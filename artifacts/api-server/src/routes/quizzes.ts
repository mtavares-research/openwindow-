import { Router, type IRouter } from "express";
import { db, quizzesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListQuizzesQueryParams,
  AnswerQuizParams,
  AnswerQuizBody,
  ListQuizzesResponse,
  AnswerQuizResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/quizzes", async (req, res): Promise<void> => {
  const query = ListQuizzesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const quizzes = query.data.materialId
    ? await db.select().from(quizzesTable).where(eq(quizzesTable.materialId, query.data.materialId))
    : await db.select().from(quizzesTable);

  res.json(ListQuizzesResponse.parse(quizzes));
});

router.post("/quizzes/:id/answer", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AnswerQuizParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AnswerQuizBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, params.data.id));
  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const correct = body.data.selectedIndex === quiz.correctIndex;

  await db
    .update(quizzesTable)
    .set({
      timesAnswered: quiz.timesAnswered + 1,
      timesCorrect: correct ? quiz.timesCorrect + 1 : quiz.timesCorrect,
    })
    .where(eq(quizzesTable.id, params.data.id));

  res.json(
    AnswerQuizResponse.parse({
      correct,
      correctIndex: quiz.correctIndex,
      explanation: quiz.explanation,
    })
  );
});

export default router;

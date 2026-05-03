import { Router, type IRouter } from "express";
import { db, flashcardsTable } from "@workspace/db";
import { eq, lte, isNull, or } from "drizzle-orm";
import {
  ListFlashcardsQueryParams,
  ReviewFlashcardParams,
  ReviewFlashcardBody,
  ListFlashcardsResponse,
  GetDueFlashcardsResponse,
  ReviewFlashcardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/flashcards", async (req, res): Promise<void> => {
  const query = ListFlashcardsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const cards = query.data.materialId
    ? await db.select().from(flashcardsTable).where(eq(flashcardsTable.materialId, query.data.materialId))
    : await db.select().from(flashcardsTable);

  res.json(ListFlashcardsResponse.parse(cards));
});

router.get("/flashcards/due", async (req, res): Promise<void> => {
  const now = new Date();
  const dueCards = await db
    .select()
    .from(flashcardsTable)
    .where(or(isNull(flashcardsTable.nextReviewAt), lte(flashcardsTable.nextReviewAt, now)))
    .limit(20);

  res.json(GetDueFlashcardsResponse.parse(dueCards));
});

router.post("/flashcards/:id/review", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ReviewFlashcardParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ReviewFlashcardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [card] = await db.select().from(flashcardsTable).where(eq(flashcardsTable.id, params.data.id));
  if (!card) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  // Spaced repetition: difficulty 1 = very hard (review soon), 5 = very easy (review later)
  const difficulty = body.data.difficulty;
  const daysUntilReview = difficulty <= 1 ? 1 : difficulty === 2 ? 3 : difficulty === 3 ? 7 : difficulty === 4 ? 14 : 30;
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + daysUntilReview);

  const [updated] = await db
    .update(flashcardsTable)
    .set({
      difficulty,
      lastReviewedAt: new Date(),
      nextReviewAt,
      reviewCount: card.reviewCount + 1,
    })
    .where(eq(flashcardsTable.id, params.data.id))
    .returning();

  res.json(ReviewFlashcardResponse.parse(updated));
});

export default router;

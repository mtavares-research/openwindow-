import { Router, type IRouter } from "express";
import { db, studySessionsTable, collectedCardsTable, packOpeningsTable, flashcardsTable, quizzesTable, cardsTable } from "@workspace/db";
import { eq, and, sum, count } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { GetStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [durResult] = await db.select({ total: sum(studySessionsTable.durationSeconds) }).from(studySessionsTable).where(and(eq(studySessionsTable.status, "completed"), eq(studySessionsTable.userId, userId)));
  const [sessionCount] = await db.select({ count: count() }).from(studySessionsTable).where(and(eq(studySessionsTable.status, "completed"), eq(studySessionsTable.userId, userId)));
  const [cardCount] = await db.select({ count: count() }).from(collectedCardsTable).where(eq(collectedCardsTable.userId, userId));
  const [packCount] = await db.select({ count: count() }).from(packOpeningsTable).where(eq(packOpeningsTable.userId, userId));
  const [flashcardCount] = await db.select({ count: count() }).from(flashcardsTable).where(eq(flashcardsTable.userId, userId));
  const [quizCount] = await db.select({ count: count() }).from(quizzesTable).where(eq(quizzesTable.userId, userId));

  const allCollected = await db.select({ cardId: collectedCardsTable.cardId }).from(collectedCardsTable).where(eq(collectedCardsTable.userId, userId));
  const uniqueCardIds = new Set(allCollected.map((c) => c.cardId));

  const legendaryCards = await db.select({ id: collectedCardsTable.id }).from(collectedCardsTable).innerJoin(cardsTable, eq(collectedCardsTable.cardId, cardsTable.id)).where(and(eq(collectedCardsTable.userId, userId), eq(cardsTable.rarity, "legendary")));

  res.json(GetStatsResponse.parse({ totalStudySeconds: Number(durResult?.total ?? 0), sessionsCompleted: Number(sessionCount?.count ?? 0), cardsCollected: Number(cardCount?.count ?? 0), packsOpened: Number(packCount?.count ?? 0), uniqueCards: uniqueCardIds.size, legendaryCards: legendaryCards.length, flashcardsCreated: Number(flashcardCount?.count ?? 0), quizzesCreated: Number(quizCount?.count ?? 0) }));
});

export default router;

import { Router, type IRouter } from "express";
import { db, collectedCardsTable, cardsTable, packOpeningsTable, studySessionsTable } from "@workspace/db";
import { eq, and, sum } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  GetCollectionResponse,
  GetPackStatusResponse,
  OpenPackResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const PACK_STUDY_SECONDS_REQUIRED = 3600;

router.get("/collection", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const collected = await db
    .select({ id: collectedCardsTable.id, cardId: collectedCardsTable.cardId, packOpeningId: collectedCardsTable.packOpeningId, acquiredAt: collectedCardsTable.acquiredAt, card: cardsTable })
    .from(collectedCardsTable)
    .innerJoin(cardsTable, eq(collectedCardsTable.cardId, cardsTable.id))
    .where(eq(collectedCardsTable.userId, userId))
    .orderBy(collectedCardsTable.acquiredAt);

  res.json(GetCollectionResponse.parse(collected));
});

router.get("/packs/status", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [durResult] = await db
    .select({ total: sum(studySessionsTable.durationSeconds) })
    .from(studySessionsTable)
    .where(and(eq(studySessionsTable.status, "completed"), eq(studySessionsTable.userId, userId)));

  const totalStudySeconds = Number(durResult?.total ?? 0);
  const packOpenings = await db.select().from(packOpeningsTable).where(eq(packOpeningsTable.userId, userId));
  const packsOpened = packOpenings.length;
  const packsEarned = Math.floor(totalStudySeconds / PACK_STUDY_SECONDS_REQUIRED);
  const packsAvailable = Math.max(0, packsEarned - packsOpened);

  res.json(GetPackStatusResponse.parse({ available: packsAvailable > 0, studySecondsRequired: PACK_STUDY_SECONDS_REQUIRED, currentStudySeconds: totalStudySeconds, packsAvailable }));
});

router.post("/packs/open", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [durResult] = await db
    .select({ total: sum(studySessionsTable.durationSeconds) })
    .from(studySessionsTable)
    .where(and(eq(studySessionsTable.status, "completed"), eq(studySessionsTable.userId, userId)));

  const totalStudySeconds = Number(durResult?.total ?? 0);
  const packOpenings = await db.select().from(packOpeningsTable).where(eq(packOpeningsTable.userId, userId));
  const packsOpened = packOpenings.length;
  const packsEarned = Math.floor(totalStudySeconds / PACK_STUDY_SECONDS_REQUIRED);
  const packsAvailable = Math.max(0, packsEarned - packsOpened);

  if (packsAvailable <= 0) { res.status(400).json({ error: "No pack available. Keep studying!" }); return; }

  const [packOpening] = await db.insert(packOpeningsTable).values({ userId }).returning();
  const allCards = await db.select().from(cardsTable);
  if (allCards.length === 0) { res.status(400).json({ error: "No cards in catalog" }); return; }

  const selectedCards: typeof allCards = [];
  const rarityWeights = { common: 60, rare: 25, holographic: 12, legendary: 3 };
  for (let i = 0; i < 5; i++) {
    const roll = Math.random() * 100;
    let targetRarity: string;
    if (roll < rarityWeights.legendary) targetRarity = "legendary";
    else if (roll < rarityWeights.legendary + rarityWeights.holographic) targetRarity = "holographic";
    else if (roll < rarityWeights.legendary + rarityWeights.holographic + rarityWeights.rare) targetRarity = "rare";
    else targetRarity = "common";
    const pool = allCards.filter((c) => c.rarity === targetRarity);
    selectedCards.push((pool.length > 0 ? pool : allCards)[Math.floor(Math.random() * (pool.length > 0 ? pool : allCards).length)]);
  }

  await db.insert(collectedCardsTable).values(selectedCards.map((card) => ({ userId, cardId: card.id, packOpeningId: packOpening.id }))).returning();

  const withCards = await db
    .select({ id: collectedCardsTable.id, cardId: collectedCardsTable.cardId, packOpeningId: collectedCardsTable.packOpeningId, acquiredAt: collectedCardsTable.acquiredAt, card: cardsTable })
    .from(collectedCardsTable)
    .innerJoin(cardsTable, eq(collectedCardsTable.cardId, cardsTable.id))
    .where(eq(collectedCardsTable.packOpeningId, packOpening.id));

  res.json(OpenPackResponse.parse({ packId: packOpening.id, cards: withCards }));
});

export default router;

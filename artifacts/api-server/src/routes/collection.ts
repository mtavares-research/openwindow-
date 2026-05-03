import { Router, type IRouter } from "express";
import { db, collectedCardsTable, cardsTable, packOpeningsTable, studySessionsTable } from "@workspace/db";
import { eq, and, sum, count, desc } from "drizzle-orm";
import {
  GetCollectionResponse,
  GetPackStatusResponse,
  OpenPackResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PACK_STUDY_SECONDS_REQUIRED = 3600; // 1 hour

router.get("/collection", async (req, res): Promise<void> => {
  const collected = await db
    .select({
      id: collectedCardsTable.id,
      cardId: collectedCardsTable.cardId,
      packOpeningId: collectedCardsTable.packOpeningId,
      acquiredAt: collectedCardsTable.acquiredAt,
      card: cardsTable,
    })
    .from(collectedCardsTable)
    .innerJoin(cardsTable, eq(collectedCardsTable.cardId, cardsTable.id))
    .orderBy(desc(collectedCardsTable.acquiredAt));

  res.json(GetCollectionResponse.parse(collected));
});

router.get("/packs/status", async (req, res): Promise<void> => {
  // Count total study seconds from sessions that have earned packs but not yet been redeemed
  const [durResult] = await db
    .select({ total: sum(studySessionsTable.durationSeconds) })
    .from(studySessionsTable)
    .where(eq(studySessionsTable.status, "completed"));

  const totalStudySeconds = Number(durResult?.total ?? 0);
  const packsOpened = (await db.select().from(packOpeningsTable)).length;

  // Packs available = floor(totalStudySeconds / PACK_STUDY_SECONDS_REQUIRED) - packsOpened
  const packsEarned = Math.floor(totalStudySeconds / PACK_STUDY_SECONDS_REQUIRED);
  const packsAvailable = Math.max(0, packsEarned - packsOpened);

  res.json(
    GetPackStatusResponse.parse({
      available: packsAvailable > 0,
      studySecondsRequired: PACK_STUDY_SECONDS_REQUIRED,
      currentStudySeconds: totalStudySeconds,
      packsAvailable,
    })
  );
});

router.post("/packs/open", async (req, res): Promise<void> => {
  // Check availability first
  const [durResult] = await db
    .select({ total: sum(studySessionsTable.durationSeconds) })
    .from(studySessionsTable)
    .where(eq(studySessionsTable.status, "completed"));

  const totalStudySeconds = Number(durResult?.total ?? 0);
  const packsOpened = (await db.select().from(packOpeningsTable)).length;
  const packsEarned = Math.floor(totalStudySeconds / PACK_STUDY_SECONDS_REQUIRED);
  const packsAvailable = Math.max(0, packsEarned - packsOpened);

  if (packsAvailable <= 0) {
    res.status(400).json({ error: "No pack available. Keep studying!" });
    return;
  }

  // Create a pack opening
  const [packOpening] = await db.insert(packOpeningsTable).values({}).returning();

  // Select 5 random cards with rarity distribution
  const allCards = await db.select().from(cardsTable);
  if (allCards.length === 0) {
    res.status(400).json({ error: "No cards in catalog" });
    return;
  }

  const selectedCards: typeof allCards = [];
  const rarityWeights = {
    common: 60,
    rare: 25,
    holographic: 12,
    legendary: 3,
  };

  for (let i = 0; i < 5; i++) {
    const roll = Math.random() * 100;
    let targetRarity: string;
    if (roll < rarityWeights.legendary) {
      targetRarity = "legendary";
    } else if (roll < rarityWeights.legendary + rarityWeights.holographic) {
      targetRarity = "holographic";
    } else if (roll < rarityWeights.legendary + rarityWeights.holographic + rarityWeights.rare) {
      targetRarity = "rare";
    } else {
      targetRarity = "common";
    }

    const rarityCards = allCards.filter((c) => c.rarity === targetRarity);
    const pool = rarityCards.length > 0 ? rarityCards : allCards;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    selectedCards.push(picked);
  }

  // Insert collected cards
  const insertedCards = await db
    .insert(collectedCardsTable)
    .values(
      selectedCards.map((card) => ({
        cardId: card.id,
        packOpeningId: packOpening.id,
      }))
    )
    .returning();

  // Fetch with card data
  const withCards = await db
    .select({
      id: collectedCardsTable.id,
      cardId: collectedCardsTable.cardId,
      packOpeningId: collectedCardsTable.packOpeningId,
      acquiredAt: collectedCardsTable.acquiredAt,
      card: cardsTable,
    })
    .from(collectedCardsTable)
    .innerJoin(cardsTable, eq(collectedCardsTable.cardId, cardsTable.id))
    .where(eq(collectedCardsTable.packOpeningId, packOpening.id));

  res.json(
    OpenPackResponse.parse({
      packId: packOpening.id,
      cards: withCards,
    })
  );
});

export default router;

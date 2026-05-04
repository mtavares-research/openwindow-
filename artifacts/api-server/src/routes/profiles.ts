import { Router, type IRouter } from "express";
import { db, profilesTable, collectedCardsTable, cardsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

router.get("/profile", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  let [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  if (!profile) {
    [profile] = await db.insert(profilesTable).values({ userId }).returning();
  }
  res.json(profile);
});

router.patch("/profile", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { username, displayName, bio, avatarColor } = req.body as { username?: string; displayName?: string; bio?: string; avatarColor?: string };

  const updates: Partial<typeof profilesTable.$inferInsert> = {};
  if (username !== undefined) updates.username = username || null;
  if (displayName !== undefined) updates.displayName = displayName || null;
  if (bio !== undefined) updates.bio = bio || null;
  if (avatarColor !== undefined) updates.avatarColor = avatarColor;

  let [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  if (!profile) {
    [profile] = await db.insert(profilesTable).values({ userId, ...updates }).returning();
  } else {
    [profile] = await db.update(profilesTable).set(updates).where(eq(profilesTable.userId, userId)).returning();
  }
  res.json(profile);
});

router.get("/profile/search", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) { res.json([]); return; }

  const results = await db.select().from(profilesTable).where(ilike(profilesTable.username, `%${q}%`)).limit(10);
  res.json(results.filter((p) => p.userId !== userId));
});

router.get("/users/:targetUserId/collection", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const targetUserId = req.params.targetUserId;
  const collected = await db
    .select({ id: collectedCardsTable.id, cardId: collectedCardsTable.cardId, acquiredAt: collectedCardsTable.acquiredAt, card: cardsTable })
    .from(collectedCardsTable)
    .innerJoin(cardsTable, eq(collectedCardsTable.cardId, cardsTable.id))
    .where(eq(collectedCardsTable.userId, targetUserId));

  const grouped = new Map<number, { cardId: number; quantity: number; card: (typeof cardsTable.$inferSelect) }>();
  for (const c of collected) {
    const existing = grouped.get(c.cardId);
    if (existing) existing.quantity++;
    else grouped.set(c.cardId, { cardId: c.cardId, quantity: 1, card: c.card });
  }

  res.json(Array.from(grouped.values()));
});

router.post("/profile/claim-all-cards", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const allCards = await db.select().from(cardsTable);
  if (allCards.length === 0) { res.status(400).json({ error: "No cards defined" }); return; }

  const { packOpeningsTable } = await import("@workspace/db");
  const [packOpening] = await db.insert(packOpeningsTable).values({ userId }).returning();

  await db.insert(collectedCardsTable).values(
    allCards.map((card) => ({ userId, cardId: card.id, packOpeningId: packOpening.id }))
  );

  res.json({ message: `Granted all ${allCards.length} cards!`, count: allCards.length });
});

export default router;

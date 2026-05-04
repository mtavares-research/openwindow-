import { Router, type IRouter } from "express";
import { db, studySessionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  StopStudySessionParams,
  ListStudySessionsResponse,
  GetCurrentStudySessionResponse,
  StopStudySessionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/study-sessions", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const sessions = await db.select().from(studySessionsTable).where(eq(studySessionsTable.userId, userId)).orderBy(desc(studySessionsTable.startedAt)).limit(20);
  res.json(ListStudySessionsResponse.parse(sessions));
});

router.post("/study-sessions/start", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db.update(studySessionsTable).set({ status: "completed", endedAt: new Date() }).where(and(eq(studySessionsTable.status, "active"), eq(studySessionsTable.userId, userId)));

  const [session] = await db.insert(studySessionsTable).values({ userId, status: "active", packEarned: false }).returning();
  res.status(201).json(session);
});

router.get("/study-sessions/current", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [session] = await db.select().from(studySessionsTable).where(and(eq(studySessionsTable.status, "active"), eq(studySessionsTable.userId, userId))).limit(1);
  res.json(GetCurrentStudySessionResponse.parse({ session: session ?? null }));
});

router.patch("/study-sessions/:id/stop", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = StopStudySessionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db.select().from(studySessionsTable).where(and(eq(studySessionsTable.id, params.data.id), eq(studySessionsTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Session not found" }); return; }

  const endedAt = new Date();
  const durationSeconds = Math.floor((endedAt.getTime() - existing.startedAt.getTime()) / 1000);
  const packEarned = durationSeconds >= 60;

  const [updated] = await db.update(studySessionsTable).set({ status: "completed", endedAt, durationSeconds, packEarned }).where(eq(studySessionsTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(StopStudySessionResponse.parse(updated));
});

export default router;

import { Router, type IRouter } from "express";
import { db, studySessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  StopStudySessionParams,
  ListStudySessionsResponse,
  GetCurrentStudySessionResponse,
  StopStudySessionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/study-sessions", async (req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(studySessionsTable)
    .orderBy(desc(studySessionsTable.startedAt))
    .limit(20);
  res.json(ListStudySessionsResponse.parse(sessions));
});

router.post("/study-sessions/start", async (req, res): Promise<void> => {
  // Stop any existing active session first
  await db
    .update(studySessionsTable)
    .set({ status: "completed", endedAt: new Date() })
    .where(eq(studySessionsTable.status, "active"));

  const [session] = await db
    .insert(studySessionsTable)
    .values({ status: "active", packEarned: false })
    .returning();

  res.status(201).json(session);
});

router.get("/study-sessions/current", async (req, res): Promise<void> => {
  const [session] = await db
    .select()
    .from(studySessionsTable)
    .where(eq(studySessionsTable.status, "active"))
    .limit(1);

  res.json(GetCurrentStudySessionResponse.parse({ session: session ?? null }));
});

router.patch("/study-sessions/:id/stop", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = StopStudySessionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(studySessionsTable)
    .where(eq(studySessionsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const endedAt = new Date();
  const startedAt = existing.startedAt;
  const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

  // Pack is earned every 3600 seconds (1 hour) of cumulative study - simplified: earn one per completed session >= 60s
  const packEarned = durationSeconds >= 60;

  const [updated] = await db
    .update(studySessionsTable)
    .set({
      status: "completed",
      endedAt,
      durationSeconds,
      packEarned,
    })
    .where(eq(studySessionsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(StopStudySessionResponse.parse(updated));
});

export default router;

import { Router, type IRouter } from "express";
import { db, studyMaterialsTable, flashcardsTable, quizzesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateStudyMaterialBody,
  GetStudyMaterialParams,
  DeleteStudyMaterialParams,
  GenerateFromMaterialParams,
  ListStudyMaterialsResponse,
  GetStudyMaterialResponse,
  GenerateFromMaterialResponse,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/study-materials", async (req, res): Promise<void> => {
  const materials = await db.select().from(studyMaterialsTable).orderBy(studyMaterialsTable.createdAt);

  const withCounts = await Promise.all(
    materials.map(async (m) => {
      const [fc] = await db.select({ count: count() }).from(flashcardsTable).where(eq(flashcardsTable.materialId, m.id));
      const [qc] = await db.select({ count: count() }).from(quizzesTable).where(eq(quizzesTable.materialId, m.id));
      return {
        ...m,
        flashcardCount: Number(fc?.count ?? 0),
        quizCount: Number(qc?.count ?? 0),
      };
    })
  );

  res.json(ListStudyMaterialsResponse.parse(withCounts));
});

router.post("/study-materials", async (req, res): Promise<void> => {
  const parsed = CreateStudyMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [material] = await db.insert(studyMaterialsTable).values(parsed.data).returning();

  const [fc] = await db.select({ count: count() }).from(flashcardsTable).where(eq(flashcardsTable.materialId, material.id));
  const [qc] = await db.select({ count: count() }).from(quizzesTable).where(eq(quizzesTable.materialId, material.id));

  res.status(201).json(
    GetStudyMaterialResponse.parse({
      ...material,
      flashcardCount: Number(fc?.count ?? 0),
      quizCount: Number(qc?.count ?? 0),
    })
  );
});

router.get("/study-materials/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetStudyMaterialParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [material] = await db.select().from(studyMaterialsTable).where(eq(studyMaterialsTable.id, params.data.id));
  if (!material) {
    res.status(404).json({ error: "Study material not found" });
    return;
  }

  const [fc] = await db.select({ count: count() }).from(flashcardsTable).where(eq(flashcardsTable.materialId, material.id));
  const [qc] = await db.select({ count: count() }).from(quizzesTable).where(eq(quizzesTable.materialId, material.id));

  res.json(
    GetStudyMaterialResponse.parse({
      ...material,
      flashcardCount: Number(fc?.count ?? 0),
      quizCount: Number(qc?.count ?? 0),
    })
  );
});

router.delete("/study-materials/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteStudyMaterialParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Delete related flashcards and quizzes first
  await db.delete(flashcardsTable).where(eq(flashcardsTable.materialId, params.data.id));
  await db.delete(quizzesTable).where(eq(quizzesTable.materialId, params.data.id));

  const [deleted] = await db.delete(studyMaterialsTable).where(eq(studyMaterialsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Study material not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/study-materials/:id/generate", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GenerateFromMaterialParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [material] = await db.select().from(studyMaterialsTable).where(eq(studyMaterialsTable.id, params.data.id));
  if (!material) {
    res.status(404).json({ error: "Study material not found" });
    return;
  }

  try {
    const prompt = `You are an expert study assistant using evidence-based learning methods (active recall, spaced repetition, retrieval practice).

Analyze this study material and generate:
1. 8-12 flashcards using active recall principles
2. 4-6 multiple choice quiz questions

Material Title: ${material.title}
Material Type: ${material.type}
Content:
${material.content.slice(0, 3000)}

Respond with valid JSON in this exact format:
{
  "flashcards": [
    {
      "front": "Question or prompt that tests recall",
      "back": "Complete answer or explanation",
      "category": "optional category label"
    }
  ],
  "quizzes": [
    {
      "question": "Multiple choice question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(responseText) as {
      flashcards?: { front: string; back: string; category?: string }[];
      quizzes?: { question: string; options: string[]; correctIndex: number; explanation?: string }[];
    };

    const flashcards = parsed.flashcards ?? [];
    const quizzes = parsed.quizzes ?? [];

    // Insert flashcards
    if (flashcards.length > 0) {
      await db.insert(flashcardsTable).values(
        flashcards.map((f) => ({
          materialId: material.id,
          front: f.front,
          back: f.back,
          category: f.category ?? null,
          difficulty: 3,
        }))
      );
    }

    // Insert quizzes
    if (quizzes.length > 0) {
      await db.insert(quizzesTable).values(
        quizzes.map((q) => ({
          materialId: material.id,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation ?? null,
        }))
      );
    }

    // Mark material as having generated content
    await db.update(studyMaterialsTable).set({ hasGeneratedContent: true }).where(eq(studyMaterialsTable.id, material.id));

    res.json(
      GenerateFromMaterialResponse.parse({
        flashcardsGenerated: flashcards.length,
        quizzesGenerated: quizzes.length,
      })
    );
  } catch (err) {
    req.log.error({ err }, "Failed to generate study content");
    res.status(500).json({ error: "Failed to generate content" });
  }
});

export default router;

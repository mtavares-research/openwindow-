import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studyMaterialsTable = pgTable("study_materials", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  hasGeneratedContent: boolean("has_generated_content").notNull().default(false),
});

export const flashcardsTable = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  materialId: integer("material_id").notNull().references(() => studyMaterialsTable.id),
  front: text("front").notNull(),
  back: text("back").notNull(),
  category: text("category"),
  difficulty: integer("difficulty").notNull().default(3),
  reviewCount: integer("review_count").notNull().default(0),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
});

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  materialId: integer("material_id").notNull().references(() => studyMaterialsTable.id),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation"),
  timesAnswered: integer("times_answered").notNull().default(0),
  timesCorrect: integer("times_correct").notNull().default(0),
});

export const insertStudyMaterialSchema = createInsertSchema(studyMaterialsTable).omit({ id: true, createdAt: true, hasGeneratedContent: true });
export type InsertStudyMaterial = z.infer<typeof insertStudyMaterialSchema>;
export type StudyMaterial = typeof studyMaterialsTable.$inferSelect;

export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({ id: true, reviewCount: true, lastReviewedAt: true, nextReviewAt: true });
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcardsTable.$inferSelect;

export const insertQuizSchema = createInsertSchema(quizzesTable).omit({ id: true, timesAnswered: true, timesCorrect: true });
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzesTable.$inferSelect;

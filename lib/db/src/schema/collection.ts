import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cardsTable } from "./cards";

export const packOpeningsTable = pgTable("pack_openings", {
  id: serial("id").primaryKey(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collectedCardsTable = pgTable("collected_cards", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull().references(() => cardsTable.id),
  packOpeningId: integer("pack_opening_id").references(() => packOpeningsTable.id),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCollectedCardSchema = createInsertSchema(collectedCardsTable).omit({ id: true, acquiredAt: true });
export type InsertCollectedCard = z.infer<typeof insertCollectedCardSchema>;
export type CollectedCard = typeof collectedCardsTable.$inferSelect;

import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cardsTable = pgTable("cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rarity: text("rarity").notNull(), // common | rare | holographic | legendary
  type: text("type").notNull(), // creature | quote | fact | achievement | cosmetic
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  element: text("element").notNull(),
  power: integer("power"),
  flavorText: text("flavor_text"),
});

export const insertCardSchema = createInsertSchema(cardsTable).omit({ id: true });
export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cardsTable.$inferSelect;

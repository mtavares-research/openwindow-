import { Router, type IRouter } from "express";
import { db, cardsTable } from "@workspace/db";
import { ListCardsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cards", async (req, res): Promise<void> => {
  const cards = await db.select().from(cardsTable).orderBy(cardsTable.id);
  res.json(ListCardsResponse.parse(cards));
});

export default router;

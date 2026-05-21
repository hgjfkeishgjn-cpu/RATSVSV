import { Router } from "express";
import { db, watchlistTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { AddToWatchlistBody, RemoveFromWatchlistParams } from "@workspace/api-zod";

const router = Router();

router.get("/watchlist", async (_req, res): Promise<void> => {
  const items = await db.select().from(watchlistTable).orderBy(desc(watchlistTable.createdAt));
  res.json(items);
});

router.post("/watchlist", async (req, res): Promise<void> => {
  const parsed = AddToWatchlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(watchlistTable).values({
    symbol: parsed.data.symbol.toUpperCase(),
    assetClass: parsed.data.assetClass as "crypto" | "stocks" | "forex" | "commodities",
    notes: parsed.data.notes ?? null,
  }).returning();
  res.status(201).json(item);
});

router.delete("/watchlist/:id", async (req, res): Promise<void> => {
  const params = RemoveFromWatchlistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(watchlistTable).where(eq(watchlistTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

import { Router } from "express";
import { db, portfolioTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { AddPositionBody, UpdatePositionParams, UpdatePositionBody, DeletePositionParams } from "@workspace/api-zod";
import { getSimulatedPrice } from "../lib/marketData";

const router = Router();

router.get("/portfolio", async (_req, res): Promise<void> => {
  const positions = await db.select().from(portfolioTable).orderBy(desc(portfolioTable.createdAt));
  const enriched = positions.map(p => {
    const market = getSimulatedPrice(p.symbol);
    const currentPrice = p.currentPrice ?? market.price;
    const pnl = (currentPrice - p.avgEntryPrice) * p.quantity;
    const pnlPercent = ((currentPrice - p.avgEntryPrice) / p.avgEntryPrice) * 100;
    return { ...p, currentPrice, pnl: parseFloat(pnl.toFixed(2)), pnlPercent: parseFloat(pnlPercent.toFixed(2)) };
  });
  res.json(enriched);
});

router.post("/portfolio", async (req, res): Promise<void> => {
  const parsed = AddPositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [pos] = await db.insert(portfolioTable).values({
    symbol: parsed.data.symbol.toUpperCase(),
    assetClass: parsed.data.assetClass as "crypto" | "stocks" | "forex" | "commodities",
    quantity: parsed.data.quantity,
    avgEntryPrice: parsed.data.avgEntryPrice,
  }).returning();
  res.status(201).json({ ...pos, pnl: null, pnlPercent: null });
});

router.patch("/portfolio/:id", async (req, res): Promise<void> => {
  const params = UpdatePositionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [pos] = await db.update(portfolioTable).set(parsed.data).where(eq(portfolioTable.id, params.data.id)).returning();
  if (!pos) {
    res.status(404).json({ error: "Position not found" });
    return;
  }
  const currentPrice = pos.currentPrice ?? pos.avgEntryPrice;
  const pnl = (currentPrice - pos.avgEntryPrice) * pos.quantity;
  const pnlPercent = ((currentPrice - pos.avgEntryPrice) / pos.avgEntryPrice) * 100;
  res.json({ ...pos, pnl: parseFloat(pnl.toFixed(2)), pnlPercent: parseFloat(pnlPercent.toFixed(2)) });
});

router.delete("/portfolio/:id", async (req, res): Promise<void> => {
  const params = DeletePositionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(portfolioTable).where(eq(portfolioTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/portfolio/stats/summary", async (_req, res): Promise<void> => {
  const positions = await db.select().from(portfolioTable);
  let totalValue = 0, totalPnl = 0, totalCost = 0;
  let best: { symbol: string; pnlPct: number } | null = null;
  let worst: { symbol: string; pnlPct: number } | null = null;
  for (const p of positions) {
    const market = getSimulatedPrice(p.symbol);
    const currentPrice = p.currentPrice ?? market.price;
    const value = currentPrice * p.quantity;
    const cost = p.avgEntryPrice * p.quantity;
    const pnl = value - cost;
    const pnlPct = ((currentPrice - p.avgEntryPrice) / p.avgEntryPrice) * 100;
    totalValue += value;
    totalPnl += pnl;
    totalCost += cost;
    if (!best || pnlPct > best.pnlPct) best = { symbol: p.symbol, pnlPct };
    if (!worst || pnlPct < worst.pnlPct) worst = { symbol: p.symbol, pnlPct };
  }
  res.json({
    totalPositions: positions.length,
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    totalPnlPercent: totalCost > 0 ? parseFloat(((totalPnl / totalCost) * 100).toFixed(2)) : 0,
    bestPerformer: best?.symbol ?? null,
    worstPerformer: worst?.symbol ?? null,
  });
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { signalsTable } from "@workspace/db";
import { eq, desc, avg, count, sql } from "drizzle-orm";
import {
  ListSignalsQueryParams,
  GenerateSignalBody,
  GetSignalParams,
  GetRecentActivityQueryParams,
} from "@workspace/api-zod";
import { generateTradingSignal, getSimulatedPrice } from "../lib/anthropic";
import { getSimulatedPrice as getPrice } from "../lib/marketData";

const router = Router();

router.get("/signals", async (req, res): Promise<void> => {
  const parsed = ListSignalsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { symbol, action, timeframe, limit } = parsed.data;
  let query = db.select().from(signalsTable).orderBy(desc(signalsTable.createdAt)).$dynamic();
  const conditions = [];
  if (symbol) conditions.push(eq(signalsTable.symbol, symbol));
  if (action) conditions.push(eq(signalsTable.action, action as "BUY" | "SELL" | "HOLD"));
  if (timeframe) conditions.push(eq(signalsTable.timeframe, timeframe as "1m" | "5m" | "15m" | "1h" | "4h" | "1d"));
  if (conditions.length > 0) {
    query = query.where(sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}`);
  }
  const signals = await query.limit(limit ?? 50);
  res.json(signals);
});

router.post("/signals", async (req, res): Promise<void> => {
  const parsed = GenerateSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { symbol, timeframe, assetClass } = parsed.data;
  const marketData = getPrice(symbol);
  const aiSignal = await generateTradingSignal({
    symbol,
    timeframe,
    assetClass: assetClass ?? "crypto",
    simulatedPrice: marketData.price,
    simulatedChange: marketData.changePercent24h,
    simulatedVolume: marketData.volume24h,
  });
  const [signal] = await db.insert(signalsTable).values({
    symbol: symbol.toUpperCase(),
    action: aiSignal.action,
    confidence: aiSignal.confidence,
    reasoning: aiSignal.reasoning,
    timeframe: timeframe as "1m" | "5m" | "15m" | "1h" | "4h" | "1d",
    entryPrice: aiSignal.entryPrice,
    targetPrice: aiSignal.targetPrice,
    stopLoss: aiSignal.stopLoss,
    riskRewardRatio: aiSignal.riskRewardRatio,
    assetClass: (assetClass ?? "crypto") as "crypto" | "stocks" | "forex" | "commodities",
  }).returning();
  res.status(201).json(signal);
});

router.get("/signals/dashboard/summary", async (_req, res): Promise<void> => {
  const rows = await db.select({
    action: signalsTable.action,
    cnt: count(),
    avgConf: avg(signalsTable.confidence),
  }).from(signalsTable).groupBy(signalsTable.action);

  let buyCount = 0, sellCount = 0, holdCount = 0, totalConf = 0, totalRows = 0;
  for (const r of rows) {
    const n = Number(r.cnt);
    totalRows += n;
    totalConf += Number(r.avgConf) * n;
    if (r.action === "BUY") buyCount = n;
    else if (r.action === "SELL") sellCount = n;
    else holdCount = n;
  }
  res.json({
    totalSignals: totalRows,
    buyCount,
    sellCount,
    holdCount,
    avgConfidence: totalRows > 0 ? parseFloat((totalConf / totalRows).toFixed(1)) : 0,
    winRate: totalRows > 0 ? parseFloat(((buyCount / totalRows) * 100).toFixed(1)) : 0,
  });
});

router.get("/signals/recent/activity", async (req, res): Promise<void> => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const signals = await db.select().from(signalsTable).orderBy(desc(signalsTable.createdAt)).limit(limit);
  res.json(signals);
});

router.get("/signals/top/performers", async (_req, res): Promise<void> => {
  const signals = await db.select().from(signalsTable)
    .orderBy(desc(signalsTable.confidence))
    .limit(10);
  res.json(signals);
});

router.get("/signals/:id", async (req, res): Promise<void> => {
  const params = GetSignalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [signal] = await db.select().from(signalsTable).where(eq(signalsTable.id, params.data.id));
  if (!signal) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }
  res.json(signal);
});

export default router;

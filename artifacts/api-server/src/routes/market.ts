import { Router } from "express";
import { db, signalsTable } from "@workspace/db";
import { desc, count } from "drizzle-orm";
import { GetMarketPricesQueryParams } from "@workspace/api-zod";
import { getLivePrices, getLivePrice, getKnownSymbols } from "../lib/marketData";

const router = Router();

router.get("/market/prices", async (req, res): Promise<void> => {
  const parsed = GetMarketPricesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const symbols = parsed.data.symbols.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
  const prices = await getLivePrices(symbols);
  res.json(prices);
});

router.get("/market/trending", async (_req, res): Promise<void> => {
  const known = getKnownSymbols().slice(0, 8);
  const recentSignals = await db.select({
    symbol: signalsTable.symbol,
    action: signalsTable.action,
    cnt: count(),
  }).from(signalsTable).groupBy(signalsTable.symbol, signalsTable.action).orderBy(desc(count())).limit(20);

  const symbolMap: Record<string, { count: number; latestAction: "BUY" | "SELL" | "HOLD" }> = {};
  for (const s of recentSignals) {
    if (!symbolMap[s.symbol]) symbolMap[s.symbol] = { count: 0, latestAction: s.action };
    symbolMap[s.symbol].count += Number(s.cnt);
  }

  const priceData = await getLivePrices(known);

  const trending = priceData.map(data => {
    const symbol = data.symbol;
    const sigData = symbolMap[symbol] ?? { count: 0, latestAction: "HOLD" as const };
    const assetClass = ["BTC","ETH","SOL","BNB","XRP"].includes(symbol) ? "crypto"
      : ["AAPL","TSLA","NVDA","MSFT","GOOGL"].includes(symbol) ? "stocks"
      : ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD"].includes(symbol) ? "forex"
      : ["NASDAQ","SP500","DOW"].includes(symbol) ? "indices"
      : "commodities";
    return {
      symbol,
      assetClass,
      momentum: parseFloat(data.changePercent24h.toFixed(2)),
      signalCount: sigData.count,
      latestAction: sigData.latestAction,
    };
  });

  trending.sort((a, b) => Math.abs(b.momentum) - Math.abs(a.momentum));
  res.json(trending);
});

export default router;

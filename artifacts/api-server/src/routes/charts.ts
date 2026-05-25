import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

// Yahoo Finance ticker map
const YAHOO_MAP: Record<string, string> = {
  // Crypto
  BTC: "BTC-USD", ETH: "ETH-USD", SOL: "SOL-USD", BNB: "BNB-USD",
  XRP: "XRP-USD", AVAX: "AVAX-USD", DOGE: "DOGE-USD", ADA: "ADA-USD",
  // Commodities
  GOLD: "GC=F", XAU: "GC=F", SILVER: "SI=F", OIL: "CL=F",
  // Indices
  NASDAQ: "^IXIC", NAS100: "^NDX", SP500: "^GSPC", US30: "^DJI",
  // Stocks
  AAPL: "AAPL", NVDA: "NVDA", TSLA: "TSLA", MSFT: "MSFT",
  GOOGL: "GOOGL", AMZN: "AMZN", META: "META",
  // Forex
  EURUSD: "EURUSD=X", GBPUSD: "GBPUSD=X", USDJPY: "JPY=X",
  AUDUSD: "AUDUSD=X", USDCAD: "CAD=X", USDCHF: "CHF=X",
};

function yahooInterval(interval: string): string {
  const map: Record<string, string> = {
    "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
    "1h": "1h", "4h": "1h", "1d": "1d", "1w": "1wk", "1M": "1mo",
  };
  return map[interval] ?? "1h";
}

function yahooRange(interval: string): string {
  if (interval === "1d" || interval === "1w" || interval === "1M") return "1y";
  if (interval === "4h") return "60d";
  if (interval === "1h") return "60d";
  if (interval === "30m" || interval === "15m") return "60d";
  if (interval === "5m") return "5d";
  return "5d";
}

async function fetchYahooOHLCV(ticker: string, interval: string) {
  const yInterval = yahooInterval(interval);
  const range = yahooRange(interval);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${yInterval}&range=${range}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
      "Referer": "https://finance.yahoo.com",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Yahoo ${res.status}`);

  const json = await res.json() as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }>;
        };
      }>;
      error?: { code: string; description: string };
    };
  };

  if (json?.chart?.error) throw new Error(json.chart.error.description);

  const result = json?.chart?.result?.[0];
  if (!result?.timestamp) throw new Error("No data");

  const q = result.indicators?.quote?.[0] ?? {};
  const candles = [];

  for (let i = 0; i < result.timestamp.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    if (c <= 0 || h < l) continue;
    candles.push({
      time: result.timestamp[i],
      open: o, high: h, low: l, close: c,
      volume: q.volume?.[i] ?? 0,
    });
  }

  // For 4h interval, downsample from 1h data
  if (interval === "4h" && candles.length > 0) {
    const grouped: typeof candles = [];
    for (let i = 0; i < candles.length; i += 4) {
      const chunk = candles.slice(i, i + 4);
      if (chunk.length === 0) continue;
      grouped.push({
        time: chunk[0].time,
        open: chunk[0].open,
        high: Math.max(...chunk.map(c => c.high)),
        low: Math.min(...chunk.map(c => c.low)),
        close: chunk[chunk.length - 1].close,
        volume: chunk.reduce((s, c) => s + c.volume, 0),
      });
    }
    return grouped;
  }

  return candles;
}

router.get("/charts/ohlcv", async (req, res): Promise<void> => {
  const symbol = (req.query.symbol as string ?? "BTC").toUpperCase();
  const interval = (req.query.interval as string ?? "1h");
  const limit = Math.min(500, parseInt(req.query.limit as string ?? "200", 10));

  const ticker = YAHOO_MAP[symbol];
  if (!ticker) {
    res.status(404).json({ error: `Unknown symbol: ${symbol}` });
    return;
  }

  try {
    const candles = await fetchYahooOHLCV(ticker, interval);
    if (!candles || candles.length === 0) {
      res.status(404).json({ error: "No data available for this symbol" });
      return;
    }
    // Return last `limit` candles
    res.json(candles.slice(-limit));
  } catch (err) {
    logger.warn({ err, symbol, interval }, "OHLCV fetch error");
    res.status(500).json({ error: "Failed to fetch chart data" });
  }
});

export default router;

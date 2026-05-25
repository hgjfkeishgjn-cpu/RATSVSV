import { useState, useEffect, useRef, useCallback } from "react";

// ── types ─────────────────────────────────────────────────────────────────────
export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPct: number;
  midPrice: number;
  lastUpdate: number;
}

export interface ActiveTrade {
  id: string;
  symbol: string;
  action: "BUY" | "SELL";
  entry: number;
  current: number;
  pnl: number;
  pnlPct: number;
  size: number;
  openedAt: Date;
  confidence: number;
  tp: number;
  sl: number;
}

export interface MarketStructure {
  trend: "BULLISH" | "BEARISH" | "RANGING";
  lastEvent: "BOS" | "CHoCH" | "MSB" | "Sweep";
  bias: number; // -100 to +100
  sweepDetected: boolean;
  displacement: boolean;
  higherHigh: boolean;
  higherLow: boolean;
}

export interface SentimentData {
  score: number;         // -100 to +100
  label: "EXTREME FEAR" | "FEAR" | "NEUTRAL" | "GREED" | "EXTREME GREED";
  bullishPct: number;
  bearishPct: number;
  neutralPct: number;
}

export interface LivePrice {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePct: number;
  flash: "up" | "down" | null;
}

// ── helpers ───────────────────────────────────────────────────────────────────
function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function jitter(val: number, pct: number) {
  return val * (1 + rand(-pct, pct) / 100);
}

function sentimentLabel(score: number): SentimentData["label"] {
  if (score < -60) return "EXTREME FEAR";
  if (score < -20) return "FEAR";
  if (score < 20)  return "NEUTRAL";
  if (score < 60)  return "GREED";
  return "EXTREME GREED";
}

function buildOrderBook(mid: number): OrderBook {
  const LEVELS = 6;
  const TICK   = mid * 0.0002; // 0.02% tick

  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];

  let bidTotal = 0;
  let askTotal = 0;

  for (let i = 0; i < LEVELS; i++) {
    const bidPrice = mid - TICK * (i + 1);
    const bidSize  = rand(0.5, 12);
    bidTotal += bidSize;
    bids.push({ price: bidPrice, size: bidSize, total: bidTotal });

    const askPrice = mid + TICK * (i + 1);
    const askSize  = rand(0.5, 12);
    askTotal += askSize;
    asks.push({ price: askPrice, size: askSize, total: askTotal });
  }

  const spread    = asks[0].price - bids[0].price;
  const spreadPct = (spread / mid) * 100;

  return { bids, asks, spread, spreadPct, midPrice: mid, lastUpdate: Date.now() };
}

function buildActiveTrades(basePrice: number): ActiveTrade[] {
  const PAIRS = [
    { symbol: "BTC/USD", entry: basePrice,          tp: basePrice * 1.035, sl: basePrice * 0.985 },
    { symbol: "ETH/USD", entry: 2_100 + rand(-50,50), tp: 2210, sl: 2040 },
    { symbol: "GOLD",    entry: 4_500 + rand(-20,20), tp: 4580, sl: 4440 },
    { symbol: "EUR/USD", entry: 1.0850 + rand(-0.003,0.003), tp: 1.0950, sl: 1.0770 },
    { symbol: "NASDAQ",  entry: 26_000 + rand(-200,200), tp: 26_600, sl: 25_500 },
  ];

  return PAIRS.slice(0, 3 + Math.floor(Math.random() * 2)).map((p, i) => {
    const action = Math.random() > 0.4 ? "BUY" : "SELL" as "BUY"|"SELL";
    const drift  = action === "BUY" ? rand(0.002, 0.018) : rand(-0.016, -0.001);
    const current = p.entry * (1 + drift);
    const pnl = action === "BUY"
      ? (current - p.entry) * 0.1
      : (p.entry - current) * 0.1;
    return {
      id: `trade-${i}`,
      symbol: p.symbol,
      action,
      entry: p.entry,
      current,
      pnl,
      pnlPct: ((current - p.entry) / p.entry) * 100 * (action === "SELL" ? -1 : 1),
      size: rand(0.05, 0.5),
      openedAt: new Date(Date.now() - rand(600_000, 14_400_000)),
      confidence: Math.round(rand(62, 92)),
      tp: p.tp,
      sl: p.sl,
    };
  });
}

// ── hook ──────────────────────────────────────────────────────────────────────
export function useLiveSimulation(basePrice = 77_500) {
  const [orderBook,     setOrderBook]     = useState<OrderBook>(() => buildOrderBook(basePrice));
  const [activeTrades,  setActiveTrades]  = useState<ActiveTrade[]>(() => buildActiveTrades(basePrice));
  const [sentiment,     setSentiment]     = useState<SentimentData>(() => {
    const s = Math.round(rand(10, 45));
    return { score: s, label: sentimentLabel(s), bullishPct: 55+s*0.2, bearishPct: 30-s*0.1, neutralPct: 15 };
  });
  const [structure, setStructure] = useState<MarketStructure>({
    trend: "BULLISH", lastEvent: "BOS", bias: 62, sweepDetected: true, displacement: true,
    higherHigh: true, higherLow: true,
  });
  const [currentPrice, setCurrentPrice] = useState(basePrice);
  const priceRef = useRef(basePrice);

  // Fast tick: price + order book
  useEffect(() => {
    const id = setInterval(() => {
      priceRef.current = jitter(priceRef.current, 0.04);
      const p = priceRef.current;
      setCurrentPrice(p);
      setOrderBook(buildOrderBook(p));

      // Update active trades with new price drift
      setActiveTrades(prev =>
        prev.map(t => {
          const newCurrent = jitter(t.current, 0.06);
          const pnlPct = ((newCurrent - t.entry) / t.entry) * 100 * (t.action === "SELL" ? -1 : 1);
          const pnl = pnlPct * t.size * 100;
          return { ...t, current: newCurrent, pnl, pnlPct };
        })
      );
    }, 800);
    return () => clearInterval(id);
  }, []);

  // Medium tick: sentiment drift
  useEffect(() => {
    const id = setInterval(() => {
      setSentiment(prev => {
        const next = Math.max(-80, Math.min(80, prev.score + rand(-4, 4)));
        return {
          score: Math.round(next),
          label: sentimentLabel(next),
          bullishPct: Math.round(50 + next * 0.35),
          bearishPct: Math.round(35 - next * 0.2),
          neutralPct: 15,
        };
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Slow tick: market structure events
  useEffect(() => {
    const events: MarketStructure["lastEvent"][] = ["BOS", "CHoCH", "MSB", "Sweep"];
    const id = setInterval(() => {
      setStructure(prev => {
        const newBias = Math.max(-85, Math.min(85, prev.bias + rand(-8, 8)));
        const trend: MarketStructure["trend"] =
          newBias > 20 ? "BULLISH" : newBias < -20 ? "BEARISH" : "RANGING";
        return {
          trend,
          lastEvent: events[Math.floor(Math.random() * events.length)],
          bias: Math.round(newBias),
          sweepDetected: Math.random() > 0.6,
          displacement: Math.random() > 0.5,
          higherHigh: trend === "BULLISH",
          higherLow: trend === "BULLISH",
        };
      });
    }, 7000);
    return () => clearInterval(id);
  }, []);

  return { orderBook, activeTrades, sentiment, structure, currentPrice };
}

// ── session killzones ─────────────────────────────────────────────────────────
export interface TradingSession {
  name: string;
  short: string;
  start: number; // UTC hour
  end: number;
  color: string;
  glow: string;
  active: boolean;
  minutesLeft: number | null;
  minutesUntil: number | null;
}

export function useSessionKillzones(): TradingSession[] {
  const [sessions, setSessions] = useState<TradingSession[]>([]);

  const compute = useCallback(() => {
    const now = new Date();
    const utcH = now.getUTCHours();
    const utcM = now.getUTCMinutes();
    const utcMinutes = utcH * 60 + utcM;

    const defs = [
      { name: "Tokyo",  short: "TYO", start:  0, end:  3, color: "text-purple-400", glow: "bg-purple-500" },
      { name: "London", short: "LON", start:  7, end: 10, color: "text-blue-400",   glow: "bg-blue-500" },
      { name: "NY Open",short: "NYO", start: 13, end: 16, color: "text-emerald-400",glow: "bg-emerald-500" },
      { name: "NY Close",short: "NYC",start: 19, end: 22, color: "text-amber-400",  glow: "bg-amber-500" },
    ];

    return defs.map(d => {
      const startM = d.start * 60;
      const endM   = d.end * 60;
      const active = utcMinutes >= startM && utcMinutes < endM;
      const minutesLeft   = active ? endM - utcMinutes : null;
      const minutesUntil  = !active
        ? (utcMinutes < startM ? startM - utcMinutes : 1440 - utcMinutes + startM)
        : null;
      return { ...d, active, minutesLeft, minutesUntil };
    });
  }, []);

  useEffect(() => {
    setSessions(compute());
    const id = setInterval(() => setSessions(compute()), 60_000);
    return () => clearInterval(id);
  }, [compute]);

  return sessions;
}

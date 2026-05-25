import { logger } from "./logger";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi14: number;
  ema9: number;
  ema21: number;
  ema50: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  atr14: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  support: number;
  resistance: number;
  trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  momentum: "BULLISH" | "BEARISH" | "NEUTRAL";
  lastClose: number;
}

// ── Indicator Math ──────────────────────────────────────────────────────────

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

function calcEMA(data: number[], period: number): number[] {
  if (data.length < period) return data.map(() => data[data.length - 1] ?? 0);
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(...Array(period - 1).fill(ema));
  result.push(ema);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 35) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = closes.map((_, i) => ema12[i] - ema26[i]);
  const signalLine = calcEMA(macdLine, 9);
  const last = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  return {
    macd: parseFloat(last.toFixed(6)),
    signal: parseFloat(lastSignal.toFixed(6)),
    histogram: parseFloat((last - lastSignal).toFixed(6)),
  };
}

function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (highs.length < period + 1) {
    // Fallback: rough estimate from recent high-low range
    const recent = highs.slice(-10);
    const recentLow = lows.slice(-10);
    return (Math.max(...recent) - Math.min(...recentLow)) / 10;
  }
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  const recent = trs.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / period;
}

function calcBB(closes: number[], period = 20, mult = 2): { upper: number; middle: number; lower: number } {
  const recent = closes.slice(-period);
  if (recent.length < 5) {
    const last = closes[closes.length - 1] ?? 0;
    return { upper: last * 1.02, middle: last, lower: last * 0.98 };
  }
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance = recent.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / recent.length;
  const std = Math.sqrt(variance);
  return {
    upper: mean + mult * std,
    middle: mean,
    lower: mean - mult * std,
  };
}

function findSR(highs: number[], lows: number[]): { support: number; resistance: number } {
  const window = Math.min(30, highs.length);
  return {
    resistance: Math.max(...highs.slice(-window)),
    support: Math.min(...lows.slice(-window)),
  };
}

function computeIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map(c => c.close);
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);

  const ema9Arr  = calcEMA(closes, 9);
  const ema21Arr = calcEMA(closes, 21);
  const ema50Arr = calcEMA(closes, 50);
  const ema9  = ema9Arr[ema9Arr.length - 1];
  const ema21 = ema21Arr[ema21Arr.length - 1];
  const ema50 = ema50Arr[ema50Arr.length - 1];

  const rsi14 = calcRSI(closes);
  const { macd, signal: macdSignal, histogram: macdHistogram } = calcMACD(closes);
  const atr14 = calcATR(highs, lows, closes);
  const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = calcBB(closes);
  const { support, resistance } = findSR(highs, lows);

  const trend: TechnicalIndicators["trend"] =
    ema9 > ema21 && ema21 > ema50 ? "UPTREND" :
    ema9 < ema21 && ema21 < ema50 ? "DOWNTREND" : "SIDEWAYS";

  const momentum: TechnicalIndicators["momentum"] =
    macdHistogram > 0 && rsi14 > 50 ? "BULLISH" :
    macdHistogram < 0 && rsi14 < 50 ? "BEARISH" : "NEUTRAL";

  return {
    rsi14, ema9, ema21, ema50,
    macd, macdSignal, macdHistogram,
    atr14, bbUpper, bbMiddle, bbLower,
    support, resistance, trend, momentum,
    lastClose: closes[closes.length - 1],
  };
}

// ── OHLCV Fetchers ───────────────────────────────────────────────────────────

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT", ETH: "ETHUSDT", SOL: "SOLUSDT",
  BNB: "BNBUSDT", XRP: "XRPUSDT", AVAX: "AVAXUSDT",
  DOGE: "DOGEUSDT", ADA: "ADAUSDT", DOT: "DOTUSDT",
};

async function fetchBinanceCandles(symbol: string, interval: "1h" | "5m", limit = 60): Promise<Candle[]> {
  const pair = BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!pair) return [];
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const data = await res.json() as Array<[number, string, string, string, string, string]>;
  return data.map(c => ({
    time: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

const YAHOO_MAP: Record<string, string> = {
  GOLD: "GC%3DF", XAU: "GC%3DF", SILVER: "SI%3DF", OIL: "CL%3DF", NATGAS: "NG%3DF",
  NASDAQ: "%5EIXIC", SP500: "%5EGSPC", DOW: "%5EDJI",
  AAPL: "AAPL", NVDA: "NVDA", TSLA: "TSLA", MSFT: "MSFT", GOOGL: "GOOGL",
  EURUSD: "EURUSD%3DX", GBPUSD: "GBPUSD%3DX", USDJPY: "JPY%3DX",
  AUDUSD: "AUDUSD%3DX", USDCAD: "CAD%3DX",
};

// Yahoo only provides daily/hourly; 5m not available without auth
// For 5m context we'll use the most recent 20 1h candles as proxy entry analysis
async function fetchYahooCandles(symbol: string, interval: "1h" | "1d", range: string): Promise<Candle[]> {
  const ticker = YAHOO_MAP[symbol.toUpperCase()];
  if (!ticker) return [];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
      "Referer": "https://finance.yahoo.com",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const json = await res.json() as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{ open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[] }>;
        };
      }>;
    };
  };
  const result = json?.chart?.result?.[0];
  if (!result?.timestamp) return [];
  const q = result.indicators?.quote?.[0] ?? {};
  const timestamps = result.timestamp;
  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({
      time: timestamps[i] * 1000,
      open: o, high: h, low: l, close: c,
      volume: q.volume?.[i] ?? 0,
    });
  }
  return candles;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface MultiTimeframeAnalysis {
  symbol: string;
  currentPrice: number;
  indicators1h: TechnicalIndicators;
  indicators5m: TechnicalIndicators;
  candles1h: Candle[];
}

export async function getMultiTimeframeAnalysis(
  symbol: string,
  assetClass: string
): Promise<MultiTimeframeAnalysis | null> {
  const sym = symbol.toUpperCase();

  try {
    let candles1h: Candle[] = [];
    let candles5m: Candle[] = [];

    if (BINANCE_SYMBOLS[sym]) {
      // Crypto: use Binance for both timeframes
      [candles1h, candles5m] = await Promise.all([
        fetchBinanceCandles(sym, "1h", 60).catch(() => []),
        fetchBinanceCandles(sym, "5m", 30).catch(() => []),
      ]);
    } else {
      // Stocks/Forex/Commodities: Yahoo Finance 1h candles (no 5m without auth)
      candles1h = await fetchYahooCandles(sym, "1h", "7d").catch(() => []);
      // Use last 20 of the 1h candles as "short-term context" proxy
      candles5m = candles1h.slice(-20);
    }

    if (candles1h.length < 10) {
      logger.warn({ sym }, "Insufficient 1h candle data, using fallback");
      return null;
    }

    const indicators1h = computeIndicators(candles1h);
    const indicators5m = candles5m.length >= 5
      ? computeIndicators(candles5m)
      : indicators1h;

    const currentPrice = indicators1h.lastClose;

    return { symbol: sym, currentPrice, indicators1h, indicators5m, candles1h };
  } catch (err) {
    logger.warn({ err, sym }, "Failed to get multi-timeframe analysis");
    return null;
  }
}

export function calcTPSL(
  action: "BUY" | "SELL" | "HOLD",
  currentPrice: number,
  indicators: TechnicalIndicators
): { entryPrice: number; targetPrice: number; stopLoss: number; riskRewardRatio: number } {
  const atr = indicators.atr14;
  const price = currentPrice;

  // ATR multipliers: reward = 2.5x ATR, risk = 1.5x ATR → R:R ≈ 1.67
  // Adjust to nearest support/resistance where it makes sense
  if (action === "BUY") {
    const tp = price + 2.5 * atr;
    // SL: just below support OR 1.5x ATR, whichever is tighter
    const atrSL = price - 1.5 * atr;
    const supportSL = indicators.support * 0.998; // 0.2% below support
    const sl = price - supportSL > 0.5 * atr ? supportSL : atrSL;
    const rr = parseFloat(((tp - price) / Math.abs(price - sl)).toFixed(2));
    return {
      entryPrice: parseFloat(price.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
      targetPrice: parseFloat(tp.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
      stopLoss: parseFloat(sl.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
      riskRewardRatio: Math.max(rr, 0.5),
    };
  } else if (action === "SELL") {
    const tp = price - 2.5 * atr;
    // SL: just above resistance OR 1.5x ATR
    const atrSL = price + 1.5 * atr;
    const resistanceSL = indicators.resistance * 1.002;
    const sl = resistanceSL - price < 0.5 * atr ? resistanceSL : atrSL;
    const rr = parseFloat(((price - tp) / Math.abs(sl - price)).toFixed(2));
    return {
      entryPrice: parseFloat(price.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
      targetPrice: parseFloat(tp.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
      stopLoss: parseFloat(sl.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
      riskRewardRatio: Math.max(rr, 0.5),
    };
  } else {
    // HOLD: mark levels but no directional trade
    return {
      entryPrice: parseFloat(price.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
      targetPrice: parseFloat((price + atr).toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
      stopLoss: parseFloat((price - atr).toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
      riskRewardRatio: 1,
    };
  }
}

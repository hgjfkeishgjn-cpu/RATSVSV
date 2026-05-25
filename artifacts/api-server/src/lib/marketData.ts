import { logger } from "./logger";

const BASE_PRICES: Record<string, number> = {
  BTC: 67500, ETH: 3850, SOL: 185, BNB: 580, XRP: 0.58,
  AAPL: 213, TSLA: 248, NVDA: 875, MSFT: 420, GOOGL: 175,
  EURUSD: 1.085, GBPUSD: 1.27, USDJPY: 154.5, AUDUSD: 0.655, USDCAD: 1.37,
  GOLD: 2345, XAU: 2345, OIL: 82, SILVER: 27.5, NATGAS: 2.85,
  NASDAQ: 18500, SP500: 5300, DOW: 39500,
};

function simulatedPrice(symbol: string) {
  const base = BASE_PRICES[symbol.toUpperCase()] ?? 100;
  const variance = (Math.random() - 0.48) * 0.04;
  const price = base * (1 + variance);
  const change24h = base * variance;
  return {
    price: parseFloat(price.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
    change24h: parseFloat(change24h.toFixed(2)),
    changePercent24h: parseFloat((variance * 100).toFixed(2)),
    volume24h: parseFloat((base * 1000 * (Math.random() * 5 + 1)).toFixed(0)),
    high24h: parseFloat((price * 1.02).toFixed(2)),
    low24h: parseFloat((price * 0.98).toFixed(2)),
  };
}

// ── Real-price cache (refresh every 30s, micro-tick on every request) ─────────
interface CachedEntry {
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  fetchedAt: number;
}

const priceCache = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 30_000; // refresh real APIs every 30 s

// Micro-fluctuation: ±0.12% per tick, anchored to cached real price
function applyTick(entry: CachedEntry, symbol: string): CachedEntry {
  const isForex = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"].includes(symbol);
  const isIndex = ["NASDAQ", "SP500", "DOW"].includes(symbol);
  const tickMagnitude = isForex ? 0.0003 : isIndex ? 0.0006 : 0.0012;
  const tick = (Math.random() - 0.48) * tickMagnitude;
  const newPrice = entry.price * (1 + tick);
  const decimals = newPrice < 1 ? 6 : newPrice < 10 ? 4 : isForex ? 4 : 2;
  return {
    ...entry,
    price: parseFloat(newPrice.toFixed(decimals)),
  };
}

// ── CoinGecko ─────────────────────────────────────────────────────────────────
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana",
  BNB: "binancecoin", XRP: "ripple", AVAX: "avalanche-2",
};

async function fetchCoinGecko(symbols: string[]): Promise<Map<string, CachedEntry>> {
  const ids = symbols.map(s => COINGECKO_IDS[s]).filter(Boolean);
  if (!ids.length) return new Map();

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_24h_high=true&include_24h_low=true`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json() as Record<string, {
    usd: number; usd_24h_change: number; usd_24h_vol: number;
  }>;

  const map = new Map<string, CachedEntry>();
  const now = Date.now();
  for (const sym of symbols) {
    const id = COINGECKO_IDS[sym];
    const d = id ? data[id] : undefined;
    if (!d) continue;
    const price = d.usd;
    const pct = d.usd_24h_change ?? 0;
    map.set(sym, {
      price: parseFloat(price.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
      change24h: parseFloat(((price * pct) / 100).toFixed(2)),
      changePercent24h: parseFloat(pct.toFixed(2)),
      volume24h: Math.round(d.usd_24h_vol ?? 0),
      high24h: parseFloat((price * 1.015).toFixed(2)),
      low24h: parseFloat((price * 0.985).toFixed(2)),
      fetchedAt: now,
    });
  }
  return map;
}

// ── Open Exchange Rates ───────────────────────────────────────────────────────
const FOREX_PAIRS: Record<string, { base: string; quote: string }> = {
  EURUSD: { base: "EUR", quote: "USD" },
  GBPUSD: { base: "GBP", quote: "USD" },
  USDJPY: { base: "USD", quote: "JPY" },
  AUDUSD: { base: "AUD", quote: "USD" },
  USDCAD: { base: "USD", quote: "CAD" },
};

async function fetchForex(symbols: string[]): Promise<Map<string, CachedEntry>> {
  const map = new Map<string, CachedEntry>();
  const forexSymbols = symbols.filter(s => FOREX_PAIRS[s]);
  if (!forexSymbols.length) return map;

  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Open ER API ${res.status}`);
  const data = await res.json() as { rates: Record<string, number> };
  const rates = data.rates;
  const now = Date.now();

  for (const sym of forexSymbols) {
    const pair = FOREX_PAIRS[sym];
    if (!pair) continue;
    let rate: number;
    if (pair.base === "USD") {
      rate = rates[pair.quote];
    } else {
      const baseRate = rates[pair.base];
      rate = baseRate ? 1 / baseRate : 0;
    }
    if (!rate) continue;
    const base = BASE_PRICES[sym] ?? rate;
    const drift = (rate - base) / base;
    map.set(sym, {
      price: parseFloat(rate.toFixed(4)),
      change24h: parseFloat((rate * drift).toFixed(5)),
      changePercent24h: parseFloat((drift * 100).toFixed(2)),
      volume24h: 0,
      high24h: parseFloat((rate * 1.003).toFixed(4)),
      low24h: parseFloat((rate * 0.997).toFixed(4)),
      fetchedAt: now,
    });
  }
  return map;
}

// ── Yahoo Finance chart ───────────────────────────────────────────────────────
const YAHOO_CHART_MAP: Record<string, string> = {
  GOLD: "GC%3DF", XAU: "GC%3DF", SILVER: "SI%3DF",
  OIL: "CL%3DF", NATGAS: "NG%3DF",
  NASDAQ: "%5EIXIC", SP500: "%5EGSPC", DOW: "%5EDJI",
  AAPL: "AAPL", NVDA: "NVDA", TSLA: "TSLA", MSFT: "MSFT", GOOGL: "GOOGL",
};

async function fetchYahooChart(symbol: string): Promise<CachedEntry | null> {
  const yTicker = YAHOO_CHART_MAP[symbol];
  if (!yTicker) return null;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yTicker}?interval=1d&range=2d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://finance.yahoo.com",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = await res.json() as {
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number; chartPreviousClose?: number; regularMarketVolume?: number };
        indicators?: { quote?: Array<{ high?: number[]; low?: number[] }> };
      }>;
    };
  };

  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const price = meta?.regularMarketPrice;
  if (!price) return null;

  const prevClose = meta?.chartPreviousClose ?? price;
  const change = price - prevClose;
  const changePct = prevClose ? (change / prevClose) * 100 : 0;
  const quotes = result?.indicators?.quote?.[0];
  const highs = quotes?.high?.filter(Boolean) ?? [];
  const lows = quotes?.low?.filter(Boolean) ?? [];
  const high = highs.length ? Math.max(...highs) : price * 1.01;
  const low = lows.length ? Math.min(...lows.filter((v): v is number => v !== null && v !== undefined && v > 0)) : price * 0.99;

  return {
    price: parseFloat(price.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
    change24h: parseFloat(change.toFixed(2)),
    changePercent24h: parseFloat(changePct.toFixed(2)),
    volume24h: meta?.regularMarketVolume ?? 0,
    high24h: parseFloat(high.toFixed(2)),
    low24h: parseFloat(low.toFixed(2)),
    fetchedAt: Date.now(),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function getLivePrices(symbols: string[]): Promise<Array<{
  symbol: string; price: number; change24h: number;
  changePercent24h: number; volume24h: number; high24h: number; low24h: number;
}>> {
  const uppers = symbols.map(s => s.toUpperCase());
  const now = Date.now();

  // Determine which symbols need a fresh real fetch
  const staleSymbols = uppers.filter(s => {
    const cached = priceCache.get(s);
    return !cached || now - cached.fetchedAt > CACHE_TTL_MS;
  });

  if (staleSymbols.length > 0) {
    const cryptoSymbols = staleSymbols.filter(s => COINGECKO_IDS[s]);
    const forexSymbols  = staleSymbols.filter(s => FOREX_PAIRS[s]);
    const chartSymbols  = staleSymbols.filter(s => YAHOO_CHART_MAP[s]);

    const [cryptoMap, forexMap] = await Promise.all([
      cryptoSymbols.length
        ? fetchCoinGecko(cryptoSymbols).catch(err => {
            logger.warn({ err }, "CoinGecko fetch failed");
            return new Map<string, CachedEntry>();
          })
        : Promise.resolve(new Map<string, CachedEntry>()),
      forexSymbols.length
        ? fetchForex(forexSymbols).catch(err => {
            logger.warn({ err }, "Forex fetch failed");
            return new Map<string, CachedEntry>();
          })
        : Promise.resolve(new Map<string, CachedEntry>()),
    ]);

    const chartResults = await Promise.all(
      chartSymbols.map(async sym => {
        const result = await fetchYahooChart(sym).catch(() => null);
        return [sym, result] as const;
      })
    );
    const chartMap = new Map(chartResults.filter(([, v]) => v !== null) as [string, CachedEntry][]);

    // Populate cache with fresh real data
    for (const sym of staleSymbols) {
      const fresh = cryptoMap.get(sym) ?? forexMap.get(sym) ?? chartMap.get(sym);
      if (fresh) {
        priceCache.set(sym, fresh);
      } else if (!priceCache.has(sym)) {
        // Seed with simulated if no real data at all
        const sim = simulatedPrice(sym);
        priceCache.set(sym, { ...sim, fetchedAt: now - CACHE_TTL_MS + 5000 });
      }
    }
  }

  // Apply micro-tick to every symbol for this request
  return uppers.map(symbol => {
    const cached = priceCache.get(symbol);
    if (cached) {
      const ticked = applyTick(cached, symbol);
      return { symbol, ...ticked };
    }
    return { symbol, ...simulatedPrice(symbol) };
  });
}

export function getSimulatedPrice(symbol: string) {
  return simulatedPrice(symbol.toUpperCase());
}

export function getKnownSymbols(): string[] {
  return [...Object.keys(COINGECKO_IDS), ...Object.keys(FOREX_PAIRS), ...Object.keys(YAHOO_CHART_MAP)];
}

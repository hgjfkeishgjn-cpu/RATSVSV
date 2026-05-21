// Simulated market data with realistic price ranges per asset
const BASE_PRICES: Record<string, number> = {
  BTC: 67500, ETH: 3850, SOL: 185, BNB: 580, XRP: 0.58,
  AAPL: 213, TSLA: 248, NVDA: 875, MSFT: 420, GOOGL: 175,
  EURUSD: 1.085, GBPUSD: 1.27, USDJPY: 154.5, AUDUSD: 0.655,
  GOLD: 2345, OIL: 82, SILVER: 27.5, NATGAS: 2.85,
};

export function getSimulatedPrice(symbol: string): {
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
} {
  const base = BASE_PRICES[symbol.toUpperCase()] ?? 100;
  const variance = (Math.random() - 0.48) * 0.06; // slight upward bias
  const price = base * (1 + variance);
  const change24h = base * variance;
  const changePercent24h = variance * 100;
  const volume24h = base * 1000 * (Math.random() * 5 + 1);
  const spread = price * 0.03;

  return {
    price: parseFloat(price.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2)),
    change24h: parseFloat(change24h.toFixed(2)),
    changePercent24h: parseFloat(changePercent24h.toFixed(2)),
    volume24h: parseFloat(volume24h.toFixed(0)),
    high24h: parseFloat((price + spread).toFixed(2)),
    low24h: parseFloat((price - spread).toFixed(2)),
  };
}

export function getKnownSymbols(): string[] {
  return Object.keys(BASE_PRICES);
}

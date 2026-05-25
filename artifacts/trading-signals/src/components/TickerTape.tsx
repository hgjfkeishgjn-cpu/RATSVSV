import { useGetMarketPrices } from "@workspace/api-client-react";
import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const SYMBOLS = "BTC,ETH,SOL,GOLD,NASDAQ,EURUSD,GBPUSD,USDJPY";

const LABEL: Record<string, string> = {
  BTC: "BTC/USD", ETH: "ETH/USD", SOL: "SOL/USD", GOLD: "XAU/USD",
  NASDAQ: "NAS100", EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY",
};

function formatTape(symbol: string, price: number, pct: number) {
  const label = LABEL[symbol] ?? symbol;
  const decimals = ["EURUSD", "GBPUSD", "AUDUSD"].includes(symbol) ? 4
    : ["USDJPY"].includes(symbol) ? 2
    : symbol === "NASDAQ" ? 2 : 2;
  const prefix = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "NASDAQ"].includes(symbol) ? "" : "$";
  const priceStr = `${prefix}${price.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  const pctStr = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
  return { label, priceStr, pctStr, isUp: pct >= 0 };
}

type FlashDir = "up" | "down" | null;

function usePriceFlash(price: number | undefined): FlashDir {
  const prev = useRef<number | undefined>(undefined);
  const [flash, setFlash] = useState<FlashDir>(null);
  useEffect(() => {
    if (price === undefined) return;
    if (prev.current !== undefined && price !== prev.current) {
      setFlash(price > prev.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 500);
      prev.current = price;
      return () => clearTimeout(t);
    }
    prev.current = price;
  }, [price]);
  return flash;
}

function TickItem({ symbol, price, changePercent24h }: {
  symbol: string; price: number; changePercent24h: number;
}) {
  const flash = usePriceFlash(price);
  const { label, priceStr, pctStr, isUp } = formatTape(symbol, price, changePercent24h);
  return (
    <span className="inline-flex items-center gap-1.5 px-4 border-r border-border/40 whitespace-nowrap">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span
        className={`font-mono text-xs font-bold transition-colors duration-300 ${
          flash === "up" ? "text-emerald-400" :
          flash === "down" ? "text-rose-400" :
          "text-foreground"
        }`}
      >
        {priceStr}
      </span>
      <span className={`flex items-center gap-0.5 text-[10px] font-mono font-semibold ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
        {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
        {pctStr}
      </span>
    </span>
  );
}

export default function TickerTape() {
  const { data: prices } = useGetMarketPrices(
    { symbols: SYMBOLS },
    { query: { refetchInterval: 5000 } }
  );

  if (!prices || prices.length === 0) return null;

  // Duplicate for seamless loop
  const items = [...prices, ...prices];

  return (
    <div className="h-8 bg-card/60 border-b border-border/60 backdrop-blur-sm overflow-hidden flex items-center relative">
      <div className="absolute inset-y-0 left-0 w-8 z-10 bg-gradient-to-r from-card/60 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-card/60 to-transparent pointer-events-none" />
      <div className="ticker-scroll flex items-center h-full">
        {items.map((p, i) => (
          <TickItem key={`${p.symbol}-${i}`} symbol={p.symbol} price={p.price} changePercent24h={p.changePercent24h} />
        ))}
      </div>
    </div>
  );
}

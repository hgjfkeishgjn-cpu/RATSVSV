import { type OrderBook as OB } from "@/hooks/useLiveSimulation";

function fmt(price: number, decimals = 2) {
  return price.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function Row({ price, size, total, maxTotal, side }: {
  price: number; size: number; total: number; maxTotal: number; side: "bid" | "ask";
}) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const isBid = side === "bid";
  return (
    <div className="relative flex items-center justify-between px-2 py-[3px] ob-row group overflow-hidden">
      <div
        className={`absolute inset-y-0 ${isBid ? "right-0" : "left-0"} ${isBid ? "bg-emerald-500/8" : "bg-rose-500/8"} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
      <span className={`relative font-mono text-[11px] font-bold z-10 ${isBid ? "text-emerald-400" : "text-rose-400"}`}>
        {fmt(price)}
      </span>
      <span className="relative font-mono text-[11px] text-muted-foreground z-10">{size.toFixed(3)}</span>
      <span className="relative font-mono text-[10px] text-muted-foreground/60 z-10">{total.toFixed(2)}</span>
    </div>
  );
}

export default function OrderBook({ ob, symbol = "BTC/USD" }: { ob: OB; symbol?: string }) {
  const maxTotal = Math.max(
    ob.asks[ob.asks.length - 1]?.total ?? 1,
    ob.bids[ob.bids.length - 1]?.total ?? 1,
  );

  return (
    <div className="h-full flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between px-2 pb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="widget-label">Order Book</span>
          <span className="text-[10px] font-mono text-muted-foreground">{symbol}</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          Spread: <span className="text-amber-400">{ob.spreadPct.toFixed(3)}%</span>
        </span>
      </div>

      {/* col headers */}
      <div className="flex items-center justify-between px-2 py-1">
        {["Price", "Size", "Total"].map(h => (
          <span key={h} className="widget-label">{h}</span>
        ))}
      </div>

      {/* asks (reversed — highest at top) */}
      <div className="flex-1 overflow-hidden">
        {[...ob.asks].reverse().map((level, i) => (
          <Row key={`ask-${i}`} {...level} maxTotal={maxTotal} side="ask" />
        ))}
      </div>

      {/* mid price */}
      <div className="flex items-center justify-center gap-3 py-1.5 border-y border-border/60 bg-muted/20">
        <span className="font-mono text-sm font-bold">
          {fmt(ob.midPrice)}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          Mid · Spd {ob.spread.toFixed(2)}
        </span>
      </div>

      {/* bids */}
      <div className="flex-1 overflow-hidden">
        {ob.bids.map((level, i) => (
          <Row key={`bid-${i}`} {...level} maxTotal={maxTotal} side="bid" />
        ))}
      </div>
    </div>
  );
}

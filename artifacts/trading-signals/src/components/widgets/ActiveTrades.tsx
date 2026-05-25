import { type ActiveTrade } from "@/hooks/useLiveSimulation";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";

function PnLValue({ pnl, pnlPct }: { pnl: number; pnlPct: number }) {
  const isPos = pnl >= 0;
  return (
    <div className={`text-right num-transition ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
      <div className="font-mono text-xs font-bold">
        {isPos ? "+" : ""}{pnl.toFixed(2)}
      </div>
      <div className="font-mono text-[10px] opacity-80">
        {isPos ? "+" : ""}{pnlPct.toFixed(2)}%
      </div>
    </div>
  );
}

export default function ActiveTrades({ trades }: { trades: ActiveTrade[] }) {
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="widget-label">Active Trades</span>
          <span className="text-[10px] font-mono text-muted-foreground">({trades.length} open)</span>
        </div>
        <span className={`font-mono text-xs font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)} USD
        </span>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {trades.map(t => {
          const isBuy = t.action === "BUY";
          return (
            <div
              key={t.id}
              className={`flex items-center gap-2 p-2 rounded-md border transition-all duration-300 ${
                t.pnl >= 0
                  ? "border-emerald-500/15 bg-emerald-500/5"
                  : "border-rose-500/15 bg-rose-500/5"
              }`}
            >
              <div className={`shrink-0 p-1 rounded ${isBuy ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
                {isBuy
                  ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                  : <TrendingDown className="h-3 w-3 text-rose-400" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">{t.symbol}</span>
                  <span className={`text-[9px] font-bold px-1 py-0 rounded ${isBuy ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                    {t.action}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    @ {t.entry.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60">
                    {formatDistanceToNow(t.openedAt, { addSuffix: true })}
                  </span>
                </div>

                {/* Progress bar to TP */}
                <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${t.pnl >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{
                      width: `${Math.min(100, Math.abs(t.pnlPct / ((Math.abs(t.tp - t.entry) / t.entry) * 100)) * 100)}%`
                    }}
                  />
                </div>
              </div>

              <PnLValue pnl={t.pnl} pnlPct={t.pnlPct} />
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="pt-2 border-t border-border/60 grid grid-cols-3 gap-2">
        {[
          { label: "Open", value: trades.length.toString(), color: "text-foreground" },
          { label: "Winning", value: trades.filter(t => t.pnl > 0).length.toString(), color: "text-emerald-400" },
          { label: "Losing",  value: trades.filter(t => t.pnl < 0).length.toString(), color: "text-rose-400" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="widget-label">{s.label}</div>
            <div className={`font-mono text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

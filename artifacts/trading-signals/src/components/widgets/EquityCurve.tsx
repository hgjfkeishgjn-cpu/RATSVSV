import { useMemo } from "react";

interface Trade {
  day: number;
  equity: number;
  win: boolean;
  pnl: number;
}

function genTrades(seed: number): Trade[] {
  const trades: Trade[] = [];
  let equity = 100_000;
  const rng = (n: number) => ((Math.sin(n * 9301 + 49297) / 233280 + 1) % 1);

  for (let i = 0; i < 30; i++) {
    const win  = rng(seed + i) > 0.38;
    const risk = equity * 0.01;
    const rr   = 1.5 + rng(seed + i + 100) * 1.5;
    equity    += win ? risk * rr : -risk;
    trades.push({ day: i + 1, equity: Math.max(equity, 88_000), win, pnl: win ? risk * rr : -risk });
  }
  return trades;
}

function Sparkline({ trades }: { trades: Trade[] }) {
  if (trades.length < 2) return null;

  const W = 300, H = 60;
  const minE = Math.min(...trades.map(t => t.equity));
  const maxE = Math.max(...trades.map(t => t.equity));
  const rng  = maxE - minE || 1;

  const pts = trades.map((t, i) => ({
    x: (i / (trades.length - 1)) * W,
    y: H - ((t.equity - minE) / rng) * (H - 8) - 4,
  }));

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L ${pts[pts.length-1].x} ${H} L 0 ${H} Z`;

  const isProfit = trades[trades.length - 1].equity >= 100_000;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={isProfit ? "#10b981" : "#ef4444"} stopOpacity="0.25" />
          <stop offset="100%" stopColor={isProfit ? "#10b981" : "#ef4444"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#eq-grad)" />
      <path d={path} fill="none" stroke={isProfit ? "#10b981" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Breakeven line */}
      <line
        x1={0} y1={H - ((100_000 - minE) / rng) * (H - 8) - 4}
        x2={W} y2={H - ((100_000 - minE) / rng) * (H - 8) - 4}
        stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4,4"
      />
    </svg>
  );
}

export default function EquityCurve({ seed = 1 }: { seed?: number }) {
  const trades = useMemo(() => genTrades(seed), [seed]);

  const finalEquity = trades[trades.length - 1]?.equity ?? 100_000;
  const totalPnl    = finalEquity - 100_000;
  const totalPnlPct = (totalPnl / 100_000) * 100;
  const wins        = trades.filter(t => t.win).length;
  const winRate     = (wins / trades.length) * 100;
  const isProfit    = totalPnl >= 0;

  // Compute max drawdown
  let peak = 100_000, maxDD = 0;
  for (const t of trades) {
    if (t.equity > peak) peak = t.equity;
    const dd = (peak - t.equity) / peak * 100;
    if (dd > maxDD) maxDD = dd;
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <span className="widget-label">Equity Curve</span>
        <span className={`font-mono text-xs font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
          {isProfit ? "+" : ""}{totalPnlPct.toFixed(2)}%
        </span>
      </div>

      <Sparkline trades={trades} />

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Balance",  value: `$${Math.round(finalEquity / 1000)}K`, color: isProfit ? "text-emerald-400" : "text-rose-400" },
          { label: "Win Rate", value: `${winRate.toFixed(0)}%`,             color: winRate > 55 ? "text-emerald-400" : "text-amber-400" },
          { label: "Trades",   value: trades.length.toString(),             color: "text-foreground" },
          { label: "Max DD",   value: `${maxDD.toFixed(1)}%`,              color: maxDD > 5 ? "text-rose-400" : "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="widget-label">{s.label}</div>
            <div className={`font-mono text-xs font-bold mt-0.5 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent trades */}
      <div className="flex-1 overflow-hidden">
        <div className="widget-label mb-1.5">Recent Trades</div>
        <div className="space-y-1">
          {trades.slice(-6).reverse().map((t, i) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground font-mono">Day {t.day}</span>
              <div className="flex items-center gap-1">
                <span className={`font-bold px-1 py-0 rounded text-[9px] ${t.win ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {t.win ? "WIN" : "LOSS"}
                </span>
                <span className={`font-mono font-bold ${t.win ? "text-emerald-400" : "text-rose-400"}`}>
                  {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

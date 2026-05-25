import { type SentimentData } from "@/hooks/useLiveSimulation";

const PAIRS = [
  { label: "BTC",    bull: 68, bear: 32 },
  { label: "ETH",    bull: 61, bear: 39 },
  { label: "GOLD",   bull: 74, bear: 26 },
  { label: "EUR/USD",bull: 48, bear: 52 },
];

function MiniBar({ bull, bear }: { bull: number; bear: number }) {
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden">
      <div className="bg-emerald-500 transition-all duration-1000" style={{ width: `${bull}%` }} />
      <div className="bg-rose-500 transition-all duration-1000" style={{ width: `${bear}%` }} />
    </div>
  );
}

const COLORS: Record<string, string> = {
  "EXTREME FEAR": "text-rose-400",
  "FEAR":         "text-rose-300",
  "NEUTRAL":      "text-amber-400",
  "GREED":        "text-emerald-400",
  "EXTREME GREED":"text-emerald-300",
};

export default function SentimentGauge({ sentiment }: { sentiment: SentimentData }) {
  const norm  = (sentiment.score + 100) / 200; // 0–1
  const angle = norm * 180 - 90;               // -90 to +90
  const color = COLORS[sentiment.label] ?? "text-amber-400";

  // Gauge needle endpoint
  const rad = (angle * Math.PI) / 180;
  const cx = 50, cy = 45, r = 32;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <span className="widget-label">Market Sentiment</span>
        <span className={`text-[10px] font-bold ${color}`}>{sentiment.label}</span>
      </div>

      {/* Gauge */}
      <svg viewBox="0 0 100 55" className="w-full" style={{ maxHeight: 55 }}>
        {/* Gradient arc segments */}
        {[
          { start: -90, end: -54, color: "#ef4444" },
          { start: -54, end: -18, color: "#f97316" },
          { start: -18, end:  18, color: "#f59e0b" },
          { start:  18, end:  54, color: "#84cc16" },
          { start:  54, end:  90, color: "#10b981" },
        ].map((seg, i) => {
          const s = ((seg.start + 90) * Math.PI) / 180;
          const e = ((seg.end   + 90) * Math.PI) / 180;
          const x1 = cx + r * Math.cos(s - Math.PI / 2);
          const y1 = cy + r * Math.sin(s - Math.PI / 2);
          const x2 = cx + r * Math.cos(e - Math.PI / 2);
          const y2 = cy + r * Math.sin(e - Math.PI / 2);
          const large = (seg.end - seg.start) > 180 ? 1 : 0;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
              fill="none"
              stroke={seg.color}
              strokeWidth="6"
              strokeLinecap="butt"
              opacity="0.3"
            />
          );
        })}
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={nx} y2={ny}
          stroke="white" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "all 0.8s ease-out" }}
        />
        <circle cx={cx} cy={cy} r="3" fill="white" opacity="0.9" />
        <text x={cx} y={cy + 12} fontSize="10" fill="white" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
          {sentiment.score}
        </text>
      </svg>

      {/* Global sentiment bars */}
      <div className="space-y-2 mt-auto">
        {[{ label: "Bullish", pct: sentiment.bullishPct, color: "bg-emerald-500" },
          { label: "Bearish", pct: sentiment.bearishPct, color: "bg-rose-500" },
          { label: "Neutral", pct: sentiment.neutralPct, color: "bg-amber-500" }
        ].map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="widget-label w-12">{b.label}</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${b.color} rounded-full transition-all duration-1000`} style={{ width: `${b.pct}%` }} />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground w-7 text-right">{b.pct}%</span>
          </div>
        ))}
      </div>

      {/* Per-pair mini bars */}
      <div className="pt-2 border-t border-border/60 space-y-1.5">
        {PAIRS.map(p => (
          <div key={p.label} className="flex items-center gap-2">
            <span className="widget-label w-12">{p.label}</span>
            <div className="flex-1">
              <MiniBar
                bull={Math.round(p.bull * (0.8 + (sentiment.score / 100) * 0.2))}
                bear={100 - Math.round(p.bull * (0.8 + (sentiment.score / 100) * 0.2))}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

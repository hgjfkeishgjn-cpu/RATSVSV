import { type MarketStructure as MS } from "@/hooks/useLiveSimulation";

const SMC_TAGS = ["BOS", "CHoCH", "MSB", "LQZ", "OB", "FVG", "Sweep", "Displacement"];

function BiasArc({ bias }: { bias: number }) {
  const norm    = (bias + 100) / 200; // 0–1
  const degrees = norm * 180;          // 0–180
  const rad     = ((degrees - 90) * Math.PI) / 180;
  const cx = 50, cy = 50, r = 36;
  const x  = cx + r * Math.cos(rad);
  const y  = cy + r * Math.sin(rad);

  const color = bias > 20 ? "#10b981" : bias < -20 ? "#ef4444" : "#f59e0b";

  return (
    <svg viewBox="0 0 100 60" className="w-full" style={{ maxHeight: 60 }}>
      {/* Track */}
      <path d={`M 14 50 A 36 36 0 0 1 86 50`} fill="none" stroke="hsl(216 34% 14%)" strokeWidth="6" strokeLinecap="round" />
      {/* Fill */}
      <path
        d={`M ${cx + r * Math.cos(-Math.PI / 2)} ${cy + r * Math.sin(-Math.PI / 2)} A ${r} ${r} 0 ${norm > 0.5 ? 1 : 0} 1 ${x} ${y}`}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <circle cx={cx} cy={cy} r="3" fill={color} />
      {/* Labels */}
      <text x="8"  y="58" fontSize="7" fill="#6b7280" fontFamily="monospace">BEAR</text>
      <text x="74" y="58" fontSize="7" fill="#6b7280" fontFamily="monospace">BULL</text>
    </svg>
  );
}

export default function MarketStructure({ ms }: { ms: MS }) {
  const trendColor = ms.trend === "BULLISH" ? "text-emerald-400" : ms.trend === "BEARISH" ? "text-rose-400" : "text-amber-400";
  const eventColor = ms.lastEvent === "BOS" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : ms.lastEvent === "CHoCH" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : ms.lastEvent === "Sweep" ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
    : "bg-blue-500/15 text-blue-400 border-blue-500/30";

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <span className="widget-label">Market Structure</span>
        <span className={`text-xs font-bold ${trendColor}`}>{ms.trend}</span>
      </div>

      <BiasArc bias={ms.bias} />

      <div className="text-center -mt-1">
        <span className={`font-mono text-lg font-bold ${trendColor}`}>
          {ms.bias > 0 ? "+" : ""}{ms.bias}
        </span>
        <span className="text-muted-foreground text-[10px] ml-1">bias</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mt-1">
        {[
          { label: "Last Event", value: ms.lastEvent, cls: eventColor },
          { label: "Structure", value: ms.higherHigh ? "HH / HL" : "LL / LH", cls: ms.higherHigh ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20" },
        ].map(item => (
          <div key={item.label} className="text-center">
            <div className="widget-label mb-1">{item.label}</div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.cls}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-border/60">
        {ms.sweepDetected && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
            Liquidity Sweep
          </span>
        )}
        {ms.displacement && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
            Displacement
          </span>
        )}
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-bold">
          {SMC_TAGS[Math.floor(ms.bias / 15 + 4) % SMC_TAGS.length]}
        </span>
      </div>
    </div>
  );
}

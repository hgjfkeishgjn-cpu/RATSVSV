import { useSessionKillzones } from "@/hooks/useLiveSimulation";

function mins(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}

export default function SessionKillzones() {
  const sessions = useSessionKillzones();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 pb-2 border-b border-border/60">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
        </span>
        <span className="widget-label">Session Killzones</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {new Date().toUTCString().slice(17, 22)} UTC
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-around pt-2 gap-2">
        {sessions.map(s => (
          <div
            key={s.name}
            className={`flex items-center justify-between rounded-md px-2.5 py-2 transition-all duration-700 ${
              s.active
                ? "bg-gradient-to-r from-card to-transparent border border-border/60"
                : "border border-transparent opacity-60"
            }`}
          >
            <div className="flex items-center gap-2">
              {s.active && (
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.glow} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${s.glow}`} />
                </span>
              )}
              {!s.active && <span className="h-2 w-2 rounded-full bg-muted" />}
              <span className={`text-xs font-bold ${s.active ? s.color : "text-muted-foreground"}`}>
                {s.name}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {String(s.start).padStart(2,"0")}:00–{String(s.end).padStart(2,"0")}:00
              </span>
            </div>
            <div className="text-right">
              {s.active ? (
                <span className={`text-[10px] font-mono font-semibold ${s.color}`}>
                  {mins(s.minutesLeft ?? 0)} left
                </span>
              ) : (
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  in {mins(s.minutesUntil ?? 0)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Overlap indicator */}
      <div className="mt-2 pt-2 border-t border-border/60">
        <div className="text-[10px] font-mono text-muted-foreground">
          <span className="text-amber-400 font-semibold">London/NY Overlap</span> · 13:00–15:00 UTC · High liquidity
        </div>
      </div>
    </div>
  );
}

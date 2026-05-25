import { useMemo } from "react";
import { format, addHours, startOfDay } from "date-fns";
import { AlertTriangle } from "lucide-react";

interface CalEvent {
  time: Date;
  currency: string;
  title: string;
  impact: "high" | "medium" | "low";
  forecast: string;
  previous: string;
}

const HIGH_EVENTS = [
  { currency: "USD", title: "Non-Farm Payrolls",      forecast: "185K",   previous: "177K" },
  { currency: "USD", title: "FOMC Meeting Minutes",   forecast: "—",      previous: "—" },
  { currency: "EUR", title: "ECB Rate Decision",      forecast: "3.40%",  previous: "3.65%" },
  { currency: "GBP", title: "CPI y/y",               forecast: "2.3%",   previous: "2.6%" },
  { currency: "USD", title: "Core CPI m/m",           forecast: "0.2%",   previous: "0.3%" },
  { currency: "JPY", title: "BoJ Interest Rate",      forecast: "0.50%",  previous: "0.25%" },
];

const MED_EVENTS = [
  { currency: "USD", title: "Unemployment Claims",    forecast: "221K",   previous: "227K" },
  { currency: "EUR", title: "German ZEW Sentiment",  forecast: "11.2",   previous: "9.8" },
  { currency: "GBP", title: "GDP m/m",               forecast: "0.1%",   previous: "-0.1%" },
  { currency: "AUD", title: "RBA Rate Statement",    forecast: "—",      previous: "—" },
];

const IMPACT_COLOR = {
  high:   "bg-rose-500",
  medium: "bg-amber-500",
  low:    "bg-muted-foreground",
};

const CURRENCY_COLOR: Record<string, string> = {
  USD: "text-emerald-400", EUR: "text-blue-400",
  GBP: "text-amber-400",  JPY: "text-purple-400",
  AUD: "text-cyan-400",   CHF: "text-pink-400",
};

export default function EconomicCalendar() {
  const events = useMemo<CalEvent[]>(() => {
    const base = startOfDay(new Date());
    const items: CalEvent[] = [];

    HIGH_EVENTS.forEach((e, i) => {
      items.push({ ...e, impact: "high", time: addHours(base, 8 + i * 2.5) });
    });
    MED_EVENTS.forEach((e, i) => {
      items.push({ ...e, impact: "medium", time: addHours(base, 9 + i * 3) });
    });

    return items.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, []);

  const now = new Date();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          <span className="widget-label">Economic Calendar</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          {format(now, "EEE, MMM d")}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5">
        {events.map((ev, i) => {
          const isPast   = ev.time < now;
          const isNext   = !isPast && events.slice(0, i).every(e => e.time < now);
          return (
            <div
              key={i}
              className={`flex items-center gap-2 px-1.5 py-1.5 rounded transition-colors ${
                isNext ? "bg-amber-500/8 border border-amber-500/20" :
                isPast ? "opacity-40" : "hover:bg-muted/30"
              }`}
            >
              {/* Impact dot */}
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${IMPACT_COLOR[ev.impact]}`} />

              {/* Currency */}
              <span className={`font-mono text-[10px] font-bold w-8 shrink-0 ${CURRENCY_COLOR[ev.currency] ?? "text-muted-foreground"}`}>
                {ev.currency}
              </span>

              {/* Time */}
              <span className="font-mono text-[10px] text-muted-foreground w-10 shrink-0">
                {format(ev.time, "HH:mm")}
              </span>

              {/* Title */}
              <span className={`text-[10px] flex-1 truncate ${isNext ? "text-amber-300 font-semibold" : "text-foreground/80"}`}>
                {ev.title}
              </span>

              {/* Forecast */}
              <span className="font-mono text-[10px] text-muted-foreground hidden sm:block">
                {ev.forecast}
              </span>

              {isNext && (
                <span className="text-[9px] font-bold text-amber-400 shrink-0">NEXT</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center gap-4 mt-2">
        {(["high","medium","low"] as const).map(imp => (
          <div key={imp} className="flex items-center gap-1">
            <div className={`h-1.5 w-1.5 rounded-full ${IMPACT_COLOR[imp]}`} />
            <span className="widget-label">{imp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

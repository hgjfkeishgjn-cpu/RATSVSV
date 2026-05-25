import { useGetSignalSummary, useGetRecentActivity, useGetTopPerformers, useGetMarketPrices } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Target, TrendingUp, TrendingDown, BarChart2, ArrowRight, Zap, Brain, ShieldAlert } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveSimulation } from "@/hooks/useLiveSimulation";
import OrderBook from "@/components/widgets/OrderBook";
import SessionKillzones from "@/components/widgets/SessionKillzones";
import MarketStructure from "@/components/widgets/MarketStructure";
import SentimentGauge from "@/components/widgets/SentimentGauge";
import ActiveTrades from "@/components/widgets/ActiveTrades";
import EconomicCalendar from "@/components/widgets/EconomicCalendar";
import EquityCurve from "@/components/widgets/EquityCurve";
import { useEffect, useRef, useState } from "react";

function PriceFlash({ value, decimals = 2, prefix = "" }: { value: number; decimals?: number; prefix?: string }) {
  const prev = useRef(value);
  const [cls, setCls] = useState("");

  useEffect(() => {
    if (prev.current !== value && prev.current !== 0) {
      setCls(value > prev.current ? "flash-up" : "flash-down");
      const t = setTimeout(() => setCls(""), 650);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  return (
    <span className={`font-mono font-bold transition-colors duration-300 rounded px-0.5 ${cls}`}>
      {prefix}{value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}

function ActionBadge({ action, className = "" }: { action: string; className?: string }) {
  if (action === "BUY")  return <Badge className={`bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 ${className}`}><TrendingUp className="h-2.5 w-2.5" />BUY</Badge>;
  if (action === "SELL") return <Badge className={`bg-rose-500/10 text-rose-500 border-rose-500/20 gap-1 ${className}`}><TrendingDown className="h-2.5 w-2.5" />SELL</Badge>;
  return <Badge className={`bg-amber-500/10 text-amber-500 border-amber-500/20 ${className}`}>HOLD</Badge>;
}

function SMCReasoning({ text }: { text: string }) {
  if (!text) return null;
  // Extract key SMC terms from reasoning
  const smcTerms = ["liquidity sweep", "displacement", "BOS", "CHoCH", "order block", "fair value gap", "imbalance", "bullish", "bearish", "breakout", "rejection", "confluence"];
  const found = smcTerms.filter(t => text.toLowerCase().includes(t.toLowerCase())).slice(0, 3);

  return (
    <div className="mt-2 p-2 rounded-md bg-muted/30 border border-border/60">
      <div className="flex items-start gap-1.5">
        <Brain className="h-3 w-3 text-purple-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{text}</p>
      </div>
      {found.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {found.map(f => (
            <span key={f} className="text-[9px] px-1.5 py-0 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold capitalize">
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, valueClass = "", glow = "" }: {
  title: string; value: string | null; icon: React.ComponentType<{ className?: string }>;
  trend?: string; valueClass?: string; glow?: string;
}) {
  return (
    <Card className={`border-border glass transition-all duration-300 ${glow}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground/60" />
        </div>
        {value === null
          ? <Skeleton className="h-8 w-24" />
          : <div className={`text-2xl font-bold font-mono ${valueClass}`}>{value}</div>
        }
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: summary,        isLoading: loadingSummary }     = useGetSignalSummary({ query: { refetchInterval: 30_000 } });
  const { data: recentActivity, isLoading: loadingActivity }    = useGetRecentActivity({ limit: 8 }, { query: { refetchInterval: 30_000 } });
  const { data: topPerformers,  isLoading: loadingPerformers }  = useGetTopPerformers();
  const { data: prices }                                         = useGetMarketPrices({ symbols: "BTC,ETH,GOLD,NASDAQ" }, { query: { refetchInterval: 5000 } });

  const btcPrice = prices?.find(p => p.symbol === "BTC")?.price ?? 77_500;
  const { orderBook, activeTrades, sentiment, structure, currentPrice } = useLiveSimulation(btcPrice);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Terminal Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Institutional-grade trading intelligence — live signals &amp; analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="font-mono text-xs text-muted-foreground">BTC/USD</div>
            <PriceFlash value={currentPrice} prefix="$" />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            Live
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Signals"
          value={loadingSummary ? null : summary?.totalSignals.toString() ?? "0"}
          icon={Activity}
          trend="+12% from last week"
        />
        <StatCard
          title="Win Rate"
          value={loadingSummary ? null : `${summary?.winRate.toFixed(1)}%`}
          icon={Target}
          trend="Based on closed positions"
          valueClass={summary && summary.winRate > 60 ? "text-emerald-400" : "text-foreground"}
          glow={summary && summary.winRate > 60 ? "glow-emerald" : ""}
        />
        <StatCard
          title="Avg Confidence"
          value={loadingSummary ? null : `${summary?.avgConfidence.toFixed(0)}/100`}
          icon={BarChart2}
        />
        <Card className="border-border glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Signal Mix</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground/60" />
            </div>
            {loadingSummary ? <Skeleton className="h-8 w-full" /> : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-emerald-400 font-mono font-bold">{summary?.buyCount ?? 0} <span className="text-[10px] text-muted-foreground">BUY</span></span>
                  <span className="text-rose-400 font-mono font-bold">{summary?.sellCount ?? 0} <span className="text-[10px] text-muted-foreground">SELL</span></span>
                  <span className="text-amber-400 font-mono font-bold">{summary?.holdCount ?? 0} <span className="text-[10px] text-muted-foreground">HOLD</span></span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${((summary?.buyCount ?? 0) / Math.max(1, summary?.totalSignals ?? 1)) * 100}%` }} />
                  <div className="bg-rose-500 h-full transition-all"   style={{ width: `${((summary?.sellCount ?? 0) / Math.max(1, summary?.totalSignals ?? 1)) * 100}%` }} />
                  <div className="bg-amber-500 h-full transition-all"  style={{ width: `${((summary?.holdCount ?? 0) / Math.max(1, summary?.totalSignals ?? 1)) * 100}%` }} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live prices strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {prices?.map(p => (
          <Card key={p.symbol} className="border-border glass">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <div className="widget-label">{p.symbol}/USD</div>
                <PriceFlash value={p.price} decimals={p.symbol === "GOLD" ? 2 : 2} />
              </div>
              <span className={`text-xs font-mono font-bold ${p.changePercent24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {p.changePercent24h >= 0 ? "+" : ""}{p.changePercent24h.toFixed(2)}%
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid: signals + order book */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Recent Signal Activity */}
        <Card className="lg:col-span-4 border-border glass">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3 pt-4 px-4">
            <div>
              <CardTitle className="text-base">Recent Signal Activity</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">AI-generated with SMC analysis &amp; ATR-based levels</p>
            </div>
            <Link href="/signals" className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loadingActivity ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : recentActivity?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No signals yet — go to Signals to generate your first</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentActivity?.map((signal) => (
                  <div key={signal.id} className="p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <ActionBadge action={signal.action} className="mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{signal.symbol}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">5m · {formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                            <span className="text-muted-foreground">E: <span className="text-foreground">{signal.entryPrice.toFixed(2)}</span></span>
                            <span className="text-emerald-400 flex items-center gap-0.5"><Target className="h-2.5 w-2.5" />{signal.targetPrice.toFixed(2)}</span>
                            <span className="text-rose-400 flex items-center gap-0.5"><ShieldAlert className="h-2.5 w-2.5" />{signal.stopLoss.toFixed(2)}</span>
                          </div>
                          {signal.reasoning && <SMCReasoning text={signal.reasoning} />}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm font-bold">{signal.confidence}%</div>
                        <div className={`text-[10px] font-mono ${(signal.riskRewardRatio ?? 0) >= 2 ? "text-emerald-400" : "text-amber-400"}`}>
                          {(signal.riskRewardRatio ?? 0).toFixed(2)}x R:R
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Order Book */}
          <Card className="border-border glass" style={{ height: 280 }}>
            <CardContent className="p-3 h-full">
              <OrderBook ob={orderBook} symbol="BTC/USD" />
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card className="border-border glass">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loadingPerformers ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                <div className="space-y-3">
                  {topPerformers?.slice(0, 3).map((signal, i) => (
                    <div key={signal.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-3">{i + 1}</span>
                        <span className="font-bold text-sm">{signal.symbol}</span>
                        <ActionBadge action={signal.action} className="text-[9px] px-1.5 py-0 h-4" />
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm text-emerald-400 font-bold">+{signal.riskRewardRatio} R:R</span>
                        <div className="text-[10px] text-muted-foreground">{signal.confidence}% conf</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom institutional widget grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border glass" style={{ minHeight: 240 }}>
          <CardContent className="p-4 h-full">
            <SessionKillzones />
          </CardContent>
        </Card>

        <Card className="border-border glass" style={{ minHeight: 240 }}>
          <CardContent className="p-4 h-full">
            <MarketStructure ms={structure} />
          </CardContent>
        </Card>

        <Card className="border-border glass" style={{ minHeight: 240 }}>
          <CardContent className="p-4 h-full">
            <SentimentGauge sentiment={sentiment} />
          </CardContent>
        </Card>

        <Card className="border-border glass" style={{ minHeight: 240 }}>
          <CardContent className="p-4 h-full">
            <ActiveTrades trades={activeTrades} />
          </CardContent>
        </Card>
      </div>

      {/* Equity + Calendar row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border glass">
          <CardContent className="p-4" style={{ minHeight: 220 }}>
            <EquityCurve seed={summary?.totalSignals ?? 42} />
          </CardContent>
        </Card>

        <Card className="border-border glass">
          <CardContent className="p-4" style={{ minHeight: 220 }}>
            <EconomicCalendar />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

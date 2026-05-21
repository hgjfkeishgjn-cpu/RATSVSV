import { useGetSignalSummary, useGetRecentActivity, useGetTopPerformers } from "@workspace/api-client-react";
import { useGetTrendingAssets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Target, TrendingUp, BarChart2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetSignalSummary({ 
    query: { refetchInterval: 60000 } 
  });
  
  const { data: recentActivity, isLoading: loadingActivity } = useGetRecentActivity(
    { limit: 5 }, 
    { query: { refetchInterval: 60000 } }
  );
  
  const { data: topPerformers, isLoading: loadingPerformers } = useGetTopPerformers();
  const { data: trendingAssets, isLoading: loadingTrending } = useGetTrendingAssets();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Terminal Overview</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          Live Feed Active
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Signals" 
          value={loadingSummary ? null : summary?.totalSignals.toString()} 
          icon={Activity} 
          trend="+12% from last week"
        />
        <StatCard 
          title="Win Rate" 
          value={loadingSummary ? null : `${summary?.winRate.toFixed(1)}%`} 
          icon={Target} 
          trend="Based on closed positions"
          valueClass={summary && summary.winRate > 60 ? "text-emerald-500" : "text-foreground"}
        />
        <StatCard 
          title="Avg Confidence" 
          value={loadingSummary ? null : `${summary?.avgConfidence.toFixed(0)}/100`} 
          icon={BarChart2} 
        />
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Signal Breakdown</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-full mt-1" />
            ) : (
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold font-mono">{summary?.buyCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-rose-500" />
                  <span className="text-sm font-bold font-mono">{summary?.sellCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-sm font-bold font-mono">{summary?.holdCount}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="lg:col-span-4 border-border">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <CardTitle className="text-lg">Recent Signal Activity</CardTitle>
            <Link href="/signals" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loadingActivity ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentActivity?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No recent activity</div>
            ) : (
              <div className="divide-y divide-border">
                {recentActivity?.map((signal) => (
                  <div key={signal.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <ActionBadge action={signal.action} />
                      <div>
                        <div className="font-bold text-lg">{signal.symbol}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(signal.createdAt), "MMM d, HH:mm")} • {signal.timeframe}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">Entry: ${signal.entryPrice}</div>
                      <div className="text-xs text-muted-foreground">Conf: {signal.confidence}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          {/* Top Performers */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPerformers ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {topPerformers?.slice(0, 3).map(signal => (
                    <div key={signal.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{signal.symbol}</span>
                        <ActionBadge action={signal.action} className="text-[10px] px-1.5 py-0" />
                      </div>
                      <span className="font-mono text-emerald-500">+{signal.riskRewardRatio} R:R</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trending Assets */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Trending Momentum</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTrending ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {trendingAssets?.slice(0, 4).map(asset => (
                    <div key={asset.symbol} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{asset.symbol}</span>
                        <Badge variant="outline" className="text-[10px]">{asset.assetClass}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${Math.min(100, Math.max(0, asset.momentum))}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs">{asset.momentum.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, valueClass = "" }: any) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-20 mt-1" />
        ) : (
          <div className={`text-2xl font-bold font-mono ${valueClass}`}>{value}</div>
        )}
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}

function ActionBadge({ action, className = "" }: { action: string, className?: string }) {
  if (action === "BUY") {
    return <Badge className={`bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 ${className}`}>BUY</Badge>;
  }
  if (action === "SELL") {
    return <Badge className={`bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20 ${className}`}>SELL</Badge>;
  }
  return <Badge className={`bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 ${className}`}>HOLD</Badge>;
}
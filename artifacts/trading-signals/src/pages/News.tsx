import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, ExternalLink, RefreshCw, TrendingUp, Globe, DollarSign, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  category: "crypto" | "forex" | "stocks" | "macro";
}

const CATEGORY_META = {
  crypto: { label: "Crypto", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: TrendingUp },
  forex: { label: "Forex", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Globe },
  stocks: { label: "Stocks", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: BarChart2 },
  macro: { label: "Macro", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: DollarSign },
};

export default function News() {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { data: news, isLoading, refetch, isFetching } = useQuery<NewsItem[]>({
    queryKey: ["news"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/news`);
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  const cryptoNews = news?.filter(n => n.category === "crypto") ?? [];
  const forexNews  = news?.filter(n => n.category === "forex" || n.category === "macro") ?? [];
  const stockNews  = news?.filter(n => n.category === "stocks") ?? [];
  const allNews    = news ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market News</h1>
          <p className="text-muted-foreground mt-1">Real-time feed — crypto, forex, macro &amp; equity news</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Category counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["crypto", "forex", "stocks", "macro"] as const).map(cat => {
          const meta = CATEGORY_META[cat];
          const count = news?.filter(n => n.category === cat).length ?? 0;
          const Icon = meta.icon;
          return (
            <Card key={cat} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-md ${meta.color.split(" ")[0]}`}>
                  <Icon className={`h-4 w-4 ${meta.color.split(" ")[1]}`} />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{meta.label}</div>
                  <div className="font-mono text-lg font-bold">{isLoading ? "—" : count}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Latest news — main column */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Latest
          </h2>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : allNews.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No news available
              </CardContent>
            </Card>
          ) : (
            allNews.slice(0, 15).map(item => {
              const meta = CATEGORY_META[item.category];
              return (
                <Card key={item.id} className="border-border hover:border-border/80 hover:bg-card/80 transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${meta.color}`}>
                            {meta.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-medium">{item.source}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                            {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
                          </span>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-sm leading-snug hover:text-primary transition-colors group-hover:underline line-clamp-2"
                        >
                          {item.title}
                        </a>
                        {item.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {item.summary}
                          </p>
                        )}
                      </div>
                      {item.url !== "#" && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 mt-1">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Side panels */}
        <div className="space-y-6">
          {/* Crypto */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" />Crypto
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                <div className="divide-y divide-border">
                  {cryptoNews.slice(0, 5).map(item => (
                    <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                      className="block p-3 hover:bg-muted/40 transition-colors text-xs font-medium leading-snug line-clamp-2">
                      {item.title}
                    </a>
                  ))}
                  {cryptoNews.length === 0 && <p className="p-4 text-xs text-muted-foreground">No crypto news available</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forex & Macro */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" />Forex &amp; Macro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                <div className="divide-y divide-border">
                  {forexNews.slice(0, 5).map(item => (
                    <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                      className="block p-3 hover:bg-muted/40 transition-colors text-xs font-medium leading-snug line-clamp-2">
                      {item.title}
                    </a>
                  ))}
                  {forexNews.length === 0 && <p className="p-4 text-xs text-muted-foreground">No forex news available</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

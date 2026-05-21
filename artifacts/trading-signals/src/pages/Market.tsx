import { useGetMarketPrices, useGetTrendingAssets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Market() {
  const { data: prices, isLoading: loadingPrices } = useGetMarketPrices(
    { symbols: "BTC,ETH,SOL,BNB,AAPL,NVDA,GOLD,OIL" },
    { query: { refetchInterval: 30000 } }
  );

  const { data: trending, isLoading: loadingTrending } = useGetTrendingAssets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Market Overview</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live data feed active
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingPrices ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4">
                <Skeleton className="h-6 w-16 mb-2" />
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          prices?.map((price) => {
            const isPositive = price.changePercent24h >= 0;
            return (
              <Card key={price.symbol} className="border-border bg-card/50 hover:bg-card transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-lg">{price.symbol}</div>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                    )}
                  </div>
                  <div className="text-2xl font-mono tracking-tight">
                    ${price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </div>
                  <div className={`text-sm font-medium mt-1 font-mono ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isPositive ? '+' : ''}{price.changePercent24h.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Trending Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTrending ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : trending?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No trending data available</div>
            ) : (
              <div className="divide-y divide-border">
                {trending?.map((asset) => (
                  <div key={asset.symbol} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {asset.symbol.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-lg flex items-center gap-2">
                          {asset.symbol}
                          <Badge variant="outline" className="text-[10px] uppercase border-border">{asset.assetClass}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {asset.signalCount} recent signals
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium mb-1">Momentum Score</div>
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${Math.min(100, Math.max(0, asset.momentum))}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs w-8 text-right">{asset.momentum.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Global Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-8">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96" cy="96" r="88"
                    className="stroke-muted fill-none" strokeWidth="12"
                  />
                  <circle
                    cx="96" cy="96" r="88"
                    className="stroke-emerald-500 fill-none" 
                    strokeWidth="12"
                    strokeDasharray="552.9"
                    strokeDashoffset={552.9 * 0.35} // 65% bullish
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-emerald-500">65</span>
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bullish</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 w-full">
                <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xl font-bold text-emerald-500">65%</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase">Buy</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="text-xl font-bold text-amber-500">20%</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase">Hold</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <div className="text-xl font-bold text-rose-500">15%</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase">Sell</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
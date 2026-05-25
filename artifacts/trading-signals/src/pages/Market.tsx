import { useGetMarketPrices, useGetTrendingAssets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";

const SYMBOL_META: Record<string, { label: string; prefix: string; decimals: number }> = {
  BTC:    { label: "Bitcoin",       prefix: "$",  decimals: 2 },
  ETH:    { label: "Ethereum",      prefix: "$",  decimals: 2 },
  SOL:    { label: "Solana",        prefix: "$",  decimals: 2 },
  BNB:    { label: "BNB",           prefix: "$",  decimals: 2 },
  GOLD:   { label: "Gold (XAU)",    prefix: "$",  decimals: 2 },
  SILVER: { label: "Silver (XAG)",  prefix: "$",  decimals: 2 },
  OIL:    { label: "Crude Oil",     prefix: "$",  decimals: 2 },
  NASDAQ: { label: "NASDAQ",        prefix: "",   decimals: 2 },
  SP500:  { label: "S&P 500",       prefix: "",   decimals: 2 },
  DOW:    { label: "Dow Jones",     prefix: "",   decimals: 2 },
  EURUSD: { label: "EUR / USD",     prefix: "",   decimals: 4 },
  GBPUSD: { label: "GBP / USD",     prefix: "",   decimals: 4 },
  USDJPY: { label: "USD / JPY",     prefix: "",   decimals: 2 },
  AUDUSD: { label: "AUD / USD",     prefix: "",   decimals: 4 },
  AAPL:   { label: "Apple",         prefix: "$",  decimals: 2 },
  NVDA:   { label: "NVIDIA",        prefix: "$",  decimals: 2 },
  TSLA:   { label: "Tesla",         prefix: "$",  decimals: 2 },
  MSFT:   { label: "Microsoft",     prefix: "$",  decimals: 2 },
};

function formatPrice(symbol: string, price: number) {
  const meta = SYMBOL_META[symbol];
  const decimals = meta?.decimals ?? 2;
  const prefix = meta?.prefix ?? "$";
  return `${prefix}${price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

const MARKET_SYMBOLS = "BTC,GOLD,NASDAQ,EURUSD,GBPUSD,USDJPY,ETH,SOL";

type FlashState = "up" | "down" | null;

function usePriceFlash(price: number | undefined): FlashState {
  const prevRef = useRef<number | undefined>(undefined);
  const [flash, setFlash] = useState<FlashState>(null);

  useEffect(() => {
    if (price === undefined) return;
    if (prevRef.current !== undefined && price !== prevRef.current) {
      const dir = price > prevRef.current ? "up" : "down";
      setFlash(dir);
      const t = setTimeout(() => setFlash(null), 600);
      prevRef.current = price;
      return () => clearTimeout(t);
    }
    prevRef.current = price;
  }, [price]);

  return flash;
}

function PriceCard({ symbol, price, changePercent24h }: {
  symbol: string;
  price: number;
  changePercent24h: number;
}) {
  const flash = usePriceFlash(price);
  const isPositive = changePercent24h >= 0;
  const meta = SYMBOL_META[symbol];

  return (
    <Card
      className={`border-border bg-card/50 hover:bg-card transition-colors overflow-hidden`}
    >
      <CardContent className="p-4 relative">
        {/* Flash overlay */}
        {flash && (
          <span
            className={`absolute inset-0 pointer-events-none rounded-lg transition-opacity duration-300 ${
              flash === "up" ? "bg-emerald-500/15" : "bg-rose-500/15"
            }`}
          />
        )}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              {meta?.label ?? symbol}
            </div>
            <div className="text-sm font-bold mt-0.5">{symbol}</div>
          </div>
          {isPositive
            ? <TrendingUp className="h-4 w-4 text-emerald-500 mt-1" />
            : <TrendingDown className="h-4 w-4 text-rose-500 mt-1" />}
        </div>
        <div
          className={`text-2xl font-mono tracking-tight mt-2 transition-colors duration-150 ${
            flash === "up"
              ? "text-emerald-400"
              : flash === "down"
              ? "text-rose-400"
              : ""
          }`}
        >
          {formatPrice(symbol, price)}
        </div>
        <div className={`text-sm font-medium mt-1 font-mono ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
          {isPositive ? "+" : ""}{changePercent24h.toFixed(2)}%
          <span className="text-muted-foreground ml-1 text-xs">24h</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Market() {
  const { data: prices, isLoading: loadingPrices } = useGetMarketPrices(
    { symbols: MARKET_SYMBOLS },
    { query: { refetchInterval: 5000 } }
  );

  const { data: trending, isLoading: loadingTrending } = useGetTrendingAssets(
    { query: { refetchInterval: 60000 } }
  );

  const buyCount = trending?.filter(a => a.latestAction === "BUY").length ?? 0;
  const sellCount = trending?.filter(a => a.latestAction === "SELL").length ?? 0;
  const holdCount = trending?.filter(a => a.latestAction === "HOLD").length ?? 0;
  const total = (buyCount + sellCount + holdCount) || 1;
  const bullishPct = Math.round((buyCount / total) * 100);
  const bearishPct = Math.round((sellCount / total) * 100);
  const holdPct = 100 - bullishPct - bearishPct;
  const circumference = 552.9;
  const sentimentColor = bullishPct >= 50 ? "text-emerald-500 stroke-emerald-500" : "text-rose-500 stroke-rose-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Market Overview</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live data — ticking every 5s
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingPrices
          ? Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-8 w-28 mb-1 mt-2" />
                  <Skeleton className="h-4 w-16 mt-1" />
                </CardContent>
              </Card>
            ))
          : prices?.map((price) => (
              <PriceCard
                key={price.symbol}
                symbol={price.symbol}
                price={price.price}
                changePercent24h={price.changePercent24h}
              />
            ))}
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
                {trending?.map((asset) => {
                  const meta = SYMBOL_META[asset.symbol];
                  return (
                    <div key={asset.symbol} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                          {asset.symbol.substring(0, 3)}
                        </div>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {meta?.label ?? asset.symbol}
                            <Badge variant="outline" className="text-[10px] uppercase border-border">{asset.assetClass}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {asset.signalCount} recent signals
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-mono font-bold ${asset.momentum >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                          {asset.momentum >= 0 ? "+" : ""}{asset.momentum.toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">momentum</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Signal Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="relative mb-6">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle cx="80" cy="80" r="72" className="stroke-muted fill-none" strokeWidth="10" />
                  <circle
                    cx="80" cy="80" r="72"
                    className={sentimentColor.split(" ")[1] + " fill-none"}
                    strokeWidth="10"
                    strokeDasharray={`${circumference * 0.585}`}
                    strokeDashoffset={`${circumference * 0.585 * (1 - bullishPct / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${sentimentColor.split(" ")[0]}`}>{bullishPct}%</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {bullishPct >= 50 ? "Bullish" : "Bearish"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full">
                <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xl font-bold text-emerald-500">{bullishPct}%</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase">Buy</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="text-xl font-bold text-amber-500">{holdPct}%</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase">Hold</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <div className="text-xl font-bold text-rose-500">{bearishPct}%</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase">Sell</div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Based on {total} active signals across all tracked assets
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

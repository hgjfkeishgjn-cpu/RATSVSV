import { useState } from "react";
import {
  useListSignals,
  useGenerateSignal,
  getListSignalsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search, Filter, Zap, Target, ShieldAlert, TrendingUp, TrendingDown, Minus,
  Brain, ChevronDown, ChevronUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState as useLocalState } from "react";

const generateSchema = z.object({
  symbol:     z.string().min(1, "Symbol is required").toUpperCase(),
  assetClass: z.enum(["crypto", "stocks", "forex", "commodities"]),
});

// ── SMC tag extraction ────────────────────────────────────────────────────────
const SMC_KEYWORDS: Record<string, string> = {
  "liquidity sweep":  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "displacement":     "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "order block":      "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "fair value gap":   "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "imbalance":        "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "bos":              "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "choch":            "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "breakout":         "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "rejection":        "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "confluence":       "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "momentum":         "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "reversal":         "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

function extractSMCTags(text: string): Array<{ label: string; cls: string }> {
  if (!text) return [];
  const lower = text.toLowerCase();
  return Object.entries(SMC_KEYWORDS)
    .filter(([kw]) => lower.includes(kw))
    .slice(0, 4)
    .map(([kw, cls]) => ({ label: kw.replace(/\b\w/g, c => c.toUpperCase()), cls }));
}

// ── Confidence display ────────────────────────────────────────────────────────
function ConfidenceRing({ value, action }: { value: number; action: string }) {
  const R = 18, C = 2 * Math.PI * R;
  const fill = (value / 100) * C;
  const color = action === "BUY" ? "#10b981" : action === "SELL" ? "#ef4444" : "#f59e0b";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="24" cy="24" r={R} fill="none" stroke="hsl(216 34% 14%)" strokeWidth="3" />
        <circle cx="24" cy="24" r={R} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${fill} ${C}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease-out" }}
        />
      </svg>
      <span className="absolute font-mono text-[10px] font-bold" style={{ color }}>{value}%</span>
    </div>
  );
}

// ── Action badge ──────────────────────────────────────────────────────────────
function ActionBadge({ action, className = "" }: { action: string; className?: string }) {
  if (action === "BUY")  return <Badge className={`bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1 ${className}`}><TrendingUp className="h-3 w-3" />BUY</Badge>;
  if (action === "SELL") return <Badge className={`bg-rose-500/10 text-rose-400 border-rose-500/20 gap-1 ${className}`}><TrendingDown className="h-3 w-3" />SELL</Badge>;
  return <Badge className={`bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1 ${className}`}><Minus className="h-3 w-3" />HOLD</Badge>;
}

function formatPrice(n: number): string {
  if (n === 0) return "—";
  if (n < 0.01) return n.toFixed(6);
  if (n < 1)    return n.toFixed(4);
  if (n < 10)   return n.toFixed(4);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Signal card ───────────────────────────────────────────────────────────────
function SignalCard({ signal }: { signal: {
  id: number; symbol: string; action: string; confidence: number;
  entryPrice: number; targetPrice: number; stopLoss: number;
  riskRewardRatio: number | null; reasoning: string | null; createdAt: string;
  timeframe: string;
}}) {
  const [expanded, setExpanded] = useLocalState(false);
  const tags = extractSMCTags(signal.reasoning ?? "");
  const rr   = signal.riskRewardRatio ?? 1;
  const rrColor = rr >= 2.5 ? "text-emerald-400" : rr >= 1.5 ? "text-amber-400" : "text-muted-foreground";

  const trendBias = signal.action === "BUY"
    ? "Bullish" : signal.action === "SELL" ? "Bearish" : "Neutral";
  const biasColor = signal.action === "BUY"
    ? "text-emerald-400" : signal.action === "SELL" ? "text-rose-400" : "text-amber-400";

  return (
    <Card className={`border-border glass hover:border-border/80 transition-all duration-300 ${
      signal.action === "BUY"  ? "gradient-border-emerald" :
      signal.action === "SELL" ? "gradient-border-rose" : ""
    }`}>
      <CardContent className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ConfidenceRing value={signal.confidence} action={signal.action} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base">{signal.symbol}</span>
                <ActionBadge action={signal.action} />
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">5m</span>
                <span className={`text-[10px] font-bold ${biasColor}`}>{trendBias} Bias</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })} · {format(new Date(signal.createdAt), "MMM d, HH:mm")}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className={`font-mono text-lg font-bold ${rrColor}`}>{rr.toFixed(2)}x</div>
            <div className="text-[10px] text-muted-foreground">R:R Ratio</div>
          </div>
        </div>

        {/* Price levels */}
        <div className="grid grid-cols-3 gap-2 mt-3 p-2 rounded-lg bg-muted/20 border border-border/40">
          <div className="text-center">
            <div className="widget-label mb-1">Entry</div>
            <div className="font-mono text-xs font-bold">{formatPrice(signal.entryPrice)}</div>
          </div>
          <div className="text-center">
            <div className="widget-label mb-1 flex items-center justify-center gap-0.5">
              <Target className="h-2.5 w-2.5 text-emerald-500" />TP
            </div>
            <div className="font-mono text-xs font-bold text-emerald-400">{formatPrice(signal.targetPrice)}</div>
          </div>
          <div className="text-center">
            <div className="widget-label mb-1 flex items-center justify-center gap-0.5">
              <ShieldAlert className="h-2.5 w-2.5 text-rose-500" />SL
            </div>
            <div className="font-mono text-xs font-bold text-rose-400">{formatPrice(signal.stopLoss)}</div>
          </div>
        </div>

        {/* SMC tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map(tag => (
              <span key={tag.label} className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${tag.cls}`}>
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {/* AI Reasoning expand */}
        {signal.reasoning && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              <Brain className="h-3 w-3 text-purple-400" />
              AI Reasoning
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expanded && (
              <div className="mt-2 p-3 rounded-md bg-purple-500/5 border border-purple-500/15">
                <p className="text-xs text-muted-foreground leading-relaxed">{signal.reasoning}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Signals() {
  const [searchTerm,    setSearchTerm]    = useState("");
  const [filterAction,  setFilterAction]  = useState<string>("ALL");
  const [isGenerateOpen,setIsGenerateOpen]= useState(false);
  const [view,          setView]          = useState<"cards" | "table">("cards");

  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const { data: signals, isLoading } = useListSignals();
  const generateMutation             = useGenerateSignal();

  const form = useForm<z.infer<typeof generateSchema>>({
    resolver: zodResolver(generateSchema),
    defaultValues: { symbol: "", assetClass: "crypto" },
  });

  const onSubmit = (data: z.infer<typeof generateSchema>) => {
    generateMutation.mutate({ data: { ...data, timeframe: "5m" } }, {
      onSuccess: (result) => {
        toast({
          title: `Signal: ${(result as { action: string }).action ?? "Generated"}`,
          description: `${data.symbol} — SMC analysis complete`,
        });
        queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
        setIsGenerateOpen(false);
        form.reset();
      },
      onError: () => {
        toast({
          title: "Generation failed",
          description: "Could not fetch live data or AI analysis failed.",
          variant: "destructive",
        });
      }
    });
  };

  const filtered = signals?.filter(s => {
    const matchSearch = s.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchAction = filterAction === "ALL" || s.action === filterAction;
    return matchSearch && matchAction;
  }) ?? [];

  // Stats from filtered data
  const avgConf = filtered.length > 0 ? filtered.reduce((s, x) => s + x.confidence, 0) / filtered.length : 0;
  const avgRR   = filtered.length > 0 ? filtered.reduce((s, x) => s + (x.riskRewardRatio ?? 1.5), 0) / filtered.length : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Signal Matrix</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            5m entry · 1h trend context · ATR-based TP/SL · SMC analysis
          </p>
        </div>
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button className="glow-emerald border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300">
              <Zap className="mr-2 h-4 w-4" />Generate Signal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px] glass border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />Generate AI Signal
              </DialogTitle>
              <DialogDescription>
                Fetches live OHLCV candles, computes RSI/MACD/EMA/ATR, applies SMC analysis, then generates entry with ATR-based TP/SL.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <FormField control={form.control} name="symbol" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticker Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder="BTC, AAPL, EURUSD, GOLD" {...field} data-testid="input-symbol" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="assetClass" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Class</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assetclass"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="stocks">Stocks</SelectItem>
                        <SelectItem value="forex">Forex</SelectItem>
                        <SelectItem value="commodities">Commodities</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground/80">
                    <Zap className="h-3 w-3 text-primary" />Analysis pipeline
                  </div>
                  <div className="pl-4 space-y-0.5 text-muted-foreground">
                    <div>60× 1h candles + 30× 5m candles from live feeds</div>
                    <div>RSI(14) · MACD · EMA(9/21/50) · ATR · Bollinger Bands</div>
                    <div>Smart Money Concepts: liquidity, displacement, OBs</div>
                    <div>AI reasoning via Claude claude-sonnet-4-6</div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={generateMutation.isPending} data-testid="btn-submit-generate">
                  {generateMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Fetching live data &amp; analyzing...
                    </span>
                  ) : "Run Full Analysis"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats bar */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Filtered",   value: filtered.length.toString(), color: "text-foreground" },
            { label: "Avg Conf",   value: `${avgConf.toFixed(0)}%`,   color: avgConf > 70 ? "text-emerald-400" : "text-amber-400" },
            { label: "Avg R:R",    value: `${avgRR.toFixed(2)}x`,      color: avgRR > 2 ? "text-emerald-400" : "text-amber-400" },
            { label: "Buy/Sell",   value: `${filtered.filter(s=>s.action==="BUY").length}/${filtered.filter(s=>s.action==="SELL").length}`, color: "text-foreground" },
          ].map(s => (
            <Card key={s.label} className="border-border glass">
              <CardContent className="p-3">
                <div className="widget-label">{s.label}</div>
                <div className={`font-mono text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter row */}
      <Card className="border-border glass">
        <CardHeader className="p-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search symbol..." className="pl-9 h-9 glass border-border" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} data-testid="input-search-signals" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[120px] h-9 glass border-border" data-testid="select-filter-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="BUY">Buy Only</SelectItem>
                  <SelectItem value="SELL">Sell Only</SelectItem>
                  <SelectItem value="HOLD">Hold Only</SelectItem>
                </SelectContent>
              </Select>

              {/* View toggle */}
              <div className="flex rounded-md border border-border overflow-hidden">
                <button onClick={() => setView("cards")} className={`px-3 py-1.5 text-xs transition-colors ${view === "cards" ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                  Cards
                </button>
                <button onClick={() => setView("table")} className={`px-3 py-1.5 text-xs border-l border-border transition-colors ${view === "table" ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                  Table
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Zap className="h-10 w-10 mx-auto opacity-20" />
              <p className="text-sm">No signals yet — click Generate Signal to run your first live analysis.</p>
            </div>
          ) : view === "cards" ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(signal => <SignalCard key={signal.id} signal={signal as Parameters<typeof SignalCard>[0]["signal"]} />)}
            </div>
          ) : (
            /* Compact table view for power users */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-widest">
                    <th className="text-left py-2 pr-3 font-medium">Symbol</th>
                    <th className="text-left py-2 pr-3 font-medium">Action</th>
                    <th className="text-left py-2 pr-3 font-medium">Conf</th>
                    <th className="text-left py-2 pr-3 font-medium">Entry</th>
                    <th className="text-left py-2 pr-3 font-medium hidden sm:table-cell">TP</th>
                    <th className="text-left py-2 pr-3 font-medium hidden sm:table-cell">SL</th>
                    <th className="text-left py-2 pr-3 font-medium hidden md:table-cell">R:R</th>
                    <th className="text-right py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map(signal => (
                    <tr key={signal.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pr-3">
                        <div className="font-bold">{signal.symbol}</div>
                        <div className="text-[10px] text-muted-foreground">5m</div>
                      </td>
                      <td className="py-2.5 pr-3"><ActionBadge action={signal.action} /></td>
                      <td className="py-2.5 pr-3">
                        <span className="font-mono text-xs font-bold">{signal.confidence}%</span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{formatPrice(signal.entryPrice)}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-emerald-400 hidden sm:table-cell">{formatPrice(signal.targetPrice)}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-rose-400 hidden sm:table-cell">{formatPrice(signal.stopLoss)}</td>
                      <td className={`py-2.5 pr-3 font-mono text-xs font-bold hidden md:table-cell ${(signal.riskRewardRatio ?? 0) >= 2 ? "text-emerald-400" : "text-amber-400"}`}>
                        {(signal.riskRewardRatio ?? 0).toFixed(2)}x
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground text-xs whitespace-nowrap">
                        {format(new Date(signal.createdAt), "MMM d, HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import {
  useListSignals,
  useGenerateSignal,
  getListSignalsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Search, Filter, Zap, Target, ShieldAlert, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const generateSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").toUpperCase(),
  assetClass: z.enum(["crypto", "stocks", "forex", "commodities"]),
});

function ActionBadge({ action, className = "" }: { action: string; className?: string }) {
  if (action === "BUY") {
    return (
      <Badge className={`bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 gap-1 ${className}`}>
        <TrendingUp className="h-3 w-3" />BUY
      </Badge>
    );
  }
  if (action === "SELL") {
    return (
      <Badge className={`bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20 gap-1 ${className}`}>
        <TrendingDown className="h-3 w-3" />SELL
      </Badge>
    );
  }
  return (
    <Badge className={`bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 gap-1 ${className}`}>
      <Minus className="h-3 w-3" />HOLD
    </Badge>
  );
}

function RRBadge({ rr }: { rr: number }) {
  const color = rr >= 2 ? "text-emerald-400" : rr >= 1.5 ? "text-amber-400" : "text-muted-foreground";
  return <span className={`font-mono text-xs font-bold ${color}`}>{rr.toFixed(2)}x</span>;
}

function ConfidenceBar({ value, action }: { value: number; action: string }) {
  const barColor =
    action === "BUY" ? "bg-emerald-500" :
    action === "SELL" ? "bg-rose-500" : "bg-amber-500";
  const textColor =
    action === "BUY" ? "text-emerald-400" :
    action === "SELL" ? "text-rose-400" : "text-amber-400";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className={`font-mono text-xs font-bold ${textColor} w-8 text-right`}>{value}%</span>
    </div>
  );
}

function formatPrice(n: number): string {
  if (n === 0) return "—";
  if (n < 0.01) return n.toFixed(6);
  if (n < 1) return n.toFixed(4);
  if (n < 10) return n.toFixed(4);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Signals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: signals, isLoading } = useListSignals();
  const generateMutation = useGenerateSignal();

  const form = useForm<z.infer<typeof generateSchema>>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      symbol: "",
      assetClass: "crypto",
    },
  });

  const onSubmit = (data: z.infer<typeof generateSchema>) => {
    // Always generate as 5m timeframe — analysis uses 1h context internally
    generateMutation.mutate({ data: { ...data, timeframe: "5m" } }, {
      onSuccess: (result) => {
        toast({
          title: `Signal: ${(result as { action: string }).action ?? "Generated"}`,
          description: `${data.symbol} — 5m entry / 1h trend analysis complete`,
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

  const filteredSignals = signals?.filter(signal => {
    const matchesSearch = signal.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === "ALL" || signal.action === filterAction;
    return matchesSearch && matchesAction;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Signal Matrix</h1>
          <p className="text-muted-foreground mt-1">
            5-minute entry signals — 1-hour trend context — ATR-based TP/SL
          </p>
        </div>

        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-generate-signal">
              <Zap className="mr-2 h-4 w-4" />
              Generate Signal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Generate AI Signal</DialogTitle>
              <DialogDescription>
                Fetches live OHLCV candles, computes RSI / MACD / EMA / ATR, then runs AI analysis.
                TP and SL are calculated from real ATR — not estimated.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="BTC, AAPL, EURUSD, GOLD" {...field} data-testid="input-symbol" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Class</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assetclass">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
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
                  )}
                />

                <div className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                  Analysis uses 60 candles of 1h data + 30 candles of 5m data from live market feeds
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={generateMutation.isPending}
                  data-testid="btn-submit-generate"
                >
                  {generateMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Fetching live data &amp; analyzing...
                    </span>
                  ) : "Run Analysis"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border">
        <CardHeader className="p-4 border-b border-border pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search symbol..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-signals"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[130px]" data-testid="select-filter-action">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="BUY">Buy Only</SelectItem>
                  <SelectItem value="SELL">Sell Only</SelectItem>
                  <SelectItem value="HOLD">Hold Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border text-xs">
                <TableHead className="w-[110px]">Symbol</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-emerald-500" />Entry / TP
                  </span>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <span className="flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-rose-500" />Stop Loss
                  </span>
                </TableHead>
                <TableHead className="hidden lg:table-cell">R:R</TableHead>
                <TableHead className="hidden xl:table-cell">Analysis</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredSignals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No signals yet — click Generate Signal to run your first live analysis.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSignals.map((signal) => (
                  <TableRow key={signal.id} className="border-border hover:bg-muted/30" data-testid={`row-signal-${signal.id}`}>
                    <TableCell>
                      <div className="font-bold text-sm">{signal.symbol}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-border font-mono">5m</Badge>
                        <span className="text-[9px] text-muted-foreground">/ 1h trend</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={signal.action} />
                    </TableCell>
                    <TableCell>
                      <ConfidenceBar value={signal.confidence} action={signal.action} />
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs space-y-0.5">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="w-3 text-[10px]">E</span>
                          <span>{formatPrice(signal.entryPrice)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <Target className="h-2.5 w-2.5" />
                          <span>{formatPrice(signal.targetPrice)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 text-rose-400 font-mono text-xs font-semibold">
                        <ShieldAlert className="h-2.5 w-2.5" />
                        {formatPrice(signal.stopLoss)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <RRBadge rr={signal.riskRewardRatio ?? 1} />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell max-w-[240px]">
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {signal.reasoning}
                      </p>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(signal.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

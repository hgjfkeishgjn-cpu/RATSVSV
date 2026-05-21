import { useState, useRef } from "react";
import { 
  useListSignals, 
  useGenerateSignal,
  getListSignalsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Search, Plus, Filter, Zap, Target, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SignalAction, SignalTimeframe, SignalAssetClass } from "@workspace/api-client-react/src/generated/api.schemas";

const generateSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").toUpperCase(),
  timeframe: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]),
  assetClass: z.enum(["crypto", "stocks", "forex", "commodities"]),
});

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
      timeframe: "1h",
      assetClass: "crypto",
    },
  });

  const onSubmit = (data: z.infer<typeof generateSchema>) => {
    generateMutation.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Signal generated",
          description: `Successfully analyzed ${data.symbol}`,
        });
        queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
        setIsGenerateOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast({
          title: "Generation failed",
          description: "Failed to generate signal. Please try again.",
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
          <p className="text-muted-foreground">Comprehensive view of all AI-generated trading signals.</p>
        </div>
        
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-generate-signal">
              <Zap className="mr-2 h-4 w-4" />
              Generate Signal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate AI Signal</DialogTitle>
              <DialogDescription>
                Run our proprietary model on any asset to get an instant analysis.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="BTC, AAPL, EURUSD" {...field} data-testid="input-symbol" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
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
                  
                  <FormField
                    control={form.control}
                    name="timeframe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timeframe</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-timeframe">
                              <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1m">1m</SelectItem>
                            <SelectItem value="5m">5m</SelectItem>
                            <SelectItem value="15m">15m</SelectItem>
                            <SelectItem value="1h">1h</SelectItem>
                            <SelectItem value="4h">4h</SelectItem>
                            <SelectItem value="1d">1d</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full mt-6" 
                  disabled={generateMutation.isPending}
                  data-testid="btn-submit-generate"
                >
                  {generateMutation.isPending ? "Analyzing..." : "Execute Analysis"}
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
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-[120px]">Symbol</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Entry / Target</TableHead>
                <TableHead className="hidden md:table-cell">Stop Loss</TableHead>
                <TableHead className="hidden lg:table-cell">R:R</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSignals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No signals found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSignals.map((signal) => (
                  <TableRow key={signal.id} className="border-border group" data-testid={`row-signal-${signal.id}`}>
                    <TableCell className="font-bold text-base">
                      {signal.symbol}
                      <div className="text-xs font-normal text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-border">{signal.timeframe}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={signal.action} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full ${signal.confidence > 80 ? 'bg-emerald-500' : signal.confidence > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                            style={{ width: `${signal.confidence}%` }}
                          />
                        </div>
                        <span className="font-mono text-sm">{signal.confidence}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col font-mono text-sm">
                        <span className="flex items-center gap-1"><span className="text-muted-foreground text-xs w-4">E</span>${signal.entryPrice}</span>
                        <span className="flex items-center gap-1 text-emerald-500"><Target className="h-3 w-3" />${signal.targetPrice}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 text-rose-500 font-mono text-sm">
                        <ShieldAlert className="h-3 w-3" />${signal.stopLoss}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-sm">
                      {signal.riskRewardRatio ? signal.riskRewardRatio.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
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

function ActionBadge({ action, className = "" }: { action: string, className?: string }) {
  if (action === "BUY") {
    return <Badge className={`bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 ${className}`}>BUY</Badge>;
  }
  if (action === "SELL") {
    return <Badge className={`bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20 ${className}`}>SELL</Badge>;
  }
  return <Badge className={`bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 ${className}`}>HOLD</Badge>;
}
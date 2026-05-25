import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
} from "lightweight-charts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";

const SYMBOLS = ["BTC", "ETH", "SOL", "GOLD", "NASDAQ", "EURUSD", "GBPUSD", "USDJPY", "AAPL", "NVDA", "TSLA"];
const INTERVALS = [
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "1d", label: "1D" },
];

const SYMBOL_LABELS: Record<string, string> = {
  BTC: "BTC/USD", ETH: "ETH/USD", SOL: "SOL/USD", GOLD: "XAU/USD",
  NASDAQ: "NAS100", EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY",
  AAPL: "AAPL", NVDA: "NVDA", TSLA: "TSLA",
};

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type TTime = number;

function calcEMA(data: number[], period: number): (number | null)[] {
  if (data.length < period) return data.map(() => null);
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result: (number | null)[] = Array(period - 1).fill(null);
  result.push(ema);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  const rsi: (number | null)[] = Array(period).fill(null);
  if (closes.length < period + 1) return Array(closes.length).fill(null);
  for (let i = period; i < closes.length; i++) {
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j] - closes[j - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    const avg_g = gains / period;
    const avg_l = losses / period;
    rsi.push(avg_l === 0 ? 100 : 100 - 100 / (1 + avg_g / avg_l));
  }
  return rsi;
}

const CHART_OPTS = {
  layout: {
    background: { type: ColorType.Solid, color: "#09090b" },
    textColor: "#94a3b8",
    fontFamily: "ui-monospace, monospace",
    fontSize: 11,
  },
  grid: { vertLines: { color: "#1e1e2e" }, horzLines: { color: "#1e1e2e" } },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: "#1e1e2e" },
  timeScale: { borderColor: "#1e1e2e", timeVisible: true, secondsVisible: false },
};

export default function Charts() {
  const [symbol, setSymbol] = useState("BTC");
  const [interval, setIntervalValue] = useState("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastClose, setLastClose] = useState<number | null>(null);
  const [prevClose, setPrevClose] = useState<number | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef   = useRef<HTMLDivElement>(null);
  const chartRef    = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fetchCandles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/charts/ohlcv?symbol=${symbol}&interval=${interval}&limit=200`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Candle[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error("No data");
      setCandles(data);
      if (data.length >= 2) {
        setLastClose(data[data.length - 1].close);
        setPrevClose(data[data.length - 2].close);
      }
    } catch {
      setError("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, BASE]);

  useEffect(() => { fetchCandles(); }, [fetchCandles]);

  useEffect(() => {
    if (!chartContainerRef.current || !rsiContainerRef.current || candles.length === 0) return;

    // Destroy old charts
    chartRef.current?.remove();
    rsiChartRef.current?.remove();

    // ── Main chart ──────────────────────────────────────────────────────
    const chart = createChart(chartContainerRef.current, {
      ...CHART_OPTS,
      rightPriceScale: { ...CHART_OPTS.rightPriceScale, scaleMargins: { top: 0.08, bottom: 0.28 } },
      width:  chartContainerRef.current.offsetWidth,
      height: chartContainerRef.current.offsetHeight,
    });
    chartRef.current = chart;

    // Candlestick
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:        "#10b981",
      downColor:      "#ef4444",
      borderUpColor:  "#10b981",
      borderDownColor:"#ef4444",
      wickUpColor:    "#10b981",
      wickDownColor:  "#ef4444",
    });
    candleSeries.setData(
      candles.map(c => ({ time: c.time as TTime, open: c.open, high: c.high, low: c.low, close: c.close }))
    );

    // Volume histogram
    const volSeries = chart.addSeries(HistogramSeries, {
      color: "#334155",
      priceFormat: { type: "volume" as const },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volSeries.setData(
      candles.map(c => ({
        time: c.time as TTime,
        value: c.volume,
        color: c.close >= c.open ? "#10b98140" : "#ef444440",
      }))
    );

    // EMA lines
    const closes = candles.map(c => c.close);
    const ema9  = calcEMA(closes, 9);
    const ema21 = calcEMA(closes, 21);

    const ema9Series = chart.addSeries(LineSeries, {
      color: "#f59e0b", lineWidth: 1, priceLineVisible: false, lastValueVisible: true,
    });
    ema9Series.setData(
      candles.flatMap((c, i) => ema9[i] != null ? [{ time: c.time as TTime, value: ema9[i]! }] : [])
    );

    const ema21Series = chart.addSeries(LineSeries, {
      color: "#818cf8", lineWidth: 1, priceLineVisible: false, lastValueVisible: true,
    });
    ema21Series.setData(
      candles.flatMap((c, i) => ema21[i] != null ? [{ time: c.time as TTime, value: ema21[i]! }] : [])
    );

    chart.timeScale().fitContent();

    // ── RSI chart ────────────────────────────────────────────────────────
    const rsiChart = createChart(rsiContainerRef.current!, {
      ...CHART_OPTS,
      rightPriceScale: { ...CHART_OPTS.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
      width:  rsiContainerRef.current!.offsetWidth,
      height: rsiContainerRef.current!.offsetHeight,
    });
    rsiChartRef.current = rsiChart;

    const rsiValues = calcRSI(closes);
    const rsiSeries = rsiChart.addSeries(LineSeries, { color: "#a78bfa", lineWidth: 1, priceLineVisible: false });
    rsiSeries.setData(
      candles.flatMap((c, i) => rsiValues[i] != null ? [{ time: c.time as TTime, value: rsiValues[i]! }] : [])
    );

    // Overbought / oversold reference lines
    const ob = rsiChart.addSeries(LineSeries, { color: "#ef444450", lineWidth: 1, priceLineVisible: false, lineStyle: LineStyle.Dashed });
    ob.setData(candles.map(c => ({ time: c.time as TTime, value: 70 })));
    const os = rsiChart.addSeries(LineSeries, { color: "#10b98150", lineWidth: 1, priceLineVisible: false, lineStyle: LineStyle.Dashed });
    os.setData(candles.map(c => ({ time: c.time as TTime, value: 30 })));

    rsiChart.timeScale().fitContent();

    // Sync visible range
    chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
    });
    rsiChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) chart.timeScale().setVisibleLogicalRange(range);
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.offsetWidth });
      if (rsiContainerRef.current)   rsiChart.applyOptions({ width: rsiContainerRef.current.offsetWidth });
    });
    if (chartContainerRef.current) ro.observe(chartContainerRef.current);
    if (rsiContainerRef.current)   ro.observe(rsiContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      rsiChart.remove();
      chartRef.current = null;
      rsiChartRef.current = null;
    };
  }, [candles]);

  const change    = lastClose !== null && prevClose !== null ? lastClose - prevClose : null;
  const changePct = change !== null && prevClose ? (change / prevClose) * 100 : null;
  const isUp      = (change ?? 0) >= 0;

  return (
    <div className="space-y-4 flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Charts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Live candlestick charts — EMA(9/21) overlays, RSI(14)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastClose !== null && (
            <div className="flex items-center gap-2 mr-2">
              <span className="font-mono text-lg font-bold">
                {lastClose.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
              {changePct !== null && (
                <Badge className={isUp
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }>
                  {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {isUp ? "+" : ""}{changePct.toFixed(2)}%
                </Badge>
              )}
            </div>
          )}
          <Button variant="outline" size="icon" onClick={fetchCandles} disabled={loading} className="h-8 w-8">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-md border border-border overflow-hidden">
          {SYMBOLS.map(s => (
            <button key={s} onClick={() => setSymbol(s)}
              className={`px-2.5 py-1 text-xs font-mono font-semibold border-r border-border last:border-r-0 transition-colors ${
                symbol === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >{s}</button>
          ))}
        </div>

        <div className="flex rounded-md border border-border overflow-hidden">
          {INTERVALS.map(iv => (
            <button key={iv.value} onClick={() => setIntervalValue(iv.value)}
              className={`px-3 py-1 text-xs font-mono font-semibold border-r border-border last:border-r-0 transition-colors ${
                interval === iv.value
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >{iv.label}</button>
          ))}
        </div>

        <div className="flex items-center gap-3 ml-2 text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded" /> EMA9</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-400 inline-block rounded" /> EMA21</span>
        </div>
      </div>

      {/* Chart card */}
      <Card className="border-border flex-1">
        <CardContent className="p-0 h-full">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="space-y-3 w-full px-8">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-3" style={{ width: `${55 + Math.random() * 45}%` }} />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Minus className="h-8 w-8" />
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchCandles}>Retry</Button>
            </div>
          ) : (
            <div className="flex flex-col" style={{ height: "560px" }}>
              {/* Main candlestick + volume chart */}
              <div ref={chartContainerRef} style={{ flex: "1 1 auto" }} />
              {/* RSI panel */}
              <div className="border-t border-border">
                <div className="px-3 pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">RSI(14)</span>
                  <div className="flex items-center gap-4 text-[10px] font-mono">
                    <span className="text-rose-400">70 Overbought</span>
                    <span className="text-emerald-400">30 Oversold</span>
                  </div>
                </div>
                <div ref={rsiContainerRef} style={{ height: "100px" }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Symbol",      value: SYMBOL_LABELS[symbol] ?? symbol },
          { label: "Timeframe",   value: INTERVALS.find(i => i.value === interval)?.label ?? interval },
          { label: "Candles",     value: candles.length.toString() },
          { label: "Last Update", value: new Date().toLocaleTimeString() },
        ].map(item => (
          <Card key={item.label} className="border-border">
            <CardContent className="p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.label}</div>
              <div className="font-mono text-sm font-bold mt-1">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

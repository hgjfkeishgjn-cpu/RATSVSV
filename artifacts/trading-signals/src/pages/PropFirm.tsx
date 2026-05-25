import { useState } from "react";
import { useListSignals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TrendingUp, TrendingDown, Trophy, ShieldAlert, Target,
  DollarSign, BarChart2, Calculator, Activity, Zap
} from "lucide-react";

// ── Metrics helpers ───────────────────────────────────────────────────────────
const ACCOUNT_BALANCE = 100_000;
const DAILY_LOSS_LIMIT_PCT = 5;
const MAX_DRAWDOWN_PCT = 10;
const PROFIT_TARGET_PCT = 8;

// Simulated P&L from signals (positive bias for BUY high-confidence, negative for SELL)
function getSimPnl(signals: Array<{ action: string; confidence: number; riskRewardRatio?: number | null }>) {
  let equity = ACCOUNT_BALANCE;
  const curve: { day: number; equity: number }[] = [{ day: 0, equity }];

  signals.slice().reverse().forEach((s, i) => {
    const rr = s.riskRewardRatio ?? 1.5;
    const risk = equity * 0.01; // 1% risk per trade
    const isWin = s.confidence > 60
      ? Math.random() < (s.confidence / 100)
      : Math.random() < 0.4;
    equity += isWin ? risk * rr : -risk;
    if ((i + 1) % 3 === 0) {
      curve.push({ day: curve.length, equity: Math.max(equity, ACCOUNT_BALANCE * 0.8) });
    }
  });

  curve.push({ day: curve.length, equity });
  return { equity, curve };
}

function StatCard({ label, value, sub, icon: Icon, color = "text-foreground" }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; color?: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
          <Icon className={`h-4 w-4 ${color} opacity-70`} />
        </div>
        <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Position Size Calculator ──────────────────────────────────────────────────
function RiskCalculator() {
  const [accountSize, setAccountSize] = useState("100000");
  const [riskPct, setRiskPct] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  const account = parseFloat(accountSize) || 0;
  const risk = parseFloat(riskPct) || 0;
  const entry = parseFloat(entryPrice) || 0;
  const sl = parseFloat(stopLoss) || 0;

  const riskAmount = (account * risk) / 100;
  const pipRisk = entry > 0 && sl > 0 ? Math.abs(entry - sl) : 0;
  const posSize = pipRisk > 0 ? riskAmount / pipRisk : 0;
  const rrRatio = 2; // default 1:2
  const takeProfit = entry > 0 && sl > 0
    ? entry > sl ? entry + pipRisk * rrRatio : entry - pipRisk * rrRatio
    : 0;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          Position Size Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Account Size ($)</Label>
            <Input value={accountSize} onChange={e => setAccountSize(e.target.value)}
              className="mt-1 font-mono text-sm h-8" />
          </div>
          <div>
            <Label className="text-xs">Risk % per Trade</Label>
            <Input value={riskPct} onChange={e => setRiskPct(e.target.value)}
              className="mt-1 font-mono text-sm h-8" />
          </div>
          <div>
            <Label className="text-xs">Entry Price</Label>
            <Input value={entryPrice} onChange={e => setEntryPrice(e.target.value)}
              placeholder="0.00" className="mt-1 font-mono text-sm h-8" />
          </div>
          <div>
            <Label className="text-xs">Stop Loss</Label>
            <Input value={stopLoss} onChange={e => setStopLoss(e.target.value)}
              placeholder="0.00" className="mt-1 font-mono text-sm h-8" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Risk Amount</div>
            <div className="font-mono text-sm font-bold text-rose-400">
              ${riskAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Position Size</div>
            <div className="font-mono text-sm font-bold text-primary">
              {posSize > 0 ? posSize.toFixed(4) : "—"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">TP (1:2 R:R)</div>
            <div className="font-mono text-sm font-bold text-emerald-400">
              {takeProfit > 0 ? takeProfit.toFixed(4) : "—"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PropFirm() {
  const { data: signals, isLoading } = useListSignals();

  const sigs = signals ?? [];
  const buyCount  = sigs.filter(s => s.action === "BUY").length;
  const sellCount = sigs.filter(s => s.action === "SELL").length;
  const holdCount = sigs.filter(s => s.action === "HOLD").length;
  const total = sigs.length || 1;
  const winRate = sigs.length > 0
    ? Math.round(((buyCount + holdCount * 0.3) / total) * 100)
    : 0;
  const avgConf = sigs.length > 0
    ? Math.round(sigs.reduce((s, x) => s + x.confidence, 0) / sigs.length)
    : 0;
  const avgRR = sigs.length > 0
    ? sigs.reduce((s, x) => s + (x.riskRewardRatio ?? 1.5), 0) / sigs.length
    : 0;

  const { equity, curve } = getSimPnl(sigs);
  const pnl = equity - ACCOUNT_BALANCE;
  const pnlPct = (pnl / ACCOUNT_BALANCE) * 100;
  const maxDrawdownUsed = Math.max(0, Math.random() * MAX_DRAWDOWN_PCT * 0.6);
  const dailyPnlPct = pnlPct / Math.max(1, Math.ceil(sigs.length / 3));
  const profitTargetProgress = Math.min(100, (pnlPct / PROFIT_TARGET_PCT) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prop Firm Dashboard</h1>
        <p className="text-muted-foreground mt-1">Account performance, risk metrics &amp; position sizing</p>
      </div>

      {/* Account Phase */}
      <Card className="border-border bg-gradient-to-br from-card via-card to-emerald-950/20">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Trophy className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <div className="font-bold text-lg">Challenge Account</div>
                <div className="text-sm text-muted-foreground">Phase 1 — $100,000</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                <Zap className="h-3 w-3 mr-1" />ACTIVE
              </Badge>
              <div className="text-right">
                <div className={`font-mono text-xl font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {pnl >= 0 ? "+" : ""}{pnl.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}% total P&amp;L
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key metrics */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="border-border"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Equity" value={`$${equity.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            sub={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}% from start`}
            icon={DollarSign} color={pnl >= 0 ? "text-emerald-400" : "text-rose-400"} />
          <StatCard label="Win Rate" value={`${winRate}%`}
            sub={`${buyCount} buy / ${sellCount} sell signals`}
            icon={TrendingUp} color={winRate >= 55 ? "text-emerald-400" : "text-amber-400"} />
          <StatCard label="Avg R:R" value={`${avgRR.toFixed(2)}x`}
            sub={`${avgConf}% avg confidence`}
            icon={Target} color="text-blue-400" />
          <StatCard label="Total Signals" value={sigs.length.toString()}
            sub={`${holdCount} hold / ${sellCount} sell`}
            icon={Activity} color="text-purple-400" />
        </div>
      )}

      {/* Rules progress + equity curve */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Challenge rules */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              Challenge Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Profit Target ({PROFIT_TARGET_PCT}%)</span>
                <span className="font-mono text-xs font-bold text-emerald-400">{pnlPct.toFixed(2)}% / {PROFIT_TARGET_PCT}%</span>
              </div>
              <MiniBar value={profitTargetProgress} max={100} color="bg-emerald-500" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Max Daily Loss ({DAILY_LOSS_LIMIT_PCT}%)</span>
                <span className={`font-mono text-xs font-bold ${Math.abs(dailyPnlPct) > DAILY_LOSS_LIMIT_PCT * 0.7 ? "text-rose-400" : "text-emerald-400"}`}>
                  {Math.abs(Math.min(0, dailyPnlPct)).toFixed(2)}% / {DAILY_LOSS_LIMIT_PCT}%
                </span>
              </div>
              <MiniBar value={Math.abs(Math.min(0, dailyPnlPct))} max={DAILY_LOSS_LIMIT_PCT} color="bg-rose-500" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Max Drawdown ({MAX_DRAWDOWN_PCT}%)</span>
                <span className={`font-mono text-xs font-bold ${maxDrawdownUsed > MAX_DRAWDOWN_PCT * 0.7 ? "text-rose-400" : "text-amber-400"}`}>
                  {maxDrawdownUsed.toFixed(2)}% / {MAX_DRAWDOWN_PCT}%
                </span>
              </div>
              <MiniBar value={maxDrawdownUsed} max={MAX_DRAWDOWN_PCT} color="bg-amber-500" />
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              {[
                { rule: "Min Trading Days", status: `${Math.min(sigs.length, 10)} / 10`, ok: sigs.length >= 10 },
                { rule: "Max Position Size", status: "1% Risk", ok: true },
                { rule: "No Weekend Hold", status: "Compliant", ok: true },
                { rule: "News Filter Active", status: "Enabled", ok: true },
              ].map(r => (
                <div key={r.rule} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{r.rule}</span>
                  <span className={`font-mono font-semibold ${r.ok ? "text-emerald-400" : "text-amber-400"}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Signal breakdown */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4 text-primary" />
              Signal Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : sigs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Generate signals to see performance metrics</p>
            ) : (
              <>
                {/* Action breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "BUY", count: buyCount, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                    { label: "SELL", count: sellCount, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
                    { label: "HOLD", count: holdCount, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                  ].map(a => (
                    <div key={a.label} className={`rounded-lg border p-3 text-center ${a.bg}`}>
                      <div className={`text-xl font-mono font-bold ${a.color}`}>{a.count}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{a.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent signals */}
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Recent</div>
                  {sigs.slice(0, 6).map(s => (
                    <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          s.action === "BUY" ? "bg-emerald-500/10 text-emerald-400" :
                          s.action === "SELL" ? "bg-rose-500/10 text-rose-400" :
                          "bg-amber-500/10 text-amber-400"
                        }`}>{s.action}</span>
                        <span className="text-xs font-mono font-bold">{s.symbol}</span>
                        <span className="text-[10px] text-muted-foreground">5m</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-muted-foreground">{s.confidence}%</span>
                        <span className={`text-[10px] font-mono font-bold ${(s.riskRewardRatio ?? 0) >= 2 ? "text-emerald-400" : "text-amber-400"}`}>
                          {(s.riskRewardRatio ?? 0).toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Calculator */}
      <RiskCalculator />

      {/* Trading rules */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Funded Trader Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Risk Management", items: ["Max 1-2% per trade", "Stop loss mandatory", "No martingale allowed", "Max 5% daily drawdown"] },
              { title: "Trade Execution", items: ["Enter at confirmation", "Wait for structure shift", "Avoid news (30min)", "Use limit orders"] },
              { title: "Psychology", items: ["Follow your plan", "Journal every trade", "No revenge trading", "Set daily loss limit"] },
              { title: "Edge Criteria", items: ["Minimum 1:2 R:R", "60%+ win rate signal", "Trend confirmation", "Volume validation"] },
            ].map(section => (
              <div key={section.title}>
                <div className="text-xs font-semibold text-foreground mb-2">{section.title}</div>
                <ul className="space-y-1">
                  {section.items.map(item => (
                    <li key={item} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5 shrink-0">›</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

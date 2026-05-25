import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Activity, Shield, Zap, Target, TrendingUp, BarChart3, ChevronRight, Brain, Globe, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="container mx-auto px-4 h-16 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center h-8 w-8">
            <div className="absolute inset-0 rounded bg-emerald-500/20 animate-pulse" />
            <Activity className="h-5 w-5 text-emerald-400 relative z-10" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-black tracking-tight">EDGE AI</span>
            <span className="text-[9px] font-semibold tracking-widest text-emerald-400/80 uppercase">Institutional Intelligence.</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
          <Button asChild size="sm" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:text-emerald-300">
            <Link href="/sign-up">Get Access</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-24 md:py-36 container mx-auto px-4 flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-8 px-4 py-1.5 text-xs border-emerald-500/30 bg-emerald-500/5 text-emerald-400 tracking-widest uppercase font-bold">
            Institutional Intelligence. Trader Precision.
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter max-w-4xl mb-6 leading-[1.05]">
            The terminal that thinks<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400">
              like a hedge fund.
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            EDGE AI delivers real-time smart money signals, institutional order flow analysis, and AI-powered market intelligence — all in a single high-density terminal built for serious traders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25" data-testid="home-cta-signup">
              <Link href="/sign-up">
                Access the Terminal <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base font-semibold border-border/60 hover:border-border" data-testid="home-cta-pricing">
              <Link href="/pricing">View Plans</Link>
            </Button>
          </div>

          {/* Live stat strip */}
          <div className="mt-16 grid grid-cols-3 gap-px bg-border/40 rounded-xl overflow-hidden border border-border/40 w-full max-w-lg">
            {[
              { value: "91%", label: "Avg Signal Confidence" },
              { value: "2.4x", label: "Avg Risk:Reward" },
              { value: "Live", label: "Market Data Feed" },
            ].map(s => (
              <div key={s.label} className="bg-card px-6 py-4 text-center">
                <div className="font-mono text-xl font-black text-emerald-400">{s.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-muted/20 border-y border-border/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-black tracking-tight mb-3">Built for the edge.</h2>
              <p className="text-muted-foreground text-base max-w-xl mx-auto">
                Every feature engineered to give you an unfair advantage in the market.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard icon={Brain}       title="AI Signal Engine"       description="Smart money concepts, RSI/MACD/EMA confluences, liquidity sweeps, and displacement patterns — all scored by AI." accent="emerald" />
              <FeatureCard icon={TrendingUp}  title="Live Market Structure"  description="Real-time BOS/CHoCH detection, bias arc, session killzones, and order book depth — streaming continuously." accent="blue" />
              <FeatureCard icon={Shield}      title="Risk Management"        description="ATR-based TP/SL, position sizing calculator, drawdown limits, and prop firm challenge tracker built-in." accent="amber" />
              <FeatureCard icon={Zap}         title="Instant Alerts"         description="Price alerts, signal notifications, and economic event warnings — never miss a high-probability setup again." accent="rose" />
              <FeatureCard icon={BarChart3}   title="Performance Analytics"  description="Equity curve, win rate, drawdown analysis, and weekly PnL — full transparency on every signal's track record." accent="purple" />
              <FeatureCard icon={Globe}       title="Multi-Asset Coverage"   description="Crypto, forex, commodities, and stocks — BTC, ETH, GOLD, EUR/USD, NAS100, AAPL, NVDA and more." accent="cyan" />
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="py-16 container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Lock,     title: "Secure by default",      body: "Clerk authentication, encrypted sessions, and no data sold to third parties." },
              { icon: Activity, title: "Always-on terminal",     body: "Live simulation engine keeps every widget updating even between market hours." },
              { icon: Target,   title: "Contract-first signals", body: "Every signal includes entry, TP, SL, confidence score, R:R ratio, and AI reasoning." },
            ].map(t => (
              <div key={t.title} className="flex gap-4 p-5 rounded-xl border border-border/40 bg-card/50">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <t.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-sm mb-1">{t.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{t.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-border/40">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center h-6 w-6">
              <div className="absolute inset-0 rounded bg-emerald-500/15" />
              <Activity className="h-4 w-4 text-emerald-400 relative z-10" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-black tracking-tight">EDGE AI</span>
              <span className="text-[8px] font-semibold tracking-widest text-emerald-400/60 uppercase">Institutional Intelligence.</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} EDGE AI. For informational purposes only. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, accent }: {
  icon: React.ComponentType<{ className?: string }>; title: string; description: string; accent: string;
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    blue:    "bg-blue-500/10 text-blue-400",
    amber:   "bg-amber-500/10 text-amber-400",
    rose:    "bg-rose-500/10 text-rose-400",
    purple:  "bg-purple-500/10 text-purple-400",
    cyan:    "bg-cyan-500/10 text-cyan-400",
  };
  return (
    <Card className="bg-card/50 border-border/50 hover:border-border transition-colors">
      <CardContent className="pt-5 pb-5">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 ${colors[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-bold mb-2">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

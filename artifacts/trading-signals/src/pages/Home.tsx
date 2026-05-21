import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Activity, Shield, Zap, Target, TrendingUp, BarChart3, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="container mx-auto px-4 h-16 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Activity className="h-6 w-6 text-primary" />
          <span>AlphaSignal</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
          <Button asChild size="sm">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32 container mx-auto px-4 flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-8 px-4 py-1.5 text-sm border-primary/20 bg-primary/10 text-primary">
            Next-Gen Trading Intelligence
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter max-w-4xl mb-6 leading-tight">
            Institutional precision for <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              the self-directed trader.
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            AlphaSignal acts as your personal quant. Real-time AI signals, advanced portfolio tracking, 
            and market momentum alerts in a single, high-density terminal.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button asChild size="lg" className="h-12 px-8 text-lg font-medium" data-testid="home-cta-signup">
              <Link href="/sign-up">
                Start Trading Now <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-lg font-medium" data-testid="home-cta-pricing">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </section>

        <section className="py-20 bg-muted/30 border-y border-border/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">The edge you've been looking for.</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Built for speed, accuracy, and action. Everything you need to execute with confidence.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={Target}
                title="AI-Powered Signals"
                description="Our proprietary models analyze millions of data points to generate high-probability BUY, SELL, and HOLD signals."
              />
              <FeatureCard 
                icon={TrendingUp}
                title="Real-Time Momentum"
                description="Track trending assets across crypto, stocks, and forex before the crowd catches on."
              />
              <FeatureCard 
                icon={Shield}
                title="Risk Management"
                description="Built-in position sizing, risk/reward calculations, and dynamic stop-loss recommendations."
              />
              <FeatureCard 
                icon={Zap}
                title="Instant Alerts"
                description="Never miss a setup. Get notified instantly when price thresholds are crossed or new signals fire."
              />
              <FeatureCard 
                icon={BarChart3}
                title="Portfolio Analytics"
                description="Deep dive into your performance with advanced metrics, win rates, and PnL tracking."
              />
              <FeatureCard 
                icon={Activity}
                title="Dense Data Terminal"
                description="A high-contrast, information-dense interface designed for quick scanning and rapid execution."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-border/40 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            <span>AlphaSignal</span>
          </div>
          <p className="mt-4 md:mt-0">© 2025 AlphaSignal. All rights reserved. For informational purposes only.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-colors">
      <CardContent className="pt-6">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
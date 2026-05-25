import { Link, useLocation } from "wouter";
import { Show, useClerk, useUser } from "@clerk/react";
import {
  LayoutDashboard,
  Activity,
  LineChart,
  Briefcase,
  Globe,
  Bell,
  CreditCard,
  LogOut,
  Menu,
  Bot,
  CandlestickChart,
  Newspaper,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TickerTape from "@/components/TickerTape";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",    icon: LayoutDashboard },
  { href: "/signals",    label: "Signals",       icon: Activity },
  { href: "/charts",     label: "Charts",        icon: CandlestickChart },
  { href: "/chat",       label: "AI Analyst",    icon: Bot, highlight: true },
  { href: "/watchlist",  label: "Watchlist",     icon: LineChart },
  { href: "/portfolio",  label: "Portfolio",     icon: Briefcase },
  { href: "/prop",       label: "Prop Firm",     icon: Trophy },
  { href: "/market",     label: "Market",        icon: Globe },
  { href: "/news",       label: "News",          icon: Newspaper },
  { href: "/alerts",     label: "Alerts",        icon: Bell },
  { href: "/pricing",    label: "Pricing",       icon: CreditCard },
];

function Sidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignOut = () => {
    signOut({ redirectUrl: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" });
  };

  const content = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg" onClick={onClose}>
          <div className="relative flex items-center justify-center h-7 w-7">
            <div className="absolute inset-0 rounded bg-emerald-500/20 animate-pulse" />
            <Activity className="h-5 w-5 text-emerald-400 relative z-10" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-black tracking-tight text-foreground">EDGE AI</span>
            <span className="text-[9px] font-semibold tracking-widest text-emerald-400/80 uppercase">Institutional Intelligence.</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-auto py-3">
        <nav className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const isHighlight = (item as { highlight?: boolean }).highlight;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? isHighlight
                      ? "bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30"
                      : "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : isHighlight
                      ? "text-emerald-400/80 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {isHighlight && !isActive && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    AI
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <Show when="signed-in">
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-9 w-9 border border-sidebar-border">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback>{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.fullName || user?.primaryEmailAddress?.emailAddress}</span>
              <span className="text-xs text-muted-foreground truncate">Pro Plan</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground border-sidebar-border bg-transparent hover:bg-sidebar-accent"
            onClick={handleSignOut}
            data-testid="button-signout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </Show>

      <Show when="signed-out">
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Button asChild className="w-full" variant="default" data-testid="button-signin-nav">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild className="w-full" variant="outline" data-testid="button-signup-nav">
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </div>
      </Show>
    </div>
  );

  if (mobile) return content;
  return <div className="hidden md:flex md:w-56 md:flex-col fixed inset-y-0">{content}</div>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="md:pl-56 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-56 border-r-0">
              <Sidebar mobile onClose={() => setIsOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 font-bold">
            <div className="relative flex items-center justify-center h-6 w-6">
              <div className="absolute inset-0 rounded bg-emerald-500/20" />
              <Activity className="h-4 w-4 text-emerald-400 relative z-10" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-black tracking-tight">EDGE AI</span>
              <span className="text-[8px] font-semibold tracking-widest text-emerald-400/80 uppercase">Institutional Intelligence.</span>
            </div>
          </div>
        </header>

        {/* Live ticker tape */}
        <TickerTape />

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

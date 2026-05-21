import { 
  useGetSubscription, 
  useUpsertSubscription,
  getGetSubscriptionQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, ShieldAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Show } from "@clerk/react";
import { Link } from "wouter";

export default function Pricing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: subscription, isLoading } = useGetSubscription();
  const upsertMutation = useUpsertSubscription();

  const handleUpgrade = (plan: "free" | "pro" | "premium") => {
    upsertMutation.mutate({ data: { plan } }, {
      onSuccess: () => {
        toast({ title: "Subscription updated", description: `You are now on the ${plan.toUpperCase()} plan.` });
        queryClient.invalidateQueries({ queryKey: getGetSubscriptionQueryKey() });
      },
      onError: () => {
        toast({ title: "Update failed", description: "Could not change subscription.", variant: "destructive" });
      }
    });
  };

  const currentPlan = subscription?.plan || "free";

  return (
    <div className="py-8 max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that matches your trading frequency and ambition.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* FREE */}
        <Card className="border-border bg-card flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Free</CardTitle>
            <CardDescription>For casual investors</CardDescription>
            <div className="mt-4 flex items-baseline text-4xl font-bold">
              $0
              <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-emerald-500" /> 5 signals per day
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-emerald-500" /> Basic dashboard
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-emerald-500" /> End-of-day market data
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <ShieldAlert className="h-4 w-4 opacity-50" /> No custom alerts
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Show when="signed-in">
              <Button 
                className="w-full" 
                variant={currentPlan === "free" ? "outline" : "default"}
                disabled={currentPlan === "free" || upsertMutation.isPending}
                onClick={() => handleUpgrade("free")}
              >
                {currentPlan === "free" ? "Current Plan" : "Downgrade"}
              </Button>
            </Show>
            <Show when="signed-out">
              <Button asChild className="w-full" variant="outline">
                <Link href="/sign-up">Sign Up Free</Link>
              </Button>
            </Show>
          </CardFooter>
        </Card>

        {/* PRO */}
        <Card className="border-primary shadow-lg shadow-primary/10 bg-card relative flex flex-col transform md:-translate-y-4">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-primary" />
          <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground">Most Popular</Badge>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              Pro <Zap className="h-5 w-5 text-primary" />
            </CardTitle>
            <CardDescription>For active day traders</CardDescription>
            <div className="mt-4 flex items-baseline text-4xl font-bold">
              $29
              <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-primary" /> 50 signals per day
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-primary" /> Real-time market data
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-primary" /> Advanced portfolio tracking
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-primary" /> Up to 20 active alerts
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Show when="signed-in">
              <Button 
                className="w-full" 
                variant={currentPlan === "pro" ? "outline" : "default"}
                disabled={currentPlan === "pro" || upsertMutation.isPending}
                onClick={() => handleUpgrade("pro")}
              >
                {currentPlan === "pro" ? "Current Plan" : "Upgrade to Pro"}
              </Button>
            </Show>
            <Show when="signed-out">
              <Button asChild className="w-full">
                <Link href="/sign-up">Get Pro</Link>
              </Button>
            </Show>
          </CardFooter>
        </Card>

        {/* PREMIUM */}
        <Card className="border-border bg-card flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              Premium <Crown className="h-5 w-5 text-amber-500" />
            </CardTitle>
            <CardDescription>For professional quants</CardDescription>
            <div className="mt-4 flex items-baseline text-4xl font-bold">
              $99
              <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-amber-500" /> Unlimited AI signals
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-amber-500" /> API access
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-amber-500" /> Unlimited active alerts
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-amber-500" /> Priority execution
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Show when="signed-in">
              <Button 
                className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950" 
                variant={currentPlan === "premium" ? "outline" : "default"}
                disabled={currentPlan === "premium" || upsertMutation.isPending}
                onClick={() => handleUpgrade("premium")}
              >
                {currentPlan === "premium" ? "Current Plan" : "Upgrade to Premium"}
              </Button>
            </Show>
            <Show when="signed-out">
              <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950">
                <Link href="/sign-up">Get Premium</Link>
              </Button>
            </Show>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
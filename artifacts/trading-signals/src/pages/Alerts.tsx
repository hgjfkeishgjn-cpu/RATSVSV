import { useState } from "react";
import { 
  useListAlerts, 
  useCreateAlert, 
  useDeleteAlert,
  getListAlertsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Bell, Plus, Trash2, BellRing } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Show } from "@clerk/react";
import { Link } from "wouter";

const alertSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").toUpperCase(),
  alertType: z.enum(["price_above", "price_below", "signal_buy", "signal_sell"]),
  threshold: z.coerce.number().optional(),
});

export default function Alerts() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: alerts, isLoading } = useListAlerts();
  const createMutation = useCreateAlert();
  const deleteMutation = useDeleteAlert();

  const form = useForm<z.infer<typeof alertSchema>>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      symbol: "",
      alertType: "signal_buy",
      threshold: undefined,
    },
  });

  // Watch alertType to conditionally require threshold
  const alertType = form.watch("alertType");
  const requiresThreshold = alertType === "price_above" || alertType === "price_below";

  const onSubmit = (data: z.infer<typeof alertSchema>) => {
    if (requiresThreshold && !data.threshold) {
      form.setError("threshold", { type: "manual", message: "Threshold is required for price alerts" });
      return;
    }

    createMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Alert created", description: "You will be notified when conditions are met." });
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        setIsAddOpen(false);
        form.reset();
      },
      onError: () => {
        toast({ title: "Failed to create alert", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Alert deleted" });
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to delete alert", variant: "destructive" });
      }
    });
  };

  const formatAlertType = (type: string) => {
    switch (type) {
      case "price_above": return "Price >";
      case "price_below": return "Price <";
      case "signal_buy": return "Buy Signal";
      case "signal_sell": return "Sell Signal";
      default: return type;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">Configure custom notifications for price action and AI signals.</p>
        </div>
        
        <Show when="signed-in">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Alert</DialogTitle>
                <DialogDescription>
                  Set conditions to trigger a notification.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="symbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Symbol</FormLabel>
                        <FormControl>
                          <Input placeholder="BTC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="alertType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="signal_buy">Any BUY Signal</SelectItem>
                            <SelectItem value="signal_sell">Any SELL Signal</SelectItem>
                            <SelectItem value="price_above">Price goes above</SelectItem>
                            <SelectItem value="price_below">Price goes below</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {requiresThreshold && (
                    <FormField
                      control={form.control}
                      name="threshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Threshold ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" placeholder="65000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <Button type="submit" className="w-full mt-6" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Alert"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </Show>
        <Show when="signed-out">
          <Button asChild>
            <Link href="/sign-in">Sign In to Set Alerts</Link>
          </Button>
        </Show>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-10 rounded-md" />
              </CardContent>
            </Card>
          ))
        ) : !alerts || alerts.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground">No active alerts</p>
              <p>You haven't set up any alerts yet. Create one to get notified.</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map(alert => (
            <Card key={alert.id} className={`border-border transition-colors ${!alert.isActive ? 'opacity-60 bg-muted/30' : 'bg-card'}`}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${alert.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {alert.isActive ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{alert.symbol}</span>
                        {!alert.isActive && <Badge variant="secondary" className="text-[10px]">Triggered</Badge>}
                      </div>
                      <div className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                        {formatAlertType(alert.alertType)} 
                        {alert.threshold && <span className="text-foreground">${alert.threshold}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Created {format(new Date(alert.createdAt), "MMM d, yyyy")}
                        {alert.triggeredAt && ` • Triggered ${format(new Date(alert.triggeredAt), "MMM d, HH:mm")}`}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                    onClick={() => handleDelete(alert.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
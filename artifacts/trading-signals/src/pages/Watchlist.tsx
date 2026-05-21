import { useState } from "react";
import { 
  useListWatchlist, 
  useAddToWatchlist, 
  useRemoveFromWatchlist,
  getListWatchlistQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Plus, Trash2, LineChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Show } from "@clerk/react";
import { Link } from "wouter";

const addWatchlistSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").toUpperCase(),
  assetClass: z.enum(["crypto", "stocks", "forex", "commodities"]),
  notes: z.string().optional(),
});

export default function Watchlist() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: watchlist, isLoading } = useListWatchlist();
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  const form = useForm<z.infer<typeof addWatchlistSchema>>({
    resolver: zodResolver(addWatchlistSchema),
    defaultValues: {
      symbol: "",
      assetClass: "crypto",
      notes: "",
    },
  });

  const onSubmit = (data: z.infer<typeof addWatchlistSchema>) => {
    addMutation.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Added to watchlist",
          description: `${data.symbol} is now being tracked`,
        });
        queryClient.invalidateQueries({ queryKey: getListWatchlistQueryKey() });
        setIsAddOpen(false);
        form.reset();
      },
      onError: () => {
        toast({
          title: "Failed to add",
          description: "Could not add to watchlist. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleRemove = (id: number) => {
    removeMutation.mutate({ id }, {
      onSuccess: () => {
        toast({
          title: "Removed from watchlist",
          description: "The symbol is no longer being tracked",
        });
        queryClient.invalidateQueries({ queryKey: getListWatchlistQueryKey() });
        setDeletingId(null);
      },
      onError: () => {
        toast({
          title: "Failed to remove",
          description: "Could not remove from watchlist.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-muted-foreground">Monitor specific assets for upcoming signals.</p>
        </div>
        
        <Show when="signed-in">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="btn-add-watchlist">
                <Plus className="mr-2 h-4 w-4" />
                Add Symbol
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add to Watchlist</DialogTitle>
                <DialogDescription>
                  Track an asset to get alerts and quick access to its signals.
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
                          <Input placeholder="BTC, AAPL, EURUSD" {...field} data-testid="input-watchlist-symbol" />
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
                            <SelectTrigger data-testid="select-watchlist-assetclass">
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
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Why are you watching this?" {...field} data-testid="input-watchlist-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-6" 
                    disabled={addMutation.isPending}
                    data-testid="btn-submit-watchlist"
                  >
                    {addMutation.isPending ? "Adding..." : "Add to Watchlist"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </Show>
        <Show when="signed-out">
          <Button asChild data-testid="btn-signin-watchlist">
            <Link href="/sign-in">Sign In to Manage</Link>
          </Button>
        </Show>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead>Symbol</TableHead>
                <TableHead>Asset Class</TableHead>
                <TableHead className="hidden md:table-cell">Notes</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !watchlist || watchlist.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Your watchlist is empty. Add a symbol to start tracking.
                  </TableCell>
                </TableRow>
              ) : (
                watchlist.map((item) => (
                  <TableRow key={item.id} className="border-border group">
                    <TableCell className="font-bold text-base flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      {item.symbol}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {item.assetClass}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {item.notes || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(item.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog open={deletingId === item.id} onOpenChange={(open) => !open && setDeletingId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                            onClick={() => setDeletingId(item.id)}
                            data-testid={`btn-delete-watchlist-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove from watchlist?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {item.symbol} from your tracked assets.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleRemove(item.id)}
                              className="bg-rose-500 hover:bg-rose-600 text-white"
                              data-testid={`btn-confirm-delete-${item.id}`}
                            >
                              {removeMutation.isPending ? "Removing..." : "Remove"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
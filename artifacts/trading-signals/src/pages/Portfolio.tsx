import { useState } from "react";
import { 
  useListPortfolio, 
  useAddPosition, 
  useUpdatePosition,
  useDeletePosition,
  useGetPortfolioStats,
  getListPortfolioQueryKey,
  getGetPortfolioStatsQueryKey
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
import { Plus, Trash2, Edit2, Briefcase, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Show } from "@clerk/react";
import { Link } from "wouter";

const positionSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").toUpperCase(),
  assetClass: z.enum(["crypto", "stocks", "forex", "commodities"]),
  quantity: z.coerce.number().min(0.000001, "Quantity must be > 0"),
  avgEntryPrice: z.coerce.number().min(0.000001, "Price must be > 0"),
});

const updatePositionSchema = z.object({
  quantity: z.coerce.number().min(0.000001, "Quantity must be > 0").optional(),
  avgEntryPrice: z.coerce.number().min(0.000001, "Price must be > 0").optional(),
  currentPrice: z.coerce.number().min(0.000001, "Price must be > 0").optional(),
});

export default function Portfolio() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: positions, isLoading: loadingPositions } = useListPortfolio();
  const { data: stats, isLoading: loadingStats } = useGetPortfolioStats();
  
  const addMutation = useAddPosition();
  const updateMutation = useUpdatePosition();
  const deleteMutation = useDeletePosition();

  const addForm = useForm<z.infer<typeof positionSchema>>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      symbol: "",
      assetClass: "crypto",
      quantity: 1,
      avgEntryPrice: 0,
    },
  });

  const editForm = useForm<z.infer<typeof updatePositionSchema>>({
    resolver: zodResolver(updatePositionSchema),
  });

  const onAddSubmit = (data: z.infer<typeof positionSchema>) => {
    addMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Position added" });
        queryClient.invalidateQueries({ queryKey: getListPortfolioQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPortfolioStatsQueryKey() });
        setIsAddOpen(false);
        addForm.reset();
      },
      onError: () => {
        toast({ title: "Failed to add position", variant: "destructive" });
      }
    });
  };

  const onEditSubmit = (data: z.infer<typeof updatePositionSchema>) => {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, data }, {
      onSuccess: () => {
        toast({ title: "Position updated" });
        queryClient.invalidateQueries({ queryKey: getListPortfolioQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPortfolioStatsQueryKey() });
        setEditingId(null);
      },
      onError: () => {
        toast({ title: "Failed to update position", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Position deleted" });
        queryClient.invalidateQueries({ queryKey: getListPortfolioQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPortfolioStatsQueryKey() });
        setDeletingId(null);
      },
      onError: () => {
        toast({ title: "Failed to delete position", variant: "destructive" });
      }
    });
  };

  const openEditDialog = (position: any) => {
    editForm.reset({
      quantity: position.quantity,
      avgEntryPrice: position.avgEntryPrice,
      currentPrice: position.currentPrice || position.avgEntryPrice,
    });
    setEditingId(position.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground">Track your open positions and performance.</p>
        </div>
        
        <Show when="signed-in">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="btn-add-position">
                <Plus className="mr-2 h-4 w-4" />
                Add Position
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Position</DialogTitle>
              </DialogHeader>
              
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
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
                      control={addForm.control}
                      name="assetClass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Class</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="avgEntryPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entry Price</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="w-full mt-6" disabled={addMutation.isPending}>
                    {addMutation.isPending ? "Adding..." : "Save Position"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </Show>
        <Show when="signed-out">
          <Button asChild>
            <Link href="/sign-in">Sign In to Manage</Link>
          </Button>
        </Show>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold font-mono">
                ${stats?.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
            {stats && stats.totalPnl >= 0 ? 
              <TrendingUp className="h-4 w-4 text-emerald-500" /> : 
              <TrendingDown className="h-4 w-4 text-rose-500" />
            }
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-24" /> : (
              <div className={`text-2xl font-bold font-mono ${stats && stats.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stats && stats.totalPnl >= 0 ? '+' : ''}
                ${stats?.totalPnl?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalPnlPercent ? `${stats.totalPnlPercent > 0 ? '+' : ''}${stats.totalPnlPercent.toFixed(2)}%` : '0.00%'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold font-mono">{stats?.totalPositions || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Performer</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{stats?.bestPerformer || '-'}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Entry</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Unrealized P&L</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPositions ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !positions || positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Your portfolio is empty. Add a position to start tracking.
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((pos) => {
                  const totalValue = pos.quantity * (pos.currentPrice || pos.avgEntryPrice);
                  const isProfit = (pos.pnl || 0) >= 0;
                  
                  return (
                    <TableRow key={pos.id} className="border-border">
                      <TableCell className="font-bold text-base">
                        {pos.symbol}
                        <div className="text-[10px] text-muted-foreground uppercase">{pos.assetClass}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {pos.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        ${pos.avgEntryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${(pos.currentPrice || pos.avgEntryPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`font-mono font-medium ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isProfit ? '+' : ''}${(pos.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-xs ml-1 block opacity-80">
                            {isProfit ? '+' : ''}{(pos.pnlPercent || 0).toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog open={editingId === pos.id} onOpenChange={(open) => !open && setEditingId(null)}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => openEditDialog(pos)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Update {pos.symbol}</DialogTitle>
                              </DialogHeader>
                              <Form {...editForm}>
                                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
                                  <FormField
                                    control={editForm.control}
                                    name="quantity"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="any" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={editForm.control}
                                      name="avgEntryPrice"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Avg Entry Price</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="any" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editForm.control}
                                      name="currentPrice"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Current Price</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="any" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <Button type="submit" className="w-full mt-6" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? "Updating..." : "Save Changes"}
                                  </Button>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog open={deletingId === pos.id} onOpenChange={(open) => !open && setDeletingId(null)}>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                                onClick={() => setDeletingId(pos.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete position?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove {pos.symbol} from your portfolio tracker.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(pos.id)}
                                  className="bg-rose-500 hover:bg-rose-600 text-white"
                                >
                                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search as SearchIcon, Pencil, Trash2 } from "lucide-react";
import {
  getAllTransactions, getAllCategories, filterAndSortTransactions,
  deleteTransaction, formatCurrency, getDefaultFilter,
  type Transaction, type Category, type FilterState,
} from "@/lib/finance/queries";
import { TransactionModal } from "./transaction-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FinanceTransactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<FilterState>(getDefaultFilter());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [t, c] = await Promise.all([getAllTransactions(), getAllCategories()]);
    setTxns(t);
    setCategories(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllTransactions(), getAllCategories()]).then(([t, c]) => {
      if (cancelled) return;
      setTxns(t);
      setCategories(c);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => filterAndSortTransactions(txns, categories, filter),
    [txns, categories, filter],
  );

  function handleEdit(t: Transaction) {
    setEditTxn(t);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditTxn(null);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteTransaction(deleteId);
      toast.success("Transaction deleted");
      setDeleteId(null);
      refresh();
    } catch {
      toast.error("Failed to delete");
    }
  }

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} transaction(s)</p>
        </div>
        <Button onClick={handleAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search by category or note..."
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={filter.type} onValueChange={(v) => setFilter((f) => ({ ...f, type: v as FilterState["type"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.categoryId} onValueChange={(v) => setFilter((f) => ({ ...f, categoryId: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filter.sort} onValueChange={(v) => setFilter((f) => ({ ...f, sort: v as FilterState["sort"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest">Highest Amount</SelectItem>
                <SelectItem value="lowest">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
              className="text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
              className="text-xs flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter(getDefaultFilter())}
              className="text-xs"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            📋 No transactions found. Tap + to add one!
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {filtered.map((t) => {
              const cat = catMap.get(t.category_id);
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg flex-shrink-0"
                    style={{ background: `${cat?.color ?? "#9ca3af"}20`, color: cat?.color }}
                  >
                    {cat?.emoji ?? "❓"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{cat?.name ?? "Unknown"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.note || "—"} · {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={cn(
                      "text-sm font-semibold",
                      t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                    )}>
                      {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount)}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTxn(null); }}
        onSaved={refresh}
        editTransaction={editTxn}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

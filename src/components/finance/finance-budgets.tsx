"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Target, Pencil, Trash2 } from "lucide-react";
import {
  getBudgetProgress, getCategoriesByKind, createBudget, updateBudget, deleteBudget,
  formatCurrency, currencySymbol,
  type BudgetProgress, type Category,
} from "@/lib/finance/queries";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FinanceBudgets() {
  const [progress, setProgress] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetProgress | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const p = await getBudgetProgress();
    setProgress(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getBudgetProgress().then((p) => {
      if (cancelled) return;
      setProgress(p);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">Track spending against your limits.</p>
        </div>
        <Button onClick={() => { setEditBudget(null); setModalOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : progress.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            🎯 No budgets set. Create one to track your spending!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {progress.map((p) => (
            <Card key={p.budget.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-base"
                      style={{ background: `${p.category?.color ?? "#9ca3af"}20`, color: p.category?.color }}
                    >
                      {p.category?.emoji ?? "🎯"}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{p.category?.name ?? "Unknown"}</div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {p.budget.period}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrency(p.spent)} <span className="text-muted-foreground font-normal">/ {formatCurrency(p.budget.limit)}</span>
                    </div>
                    {p.overBudget && (
                      <Badge variant="destructive" className="text-[10px] mt-0.5">Over Budget!</Badge>
                    )}
                  </div>
                </div>

                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${p.pct}%`, background: p.color }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={cn(p.remaining < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                    {p.remaining >= 0
                      ? `${formatCurrency(p.remaining)} remaining`
                      : `Over by ${formatCurrency(Math.abs(p.remaining))}`}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditBudget(p); setModalOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.budget.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>

      <BudgetModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditBudget(null); }}
        onSaved={refresh}
        editBudget={editBudget}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                await deleteBudget(deleteId);
                toast.success("Budget deleted");
                setDeleteId(null);
                refresh();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BudgetModal({
  open, onClose, onSaved, editBudget,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editBudget: BudgetProgress | null;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getCategoriesByKind("expense").then((c) => {
      setCategories(c);
      if (editBudget) {
        setCategoryId(editBudget.budget.category_id);
        setLimit(String(editBudget.budget.limit));
        setPeriod(editBudget.budget.period);
      } else {
        setCategoryId(c[0]?.id ?? "");
        setLimit("");
        setPeriod("weekly");
      }
    });
  }, [open, editBudget]);

  async function handleSave() {
    const limitNum = parseFloat(limit);
    if (!limitNum || limitNum <= 0) {
      toast.error("Please enter a valid limit");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }
    setSaving(true);
    try {
      if (editBudget) {
        await updateBudget(editBudget.budget.id, { category_id: categoryId, limit: limitNum, period });
        toast.success("Budget updated");
      } else {
        await createBudget({ category_id: categoryId, limit: limitNum, period });
        toast.success("Budget created");
      }
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to save budget");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editBudget ? "Edit Budget" : "Add Budget"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="limit">Budget Limit ({currencySymbol()})</Label>
            <Input
              id="limit"
              type="number"
              step="0.01"
              min="0"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="0.00"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Period</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(["weekly", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-md border py-2 text-sm font-medium capitalize transition-colors",
                    period === p
                      ? "border-teal-400 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editBudget ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

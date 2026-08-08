"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowDownCircle, ArrowUpCircle, cn, Repeat,
} from "@/lib/finance/imports";
import {
  getCategoriesByKind, createTransaction, updateTransaction, currencySymbol,
  type Category, type Transaction, type TransactionType,
} from "@/lib/finance/queries";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editTransaction?: Transaction | null;
  defaultType?: TransactionType;
}

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function TransactionModal({
  open, onClose, onSaved, editTransaction, defaultType = "expense",
}: Props) {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [recurrence, setRecurrence] = useState("once");
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editTransaction) {
      setType(editTransaction.type);
      setAmount(String(editTransaction.amount));
      setCategoryId(editTransaction.category_id);
      setNote(editTransaction.note);
      setDate(editTransaction.date);
      // recurring_id !== null means recurring
      setRecurrence(editTransaction.recurring_id ? "monthly" : "once");
    } else {
      setType(defaultType);
      setAmount("");
      setCategoryId("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      setRecurrence("once");
    }
  }, [open, editTransaction, defaultType]);

  useEffect(() => {
    if (!open) return;
    getCategoriesByKind(type).then((cats) => {
      setCategories(cats);
      if (!editTransaction || editTransaction.type !== type) {
        setCategoryId(cats[0]?.id ?? "");
      }
    });
  }, [open, type, editTransaction]);

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!date) {
      toast.error("Please select a date");
      return;
    }

    setSaving(true);
    try {
      if (editTransaction) {
        await updateTransaction(editTransaction.id, {
          type, amount: amt, category_id: categoryId, note, date,
          recurring_id: recurrence !== "once" ? (editTransaction.recurring_id ?? "recurring_" + Date.now()) : null,
        });
        toast.success("Transaction updated");
      } else {
        await createTransaction({
          type, amount: amt, category_id: categoryId, date, note,
          recurring_id: recurrence !== "once" ? "recurring_" + Date.now() : null,
        });
        toast.success(type === "income" ? "Income added!" : "Expense added!");
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTransaction ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type toggle */}
          <div>
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button
                onClick={() => setType("income")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md border p-2.5 text-sm font-medium transition-colors",
                  type === "income"
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                    : "border-border hover:bg-accent",
                )}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Income
              </button>
              <button
                onClick={() => setType("expense")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md border p-2.5 text-sm font-medium transition-colors",
                  type === "expense"
                    ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300"
                    : "border-border hover:bg-accent",
                )}
              >
                <ArrowDownCircle className="h-4 w-4" />
                Expense
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                {currencySymbol()}
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-8 text-lg font-semibold text-right"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5 max-h-40 overflow-y-auto">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors",
                    categoryId === c.id
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <span className="truncate w-full text-center">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was this for?"
              className="mt-1.5 min-h-[60px]"
            />
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {/* Recurrence */}
          <div>
            <Label className="flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5" />
              Recurrence
            </Label>
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              {RECURRENCE_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRecurrence(r.value)}
                  className={cn(
                    "rounded-md border py-1.5 text-xs font-medium transition-colors",
                    recurrence === r.value
                      ? "border-teal-400 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editTransaction ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

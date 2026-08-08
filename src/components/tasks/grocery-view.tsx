"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, CheckCircle2, Circle, Trash2, ShoppingCart, X } from "lucide-react";
import {
  getGroceryItems, addGroceryItem, completeTask, uncompleteTask, deleteTask,
  clearCompletedGroceries, type Task,
} from "@/lib/tasks/queries";
import { haptic, playSfx } from "@/components/providers/global-ux";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function GroceryView() {
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const refresh = useCallback(async () => {
    const items = await getGroceryItems();
    setItems(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getGroceryItems().then((items) => {
      if (cancelled) return;
      setItems(items);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleAdd() {
    if (!newItem.trim()) return;
    const qty = newQty ? parseInt(newQty, 10) : null;
    await addGroceryItem(newItem.trim(), qty ?? undefined, newUnit.trim() || undefined);
    setNewItem(""); setNewQty(""); setNewUnit("");
    playSfx("add"); haptic("success");
    refresh();
  }

  async function handleToggle(item: Task) {
    if (item.completed_at) {
      await uncompleteTask(item.id);
      playSfx("tap"); haptic("tap");
    } else {
      await completeTask(item.id);
      playSfx("success"); haptic("success");
    }
    refresh();
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    playSfx("delete");
    refresh();
  }

  async function handleClearCompleted() {
    await clearCompletedGroceries();
    toast.success("Completed items cleared");
    refresh();
  }

  const pending = items.filter((i) => !i.completed_at);
  const completed = items.filter((i) => i.completed_at);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Groceries
          </h1>
          <p className="text-sm text-muted-foreground">{pending.length} to buy · {completed.length} in cart</p>
        </div>
        {completed.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={handleClearCompleted}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear done
          </Button>
        )}
      </div>

      {/* Add item */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add an item..."
              className="flex-1"
            />
            <Input
              value={newQty}
              onChange={(e) => setNewQty(e.target.value.replace(/\D/g, ""))}
              type="number"
              placeholder="Qty"
              className="w-16"
            />
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="unit"
              className="w-20"
            />
            <Button onClick={handleAdd} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending items */}
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : pending.length === 0 && completed.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            Your grocery list is empty. Add items above.
          </CardContent>
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-1.5">
              {pending.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-2.5 flex items-center gap-3">
                    <button onClick={() => handleToggle(item)} className="text-muted-foreground hover:text-emerald-600 transition-colors flex-shrink-0">
                      <Circle className="h-6 w-6" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{item.title}</span>
                      {item.quantity && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => handleDelete(item.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground mb-2 px-1">In cart ({completed.length})</h2>
              <div className="space-y-1.5">
                {completed.map((item) => (
                  <Card key={item.id} className="opacity-60">
                    <CardContent className="p-2.5 flex items-center gap-3">
                      <button onClick={() => handleToggle(item)} className="text-emerald-600 transition-colors flex-shrink-0">
                        <CheckCircle2 className="h-6 w-6" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium line-through">{item.title}</span>
                        {item.quantity && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => handleDelete(item.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

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
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  getAllCategories, createCategory, deleteCategory,
  EMOJI_PALETTE, COLOR_PALETTE,
  type Category,
} from "@/lib/finance/queries";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FinanceCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    const c = await getAllCategories();
    setCategories(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAllCategories().then((c) => {
      if (cancelled) return;
      setCategories(c);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const custom = categories.filter((c) => c.id.startsWith("custom_"));
  const defaults = categories.filter((c) => !c.id.startsWith("custom_"));

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage your income and expense categories.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Custom categories */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Your Custom Categories</h2>
            {custom.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  No custom categories yet. Create one to organize your transactions.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y">
                  {custom.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-base flex-shrink-0"
                        style={{ background: `${c.color}20`, color: c.color }}
                      >
                        {c.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{c.name}</div>
                      </div>
                      <Badge variant={c.kind === "income" ? "default" : "secondary"}
                        className={cn(
                          "text-[10px]",
                          c.kind === "income" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                          c.kind === "expense" && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
                        )}
                      >
                        {c.kind}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={async () => {
                          await deleteCategory(c.id);
                          toast.success("Category deleted");
                          refresh();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Default categories */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Default Categories</h2>
            <Card>
              <CardContent className="p-0 divide-y">
                {defaults.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-base flex-shrink-0"
                      style={{ background: `${c.color}20`, color: c.color }}
                    >
                      {c.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                    </div>
                    <Badge variant={c.kind === "income" ? "default" : "secondary"}
                      className={cn(
                        "text-[10px]",
                        c.kind === "income" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                        c.kind === "expense" && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
                      )}
                    >
                      {c.kind}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>

      <CreateCategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}

function CreateCategoryModal({
  open, onClose, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setEmoji("");
      setColor(COLOR_PALETTE[0]);
      setKind("expense");
    }
  }, [open]);

  async function handleSave() {
    if (!name.trim()) { toast.error("Please enter a name"); return; }
    if (!emoji) { toast.error("Please pick an emoji"); return; }
    if (!color) { toast.error("Please pick a color"); return; }
    setSaving(true);
    try {
      await createCategory({ name: name.trim(), emoji, color, kind });
      toast.success("Category created");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="e.g. Coffee, Gym, Hobbies..."
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button
                onClick={() => setKind("expense")}
                className={cn(
                  "rounded-md border py-2 text-sm font-medium transition-colors",
                  kind === "expense"
                    ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300"
                    : "border-border hover:bg-accent",
                )}
              >
                Expense
              </button>
              <button
                onClick={() => setKind("income")}
                className={cn(
                  "rounded-md border py-2 text-sm font-medium transition-colors",
                  kind === "income"
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                    : "border-border hover:bg-accent",
                )}
              >
                Income
              </button>
            </div>
          </div>
          <div>
            <Label>Emoji</Label>
            <div className="grid grid-cols-10 gap-1 mt-1.5">
              {EMOJI_PALETTE.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded text-base transition-all",
                    emoji === e ? "bg-accent ring-2 ring-emerald-400 scale-110" : "hover:bg-accent",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-all",
                    color === c ? "border-foreground scale-110" : "border-transparent",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

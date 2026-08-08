"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Search, Pencil, Trash2, Download, Eye, Upload, X, Lock,
} from "lucide-react";
import {
  getVaultItemsByKind, createVaultItem, updateVaultItem, deleteVaultItem,
  decryptVaultItems, fileToBase64, formatFileSize, KIND_META,
  type DecryptedVaultItem,
} from "@/lib/vault/queries";
import type { VaultItemKind } from "@/lib/db/life-os-db";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";
import { haptic, playSfx } from "@/components/providers/global-ux";
import { cn } from "@/lib/utils";

interface Props {
  kind: VaultItemKind;
  onChanged: () => void;
}

export function VaultItemsView({ kind, onChanged }: Props) {
  const [items, setItems] = useState<DecryptedVaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<DecryptedVaultItem | null>(null);
  const [previewItem, setPreviewItem] = useState<DecryptedVaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const raw = await getVaultItemsByKind(kind);
    const decrypted = await decryptVaultItems(raw);
    setItems(decrypted);
    setLoading(false);
  }, [kind]);

  useEffect(() => {
    let cancelled = false;
    getVaultItemsByKind(kind).then(async (raw) => {
      const decrypted = await decryptVaultItems(raw);
      if (cancelled) return;
      setItems(decrypted);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [kind]);

  const meta = KIND_META[kind];
  const filtered = search.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  function handleAdd() {
    setEditItem(null);
    setModalOpen(true);
  }

  function handleEdit(item: DecryptedVaultItem) {
    setEditItem(item);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteVaultItem(deleteId);
    playSfx("delete");
    haptic("error");
    toast.success("Item deleted");
    setDeleteId(null);
    refresh();
    onChanged();
  }

  function handleSaved() {
    setModalOpen(false);
    setEditItem(null);
    refresh();
    onChanged();
  }

  // Download file
  function handleDownload(item: DecryptedVaultItem) {
    if (!item.file) return;
    const link = document.createElement("a");
    link.href = `data:${item.file.mimeType};base64,${item.file.base64}`;
    link.download = item.name;
    link.click();
    haptic("tap");
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>{meta.icon}</span>
            {meta.label}
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} item(s) · encrypted</p>
        </div>
        <Button onClick={handleAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            {search.trim() ? "No items match your search." : `No ${meta.label.toLowerCase()} yet. Tap Add to create one.`}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-muted flex-shrink-0 text-lg")}>
                  {item.file ? (
                    item.kind === "image" ? (
                      <img
                        src={`data:${item.file.mimeType};base64,${item.file.base64}`}
                        alt={item.name}
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      <span>{meta.icon}</span>
                    )
                  ) : (
                    <span>{meta.icon}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {item.file ? (
                      <>
                        <span>{formatFileSize(item.file.size)}</span>
                        <span>·</span>
                        <span>{item.file.mimeType.split("/")[1]?.toUpperCase() ?? "FILE"}</span>
                      </>
                    ) : item.text ? (
                      <span className="truncate">{item.text.slice(0, 60)}</span>
                    ) : (
                      <span>No content</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {item.file && (
                    <>
                      {item.kind === "image" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewItem(item)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(item)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>

      {/* Add/Edit modal */}
      <ItemModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSaved={handleSaved}
        kind={kind}
        editItem={editItem}
      />

      {/* Image preview modal */}
      {previewItem && previewItem.file && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={`data:${previewItem.file.mimeType};base64,${previewItem.file.base64}`}
              alt={previewItem.name}
              className="max-w-full max-h-[80vh] rounded-lg"
            />
            <div className="absolute top-2 right-2">
              <Button variant="secondary" size="icon" onClick={() => setPreviewItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center mt-2 text-sm text-white">
              {previewItem.name}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDeleteId(null)}
        >
          <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Delete item?</h3>
                <p className="text-sm text-muted-foreground mt-1">This cannot be undone.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDelete}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Add/Edit modal ──────────────────────────────────────────────────────────

function ItemModal({
  open, onClose, onSaved, kind, editItem,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  kind: VaultItemKind;
  editItem: DecryptedVaultItem | null;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [fileData, setFileData] = useState<{ base64: string; mimeType: string; size: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setName(editItem.name);
      setText(editItem.text);
      setFileData(editItem.file);
    } else {
      setName("");
      setText("");
      setFileData(null);
    }
  }, [open, editItem]);

  const isFileKind = kind === "document" || kind === "image" || kind === "file";
  const isTextKind = kind === "note" || kind === "card";

  async function handleFileSelect(file: File) {
    try {
      const data = await fileToBase64(file);
      setFileData(data);
      if (!name) setName(file.name);
      haptic("tap");
    } catch {
      toast.error("Failed to read file");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (isFileKind && !fileData && !editItem?.file) {
      toast.error("Please select a file");
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await updateVaultItem(editItem.id, {
          name: name.trim(),
          textContent: text,
          fileData: fileData ?? undefined,
        });
        toast.success("Item updated");
      } else {
        await createVaultItem({
          kind,
          name: name.trim(),
          textContent: isTextKind ? text : "",
          fileData: fileData ?? undefined,
        });
        playSfx("add");
        haptic("success");
        toast.success("Item added to vault");
      }
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editItem ? "Edit" : "Add"} {KIND_META[kind].label.replace("s", "").replace("& IDs", "")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Passport, Health Insurance, Wi-Fi Password..."
              className="mt-1.5"
              autoFocus
            />
          </div>

          {isFileKind && (
            <div>
              <Label>File</Label>
              {fileData ? (
                <div className="mt-1.5 flex items-center gap-2 rounded-md border p-3">
                  <span className="text-2xl">{KIND_META[kind].icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{name || "Selected file"}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(fileData.size)} · {fileData.mimeType.split("/")[1]?.toUpperCase() ?? "FILE"}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFileData(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "mt-1.5 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    dragOver ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30" : "border-border hover:border-indigo-300",
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to browse or drag a file here
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {isTextKind && (
            <div>
              <Label htmlFor="item-text">{kind === "card" ? "Card details" : "Note content"}</Label>
              <Textarea
                id="item-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={kind === "card" ? "Card number, expiry, CVV, etc." : "Write your secure note here..."}
                className="mt-1.5 min-h-[100px]"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Encrypting..." : editItem ? "Update" : "Add to vault"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users, Phone, Mail, User } from "lucide-react";
import {
  getVaultItemsByKind, createVaultItem, updateVaultItem, deleteVaultItem,
  decryptVaultItems, type DecryptedVaultItem,
} from "@/lib/vault/queries";
import { toast } from "sonner";
import { haptic, playSfx } from "@/components/providers/global-ux";

interface ContactData {
  role: string;
  phone: string;
  email: string;
  relationship: string;
}

export function VaultContactsView() {
  const [contacts, setContacts] = useState<DecryptedVaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<DecryptedVaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const raw = await getVaultItemsByKind("contact");
    const decrypted = await decryptVaultItems(raw);
    setContacts(decrypted);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getVaultItemsByKind("contact").then(async (raw) => {
      const decrypted = await decryptVaultItems(raw);
      if (cancelled) return;
      setContacts(decrypted);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

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
    toast.success("Contact deleted");
    setDeleteId(null);
    refresh();
  }

  function parseContact(item: DecryptedVaultItem): ContactData {
    try {
      return JSON.parse(item.text || "{}") as ContactData;
    } catch {
      return { role: "", phone: "", email: "", relationship: "" };
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            Trusted Contacts
          </h1>
          <p className="text-sm text-muted-foreground">{contacts.length} contact(s) · encrypted</p>
        </div>
        <Button onClick={handleAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            No trusted contacts yet. Add family members, doctors, or emergency contacts.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((item) => {
            const c = parseContact(item);
            return (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950/30 flex-shrink-0">
                    <User className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    {c.role && <div className="text-xs text-muted-foreground">{c.role}</div>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" /> {c.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>

      <ContactModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSaved={() => { setModalOpen(false); setEditItem(null); refresh(); }}
        editItem={editItem}
      />

      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDeleteId(null)}
        >
          <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Delete contact?</h3>
              <p className="text-sm text-muted-foreground">This cannot be undone.</p>
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

function ContactModal({
  open, onClose, onSaved, editItem,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editItem: DecryptedVaultItem | null;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setName(editItem.name);
      try {
        const c = JSON.parse(editItem.text || "{}") as ContactData;
        setRole(c.role ?? "");
        setPhone(c.phone ?? "");
        setEmail(c.email ?? "");
        setRelationship(c.relationship ?? "");
      } catch {
        setRole(""); setPhone(""); setEmail(""); setRelationship("");
      }
    } else {
      setName(""); setRole(""); setPhone(""); setEmail(""); setRelationship("");
    }
  }, [open, editItem]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    setSaving(true);
    const contactData = JSON.stringify({ role, phone, email, relationship });
    try {
      if (editItem) {
        await updateVaultItem(editItem.id, { name: name.trim(), textContent: contactData });
        toast.success("Contact updated");
      } else {
        await createVaultItem({
          kind: "contact",
          name: name.trim(),
          textContent: contactData,
        });
        playSfx("add");
        haptic("success");
        toast.success("Contact added");
      }
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save contact");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? "Edit" : "Add"} Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="mt-1.5" autoFocus />
          </div>
          <div>
            <Label htmlFor="c-role">Role / Title</Label>
            <Input id="c-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g., Doctor, Father, Lawyer" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="c-phone">Phone</Label>
            <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="c-rel">Relationship</Label>
            <Input id="c-rel" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g., Family, Friend, Professional" className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Encrypting..." : editItem ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

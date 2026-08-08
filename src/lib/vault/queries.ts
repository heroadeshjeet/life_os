/**
 * Life_OS v2 — Vault queries layer.
 *
 * All vault items are encrypted with the master-password-derived DEK
 * (Data Encryption Key) that lives in memory when the app is unlocked.
 * Files are stored as encrypted base64 blobs inside the encrypted_data
 * field. This fixes v1's plaintext PIN security gap — now everything
 * is AES-GCM encrypted.
 */
import { db, uid, type VaultItem, type VaultItemKind } from "@/lib/db/life-os-db";
import { useAuthStore } from "@/lib/stores/auth-store";
import { encryptString, decryptString, bytesToBase64, base64ToBytes } from "@/lib/crypto/master-key";

// ─── Activity log (stored in localStorage, capped at 200) ───────────────────

const ACTIVITY_KEY = "vault_activity";
const MAX_ACTIVITY = 200;

export interface VaultActivity {
  id: string;
  action: "created" | "updated" | "deleted" | "viewed";
  itemKind: VaultItemKind;
  itemName: string;
  timestamp: number;
}

function loadActivity(): VaultActivity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveActivity(entries: VaultActivity[]): void {
  if (typeof window === "undefined") return;
  const capped = entries.slice(0, MAX_ACTIVITY);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(capped));
}

function logActivity(action: VaultActivity["action"], itemKind: VaultItemKind, itemName: string): void {
  const entries = loadActivity();
  entries.unshift({
    id: uid("va_"),
    action,
    itemKind,
    itemName,
    timestamp: Date.now(),
  });
  saveActivity(entries);
}

export async function getActivityLog(): Promise<VaultActivity[]> {
  return loadActivity();
}

export async function clearActivityLog(): Promise<void> {
  saveActivity([]);
}

// ─── Get DEK from auth store ─────────────────────────────────────────────────

function getDek(): CryptoKey {
  const dek = useAuthStore.getState().dek;
  if (!dek) throw new Error("Vault is locked. Please unlock the app first.");
  return dek;
}

// ─── Item CRUD ───────────────────────────────────────────────────────────────

export async function getAllVaultItems(): Promise<VaultItem[]> {
  return db.vault_items.orderBy("created_at").reverse().toArray();
}

export async function getVaultItemsByKind(kind: VaultItemKind): Promise<VaultItem[]> {
  const all = await getAllVaultItems();
  return all.filter((i) => i.kind === kind);
}

export async function getVaultItemById(id: string): Promise<VaultItem | undefined> {
  return db.vault_items.get(id);
}

// ─── Create item (encrypts data) ────────────────────────────────────────────

export interface CreateVaultItemInput {
  kind: VaultItemKind;
  name: string;
  // For text-based items (notes, cards, contacts)
  textContent?: string;
  // For file-based items (documents, images, files)
  fileData?: {
    base64: string;
    mimeType: string;
    size: number;
  };
  metadata?: Record<string, unknown>;
}

export async function createVaultItem(input: CreateVaultItemInput): Promise<string> {
  const dek = getDek();
  const id = uid("vi_");

  // Build the plaintext payload
  const payload = JSON.stringify({
    text: input.textContent ?? "",
    file: input.fileData ?? null,
    meta: input.metadata ?? {},
  });

  // Encrypt
  const { ciphertext, iv } = await encryptString(dek, payload);

  const item: VaultItem = {
    id,
    kind: input.kind,
    name: input.name,
    encrypted_data: ciphertext,
    iv,
    metadata: input.metadata ?? {},
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  await db.vault_items.add(item);
  logActivity("created", input.kind, input.name);
  return id;
}

// ─── Update item ─────────────────────────────────────────────────────────────

export async function updateVaultItem(
  id: string,
  patch: {
    name?: string;
    textContent?: string;
    fileData?: { base64: string; mimeType: string; size: number };
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const dek = getDek();
  const existing = await db.vault_items.get(id);
  if (!existing) throw new Error("Item not found");

  // Decrypt existing to preserve unmodified fields
  const existingPayload = JSON.parse(await decryptString(dek, existing.encrypted_data, existing.iv));

  const newPayload = JSON.stringify({
    text: patch.textContent !== undefined ? patch.textContent : existingPayload.text,
    file: patch.fileData !== undefined ? patch.fileData : existingPayload.file,
    meta: patch.metadata !== undefined ? patch.metadata : existingPayload.meta,
  });

  const { ciphertext, iv } = await encryptString(dek, newPayload);

  await db.vault_items.update(id, {
    name: patch.name ?? existing.name,
    encrypted_data: ciphertext,
    iv,
    metadata: patch.metadata ?? existing.metadata,
    updated_at: Date.now(),
  });

  logActivity("updated", existing.kind, patch.name ?? existing.name);
}

// ─── Delete item ─────────────────────────────────────────────────────────────

export async function deleteVaultItem(id: string): Promise<void> {
  const item = await db.vault_items.get(id);
  if (!item) return;
  await db.vault_items.delete(id);
  logActivity("deleted", item.kind, item.name);
}

// ─── Decrypt item content ───────────────────────────────────────────────────

export interface DecryptedVaultItem {
  id: string;
  kind: VaultItemKind;
  name: string;
  text: string;
  file: { base64: string; mimeType: string; size: number } | null;
  meta: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export async function decryptVaultItem(item: VaultItem): Promise<DecryptedVaultItem> {
  const dek = getDek();
  const payload = JSON.parse(await decryptString(dek, item.encrypted_data, item.iv));
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    text: payload.text ?? "",
    file: payload.file ?? null,
    meta: payload.meta ?? {},
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export async function decryptVaultItems(items: VaultItem[]): Promise<DecryptedVaultItem[]> {
  return Promise.all(items.map(decryptVaultItem));
}

// ─── File helpers ────────────────────────────────────────────────────────────

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({
        base64,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface VaultStats {
  totalItems: number;
  byKind: Record<VaultItemKind, number>;
  totalSizeBytes: number;
  recentItems: VaultItem[];
}

export async function getVaultStats(): Promise<VaultStats> {
  const all = await getAllVaultItems();
  const byKind: Record<VaultItemKind, number> = {
    document: 0, image: 0, file: 0, card: 0, note: 0, contact: 0,
  };
  let totalSize = 0;

  // Decrypt all to get file sizes
  const decrypted = await decryptVaultItems(all);
  for (const d of decrypted) {
    byKind[d.kind]++;
    if (d.file) totalSize += d.file.size;
  }

  return {
    totalItems: all.length,
    byKind,
    totalSizeBytes: totalSize,
    recentItems: all.slice(0, 5),
  };
}

// ─── Kind metadata ───────────────────────────────────────────────────────────

export const KIND_META: Record<VaultItemKind, { label: string; icon: string; color: string }> = {
  document: { label: "Documents", icon: "📄", color: "text-sky-600 dark:text-sky-400" },
  image:    { label: "Images",    icon: "🖼️", color: "text-violet-600 dark:text-violet-400" },
  file:     { label: "Files",     icon: "📁", color: "text-amber-600 dark:text-amber-400" },
  card:     { label: "Cards & IDs", icon: "💳", color: "text-emerald-600 dark:text-emerald-400" },
  note:     { label: "Notes",     icon: "📝", color: "text-rose-600 dark:text-rose-400" },
  contact:  { label: "Contacts",  icon: "👤", color: "text-cyan-600 dark:text-cyan-400" },
};

export const KIND_ORDER: VaultItemKind[] = ["document", "image", "file", "card", "note", "contact"];

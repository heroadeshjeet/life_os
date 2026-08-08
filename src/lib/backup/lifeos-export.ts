/**
 * Life_OS v2 — Encrypted .lifeos export/import.
 *
 * Exports the entire Dexie database as a single encrypted .lifeos file.
 * The file is encrypted with the master password (PBKDF2 + AES-GCM),
 * so even if the file leaks, the data is unreadable.
 */
import { db } from "@/lib/db/life-os-db";
import { useAuthStore } from "@/lib/stores/auth-store";
import { encryptString, decryptString, bytesToBase64, base64ToBytes } from "@/lib/crypto/master-key";

const BACKUP_VERSION = "2.0.0";

interface BackupData {
  version: string;
  exportedAt: string;
  schemaVersion: number;
  tables: Record<string, unknown[]>;
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportToLifeos(): Promise<{ data: string; filename: string }> {
  const dek = useAuthStore.getState().dek;
  if (!dek) throw new Error("App must be unlocked to export.");

  const tableNames = [
    "user_profile", "journals", "moods", "tasks", "exercise_plans", "exercise_sessions",
    "water_logs", "categories", "transactions", "budgets", "vault_items",
    "meditation_sessions", "habits", "streak_days", "day_in_life_rollups",
    "counselor_conversations",
  ] as const;

  const allData: Record<string, unknown[]> = {};
  for (const name of tableNames) {
    // @ts-expect-error — dynamic table access
    allData[name] = serializeTable(await db[name].toArray());
  }

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    tables: allData,
  };

  const json = JSON.stringify(backup);
  const { ciphertext, iv } = await encryptString(dek, json);
  const encrypted = JSON.stringify({
    format: "lifeos-encrypted",
    version: BACKUP_VERSION,
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
  });

  const date = new Date().toISOString().slice(0, 10);
  return { data: encrypted, filename: `lifeos-backup-${date}.lifeos` };
}

// ─── Import ──────────────────────────────────────────────────────────────────

export async function importFromLifeos(
  fileContent: string,
  mode: "replace" | "merge" = "replace",
): Promise<{ tables: number; rows: number }> {
  const dek = useAuthStore.getState().dek;
  if (!dek) throw new Error("App must be unlocked to import.");

  const wrapper = JSON.parse(fileContent);
  if (wrapper.format !== "lifeos-encrypted") {
    throw new Error("Invalid .lifeos file format.");
  }

  const ciphertext = base64ToBytes(wrapper.ciphertext);
  const iv = base64ToBytes(wrapper.iv);
  const json = await decryptString(dek, ciphertext, iv);
  const backup = JSON.parse(json) as BackupData;

  if (!backup.tables) {
    throw new Error("Invalid backup data — no tables found.");
  }

  const tables = Object.fromEntries(
    Object.entries(backup.tables).map(([k, v]) => [k, deserializeTable(v)])
  );

  let totalRows = 0;

  if (mode === "replace") {
    for (const tableName of Object.keys(tables)) {
      // @ts-expect-error — dynamic table access
      await db[tableName].clear();
    }
  }

  for (const [tableName, rows] of Object.entries(tables)) {
    if (rows.length > 0) {
      // @ts-expect-error — dynamic table access
      await db[tableName].bulkPut(rows);
      totalRows += rows.length;
    }
  }

  return { tables: Object.keys(tables).length, rows: totalRows };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function serializeTable(rows: unknown[]): unknown[] {
  return rows.map((row) => {
    const obj = row as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Uint8Array) {
        out[key] = { __type: "bytes", value: bytesToBase64(value) };
      } else {
        out[key] = value;
      }
    }
    return out;
  });
}

function deserializeTable(rows: unknown[]): unknown[] {
  return rows.map((row) => {
    const obj = row as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === "object" && (value as { __type?: string }).__type === "bytes") {
        out[key] = base64ToBytes((value as { value: string }).value);
      } else {
        out[key] = value;
      }
    }
    return out;
  });
}

export function downloadFile(data: string, filename: string): void {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

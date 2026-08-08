/**
 * Life_OS v2 — Counselor conversation storage.
 *
 * Persists chat messages to Dexie counselor_conversations table.
 * Each conversation belongs to a thread; we use a single "main" thread
 * for now but the schema supports multiple.
 */
import { db, uid, type CounselorMessage } from "@/lib/db/life-os-db";

const MAIN_THREAD_ID = "main";

export async function getConversationHistory(limit = 20): Promise<CounselorMessage[]> {
  const msgs = await db.counselor_conversations
    .where("thread_id").equals(MAIN_THREAD_ID)
    .toArray();
  return msgs.sort((a, b) => a.created_at - b.created_at).slice(-limit);
}

export async function saveUserMessage(content: string, contextSnapshot: string | null = null): Promise<string> {
  const msg: CounselorMessage = {
    id: uid("c_"),
    thread_id: MAIN_THREAD_ID,
    role: "user",
    content,
    context_snapshot: contextSnapshot,
    created_at: Date.now(),
  };
  await db.counselor_conversations.add(msg);
  return msg.id;
}

export async function saveCounselorMessage(
  content: string,
  contextSnapshot: string | null = null,
): Promise<string> {
  const msg: CounselorMessage = {
    id: uid("c_"),
    thread_id: MAIN_THREAD_ID,
    role: "counselor",
    content,
    context_snapshot: contextSnapshot,
    created_at: Date.now(),
  };
  await db.counselor_conversations.add(msg);
  return msg.id;
}

export async function clearConversation(): Promise<void> {
  await db.counselor_conversations.where("thread_id").equals(MAIN_THREAD_ID).delete();
}

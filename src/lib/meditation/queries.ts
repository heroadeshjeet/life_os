/**
 * Life_OS v2 — Meditation queries layer.
 *
 * Handles meditation_sessions CRUD + stats. Triggers streak rollup.
 */
import { db, uid, todayStr, type MeditationSession, type MeditationType } from "@/lib/db/life-os-db";

// ─── Session CRUD ───────────────────────────────────────────────────────────

export async function getAllSessions(): Promise<MeditationSession[]> {
  return db.meditation_sessions.orderBy("started_at").reverse().toArray();
}

export async function getRecentSessions(limit: number = 10): Promise<MeditationSession[]> {
  const all = await getAllSessions();
  return all.slice(0, limit);
}

export async function createSession(input: {
  type: MeditationType;
  duration_s: number;
  notes?: string;
}): Promise<string> {
  const id = uid("ms_");
  const now = Date.now();
  const session: MeditationSession = {
    id,
    type: input.type,
    started_at: now - input.duration_s * 1000,
    ended_at: now,
    duration_s: input.duration_s,
    notes: input.notes ?? "",
  };
  await db.meditation_sessions.add(session);

  // Trigger streak rollup
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup();

  return id;
}

export async function deleteSession(id: string): Promise<void> {
  await db.meditation_sessions.delete(id);
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup();
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface MeditationStats {
  totalSessions: number;
  sessionsThisWeek: number;
  totalMinutes: number;
  avgDurationMin: number;
  currentStreak: number;
  byType: Record<MeditationType, number>;
}

export async function getStats(): Promise<MeditationStats> {
  const all = await getAllSessions();
  const now = new Date();
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const weekMs = monday.getTime();

  const weekSessions = all.filter((s) => s.started_at >= weekMs);
  const totalMinutes = all.reduce((s, e) => s + Math.round(e.duration_s / 60), 0);

  const byType: Record<MeditationType, number> = { breath: 0, focus: 0, pomodoro: 0, ambient: 0 };
  for (const s of all) byType[s.type]++;

  // Streak
  const sessionDates = new Set(
    all.map((s) => new Date(s.started_at).toISOString().slice(0, 10)),
  );
  let currentStreak = 0;
  const today = new Date(todayStr());
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (sessionDates.has(ds)) currentStreak++;
    else if (i === 0) continue;
    else break;
  }

  return {
    totalSessions: all.length,
    sessionsThisWeek: weekSessions.length,
    totalMinutes,
    avgDurationMin: all.length > 0 ? Math.round(totalMinutes / all.length) : 0,
    currentStreak,
    byType,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return "just now";
}

export const TYPE_META: Record<MeditationType, { label: string; icon: string; color: string }> = {
  breath:   { label: "Breathing",    icon: "🫁", color: "text-cyan-600 dark:text-cyan-400" },
  focus:    { label: "Focus",        icon: "🎯", color: "text-violet-600 dark:text-violet-400" },
  pomodoro: { label: "Pomodoro",     icon: "🍅", color: "text-rose-600 dark:text-rose-400" },
  ambient:  { label: "Ambient",      icon: "🎵", color: "text-amber-600 dark:text-amber-400" },
};

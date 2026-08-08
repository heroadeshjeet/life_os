/**
 * Life_OS v2 — Exercise queries layer.
 *
 * Handles exercise_sessions + water_logs CRUD, plus stats.
 */
import { db, uid, todayStr, type ExerciseSession, type WaterLog } from "@/lib/db/life-os-db";
import type { ExerciseCategory } from "@/lib/db/life-os-db";

// ─── Session queries ────────────────────────────────────────────────────────

export async function getAllSessions(): Promise<ExerciseSession[]> {
  return db.exercise_sessions.orderBy("started_at").reverse().toArray();
}

export async function getSessionsThisWeek(): Promise<ExerciseSession[]> {
  const now = new Date();
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return db.exercise_sessions.where("started_at").above(monday.getTime()).toArray();
}

export async function getRecentSessions(limit: number = 10): Promise<ExerciseSession[]> {
  const all = await getAllSessions();
  return all.slice(0, limit);
}

export async function createSession(input: {
  plan_id: string | null;
  category: ExerciseCategory;
  exercises: ExerciseSession["exercises"];
  total_volume_kg: number;
  perceived_effort: number | null;
  notes: string;
  ended_at: number;
}): Promise<string> {
  const id = uid("es_");
  const session: ExerciseSession = {
    id,
    plan_id: input.plan_id,
    category: input.category,
    started_at: Date.now() - (input.ended_at ? Date.now() - input.ended_at : 0),
    ended_at: input.ended_at,
    exercises: input.exercises,
    total_volume_kg: input.total_volume_kg,
    perceived_effort: input.perceived_effort,
    notes: input.notes,
  };
  // Fix started_at to be the actual start
  session.started_at = input.ended_at - (input.ended_at - session.started_at);
  await db.exercise_sessions.add(session);

  // Trigger streak rollup
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup();

  return id;
}

export async function deleteSession(id: string): Promise<void> {
  await db.exercise_sessions.delete(id);
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup();
}

// ─── Session stats ──────────────────────────────────────────────────────────

export interface ExerciseStats {
  totalSessions: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  totalVolumeKg: number;
  totalDurationMin: number;
  avgPerceivedEffort: number | null;
  currentStreak: number;
}

export async function getExerciseStats(): Promise<ExerciseStats> {
  const all = await getAllSessions();
  const now = new Date();
  const monthPrefix = now.toISOString().slice(0, 7);

  // Weekly sessions
  const weekSessions = await getSessionsThisWeek();

  // Monthly sessions
  const monthSessions = all.filter((s) => {
    const d = new Date(s.started_at);
    return d.toISOString().slice(0, 7) === monthPrefix;
  });

  const totalVolumeKg = all.reduce((s, e) => s + e.total_volume_kg, 0);
  const totalDurationMin = all.reduce((s, e) => {
    if (!e.ended_at) return s;
    return s + Math.round((e.ended_at - e.started_at) / 60000);
  }, 0);

  const efforts = all.filter((s) => s.perceived_effort !== null).map((s) => s.perceived_effort!);
  const avgPerceivedEffort = efforts.length > 0
    ? efforts.reduce((a, b) => a + b, 0) / efforts.length
    : null;

  // Streak: consecutive days with at least one session
  const sessionDates = new Set(
    all.map((s) => new Date(s.started_at).toISOString().slice(0, 10)),
  );
  let currentStreak = 0;
  const today = new Date(todayStr());
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (sessionDates.has(ds)) {
      currentStreak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  return {
    totalSessions: all.length,
    sessionsThisWeek: weekSessions.length,
    sessionsThisMonth: monthSessions.length,
    totalVolumeKg,
    totalDurationMin,
    avgPerceivedEffort,
    currentStreak,
  };
}

// ─── Water queries ──────────────────────────────────────────────────────────

export async function getWaterToday(): Promise<{ total: number; logs: WaterLog[] }> {
  const today = todayStr();
  const logs = await db.water_logs.where("date").equals(today).toArray();
  const total = logs.reduce((s, w) => s + w.amount_ml, 0);
  return { total, logs };
}

export async function addWater(amountMl: number): Promise<void> {
  const log: WaterLog = {
    id: uid("w_"),
    date: todayStr(),
    amount_ml: amountMl,
    logged_at: Date.now(),
  };
  await db.water_logs.add(log);
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup();
}

export async function removeWaterLog(id: string): Promise<void> {
  await db.water_logs.delete(id);
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup();
}

export async function getWaterGoal(): Promise<number> {
  const profile = await db.user_profile.get("single");
  return profile?.preferences.daily_water_goal_ml ?? 2500;
}

// ─── Helper: format duration ────────────────────────────────────────────────

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

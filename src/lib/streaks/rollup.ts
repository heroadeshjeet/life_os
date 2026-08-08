/**
 * Life_OS v2 — Streak rollup worker.
 *
 * Recomputes the day_in_life_rollups + streak_days entries for a given
 * date (or today by default) by querying every Dexie table.
 *
 * Scoring (0-100):
 *   Journal entry         +20
 *   Mood logged           +10
 *   Task completed        +15 (max)
 *   Water goal met        +15
 *   Exercise session      +20
 *   Meditation session    +10
 *   No spending overruns  +10 (only if user has budgets and stayed under)
 *
 * A "streak day" = any day with score > 0.
 * Current streak = consecutive days (ending today or yesterday) with score > 0.
 */

import {
  db, todayStr, type DayInLifeRollup, type StreakDay,
  type MoodEmoji,
} from "@/lib/db/life-os-db";
import { MOOD_EMOJI_MAP } from "@/lib/journal/queries";
import { getAllBudgets, getAllCategories } from "@/lib/finance/queries";
import { getBudgetProgress } from "@/lib/finance/queries";

const SCORE_WEIGHTS = {
  journal: 20,
  mood: 10,
  task: 15,
  water: 15,
  exercise: 20,
  meditation: 10,
  budget: 10,
};

// ─── Build a single day's rollup ────────────────────────────────────────────

export async function computeDayRollup(dateStr: string): Promise<DayInLifeRollup | null> {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  // Query all tables in parallel
  const [
    journal,
    moods,
    tasksCompleted,
    exerciseSessions,
    meditationSessions,
    waterLogs,
    transactions,
    categories,
  ] = await Promise.all([
    db.journals.where("date").equals(dateStr).first(),
    db.moods.toArray(),
    db.tasks.toArray(),
    db.exercise_sessions.toArray(),
    db.meditation_sessions.toArray(),
    db.water_logs.where("date").equals(dateStr).toArray(),
    db.transactions.where("date").equals(dateStr).toArray(),
    db.categories.toArray(),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));

  // ─── Journal ──────────────────────────────────────────────────────────────
  const journalExcerpt = journal
    ? stripHtml(journal.content_html).slice(0, 200)
    : "";
  const hasJournal = !!journal;

  // ─── Mood ──────────────────────────────────────────────────────────────────
  let mood: { emoji: MoodEmoji; intensity: number } | null = null;
  if (journal?.mood_id) {
    const m = moods.find((x) => x.id === journal.mood_id);
    if (m) mood = { emoji: m.emoji, intensity: m.intensity };
  }
  const hasMood = !!mood;

  // ─── Tasks ─────────────────────────────────────────────────────────────────
  const dayTasksCompleted = tasksCompleted.filter(
    (t) => t.completed_at && new Date(t.completed_at).toISOString().slice(0, 10) === dateStr,
  );
  const tasksCompletedCount = dayTasksCompleted.length;

  // ─── Exercise ──────────────────────────────────────────────────────────────
  const dayStart = new Date(dateStr).getTime();
  const dayEnd = dayStart + 86_400_000;
  const dayExercise = exerciseSessions.filter(
    (e) => e.started_at >= dayStart && e.started_at < dayEnd,
  );
  const exerciseSummary = dayExercise.map((e) => ({
    name: e.exercises[0]?.name ?? "Workout",
    total_volume_kg: e.total_volume_kg,
    duration_s: e.ended_at ? e.ended_at - e.started_at : 0,
  }));

  // ─── Meditation ────────────────────────────────────────────────────────────
  const dayMeditation = meditationSessions.filter(
    (m) => m.started_at >= dayStart && m.started_at < dayEnd,
  );
  const meditationSummary = dayMeditation.map((m) => ({
    type: m.type,
    duration_s: m.duration_s,
  }));

  // ─── Water ──────────────────────────────────────────────────────────────────
  const waterTotal = waterLogs.reduce((s, w) => s + w.amount_ml, 0);
  const profile = await db.user_profile.get("single");
  const waterGoal = profile?.preferences.daily_water_goal_ml ?? 2500;
  const waterGoalMet = waterTotal >= waterGoal;

  // ─── Spending ─────────────────────────────────────────────────────────────
  const dayExpenses = transactions.filter((t) => t.type === "expense");
  const spendingTotal = dayExpenses.reduce((s, t) => s + t.amount, 0);
  const spendingByCatMap = new Map<string, number>();
  for (const t of dayExpenses) {
    spendingByCatMap.set(t.category_id, (spendingByCatMap.get(t.category_id) ?? 0) + t.amount);
  }
  const spendingByCategory = Array.from(spendingByCatMap.entries()).map(([catId, amount]) => {
    const cat = catMap.get(catId);
    return { name: cat?.name ?? "Unknown", emoji: cat?.emoji ?? "❓", amount };
  }).sort((a, b) => b.amount - a.amount);

  // ─── Budget adherence (only counts if user has budgets) ────────────────────
  let budgetAdhered = false;
  const budgets = await getAllBudgets();
  if (budgets.length > 0) {
    // Check if any budget was exceeded on this day
    // For simplicity, check monthly budgets against month-to-date spending including today
    // If none exceeded, budgetAdhered = true
    const progress = await getBudgetProgress();
    budgetAdhered = !progress.some((p) => p.overBudget);
  }

  // ─── Score ─────────────────────────────────────────────────────────────────
  let score = 0;
  const activities: string[] = [];
  if (hasJournal) { score += SCORE_WEIGHTS.journal; activities.push("journal"); }
  if (hasMood)    { score += SCORE_WEIGHTS.mood; activities.push("mood"); }
  if (tasksCompletedCount > 0) {
    score += SCORE_WEIGHTS.task; activities.push("task");
  }
  if (waterGoalMet) { score += SCORE_WEIGHTS.water; activities.push("water"); }
  if (dayExercise.length > 0) { score += SCORE_WEIGHTS.exercise; activities.push("exercise"); }
  if (dayMeditation.length > 0) { score += SCORE_WEIGHTS.meditation; activities.push("meditate"); }
  if (budgetAdhered && budgets.length > 0) { score += SCORE_WEIGHTS.budget; activities.push("budget"); }
  score = Math.min(100, score);

  const rollup: DayInLifeRollup = {
    date: dateStr,
    summary: {
      exercise: exerciseSummary,
      water_total_ml: waterTotal,
      water_goal_ml: waterGoal,
      mood,
      journal_excerpt: journalExcerpt,
      journal_id: journal?.id ?? null,
      tasks_completed: tasksCompletedCount,
      spending_total: spendingTotal,
      spending_by_category: spendingByCategory,
      meditation_sessions: meditationSummary,
      streak_score: score,
    },
    computed_at: Date.now(),
  };

  return rollup;
}

// ─── Persist a rollup ───────────────────────────────────────────────────────

export async function saveDayRollup(dateStr: string): Promise<DayInLifeRollup | null> {
  const rollup = await computeDayRollup(dateStr);
  if (!rollup) return null;

  // Upsert into day_in_life_rollups
  await db.day_in_life_rollups.put(rollup);

  // Upsert into streak_days (score + activities)
  const streakDay: StreakDay = {
    date: dateStr,
    score: rollup.summary.streak_score,
    activities: rollup.summary.exercise.length > 0 ? ["exercise"] : [],
    updated_at: Date.now(),
  };
  // Rebuild activities list from rollup
  const activities: string[] = [];
  if (rollup.summary.journal_id) activities.push("journal");
  if (rollup.summary.mood) activities.push("mood");
  if (rollup.summary.tasks_completed > 0) activities.push("task");
  if (rollup.summary.water_total_ml >= rollup.summary.water_goal_ml) activities.push("water");
  if (rollup.summary.exercise.length > 0) activities.push("exercise");
  if (rollup.summary.meditation_sessions.length > 0) activities.push("meditate");
  if (rollup.summary.spending_total === 0 || rollup.summary.spending_total > 0) activities.push("tracked");
  streakDay.activities = activities;

  await db.streak_days.put(streakDay);

  return rollup;
}

// ─── Recompute today (the main entry point other modules call) ──────────────

export async function recomputeToday(): Promise<void> {
  await saveDayRollup(todayStr());
}

// ─── Recompute a range of dates (for backfilling) ──────────────────────────

export async function recomputeRange(startDate: string, endDate: string): Promise<void> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    await saveDayRollup(d.toISOString().slice(0, 10));
  }
}

// ─── Streak calculations ────────────────────────────────────────────────────

export interface StreakInfo {
  current: number;
  longest: number;
  totalActiveDays: number;
  averageScore: number;
}

export async function getStreakInfo(): Promise<StreakInfo> {
  const allDays = await db.streak_days.toArray();
  const activeDays = allDays.filter((d) => d.score > 0);

  if (activeDays.length === 0) {
    return { current: 0, longest: 0, totalActiveDays: 0, averageScore: 0 };
  }

  // Sort by date ascending
  const sorted = activeDays.sort((a, b) => a.date.localeCompare(b.date));
  const dateSet = new Set(sorted.map((d) => d.date));

  // Longest streak
  let longest = 0;
  let tempStreak = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
      if (diff === 1) tempStreak++;
      else {
        longest = Math.max(longest, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longest = Math.max(longest, tempStreak);

  // Current streak: count back from today (allow yesterday if today is empty)
  let current = 0;
  const today = new Date(todayStr());
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (dateSet.has(ds)) {
      current++;
    } else if (i === 0) {
      // Today empty — check yesterday, don't break
      continue;
    } else {
      break;
    }
  }

  const totalActiveDays = activeDays.length;
  const averageScore = allDays.reduce((s, d) => s + d.score, 0) / Math.max(allDays.length, 1);

  return { current, longest, totalActiveDays, averageScore };
}

// ─── Get rollup for a specific date (from cache or compute) ─────────────────

export async function getDayRollup(dateStr: string): Promise<DayInLifeRollup | null> {
  // Try cache first
  const cached = await db.day_in_life_rollups.get(dateStr);
  if (cached) return cached;
  // Compute and cache
  return saveDayRollup(dateStr);
}

// ─── Get calendar data for a month ──────────────────────────────────────────

export interface CalendarCell {
  date: string;
  score: number;
  activities: string[];
  hasData: boolean;
}

export async function getCalendarMonth(year: number, month: number): Promise<CalendarCell[]> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  // Batch fetch all streak_days for this month
  const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
  const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  const streakDays = await db.streak_days
    .where("date").between(startDate, endDate, true, true)
    .toArray();
  const dayMap = new Map(streakDays.map((d) => [d.date, d]));

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
    const day = dayMap.get(dateStr);
    cells.push({
      date: dateStr,
      score: day?.score ?? 0,
      activities: day?.activities ?? [],
      hasData: !!day && day.score > 0,
    });
  }

  return cells;
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, "");
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

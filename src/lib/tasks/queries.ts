/**
 * Life_OS v2 — Tasks queries layer.
 *
 * Ported from v1's taskiee.html. All task CRUD + history + streak
 * calculations go through this file.
 */
import { db, uid, todayStr, type Task, type TaskListType } from "@/lib/db/life-os-db";

// ─── Task CRUD ───────────────────────────────────────────────────────────────

export async function getAllTasks(): Promise<Task[]> {
  return db.tasks.orderBy("created_at").reverse().toArray();
}

export async function getTodaysTasks(): Promise<Task[]> {
  const today = todayStr();
  const todayDate = new Date(today);
  const all = await getAllTasks();
  // Today = no due date OR due_at is today OR overdue (due before today and not completed)
  return all
    .filter((t) => {
      if (t.completed_at) return false;
      if (!t.due_at) return true; // no due date → treat as today
      const dueDate = new Date(t.due_at);
      // Due today or overdue
      return dueDate <= new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);
    })
    .sort((a, b) => {
      // Sort: high → medium → low priority, then by created_at
      const prioOrder = { high: 0, medium: 1, low: 2 };
      const p = prioOrder[a.priority] - prioOrder[b.priority];
      if (p !== 0) return p;
      return b.created_at - a.created_at;
    });
}

export async function getCompletedToday(): Promise<Task[]> {
  const today = todayStr();
  const all = await getAllTasks();
  return all
    .filter((t) => t.completed_at && new Date(t.completed_at).toISOString().slice(0, 10) === today)
    .sort((a, b) => (b.completed_at ?? 0) - (a.completed_at ?? 0));
}

export async function getTasksByDate(dateStr: string): Promise<Task[]> {
  const all = await getAllTasks();
  return all.filter((t) => {
    if (!t.completed_at) return false;
    return new Date(t.completed_at).toISOString().slice(0, 10) === dateStr;
  });
}

export async function createTask(input: {
  title: string;
  notes?: string;
  due_at?: number | null;
  reminder_at?: number | null;
  priority?: "low" | "medium" | "high";
  list_type?: TaskListType;
  quantity?: number | null;
  unit?: string | null;
}): Promise<string> {
  const id = uid("task_");
  await db.tasks.add({
    id,
    title: input.title.trim(),
    notes: input.notes ?? "",
    due_at: input.due_at ?? null,
    reminder_at: input.reminder_at ?? null,
    priority: input.priority ?? "medium",
    completed_at: null,
    list_type: input.list_type ?? "todo",
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    created_at: Date.now(),
  });
  return id;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  await db.tasks.update(id, patch);
}

export async function completeTask(id: string): Promise<void> {
  await db.tasks.update(id, { completed_at: Date.now() });
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup();
}

export async function uncompleteTask(id: string): Promise<void> {
  await db.tasks.update(id, { completed_at: null });
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup();
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

// ─── Grocery list queries ───────────────────────────────────────────────────

export async function getGroceryItems(): Promise<Task[]> {
  const all = await db.tasks.where("list_type").equals("grocery").toArray();
  return all.sort((a, b) => a.created_at - b.created_at);
}

export async function addGroceryItem(title: string, quantity?: number, unit?: string): Promise<string> {
  return createTask({ title, list_type: "grocery", quantity: quantity ?? null, unit: unit ?? null });
}

export async function clearCompletedGroceries(): Promise<void> {
  const completed = await db.tasks
    .where("list_type").equals("grocery")
    .filter((t) => t.completed_at !== null)
    .toArray();
  await Promise.all(completed.map((t) => db.tasks.delete(t.id)));
}

// ─── Streak ──────────────────────────────────────────────────────────────────

export interface StreakInfo {
  current: number;
  longest: number;
  totalCompleted: number;
}

export async function getStreak(): Promise<StreakInfo> {
  const all = await getAllTasks();
  const completedDates = new Set(
    all
      .filter((t) => t.completed_at)
      .map((t) => new Date(t.completed_at!).toISOString().slice(0, 10)),
  );
  const sortedDates = Array.from(completedDates).sort();

  // Longest streak
  let longest = 0;
  let tempStreak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) tempStreak++;
      else {
        longest = Math.max(longest, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longest = Math.max(longest, tempStreak);

  // Current streak (count back from today)
  let current = 0;
  const today = new Date(todayStr());
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (completedDates.has(dateStr)) {
      current++;
    } else if (i === 0) {
      continue; // today has no completions yet — don't break streak
    } else {
      break;
    }
  }

  return {
    current,
    longest,
    totalCompleted: all.filter((t) => t.completed_at).length,
  };
}

// ─── Calendar / history ──────────────────────────────────────────────────────

export interface CalendarDay {
  date: string;
  completedCount: number;
}

export async function getCalendarMonth(year: number, month: number): Promise<CalendarDay[]> {
  const all = await getAllTasks();
  const completedByDate = new Map<string, number>();
  for (const t of all) {
    if (!t.completed_at) continue;
    const dateStr = new Date(t.completed_at).toISOString().slice(0, 10);
    completedByDate.set(dateStr, (completedByDate.get(dateStr) ?? 0) + 1);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CalendarDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      completedCount: completedByDate.get(dateStr) ?? 0,
    });
  }
  return days;
}

// ─── Reminders (browser notifications) ──────────────────────────────────────

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderDispatcher() {
  if (reminderInterval) return;
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;

  reminderInterval = setInterval(async () => {
    const now = Date.now();
    const all = await getAllTasks();
    const pending = all.filter(
      (t) => !t.completed_at && t.reminder_at && t.reminder_at <= now && t.reminder_at > now - 60_000,
    );
    for (const t of pending) {
      try {
        if (Notification.permission === "granted") {
          new Notification("Life_OS Reminder", {
            body: t.title,
            tag: t.id,
          });
        }
      } catch {
        // no-op
      }
    }
  }, 15_000);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

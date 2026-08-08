/**
 * Life_OS v2 — Dexie (IndexedDB) database schema.
 *
 * All persistent user data lives here. Sensitive tables are stored as
 * encrypted blobs via the master-password-derived DEK (see crypto/master-key.ts);
 * non-sensitive metadata is stored in plaintext for faster queries.
 *
 * Schema versioned via Dexie's built-in versioning. Bump `version(N)` for
 * any breaking change and provide an upgrade function.
 */
import Dexie, { type Table } from "dexie";

// ─── Type definitions ────────────────────────────────────────────────────────

export type ExerciseCategory =
  | "strength-upper"
  | "strength-lower"
  | "strength-core"
  | "strength-full"
  | "cardio"
  | "hiit"
  | "mobility"
  | "yoga"
  | "skill";

export type MoodEmoji = "happy" | "neutral" | "sad" | "angry" | "tired" | "love" | "anxious" | "fire";

export type TransactionType = "income" | "expense";

export type VaultItemKind = "document" | "image" | "file" | "card" | "note" | "contact";

export type TaskListType = "todo" | "grocery";

export type MeditationType = "breath" | "focus" | "pomodoro" | "ambient";

export type CounselorRole = "user" | "counselor";

export interface UserProfile {
  id: "single";
  name: string;
  age: number | null;
  avatar_emoji: string;
  joined_at: number;
  preferences: {
    theme: "light" | "dark" | "system";
    theme_id: "default" | "frutiger-aero" | "modern" | "classy" | "cybertech";
    nav_position: "auto" | "left" | "bottom";
    accent_color: string;
    auto_lock_minutes: number;
    daily_water_goal_ml: number;
    sound_enabled: boolean;
    haptics_enabled: boolean;
    animation_intensity: "none" | "minimal" | "full";
  };
  auth: {
    salt: Uint8Array;
    iv: Uint8Array;
    wrapped_dek: Uint8Array;
    recovery_salt: Uint8Array;
    recovery_iv: Uint8Array;
    recovery_wrapped_dek: Uint8Array;
    created_at: number;
    last_master_unlock: number;
    quick_unlock?: {
      method: "biometric" | "pin";
      // Biometric
      biometric_credential_id?: Uint8Array;
      biometric_prf_salt?: Uint8Array;
      biometric_wrapped_password?: Uint8Array;
      biometric_iv?: Uint8Array;
      // PIN
      pin_salt?: Uint8Array;
      pin_wrapped_password?: Uint8Array;
      pin_iv?: Uint8Array;
    } | null;
  } | null;
}

export interface Journal {
  id: string;
  date: string;
  title: string;
  content_html: string;
  mood_id: string | null;
  gratitude: string[];
  created_at: number;
  updated_at: number;
}

export interface Mood {
  id: string;
  journal_id: string | null;
  emoji: MoodEmoji;
  intensity: number;
  tags: string[];
  note: string;
  created_at: number;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  due_at: number | null;
  reminder_at: number | null;
  priority: "low" | "medium" | "high";
  completed_at: number | null;
  list_type: TaskListType;
  quantity: number | null;
  unit: string | null;
  created_at: number;
}

export interface ExercisePlan {
  id: string;
  name: string;
  category: ExerciseCategory;
  description: string;
  exercises: Array<{
    exercise_id: string;
    name: string;
    default_sets: number;
    default_reps: number | null;
    default_duration_s: number | null;
    default_weight_kg: number | null;
  }>;
  created_at: number;
}

export interface ExerciseSession {
  id: string;
  plan_id: string | null;
  category: ExerciseCategory;
  started_at: number;
  ended_at: number | null;
  exercises: Array<{
    exercise_id: string;
    name: string;
    sets: Array<{
      reps: number | null;
      weight_kg: number | null;
      duration_s: number | null;
      rpe: number | null;
      completed: boolean;
    }>;
  }>;
  total_volume_kg: number;
  perceived_effort: number | null;
  notes: string;
}

export interface WaterLog {
  id: string;
  date: string;
  amount_ml: number;
  logged_at: number;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  kind: "income" | "expense";
  created_at: number;
}

export interface Transaction {
  id: string;
  amount: number;
  category_id: string;
  type: TransactionType;
  date: string;
  note: string;
  recurring_id: string | null;
  created_at: number;
}

export interface Budget {
  id: string;
  category_id: string;
  limit: number;
  period: "monthly" | "weekly";
  created_at: number;
}

export interface VaultItem {
  id: string;
  kind: VaultItemKind;
  name: string;
  encrypted_data: Uint8Array;
  iv: Uint8Array;
  metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export interface MeditationSession {
  id: string;
  type: MeditationType;
  started_at: number;
  ended_at: number;
  duration_s: number;
  notes: string;
}

export interface Habit {
  id: string;
  name: string;
  cadence: "daily" | "weekly" | "mon-wed-fri" | "custom";
  custom_days: number[];
  current_streak: number;
  longest_streak: number;
  last_completed_at: number | null;
  created_at: number;
}

export interface StreakDay {
  date: string;
  score: number;
  activities: string[];
  updated_at: number;
}

export interface DayInLifeRollup {
  date: string;
  summary: {
    exercise: Array<{ name: string; total_volume_kg: number; duration_s: number }>;
    water_total_ml: number;
    water_goal_ml: number;
    mood: { emoji: MoodEmoji; intensity: number } | null;
    journal_excerpt: string;
    journal_id: string | null;
    tasks_completed: number;
    spending_total: number;
    spending_by_category: Array<{ name: string; emoji: string; amount: number }>;
    meditation_sessions: Array<{ type: MeditationType; duration_s: number }>;
    streak_score: number;
  };
  computed_at: number;
}

export interface CounselorMessage {
  id: string;
  thread_id: string;
  role: CounselorRole;
  content: string;
  context_snapshot: string | null;
  created_at: number;
}

export interface LifeManualEntry {
  id: string;
  section: string;
  key: string;
  value: string;
  metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export type BookCategory = "knowledge" | "entertainment";

export interface ReaderBook {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  pdf_path: string;       // relative path to PDF in /assets/books/
  cover_color: string;    // hex color for cover placeholder
  total_pages: number;    // from PDF metadata (optional, 0 if unknown)
  current_page: number;
  total_reading_seconds: number;
  created_at: number;
}

export interface ReaderSession {
  id: string;
  book_id: string;
  started_at: number;
  ended_at: number | null;
  duration_s: number;
  pages_read: number;
  date: string;          // YYYY-MM-DD
}

// ─── Database class ──────────────────────────────────────────────────────────

export class LifeOSDB extends Dexie {
  user_profile!: Table<UserProfile, string>;
  journals!: Table<Journal, string>;
  moods!: Table<Mood, string>;
  tasks!: Table<Task, string>;
  exercise_plans!: Table<ExercisePlan, string>;
  exercise_sessions!: Table<ExerciseSession, string>;
  water_logs!: Table<WaterLog, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  vault_items!: Table<VaultItem, string>;
  meditation_sessions!: Table<MeditationSession, string>;
  habits!: Table<Habit, string>;
  streak_days!: Table<StreakDay, string>;
  day_in_life_rollups!: Table<DayInLifeRollup, string>;
  counselor_conversations!: Table<CounselorMessage, string>;
  life_manual!: Table<LifeManualEntry, string>;
  reader_books!: Table<ReaderBook, string>;
  reader_sessions!: Table<ReaderSession, string>;

  constructor() {
    super("life_os");
    this.version(1).stores({
      user_profile:            "id",
      journals:                "id, date, mood_id, created_at",
      moods:                   "id, journal_id, intensity, created_at",
      tasks:                   "id, due_at, completed_at, priority, created_at",
      exercise_plans:          "id, category, name",
      exercise_sessions:       "id, plan_id, category, started_at",
      water_logs:              "id, date, logged_at",
      categories:              "id, kind, name",
      transactions:            "id, category_id, type, date",
      budgets:                 "id, category_id, period",
      vault_items:             "id, kind, created_at",
      meditation_sessions:     "id, type, started_at",
      habits:                  "id, cadence, current_streak",
      streak_days:             "date, score",
      day_in_life_rollups:     "date",
      counselor_conversations: "id, thread_id, role, created_at",
    });
    this.version(2).stores({
      life_manual: "id, section, key, updated_at",
    });
    this.version(3).stores({
      reader_books: "id, category, title",
      reader_sessions: "id, book_id, date",
    });
    this.version(4).stores({
      tasks: "id, due_at, completed_at, priority, created_at, list_type",
    });
  }
}

export const db = new LifeOSDB();

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function uid(prefix = ""): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

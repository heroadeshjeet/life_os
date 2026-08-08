/**
 * Life_OS v2 — Module registry.
 *
 * Defines the 9 modules shown in the sidebar. Phase 0 ships only the
 * Dashboard active; the others are placeholders that show a "coming in
 * Phase N" banner when clicked, so the user can see the full vision.
 */
import {
  LayoutDashboard,
  BookHeart,
  ListTodo,
  Dumbbell,
  Wallet,
  Lock,
  Wind,
  Brain,
  BookOpen,
  Settings as SettingsIcon,
  Flame,
  Library,
  type LucideIcon,
} from "lucide-react";

export interface ModuleDef {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Phase number from the migration plan when this module ships. */
  phase: number;
  accent: string; // tailwind text color class
  /** Special modules (like Settings) render their own UI, not the placeholder. */
  special?: boolean;
}

export const MODULES: ModuleDef[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Your day at a glance — tasks, water, mood, streak",
    icon: LayoutDashboard,
    phase: 1,
    accent: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "streaks",
    name: "Streaks",
    description: "Your day-in-life calendar and streak score",
    icon: Flame,
    phase: 6,
    accent: "text-orange-600 dark:text-orange-400",
    special: true,
  },
  {
    id: "counselor",
    name: "Counselor",
    description: "AI that reads your context before responding",
    icon: Brain,
    phase: 5,
    accent: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "journal",
    name: "Journal",
    description: "Daily diary with moods, gratitude, prompts",
    icon: BookHeart,
    phase: 2,
    accent: "text-rose-600 dark:text-rose-400",
  },
  {
    id: "tasks",
    name: "Tasks",
    description: "Today's priorities with reminders and streaks",
    icon: ListTodo,
    phase: 4,
    accent: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "exercise",
    name: "Exercise",
    description: "Strength, cardio, mobility, yoga, HIIT, skill",
    icon: Dumbbell,
    phase: 7,
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "finances",
    name: "Finances",
    description: "Income, expenses, budgets, reports",
    icon: Wallet,
    phase: 3,
    accent: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "vault",
    name: "Vault",
    description: "Documents, cards, contacts — encrypted",
    icon: Lock,
    phase: 8,
    accent: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "meditation",
    name: "Meditation",
    description: "Breath, focus, pomodoro, ambient sounds",
    icon: Wind,
    phase: 9,
    accent: "text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "reader",
    name: "Reader",
    description: "PDF reader with entertainment limits",
    icon: Library,
    phase: 10,
    accent: "text-sky-600 dark:text-sky-400",
    special: true,
  },
  {
    id: "manual",
    name: "Life Manual",
    description: "Life map, identity, rules, future self",
    icon: BookOpen,
    phase: 9,
    accent: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    id: "settings",
    name: "Settings",
    description: "Theme, auto-lock, voices, music, data export",
    icon: SettingsIcon,
    phase: 0,
    accent: "text-muted-foreground",
    special: true,
  },
];

export const MODULE_MAP: Record<string, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
);

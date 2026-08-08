/**
 * Life_OS v2 — Exercise library + plan parser (comprehensive).
 *
 * Supports 7 plans, 3 value formats (xN reps, N Sec, MM:SS).
 * GIF paths map to 3 folders: gifs/, legs/, mewing/.
 */

export interface PlanExercise {
  name: string;
  type: "reps" | "time";
  reps?: number;
  durationSec?: number;
  gifPath: string | null;
}

export interface PlanDay {
  day: number;
  isRest: boolean;
  exercises: PlanExercise[];
}

export interface ExercisePlan {
  id: string;
  name: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Special";
  icon: string;
  description: string;
  category: string;
  days: PlanDay[];
}

// ─── Plan definitions ───────────────────────────────────────────────────────

const PLAN_DEFS = [
  { id: "loose-belly-fat", name: "Lose Belly Fat", difficulty: "Beginner" as const, icon: "⚡", description: "30-day beginner plan to trim belly fat.", category: "core", file: "/assets/exercise/loose-belly-fat.txt" },
  { id: "abs-beginner", name: "30 Days Abs Beginner", difficulty: "Beginner" as const, icon: "🔥", description: "30-day beginner abs plan.", category: "core", file: "/assets/exercise/30-days-abs-beginner.txt" },
  { id: "abs-advanced", name: "30 Days Abs Advanced", difficulty: "Advanced" as const, icon: "💀", description: "30-day advanced abs plan for serious core strength.", category: "core", file: "/assets/exercise/30-days-abs-advanced.txt" },
  { id: "full-body", name: "Full Body Workout", difficulty: "Intermediate" as const, icon: "💪", description: "30-day full body strength plan.", category: "strength", file: "/assets/exercise/full-body-workout.txt" },
  { id: "arms", name: "Arms Workout", difficulty: "Intermediate" as const, icon: "💥", description: "30-day arms and upper body plan.", category: "strength", file: "/assets/exercise/arms-workout.txt" },
  { id: "legs", name: "Legs Workout", difficulty: "Intermediate" as const, icon: "🦵", description: "28-day legs and glutes plan.", category: "strength", file: "/assets/exercise/legs-workout.txt" },
  { id: "mewing", name: "Mewing", difficulty: "Special" as const, icon: "😐", description: "30-day facial posture and jawline plan.", category: "special", file: "/assets/exercise/mewing.txt" },
];

// ─── GIF path resolution ────────────────────────────────────────────────────

// Map exercise names to GIF folder. Most go in gifs/, legs go in legs/, mewing in mewing/.
const LEGS_EXERCISES = new Set([
  "squat", "side lunge", "glute kick back left", "glute kick back right",
  "pile squat", "sumo squat and leg raise", "wall sit", "skater jump",
  "donkey kick left", "donkey kick right", "froggy glutes lifts",
  "lunge knee hop right", "lunge knee hops left",
  "calf stretch left", "glute stretch left", "glute stretch right",
  "kneeling lunge stretch left", "kneeling lunge stretch right",
  "quad stretch left", "quad stretch right",
  "supine hamstring stretch left", "supine hamstring stretch right",
]);

const MEWING_EXERCISES = new Set([
  "side-to-side turns", "hyoid stretch", "tongue turning", "eyes and cheeks",
  "neck lift", "alternating cheek puffs", "cheekupward massage", "chin tuck",
  "full face massage", "lymph drainage downward slide", "lymph drainage upward slide",
  "lion", "sternocleidomastoid stretchleft", "sternocleidomastoid stretchright",
  "upward chewing",
]);

function nameToGifBase(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function resolveGifPath(exerciseName: string, planCategory: string): string | null {
  const lower = exerciseName.toLowerCase().trim();

  // Mewing plan exercises → mewing folder
  if (planCategory === "special" || MEWING_EXERCISES.has(lower)) {
    return `/assets/exercises/mewing/${exerciseName}.gif`;
  }

  // Legs exercises → legs folder
  if (LEGS_EXERCISES.has(lower) || planCategory === "legs") {
    return `/assets/exercises/legs/${exerciseName}.gif`;
  }

  // Everything else → gifs folder
  return `/assets/exercises/gifs/${exerciseName}.gif`;
}

// ─── Parser ─────────────────────────────────────────────────────────────────

function parseLine(line: string, planCategory: string): PlanExercise | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("---")) return null;

  // Split on last " - " (space-dash-space)
  const dashIdx = trimmed.lastIndexOf(" - ");
  if (dashIdx < 0) return null;

  const name = trimmed.substring(0, dashIdx).trim();
  const spec = trimmed.substring(dashIdx + 3).trim();

  if (!name || !spec) return null;

  const gifPath = resolveGifPath(name, planCategory);

  // Format 1: reps — "x18" or "x 18"
  const repsMatch = spec.match(/^x\s*(\d+)$/i);
  if (repsMatch) {
    return { name, type: "reps", reps: parseInt(repsMatch[1], 10), gifPath };
  }

  // Format 2: seconds — "20 Sec"
  const secMatch = spec.match(/^(\d+)\s*sec/i);
  if (secMatch) {
    return { name, type: "time", durationSec: parseInt(secMatch[1], 10), gifPath };
  }

  // Format 3: MM:SS — "01:00" or "00:30"
  const timeMatch = spec.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1], 10);
    const seconds = parseInt(timeMatch[2], 10);
    return { name, type: "time", durationSec: minutes * 60 + seconds, gifPath };
  }

  // Unknown format — skip
  return null;
}

function parsePlan(raw: string, def: typeof PLAN_DEFS[0]): ExercisePlan {
  const lines = raw.split("\n");
  const days: PlanDay[] = [];
  let currentDay: PlanDay | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Day header: --- Day N ---
    const dayMatch = trimmed.match(/^---\s*Day\s+(\d+)\s*---/i);
    if (dayMatch) {
      if (currentDay) days.push(currentDay);
      currentDay = { day: parseInt(dayMatch[1], 10), isRest: false, exercises: [] };
      continue;
    }

    // Rest day
    if (currentDay && /rest\s*[☕]?/i.test(trimmed)) {
      currentDay.isRest = true;
      continue;
    }

    // Exercise line
    if (currentDay && !currentDay.isRest) {
      const exercise = parseLine(trimmed, def.category);
      if (exercise) currentDay.exercises.push(exercise);
    }
  }

  if (currentDay) days.push(currentDay);

  return {
    id: def.id,
    name: def.name,
    difficulty: def.difficulty,
    icon: def.icon,
    description: def.description,
    category: def.category,
    days,
  };
}

// ─── Load plans on demand ──────────────────────────────────────────────────

const _cache = new Map<string, ExercisePlan>();

export async function getAllPlans(): Promise<ExercisePlan[]> {
  const results: ExercisePlan[] = [];
  for (const def of PLAN_DEFS) {
    if (_cache.has(def.id)) {
      results.push(_cache.get(def.id)!);
      continue;
    }
    try {
      const res = await fetch(def.file);
      if (!res.ok) continue;
      const raw = await res.text();
      const plan = parsePlan(raw, def);
      _cache.set(def.id, plan);
      results.push(plan);
    } catch {
      // skip failed plans
    }
  }
  return results;
}

export async function getPlanById(id: string): Promise<ExercisePlan | null> {
  if (_cache.has(id)) return _cache.get(id)!;
  const def = PLAN_DEFS.find((d) => d.id === id);
  if (!def) return null;
  try {
    const res = await fetch(def.file);
    if (!res.ok) return null;
    const raw = await res.text();
    const plan = parsePlan(raw, def);
    _cache.set(def.id, plan);
    return plan;
  } catch {
    return null;
  }
}

// ─── GIF path helper ────────────────────────────────────────────────────────

export function getGifPath(exerciseName: string, planCategory: string): string {
  return resolveGifPath(exerciseName, planCategory) ?? `/assets/exercises/gifs/${exerciseName}.gif`;
}

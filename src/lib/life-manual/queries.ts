/**
 * Life_OS v2 — Life Manual queries.
 *
 * Stores all life-manual data (identity, goals, rules, achievements)
 * in the Dexie life_manual table. Each entry is a key-value pair
 * within a section.
 */
import { db, uid, type LifeManualEntry } from "@/lib/db/life-os-db";

// ─── Generic get/set ────────────────────────────────────────────────────────

export async function getEntry(section: string, key: string): Promise<string> {
  const id = `${section}_${key}`;
  const entry = await db.life_manual.get(id);
  return entry?.value ?? "";
}

export async function setEntry(section: string, key: string, value: string, metadata: Record<string, unknown> = {}): Promise<void> {
  const id = `${section}_${key}`;
  const existing = await db.life_manual.get(id);
  if (existing) {
    await db.life_manual.update(id, { value, metadata, updated_at: Date.now() });
  } else {
    const entry: LifeManualEntry = {
      id,
      section,
      key,
      value,
      metadata,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await db.life_manual.add(entry);
  }
}

export async function getSectionEntries(section: string): Promise<LifeManualEntry[]> {
  return db.life_manual.where("section").equals(section).toArray();
}

export async function getSectionData(section: string): Promise<Record<string, string>> {
  const entries = await getSectionEntries(section);
  const data: Record<string, string> = {};
  for (const e of entries) {
    data[e.key] = e.value;
  }
  return data;
}

// ─── Identity ───────────────────────────────────────────────────────────────

export const IDENTITY_QUESTIONS = [
  { key: "who_am_i",           label: "Who am I?",                    placeholder: "Describe who you are right now — honestly, without judgment..." },
  { key: "who_i_want_to_be",   label: "Who do I want to become?",     placeholder: "Describe the person you're becoming..." },
  { key: "identity_statements", label: "Identity Statements",         placeholder: "I am someone who... (one per line)" },
  { key: "screen_time",        label: "Screen Time Today (hours)",    placeholder: "How many hours today?" },
];

export async function getIdentity(): Promise<Record<string, string>> {
  return getSectionData("identity");
}

export async function saveIdentityField(key: string, value: string): Promise<void> {
  await setEntry("identity", key, value);
}

// ─── Goals (Life Map) ───────────────────────────────────────────────────────

export const GOAL_QUESTIONS = [
  { key: "one_year_vision",    label: "My 1-Year Vision",              placeholder: "Where do I want to be in one year?" },
  { key: "five_year_vision",   label: "My 5-Year Vision",              placeholder: "Where do I want to be in five years?" },
  { key: "skills_to_master",   label: "Skills I Want to Master",       placeholder: "What skills do I want to develop?" },
  { key: "things_to_stop",     label: "Things I Want to Stop Doing",   placeholder: "What habits or behaviors need to go?" },
  { key: "people_to_become",   label: "People I Want to Become Like",  placeholder: "Who do I admire and want to emulate?" },
  { key: "daily_intention",    label: "Today's Intention",             placeholder: "What's my main focus today?" },
];

export async function getGoals(): Promise<Record<string, string>> {
  return getSectionData("goals");
}

export async function saveGoalField(key: string, value: string): Promise<void> {
  await setEntry("goals", key, value);
}

// ─── Rules ──────────────────────────────────────────────────────────────────

export interface PersonalRule {
  id: string;
  text: string;
  tag: string;
  created_at: number;
}

export const RULE_TAGS = [
  { id: "health",        label: "Health",        color: "#e0a96d" },
  { id: "relationships", label: "Relationships", color: "#d97a8e" },
  { id: "productivity",  label: "Productivity",  color: "#8aa884" },
  { id: "money",         label: "Money",         color: "#c9a96e" },
  { id: "learning",      label: "Learning",      color: "#7a9ec9" },
  { id: "mind",          label: "Mind",          color: "#b08ac9" },
];

export async function getRules(): Promise<PersonalRule[]> {
  const data = await getSectionData("rules");
  try {
    return JSON.parse(data.rules_list || "[]") as PersonalRule[];
  } catch {
    return [];
  }
}

export async function addRule(text: string, tag: string): Promise<void> {
  const rules = await getRules();
  rules.push({ id: uid("rule_"), text, tag, created_at: Date.now() });
  await setEntry("rules", "rules_list", JSON.stringify(rules));
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getRules();
  const filtered = rules.filter((r) => r.id !== id);
  await setEntry("rules", "rules_list", JSON.stringify(filtered));
}

export async function getMotto(): Promise<string> {
  return getEntry("motto", "text");
}

export async function saveMotto(text: string): Promise<void> {
  await setEntry("motto", "text", text);
}

// ─── Achievements ───────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  created_at: number;
}

export const ACHIEVEMENT_CATEGORIES = [
  { id: "health",     label: "Health & Fitness", icon: "💪" },
  { id: "career",     label: "Career & Work",    icon: "💼" },
  { id: "education",  label: "Education",        icon: "📚" },
  { id: "personal",   label: "Personal Growth",  icon: "🌱" },
  { id: "social",     label: "Social & Family",  icon: "👥" },
  { id: "financial",  label: "Financial",        icon: "💰" },
  { id: "creative",   label: "Creative",         icon: "🎨" },
  { id: "other",      label: "Other",            icon: "⭐" },
];

export async function getAchievements(): Promise<Achievement[]> {
  const data = await getSectionData("achievements");
  try {
    return JSON.parse(data.achievements_list || "[]") as Achievement[];
  } catch {
    return [];
  }
}

export async function addAchievement(input: {
  title: string;
  description: string;
  date: string;
  category: string;
}): Promise<void> {
  const achievements = await getAchievements();
  achievements.unshift({
    id: uid("ach_"),
    title: input.title,
    description: input.description,
    date: input.date,
    category: input.category,
    created_at: Date.now(),
  });
  await setEntry("achievements", "achievements_list", JSON.stringify(achievements));
}

export async function deleteAchievement(id: string): Promise<void> {
  const achievements = await getAchievements();
  const filtered = achievements.filter((a) => a.id !== id);
  await setEntry("achievements", "achievements_list", JSON.stringify(filtered));
}

// ─── Future Self ────────────────────────────────────────────────────────────

export const FUTURE_SELF_QUESTIONS = [
  { key: "future_message",   label: "A message from your future self",  placeholder: "What would your future self tell you today?" },
  { key: "future_habits",    label: "Habits your future self has",      placeholder: "What daily habits does your future self practice?" },
  { key: "younger_advice",   label: "Advice from your younger self",    placeholder: "What did your younger self dream of?" },
  { key: "skill_today",      label: "One skill to start today",         placeholder: "What's one thing you can start today?" },
];

export async function getFutureSelf(): Promise<Record<string, string>> {
  return getSectionData("future_self");
}

export async function saveFutureSelfField(key: string, value: string): Promise<void> {
  await setEntry("future_self", key, value);
}

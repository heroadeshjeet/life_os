/**
 * Life_OS v2 — Journal data queries.
 *
 * All journal/mood CRUD operations go through this file.
 */
import { db, uid, todayStr, type Journal, type Mood, type MoodEmoji } from "@/lib/db/life-os-db";

// Re-export so components can import from a single module
export { todayStr };

// ─── Mood emoji helpers ──────────────────────────────────────────────────────

export const MOOD_EMOJI_MAP: Record<MoodEmoji, string> = {
  happy: "😊",
  neutral: "😐",
  sad: "😔",
  angry: "😤",
  tired: "😴",
  love: "🥰",
  anxious: "😰",
  fire: "🔥",
};

export const MOOD_LABELS: Record<MoodEmoji, string> = {
  happy: "Happy",
  neutral: "Neutral",
  sad: "Sad",
  angry: "Angry",
  tired: "Tired",
  love: "Loved",
  anxious: "Anxious",
  fire: "On fire",
};

export const MOOD_OPTIONS: MoodEmoji[] = [
  "happy", "love", "fire", "neutral", "tired", "sad", "anxious", "angry",
];

// ─── Writing prompts ─────────────────────────────────────────────────────────

export const WRITING_PROMPTS = [
  "What is one thing that made you smile today?",
  "Describe a moment today when you felt fully present.",
  "What is something you're looking forward to?",
  "Write about a person who influenced your day.",
  "What did your body need today, and did you give it?",
  "What's one small win from today worth celebrating?",
  "If today had a color, what would it be and why?",
  "What surprised you today?",
  "What's a thought you keep returning to? Explore it.",
  "What would you tell yourself from one year ago?",
  "Describe the texture of your day in three words, then explain.",
  "What boundary do you need to set or hold?",
  "What does rest look like for you, and did you get any?",
  "Write about something you're proud of that no one knows.",
  "What part of today do you want to remember in ten years?",
  "What story are you telling yourself that might not be true?",
  "What did you learn today, however small?",
  "Where did you feel most yourself today?",
  "What are you carrying that you could put down?",
  "If today was a chapter, what would its title be?",
];

export function randomPrompt(): string {
  return WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)];
}

// ─── Journal queries ─────────────────────────────────────────────────────────

export async function getOrCreateToday(): Promise<Journal> {
  const date = todayStr();
  let entry = await db.journals.where("date").equals(date).first();
  if (!entry) {
    entry = {
      id: uid("j_"),
      date,
      title: "",
      content_html: "",
      mood_id: null,
      gratitude: ["", "", ""],
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await db.journals.add(entry);
  }
  return entry;
}

export async function getEntryByDate(date: string): Promise<Journal | undefined> {
  return db.journals.where("date").equals(date).first();
}

export async function getEntryById(id: string): Promise<Journal | undefined> {
  return db.journals.get(id);
}

export async function getEntriesByDateRange(startDate: string, endDate: string): Promise<Journal[]> {
  return db.journals.where("date").between(startDate, endDate, true, true).toArray();
}

export async function getAllEntries(): Promise<Journal[]> {
  return db.journals.orderBy("date").reverse().toArray();
}

export async function saveEntry(entry: Journal): Promise<void> {
  await db.journals.put({ ...entry, updated_at: Date.now() });
  // Trigger streak rollup for this entry's date
  const { triggerRollup } = await import("@/lib/streaks/trigger");
  triggerRollup(entry.date);
}

export async function deleteEntry(id: string): Promise<void> {
  const entry = await db.journals.get(id);
  if (entry?.mood_id) {
    await db.moods.delete(entry.mood_id);
  }
  await db.journals.delete(id);
}

// ─── Mood queries ────────────────────────────────────────────────────────────

export async function setMood(
  journalId: string,
  emoji: MoodEmoji,
  intensity: number,
  tags: string[] = [],
  note: string = "",
): Promise<string> {
  const journal = await db.journals.get(journalId);
  if (!journal) throw new Error("Journal not found");

  if (journal.mood_id) {
    await db.moods.update(journal.mood_id, { emoji, intensity, tags, note });
    return journal.mood_id;
  }

  const mood: Mood = {
    id: uid("m_"),
    journal_id: journalId,
    emoji,
    intensity,
    tags,
    note,
    created_at: Date.now(),
  };
  await db.moods.add(mood);
  await db.journals.update(journalId, { mood_id: mood.id });
  return mood.id;
}

export async function getMoodByJournal(journalId: string): Promise<Mood | undefined> {
  return db.moods.where("journal_id").equals(journalId).first();
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface JournalStats {
  totalEntries: number;
  totalWords: number;
  currentStreak: number;
  longestStreak: number;
  moodDistribution: Record<MoodEmoji, number>;
  entriesThisMonth: number;
  gratitudeCount: number;
}

export async function getStats(): Promise<JournalStats> {
  const all = await getAllEntries();
  const totalEntries = all.length;
  const totalWords = all.reduce((sum, e) => {
    const text = stripHtml(e.content_html);
    return sum + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  const gratitudeCount = all.reduce(
    (sum, e) => sum + e.gratitude.filter((g) => g.trim().length > 0).length,
    0,
  );

  const datesSet = new Set(all.map((e) => e.date));
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const today = todayStr();
  const sortedDates = Array.from(datesSet).sort();

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  const todayDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(todayDate);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (datesSet.has(dateStr)) {
      currentStreak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyAgoStr = ninetyDaysAgo.toISOString().slice(0, 10);
  const recentJournals = all.filter((e) => e.date >= ninetyAgoStr);
  const moodDistribution: Record<MoodEmoji, number> = {
    happy: 0, neutral: 0, sad: 0, angry: 0, tired: 0, love: 0, anxious: 0, fire: 0,
  };
  for (const j of recentJournals) {
    if (j.mood_id) {
      const mood = await db.moods.get(j.mood_id);
      if (mood) moodDistribution[mood.emoji]++;
    }
  }

  const monthPrefix = today.slice(0, 7);
  const entriesThisMonth = all.filter((e) => e.date.startsWith(monthPrefix)).length;

  return {
    totalEntries,
    totalWords,
    currentStreak,
    longestStreak,
    moodDistribution,
    entriesThisMonth,
    gratitudeCount,
  };
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  date: string;
  title: string;
  snippet: string;
  moodEmoji: string | null;
}

export async function searchEntries(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const all = await getAllEntries();
  const results: SearchResult[] = [];

  for (const entry of all) {
    const titleMatch = entry.title.toLowerCase().includes(q);
    const textContent = stripHtml(entry.content_html).toLowerCase();
    const contentMatch = textContent.includes(q);
    const gratitudeMatch = entry.gratitude.some((g) => g.toLowerCase().includes(q));

    if (titleMatch || contentMatch || gratitudeMatch) {
      let moodEmoji: string | null = null;
      if (entry.mood_id) {
        const mood = await db.moods.get(entry.mood_id);
        if (mood) moodEmoji = MOOD_EMOJI_MAP[mood.emoji];
      }

      let snippet = "";
      const idx = textContent.indexOf(q);
      if (idx >= 0) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(textContent.length, idx + q.length + 50);
        snippet = (start > 0 ? "..." : "") + textContent.slice(start, end) + (end < textContent.length ? "..." : "");
      } else {
        snippet = textContent.slice(0, 120) + (textContent.length > 120 ? "..." : "");
      }

      results.push({
        id: entry.id,
        date: entry.date,
        title: entry.title || "Untitled",
        snippet,
        moodEmoji,
      });
    }
  }

  return results;
}

// ─── Calendar helpers ────────────────────────────────────────────────────────

export interface CalendarDay {
  date: string;
  hasEntry: boolean;
  moodEmoji: string | null;
  moodIntensity: number | null;
  wordCount: number;
}

export async function getCalendarMonth(year: number, month: number): Promise<CalendarDay[]> {
  const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
  const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  const entries = await getEntriesByDateRange(startDate, endDate);

  const entryMap = new Map<string, Journal>();
  for (const e of entries) entryMap.set(e.date, e);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
    const entry = entryMap.get(dateStr);
    let moodEmoji: string | null = null;
    let moodIntensity: number | null = null;
    if (entry?.mood_id) {
      const mood = await db.moods.get(entry.mood_id);
      if (mood) {
        moodEmoji = MOOD_EMOJI_MAP[mood.emoji];
        moodIntensity = mood.intensity;
      }
    }
    days.push({
      date: dateStr,
      hasEntry: !!entry,
      moodEmoji,
      moodIntensity,
      wordCount: entry ? stripHtml(entry.content_html).split(/\s+/).filter(Boolean).length : 0,
    });
  }

  return days;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

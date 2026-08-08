/**
 * Life_OS v2 — Counselor context builder.
 *
 * Pulls the user's recent data from Dexie to ground the Counselor's
 * responses. The context is sent to the cloud LLM so it can cite
 * specific entries rather than hallucinating.
 *
 * Runs client-side (the snapshot is sent to the server route, which
 * forwards it to the LLM — the API key never reaches the browser).
 */
import { db, todayStr } from "@/lib/db/life-os-db";
import { MOOD_EMOJI_MAP } from "@/lib/journal/queries";
import { getAllTransactions, getAllCategories } from "@/lib/finance/queries";
import { getStreak as getTaskStreak, getCompletedToday, getTodaysTasks } from "@/lib/tasks/queries";
import { getAchievements, getGoals, getRules, getMotto, getIdentity } from "@/lib/life-manual/queries";
import { getReaderStats } from "@/lib/reader/queries";

export interface ContextSnapshot {
  date: string;
  joinedDaysAgo: number;
  journal: {
    recentEntries: Array<{ date: string; title: string; excerpt: string; mood: string | null }>;
    streak: { current: number; longest: number };
    moodThisWeek: Array<{ date: string; emoji: string; intensity: number } | null>;
    topMoods: Array<{ emoji: string; count: number }>;
  };
  tasks: {
    streak: { current: number; longest: number };
    completedToday: number;
    pendingToday: number;
    recentCompletions: Array<{ title: string; completedAt: string }>;
  };
  finances: {
    monthlyIncome: number;
    monthlyExpense: number;
    savingsRate: number;
    topExpenseCategory: { name: string; emoji: string; amount: number } | null;
    recentTransactions: Array<{ name: string; amount: number; type: string; date: string }>;
  };
  exercise: {
    sessionsThisWeek: number;
    totalVolumeKg: number;
  };
  meditation: {
    sessionsThisWeek: number;
    totalMinutes: number;
  };
  lifeManual: {
    identity: Record<string, string>;
    goals: Record<string, string>;
    rules: Array<{ text: string; tag: string }>;
    achievements: Array<{ title: string; category: string }>;
    motto: string;
  };
  reader: {
    totalBooks: number;
    totalReadingMinutes: number;
    currentBooks: number;
  };
  summary: string; // human-readable summary line
}

export interface ContextStep {
  label: string;
  fn: () => Promise<void>;
}

export async function buildContext(onStep?: (step: string) => void): Promise<ContextSnapshot> {
  const today = todayStr();
  const todayDate = new Date(today);

  // Step 1: Journals + moods
  onStep?.("Reading your recent journals...");
  const allJournals = await db.journals.orderBy("date").reverse().toArray();
  const recentJournals = allJournals.slice(0, 5);
  const journalDates = new Set(allJournals.map((j) => j.date));

  // Journal streak
  let journalCurrent = 0;
  let journalLongest = 0;
  let tempStreak = 0;
  const sortedDates = Array.from(journalDates).sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) tempStreak = 1;
    else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
      if (diff === 1) tempStreak++;
      else { journalLongest = Math.max(journalLongest, tempStreak); tempStreak = 1; }
    }
  }
  journalLongest = Math.max(journalLongest, tempStreak);
  for (let i = 0; i < 365; i++) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (journalDates.has(ds)) journalCurrent++;
    else if (i === 0) continue;
    else break;
  }

  // Moods this week
  const weekAgo = new Date(todayDate);
  weekAgo.setDate(todayDate.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  const weekJournals = allJournals.filter((j) => j.date >= weekAgoStr);
  const moodThisWeek: Array<{ date: string; emoji: string; intensity: number } | null> = [];
  const moodCounts = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const journal = allJournals.find((j) => j.date === ds);
    if (journal?.mood_id) {
      const mood = await db.moods.get(journal.mood_id);
      if (mood) {
        moodThisWeek.push({ date: ds, emoji: MOOD_EMOJI_MAP[mood.emoji] ?? "😐", intensity: mood.intensity });
        moodCounts.set(mood.emoji, (moodCounts.get(mood.emoji) ?? 0) + 1);
      } else {
        moodThisWeek.push(null);
      }
    } else {
      moodThisWeek.push(null);
    }
  }
  const topMoods = Array.from(moodCounts.entries())
    .map(([emoji, count]) => ({ emoji: MOOD_EMOJI_MAP[emoji as keyof typeof MOOD_EMOJI_MAP] ?? "😐", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const recentEntries = await Promise.all(
    recentJournals.map(async (j) => {
      let mood: string | null = null;
      if (j.mood_id) {
        const m = await db.moods.get(j.mood_id);
        mood = m ? MOOD_EMOJI_MAP[m.emoji] ?? null : null;
      }
      const excerpt = stripHtml(j.content_html).slice(0, 200);
      return { date: j.date, title: j.title || "Untitled", excerpt, mood };
    }),
  );

  // Step 2: Tasks
  onStep?.("Checking your task streak...");
  const [taskStreak, completedToday, todaysTasks] = await Promise.all([
    getTaskStreak(),
    getCompletedToday(),
    getTodaysTasks(),
  ]);
  const recentCompletions = (await db.tasks
    .where("completed_at").above(0)
    .reverse()
    .limit(5)
    .toArray())
    .filter((t) => t.completed_at)
    .map((t) => ({ title: t.title, completedAt: new Date(t.completed_at!).toLocaleString() }));

  // Step 3: Finances
  onStep?.("Reviewing your spending...");
  const [allTxns, categories] = await Promise.all([getAllTransactions(), getAllCategories()]);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const monthPrefix = today.slice(0, 7);
  const monthTxns = allTxns.filter((t) => t.date.startsWith(monthPrefix));
  const monthlyIncome = monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;

  // Top expense category
  const expenseByCat = new Map<string, number>();
  for (const t of monthTxns.filter((t) => t.type === "expense")) {
    expenseByCat.set(t.category_id, (expenseByCat.get(t.category_id) ?? 0) + t.amount);
  }
  let topExpenseCategory: { name: string; emoji: string; amount: number } | null = null;
  if (expenseByCat.size > 0) {
    const top = Array.from(expenseByCat.entries()).sort((a, b) => b[1] - a[1])[0];
    const cat = catMap.get(top[0]);
    topExpenseCategory = { name: cat?.name ?? "Unknown", emoji: cat?.emoji ?? "❓", amount: top[1] };
  }

  const recentTransactions = allTxns.slice(0, 5).map((t) => {
    const cat = catMap.get(t.category_id);
    return { name: cat?.name ?? "Unknown", amount: t.amount, type: t.type, date: t.date };
  });

  // Step 4: Exercise
  onStep?.("Looking at your workouts...");
  const weekStart = new Date(todayDate);
  const dow = todayDate.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  weekStart.setDate(todayDate.getDate() + mondayOffset);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const exerciseSessions = await db.exercise_sessions
    .where("started_at").above(weekStart.getTime())
    .toArray();
  const exerciseThisWeek = exerciseSessions.length;
  const totalVolumeKg = exerciseSessions.reduce((s, e) => s + e.total_volume_kg, 0);

  // Step 5: Meditation
  onStep?.("Reviewing your meditation...");
  const meditationSessions = await db.meditation_sessions
    .where("started_at").above(weekStart.getTime())
    .toArray();
  const meditationThisWeek = meditationSessions.length;
  const meditationMinutes = meditationSessions.reduce((s, m) => s + Math.round(m.duration_s / 60), 0);

  // Step 6: Life Manual (identity, goals, rules, achievements, motto)
  onStep?.("Reading your life manual...");
  const [identityData, goalsData, rulesData, achievementsData, mottoText] = await Promise.all([
    getIdentity(), getGoals(), getRules(), getAchievements(), getMotto(),
  ]);

  // Step 7: Reader stats
  onStep?.("Checking your reading...");
  const readerStats = await getReaderStats().catch(() => null);

  // Step 8: Build summary
  onStep?.("Reflecting...");
  const profile = await db.user_profile.get("single");
  const joinedDaysAgo = profile ? Math.floor((Date.now() - profile.joined_at) / 86_400_000) : 0;

  const summaryParts: string[] = [];
  const userName = profile?.name ?? "Friend";
  const userAge = profile?.age;
  summaryParts.push(`User's name is ${userName}.${userAge ? ` Age: ${userAge}.` : ""} They have been using Life_OS for ${joinedDaysAgo} day(s).`);
  if (journalCurrent > 0) summaryParts.push(`Journal streak: ${journalCurrent} day(s).`);
  if (taskStreak.current > 0) summaryParts.push(`Task streak: ${taskStreak.current} day(s).`);
  summaryParts.push(`Today: ${completedToday.length} task(s) completed, ${todaysTasks.length} pending.`);
  if (monthlyIncome > 0 || monthlyExpense > 0) {
    summaryParts.push(`This month: ${monthlyIncome} income, ${monthlyExpense} expense, ${savingsRate.toFixed(0)}% savings rate.`);
  }
  if (exerciseThisWeek > 0) summaryParts.push(`${exerciseThisWeek} workout(s) this week.`);
  if (meditationThisWeek > 0) summaryParts.push(`${meditationThisWeek} meditation session(s) (${meditationMinutes} min) this week.`);

  return {
    date: today,
    joinedDaysAgo,
    journal: {
      recentEntries,
      streak: { current: journalCurrent, longest: journalLongest },
      moodThisWeek,
      topMoods,
    },
    tasks: {
      streak: taskStreak,
      completedToday: completedToday.length,
      pendingToday: todaysTasks.length,
      recentCompletions,
    },
    finances: {
      monthlyIncome,
      monthlyExpense,
      savingsRate,
      topExpenseCategory,
      recentTransactions,
    },
    exercise: {
      sessionsThisWeek: exerciseThisWeek,
      totalVolumeKg,
    },
    meditation: {
      sessionsThisWeek: meditationThisWeek,
      totalMinutes: meditationMinutes,
    },
    lifeManual: {
      identity: identityData,
      goals: goalsData,
      rules: rulesData.map((r) => ({ text: r.text, tag: r.tag })),
      achievements: achievementsData.map((a) => ({ title: a.title, category: a.category })),
      motto: mottoText,
    },
    reader: {
      totalBooks: readerStats?.totalBooks ?? 0,
      totalReadingMinutes: readerStats?.totalReadingMinutes ?? 0,
      currentBooks: readerStats?.currentBooks.length ?? 0,
    },
    summary: summaryParts.join(" "),
  };
}

// ─── Serialize for LLM prompt ───────────────────────────────────────────────

export function serializeContext(ctx: ContextSnapshot): string {
  const lines: string[] = [];
  lines.push(`=== USER CONTEXT (${ctx.date}) ===`);
  lines.push(ctx.summary);
  lines.push("");

  if (ctx.journal.recentEntries.length > 0) {
    lines.push("RECENT JOURNAL ENTRIES:");
    for (const e of ctx.journal.recentEntries.slice(0, 3)) {
      lines.push(`  [${e.date}] ${e.mood ?? "—"} ${e.title}`);
      if (e.excerpt) lines.push(`    "${e.excerpt.slice(0, 150)}${e.excerpt.length > 150 ? "..." : ""}"`);
    }
    lines.push("");
  }

  if (ctx.journal.moodThisWeek.some((m) => m !== null)) {
    lines.push("MOOD THIS WEEK (last 7 days):");
    const moodLine = ctx.journal.moodThisWeek
      .map((m, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return m ? `${d.toISOString().slice(5, 10)}:${m.emoji}(${m.intensity})` : `${d.toISOString().slice(5, 10)}:—`;
      })
      .join("  ");
    lines.push(`  ${moodLine}`);
    if (ctx.journal.topMoods.length > 0) {
      lines.push(`  Top: ${ctx.journal.topMoods.map((m) => `${m.emoji}×${m.count}`).join(", ")}`);
    }
    lines.push("");
  }

  if (ctx.tasks.recentCompletions.length > 0) {
    lines.push("RECENT TASK COMPLETIONS:");
    for (const t of ctx.tasks.recentCompletions.slice(0, 5)) {
      lines.push(`  ✓ ${t.title} (${t.completedAt})`);
    }
    lines.push("");
  }

  if (ctx.finances.monthlyIncome > 0 || ctx.finances.monthlyExpense > 0) {
    lines.push("FINANCES THIS MONTH:");
    lines.push(`  Income: $${ctx.finances.monthlyIncome.toFixed(2)}`);
    lines.push(`  Expense: $${ctx.finances.monthlyExpense.toFixed(2)}`);
    lines.push(`  Savings rate: ${ctx.finances.savingsRate.toFixed(1)}%`);
    if (ctx.finances.topExpenseCategory) {
      lines.push(`  Top category: ${ctx.finances.topExpenseCategory.emoji} ${ctx.finances.topExpenseCategory.name} ($${ctx.finances.topExpenseCategory.amount.toFixed(2)})`);
    }
    lines.push("");
  }

  if (ctx.exercise.sessionsThisWeek > 0) {
    lines.push(`EXERCISE: ${ctx.exercise.sessionsThisWeek} session(s) this week, ${ctx.exercise.totalVolumeKg.toFixed(1)} kg total volume.`);
    lines.push("");
  }

  if (ctx.meditation.sessionsThisWeek > 0) {
    lines.push(`MEDITATION: ${ctx.meditation.sessionsThisWeek} session(s), ${ctx.meditation.totalMinutes} min this week.`);
    lines.push("");
  }

  // Life Manual
  if (ctx.lifeManual.motto) {
    lines.push(`USER'S MOTTO: "${ctx.lifeManual.motto}"`);
    lines.push("");
  }
  if (ctx.lifeManual.identity.who_am_i) {
    lines.push(`WHO THEY ARE: ${ctx.lifeManual.identity.who_am_i.slice(0, 200)}`);
    lines.push("");
  }
  if (ctx.lifeManual.identity.who_i_want_to_be) {
    lines.push(`WHO THEY WANT TO BECOME: ${ctx.lifeManual.identity.who_i_want_to_be.slice(0, 200)}`);
    lines.push("");
  }
  if (ctx.lifeManual.goals.one_year_vision) {
    lines.push(`1-YEAR VISION: ${ctx.lifeManual.goals.one_year_vision.slice(0, 150)}`);
    lines.push("");
  }
  if (ctx.lifeManual.rules.length > 0) {
    lines.push("PERSONAL RULES:");
    for (const r of ctx.lifeManual.rules.slice(0, 5)) {
      lines.push(`  § ${r.text} [${r.tag}]`);
    }
    lines.push("");
  }
  if (ctx.lifeManual.achievements.length > 0) {
    lines.push("ACHIEVEMENTS:");
    for (const a of ctx.lifeManual.achievements.slice(0, 5)) {
      lines.push(`  🏆 ${a.title} [${a.category}]`);
    }
    lines.push("");
  }

  // Reader
  if (ctx.reader.totalBooks > 0) {
    lines.push(`READING: ${ctx.reader.totalBooks} book(s) in library, ${ctx.reader.totalReadingMinutes} min total, ${ctx.reader.currentBooks} in progress.`);
    lines.push("");
  }

  lines.push("=== END CONTEXT ===");
  return lines.join("\n");
}

function stripHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, "");
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

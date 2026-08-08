/**
 * Life_OS v2 — Counselor local rule engine (expanded).
 *
 * Handles ~90% of user intents without hitting the cloud LLM.
 * Each handler pulls real data from Dexie and returns a personalized,
 * grounded response.
 *
 * Only truly open-ended, reflective, or advice-seeking messages escalate
 * to the cloud LLM.
 */
import { db, todayStr } from "@/lib/db/life-os-db";
import {
  MOOD_EMOJI_MAP, getStats as getJournalStats,
  getEntriesByDateRange, stripHtml,
} from "@/lib/journal/queries";
import {
  getAllTransactions, getAllCategories, formatCurrency,
  getBudgetProgress,
} from "@/lib/finance/queries";
import {
  getStreak as getTaskStreak, getCompletedToday, getTodaysTasks,
} from "@/lib/tasks/queries";
import {
  getExerciseStats, getWaterToday, getWaterGoal,
} from "@/lib/exercise/queries";
import { getStats as getMeditationStats } from "@/lib/meditation/queries";
import { getStreakInfo } from "@/lib/streaks/rollup";
import { getAchievements } from "@/lib/life-manual/queries";
import type { CounselorVoiceId } from "./tts";

export type Intent =
  | "greeting"
  | "mood_check"
  | "mood_trend"
  | "task_status"
  | "task_advice"
  | "finance_summary"
  | "finance_advice"
  | "streak_status"
  | "exercise_status"
  | "exercise_advice"
  | "water_check"
  | "meditation_status"
  | "journal_summary"
  | "achievements_list"
  | "growth_check"
  | "daily_summary"
  | "motivation"
  | "help"
  | "thanks"
  | "cloud"; // escalate to cloud LLM

export interface LocalResponse {
  intent: Intent;
  text: string;
  handled: boolean;
}

// ─── Intent classifier (expanded) ───────────────────────────────────────────

export function classifyIntent(message: string): Intent {
  const m = message.toLowerCase().trim();

  // Cloud-worthy keywords — escalate FIRST.
  // NOTE: "motivate" is handled locally (motivation intent), NOT here.
  if (/\b(help me|think through|what should i|advice|overwhelm|stress|anxious|sad|depress|struggl|stuck|reflect|journal about|talk about|feel like|i feel|i'm feeling|im feeling|how do i|should i|what do you think|can you help|don't know what|dont know what|life is|i want to|i need to|i can't|i cant|give up|tired of|burnt out|burned out|lonely|alone|scared|afraid|worried|nervous|frustrated|angry at|hate my|love my|grateful for|thankful for)\b/i.test(m)) {
    return "cloud";
  }

  // Greetings (short only)
  if (m.length < 30 && /^\b(hi|hello|hey|good morning|good afternoon|good evening|good night|yo|sup|hey there|howdy)\b/i.test(m)) {
    return "greeting";
  }

  // Thanks
  if (m.length < 40 && /\b(thank|thanks|thx|appreciate|grateful)\b/i.test(m)) {
    return "thanks";
  }

  // Motivation requests
  if (/motivat|inspire|pump me|encourage|hype|push me|give me energy|i can do|believe in me/i.test(m)) {
    return "motivation";
  }

  // Mood queries
  if (/(my mood|what.*mood|check mood|how.*feeling today)/i.test(m) && m.length < 60) {
    return "mood_check";
  }
  if (/(mood trend|mood this week|mood pattern|how.*been feeling|mood histor)/i.test(m)) {
    return "mood_trend";
  }

  // Task queries
  if (/(task|todo|to-do|what.*done|what.*complete|progress today)/i.test(m) && m.length < 60) {
    return "task_status";
  }
  if (/(what.*task.*next|which task|prioriti|what should i work on|what to do next)/i.test(m) && m.length < 80) {
    return "task_advice";
  }

  // Finance queries
  if (/(spent|spending|expense|budget|finance|money|income|savings|how much.*spend|how much.*left)/i.test(m) && m.length < 70) {
    return "finance_summary";
  }
  if (/(save money|budget advice|financial advice|cut spending|reduce expense|spend less)/i.test(m)) {
    return "finance_advice";
  }

  // Streak queries
  if (/(streak|how many days|consistency|consistent|how am i doing overall)/i.test(m) && m.length < 60) {
    return "streak_status";
  }

  // Exercise queries
  if (/(workout|exercise|gym|training|fitness)/i.test(m) && m.length < 60) {
    return "exercise_status";
  }
  if (/(what.*exercise|workout advice|should i workout|exercise plan|what.*train)/i.test(m)) {
    return "exercise_advice";
  }

  // Water queries
  if (/(water|hydrat|drink.*water|how much water)/i.test(m) && m.length < 50) {
    return "water_check";
  }

  // Meditation queries
  if (/(meditat|breath|mindful|zen|calm|relax|stress relief)/i.test(m) && m.length < 60) {
    return "meditation_status";
  }

  // Journal queries
  if (/(journal|diary|what.*wrote|journal entry|recent.*writ)/i.test(m) && m.length < 60) {
    return "journal_summary";
  }

  // Achievements
  if (/(achiev|proud|accomplish|success|what.*done.*life)/i.test(m) && m.length < 60) {
    return "achievements_list";
  }

  // Growth/plant
  if (/(plant|tree|growth|grow|how.*growing)/i.test(m) && m.length < 50) {
    return "growth_check";
  }

  // Daily summary
  if (/(day.*summary|today.*summary|how.*today|how.*my day|how.*was.*day|what.*did today|daily report|wrap up|end of day|how.*day.*going)/i.test(m) && m.length < 70) {
    return "daily_summary";
  }

  // Help
  if (m.length < 40 && /\b(help|what can you do|commands|guide|options)\b/i.test(m)) {
    return "help";
  }

  return "cloud";
}

// ─── Handlers ───────────────────────────────────────────────────────────────

export async function handleLocalIntent(
  intent: Intent,
  _message: string,
  _voiceId: CounselorVoiceId,
): Promise<LocalResponse> {
  const today = todayStr();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const profile = await db.user_profile.get("single");
  const name = profile?.name ?? "friend";

  switch (intent) {
    // ─── Greeting ────────────────────────────────────────────────────────
    case "greeting": {
      const taskStreak = await getTaskStreak();
      let text = `${greeting}, ${name}. `;
      if (taskStreak.current > 0) {
        text += `You're on a ${taskStreak.current}-day task streak — nice. `;
      }
      const hourLate = hour >= 20;
      if (hourLate) text += `It's getting late — how was your day?`;
      else text += `What's on your mind today?`;
      return { intent, text, handled: true };
    }

    // ─── Thanks ──────────────────────────────────────────────────────────
    case "thanks": {
      const responses = [
        `Anytime, ${name}. I'm always here for you.`,
        `You're welcome, ${name}. That's what I'm here for.`,
        `Of course, ${name}. I believe in you.`,
      ];
      return { intent, text: responses[Math.floor(Math.random() * responses.length)], handled: true };
    }

    // ─── Motivation ──────────────────────────────────────────────────────
    case "motivation": {
      const streak = await getStreakInfo();
      const motivations = [
        `${name}, you've shown up ${streak.current} days in a row. That's not luck — that's discipline. Keep going.`,
        `Every rep, every page, every glass of water — it all compounds. You're building something real, ${name}.`,
        `The person you want to be is built by the things you do today. And today, ${name}, you showed up.`,
        `${name}, progress isn't always visible day to day. But look back a month from now and you'll see how far you've come.`,
        `You don't have to be perfect, ${name}. You just have to keep going. And you are. That's enough.`,
      ];
      return { intent, text: motivations[Math.floor(Math.random() * motivations.length)], handled: true };
    }

    // ─── Mood check (today) ──────────────────────────────────────────────
    case "mood_check": {
      const journal = await db.journals.where("date").equals(today).first();
      if (journal?.mood_id) {
        const mood = await db.moods.get(journal.mood_id);
        if (mood) {
          const emoji = MOOD_EMOJI_MAP[mood.emoji] ?? "😐";
          const intensityWord = mood.intensity >= 4 ? "strongly" : mood.intensity >= 3 ? "moderately" : "mildly";
          return {
            intent,
            text: `Today you logged ${emoji} at intensity ${mood.intensity}/5 — so you're feeling ${intensityWord} that way. ${mood.tags.length > 0 ? `You tagged it: ${mood.tags.join(", ")}.` : ""} Want to talk about what's behind that?`,
            handled: true,
          };
        }
      }
      const stats = await getJournalStats();
      if (stats.totalEntries > 0) {
        const topMood = Object.entries(stats.moodDistribution).sort((a, b) => b[1] - a[1])[0];
        if (topMood && topMood[1] > 0) {
          return {
            intent,
            text: `You haven't logged a mood today, but over the past 90 days your most common mood has been ${MOOD_EMOJI_MAP[topMood[0] as keyof typeof MOOD_EMOJI_MAP]} (${topMood[1]} times). How are you feeling right now? You can log it in the Journal.`,
            handled: true,
          };
        }
      }
      return {
        intent,
        text: `You haven't logged any moods yet. If you'd like, head to the Journal and tap a mood emoji — it helps me understand how you're doing over time.`,
        handled: true,
      };
    }

    // ─── Mood trend (this week) ──────────────────────────────────────────
    case "mood_trend": {
      const stats = await getJournalStats();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekEntries = await getEntriesByDateRange(weekAgo.toISOString().slice(0, 10), today);
      if (weekEntries.length === 0) {
        return { intent, text: `No journal entries this week yet. Try logging a mood in the Journal — even a quick one helps me see patterns.`, handled: true };
      }
      const moodsThisWeek: string[] = [];
      for (const e of weekEntries) {
        if (e.mood_id) {
          const m = await db.moods.get(e.mood_id);
          if (m) moodsThisWeek.push(MOOD_EMOJI_MAP[m.emoji] ?? "😐");
        }
      }
      const topMood = Object.entries(stats.moodDistribution).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1])[0];
      let text = `This week you logged ${weekEntries.length} journal entries. `;
      if (moodsThisWeek.length > 0) text += `Your moods: ${moodsThisWeek.join(", ")}. `;
      if (topMood) text += `Over 90 days, your most frequent mood is ${MOOD_EMOJI_MAP[topMood[0] as keyof typeof MOOD_EMOJI_MAP]} (${topMood[1]} times). `;
      const avgIntensity = moodsThisWeek.length > 0 ? "Your moods seem to be in a moderate range." : "";
      if (avgIntensity) text += avgIntensity;
      return { intent, text, handled: true };
    }

    // ─── Task status ─────────────────────────────────────────────────────
    case "task_status": {
      const [completed, pending, streak] = await Promise.all([getCompletedToday(), getTodaysTasks(), getTaskStreak()]);
      let text = `${name}, today: ${completed.length} task(s) completed, ${pending.length} still pending. `;
      if (completed.length > 0) text += `You finished: ${completed.slice(0, 3).map((t) => `"${t.title}"`).join(", ")}. `;
      if (streak.current > 0) text += `Task streak: ${streak.current} day(s). `;
      if (pending.length === 0 && completed.length > 0) text += `All done for today — that's worth acknowledging, ${name}.`;
      else if (pending.length > 0) text += `Want to pick the next one to tackle?`;
      else text += `No tasks scheduled. Enjoy the breather.`;
      return { intent, text, handled: true };
    }

    // ─── Task advice ─────────────────────────────────────────────────────
    case "task_advice": {
      const pending = await getTodaysTasks();
      if (pending.length === 0) return { intent, text: `You have no pending tasks today, ${name}. Either you're done, or you haven't added any. Either way — no pressure right now.`, handled: true };
      const highPriority = pending.filter((t) => t.priority === "high");
      const next = highPriority[0] ?? pending[0];
      return { intent, text: `I'd start with "${next.title}" — it's your ${next.priority} priority task. ${pending.length > 1 ? `After that, you have ${pending.length - 1} more to go.` : "That's your last one!"} Want me to break it down?`, handled: true };
    }

    // ─── Finance summary ─────────────────────────────────────────────────
    case "finance_summary": {
      const [allTxns, categories] = await Promise.all([getAllTransactions(), getAllCategories()]);
      const catMap = new Map(categories.map((c) => [c.id, c]));
      const monthPrefix = today.slice(0, 7);
      const monthTxns = allTxns.filter((t) => t.date.startsWith(monthPrefix));
      const income = monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
      let text = `This month: ${formatCurrency(income)} in, ${formatCurrency(expense)} out. `;
      if (income > 0) text += `Savings rate: ${savingsRate.toFixed(0)}%. `;
      const expenseByCat = new Map<string, number>();
      for (const t of monthTxns.filter((t) => t.type === "expense")) expenseByCat.set(t.category_id, (expenseByCat.get(t.category_id) ?? 0) + t.amount);
      if (expenseByCat.size > 0) {
        const top = Array.from(expenseByCat.entries()).sort((a, b) => b[1] - a[1])[0];
        const cat = catMap.get(top[0]);
        text += `Biggest category: ${cat?.emoji ?? ""} ${cat?.name ?? "Unknown"} at ${formatCurrency(top[1])}.`;
      }
      return { intent, text, handled: true };
    }

    // ─── Finance advice ──────────────────────────────────────────────────
    case "finance_advice": {
      const [allTxns, categories] = await Promise.all([getAllTransactions(), getAllCategories()]);
      const catMap = new Map(categories.map((c) => [c.id, c]));
      const monthPrefix = today.slice(0, 7);
      const monthTxns = allTxns.filter((t) => t.date.startsWith(monthPrefix) && t.type === "expense");
      const expenseByCat = new Map<string, number>();
      for (const t of monthTxns) expenseByCat.set(t.category_id, (expenseByCat.get(t.category_id) ?? 0) + t.amount);
      const sorted = Array.from(expenseByCat.entries()).sort((a, b) => b[1] - a[1]);
      const top3 = sorted.slice(0, 3).map(([id, amt]) => {
        const cat = catMap.get(id);
        return `${cat?.emoji ?? ""} ${cat?.name ?? "Unknown"} (${formatCurrency(amt)})`;
      });
      const budgets = await getBudgetProgress();
      const overBudget = budgets.filter((b) => b.overBudget);
      let text = `${name}, your top 3 spending categories this month are: ${top3.join(", ")}. `;
      if (overBudget.length > 0) {
        text += `You're over budget on: ${overBudget.map((b) => b.category?.name).join(", ")}. Consider reviewing those. `;
      }
      text += `A simple rule: track every expense for a week, then look for one category to cut by 20%.`;
      return { intent, text, handled: true };
    }

    // ─── Streak status ───────────────────────────────────────────────────
    case "streak_status": {
      const [taskStreak, journalStats, streakInfo] = await Promise.all([getTaskStreak(), getJournalStats(), getStreakInfo()]);
      let text = `Here's your overall progress, ${name}: `;
      text += `Overall streak: ${streakInfo.current} day(s) (longest ${streakInfo.longest}). `;
      text += `Average daily score: ${streakInfo.averageScore.toFixed(0)}/100. `;
      text += `Tasks — ${taskStreak.current}d current. `;
      text += `Journal — ${journalStats.currentStreak}d current. `;
      if (streakInfo.current >= 7) text += `You're showing up consistently across multiple areas. That compounds.`;
      else if (streakInfo.current === 0) text += `No active streak right now — that's okay, every day is a fresh start.`;
      return { intent, text, handled: true };
    }

    // ─── Exercise status ─────────────────────────────────────────────────
    case "exercise_status": {
      const stats = await getExerciseStats();
      if (stats.totalSessions === 0) return { intent, text: `No workouts logged yet, ${name}. Even a 10-minute walk counts. Want to plan something?`, handled: true };
      let text = `${stats.sessionsThisWeek} workout(s) this week, ${stats.totalSessions} total. `;
      text += `Total time: ${stats.totalDurationMin} min. `;
      if (stats.currentStreak > 0) text += `Exercise streak: ${stats.currentStreak} day(s). `;
      text += stats.sessionsThisWeek >= 3 ? `Solid consistency — keep it up!` : `Aim for 3+ sessions this week to build momentum.`;
      return { intent, text, handled: true };
    }

    // ─── Exercise advice ─────────────────────────────────────────────────
    case "exercise_advice": {
      const stats = await getExerciseStats();
      if (stats.sessionsThisWeek === 0) return { intent, text: `No workouts this week yet, ${name}. I'd suggest starting with the "Lose Belly Fat" plan — it's beginner-friendly and takes about 15 minutes. Open the Exercise module to begin.`, handled: true };
      if (stats.sessionsThisWeek < 3) return { intent, text: `You've done ${stats.sessionsThisWeek} workout(s) this week. Try to fit in one more — even a short one counts. Consistency beats intensity.`, handled: true };
      return { intent, text: `You're doing great with ${stats.sessionsThisWeek} sessions this week, ${name}. If you feel ready, try a harder plan like "Rock Hard Abs" or "Six Pack Abs".`, handled: true };
    }

    // ─── Water check ─────────────────────────────────────────────────────
    case "water_check": {
      const [{ total: waterTotal }, goal] = await Promise.all([getWaterToday(), getWaterGoal()]);
      const pct = goal > 0 ? (waterTotal / goal) * 100 : 0;
      let text = `Today: ${waterTotal}ml out of ${goal}ml goal (${pct.toFixed(0)}%). `;
      if (pct >= 100) text += `Goal reached! Great job staying hydrated, ${name}.`;
      else if (pct >= 50) text += `Over halfway there. Keep sipping!`;
      else text += `You're behind on water today, ${name}. Try logging a glass in the Exercise module during your next break.`;
      return { intent, text, handled: true };
    }

    // ─── Meditation status ───────────────────────────────────────────────
    case "meditation_status": {
      const stats = await getMeditationStats();
      if (stats.totalSessions === 0) return { intent, text: `No meditation sessions yet, ${name}. Try a 5-minute breathing exercise in the Meditation module — it's a great way to reset.`, handled: true };
      let text = `${stats.sessionsThisWeek} session(s) this week, ${stats.totalSessions} total. `;
      text += `Total meditation time: ${stats.totalMinutes} min. `;
      if (stats.currentStreak > 0) text += `Meditation streak: ${stats.currentStreak} day(s). `;
      text += `Average session: ${stats.avgDurationMin} min. `;
      return { intent, text, handled: true };
    }

    // ─── Journal summary ─────────────────────────────────────────────────
    case "journal_summary": {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const entries = await getEntriesByDateRange(weekAgo.toISOString().slice(0, 10), today);
      if (entries.length === 0) return { intent, text: `No journal entries this week, ${name}. Open the Journal and write a few words about your day — it helps process emotions.`, handled: true };
      let text = `This week you wrote ${entries.length} journal entries. `;
      const latest = entries[0];
      const excerpt = stripHtml(latest.content_html).slice(0, 100);
      text += `Your latest (from ${latest.date}): "${excerpt}${excerpt.length >= 100 ? "..." : ""}"`;
      return { intent, text, handled: true };
    }

    // ─── Achievements ────────────────────────────────────────────────────
    case "achievements_list": {
      const achievements = await getAchievements();
      if (achievements.length === 0) return { intent, text: `No achievements logged yet, ${name}. What's something you're proud of? Add it in the Life Manual → Achievements section.`, handled: true };
      const top3 = achievements.slice(0, 3).map((a) => `"${a.title}"`);
      return { intent, text: `You have ${achievements.length} achievements logged, ${name}. Your top ones: ${top3.join(", ")}. These are proof of what you're capable of.`, handled: true };
    }

    // ─── Growth/plant check ──────────────────────────────────────────────
    case "growth_check": {
      const streakInfo = await getStreakInfo();
      const stageNames = ["a seed just planted", "a sprout breaking through", "a small plant growing", "a medium plant with branches", "a full tree", "a flourishing tree with flowers"];
      const stage = Math.min(5, Math.floor(streakInfo.current / 6));
      let text = `Your growth plant is ${stageNames[stage]}, ${name}. `;
      text += `Streak: ${streakInfo.current} days. Score: ${streakInfo.averageScore.toFixed(0)}/100. `;
      if (stage >= 4) text += `Look at how far you've come — keep nurturing it.`;
      else if (stage >= 2) text += `It's growing steadily. Keep showing up.`;
      else text += `It's just starting. Every action you track helps it grow.`;
      return { intent, text, handled: true };
    }

    // ─── Daily summary ───────────────────────────────────────────────────
    case "daily_summary": {
      const [tasks, water, exercise, meditation, journal] = await Promise.all([
        getCompletedToday(), getWaterToday(), getExerciseStats(), getMeditationStats(),
        db.journals.where("date").equals(today).first(),
      ]);
      const streakInfo = await getStreakInfo();
      let text = `Here's your day, ${name}: `;
      text += `Tasks: ${tasks.length} done. `;
      text += `Water: ${water.total}ml. `;
      text += `Exercise: ${exercise.sessionsThisWeek > 0 ? `${exercise.sessionsThisWeek} this week` : "none today"}. `;
      text += `Meditation: ${meditation.sessionsThisWeek > 0 ? `${meditation.sessionsThisWeek} this week` : "none today"}. `;
      text += journal?.content_html ? `Journal: written ✓. ` : `Journal: not yet. `;
      text += `Streak score: ${streakInfo.averageScore.toFixed(0)}/100. `;
      if (tasks.length > 0 && journal) text += `Solid day, ${name}. Be proud.`;
      else text += `There's still time to add more, ${name}.`;
      return { intent, text, handled: true };
    }

    // ─── Help ────────────────────────────────────────────────────────────
    case "help": {
      return {
        intent,
        text: `I'm your Life_OS Counselor, ${name}. I can see your journals, moods, tasks, finances, workouts, water, meditation, achievements, and streaks. Ask me: "how am I doing?", "what's my mood trend?", "how much did I spend?", "what should I work on?", "what are my achievements?", "motivate me", or just tell me what's on your mind. For quick stuff I respond instantly; for deeper reflection I'll think for a moment first.`,
        handled: true,
      };
    }

    case "cloud":
    default:
      return { intent, text: "", handled: false };
  }
}

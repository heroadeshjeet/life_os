"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Flame, Droplets, Dumbbell, BookHeart, ListTodo, Wallet,
  Wind, Brain, Sparkles, ArrowRight, Calendar,
} from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { getStreakInfo, recomputeToday, type StreakInfo } from "@/lib/streaks/rollup";

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function Dashboard() {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await recomputeToday();
      const info = await getStreakInfo();
      if (!cancelled) setStreak(info);
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const currentStreak = streak?.current ?? 0;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{TODAY}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Good to see you.
        </h1>
        <p className="text-sm text-muted-foreground">
          All 9 modules are live. Your journal, tasks, finances, exercise, vault, meditation,
          AI Counselor, and streak calendar are all connected and feeding into your daily score.
        </p>
      </div>

      {/* Streak hero card */}
      <Card
        className="overflow-hidden border-amber-200 dark:border-amber-900/50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setActiveModule("streaks")}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30">
                <Flame className="h-10 w-10 text-orange-500" />
                <div className="absolute -bottom-1 -right-1 rounded-full bg-background px-2 py-0.5 text-xs font-bold border">
                  {currentStreak}
                </div>
              </div>
              <div>
                <div className="text-xl font-bold">
                  {currentStreak === 0
                    ? "Start your streak today"
                    : `${currentStreak} day${currentStreak === 1 ? "" : "s"} strong`}
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentStreak === 0
                    ? "Complete any one tracked activity today to begin. A journal entry, a glass of water, a 5-minute meditation — anything counts."
                    : currentStreak === (streak?.longest ?? 0)
                    ? "🔥 On your longest streak ever — keep going!"
                    : `${(streak?.longest ?? 0) - currentStreak} days to beat your record of ${streak?.longest ?? 0}.`}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widget grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's tasks (placeholder) */}
        <WidgetCard
          title="Today's tasks"
          icon={<ListTodo className="h-4 w-4" />}
          accent="text-sky-600 dark:text-sky-400"
          onClick={() => setActiveModule("tasks")}
          phase={4}
        >
          <div className="text-sm text-muted-foreground">No tasks yet. Tap the Tasks module to add one.</div>
        </WidgetCard>

        {/* Water ring (placeholder) */}
        <WidgetCard
          title="Water today"
          icon={<Droplets className="h-4 w-4" />}
          accent="text-cyan-600 dark:text-cyan-400"
          onClick={() => setActiveModule("exercise")}
          phase={7}
        >
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">0 ml</span>
              <span className="text-xs text-muted-foreground">/ 2500 ml goal</span>
            </div>
            <Progress value={0} className="h-2" />
          </div>
        </WidgetCard>

        {/* Workout of the day */}
        <WidgetCard
          title="Today's workout"
          icon={<Dumbbell className="h-4 w-4" />}
          accent="text-emerald-600 dark:text-emerald-400"
          onClick={() => setActiveModule("exercise")}
          phase={7}
        >
          <div className="text-sm text-muted-foreground">
            Tap to start a workout. Strength, cardio, yoga, HIIT, mobility, and skill plans available.
          </div>
        </WidgetCard>

        {/* Mood graph */}
        <WidgetCard
          title="Mood this week"
          icon={<BookHeart className="h-4 w-4" />}
          accent="text-rose-600 dark:text-rose-400"
          onClick={() => setActiveModule("journal")}
          phase={2}
        >
          <div className="text-sm text-muted-foreground">No moods logged yet. Open Journal to log one.</div>
        </WidgetCard>

        {/* Spending vs budget */}
        <WidgetCard
          title="Spending this month"
          icon={<Wallet className="h-4 w-4" />}
          accent="text-teal-600 dark:text-teal-400"
          onClick={() => setActiveModule("finances")}
          phase={3}
        >
          <div className="text-sm text-muted-foreground">Open Finances to log your first transaction.</div>
        </WidgetCard>

        {/* Meditation streak */}
        <WidgetCard
          title="Meditation"
          icon={<Wind className="h-4 w-4" />}
          accent="text-cyan-600 dark:text-cyan-400"
          onClick={() => setActiveModule("meditation")}
          phase={9}
        >
          <div className="text-sm text-muted-foreground">Open Meditation to start a session.</div>
        </WidgetCard>
      </div>

      {/* Counselor daily note */}
      <Card className="border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Counselor&apos;s note
          </CardTitle>
          <CardDescription>
            Your AI Counselor reads your journals, moods, exercise, and spending before responding.
            Open Counselor to start chatting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 p-4 text-sm italic text-violet-900 dark:text-violet-100">
            &ldquo;I&apos;ll be here once you have a few days of data. Until then — welcome to Life_OS.
            Take a breath, look around, and know that everything you log here is yours, encrypted,
            and never leaves this device.&rdquo;
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => setActiveModule("counselor")}
          >
            Open Counselor <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* Modules overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Your modules
          </CardTitle>
          <CardDescription>
            9 interconnected modules, all feeding into your daily streak score.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <ModuleChip emoji="📊" label="Dashboard" />
            <ModuleChip emoji="🔥" label="Streaks" />
            <ModuleChip emoji="🧠" label="Counselor" />
            <ModuleChip emoji="📖" label="Journal" />
            <ModuleChip emoji="✅" label="Tasks" />
            <ModuleChip emoji="💪" label="Exercise" />
            <ModuleChip emoji="💰" label="Finances" />
            <ModuleChip emoji="🔒" label="Vault" />
            <ModuleChip emoji="🫁" label="Meditation" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WidgetCard({
  title,
  icon,
  accent,
  onClick,
  phase,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  onClick: () => void;
  phase?: number;
  children: React.ReactNode;
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <span className={accent}>{icon}</span>
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ModuleChip({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <span className="text-lg">{emoji}</span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

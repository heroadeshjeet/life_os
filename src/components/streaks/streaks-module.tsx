"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Flame, ChevronLeft, ChevronRight, X, BookHeart, ListTodo,
  Droplets, Dumbbell, Wind, Wallet, TrendingUp, Award, Calendar as CalIcon,
} from "lucide-react";
import {
  getStreakInfo, getCalendarMonth, getDayRollup,
  recomputeToday,
  type StreakInfo, type CalendarCell,
} from "@/lib/streaks/rollup";
import { formatCurrency } from "@/lib/finance/queries";
import { MOOD_EMOJI_MAP } from "@/lib/journal/queries";
import { formatDateLong } from "@/lib/journal/queries";
import { cn } from "@/lib/utils";
import type { DayInLifeRollup } from "@/lib/db/life-os-db";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ACTIVITY_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  journal: { icon: BookHeart, label: "Journal", color: "text-rose-600 dark:text-rose-400" },
  mood: { icon: BookHeart, label: "Mood", color: "text-rose-600 dark:text-rose-400" },
  task: { icon: ListTodo, label: "Tasks", color: "text-sky-600 dark:text-sky-400" },
  water: { icon: Droplets, label: "Water", color: "text-cyan-600 dark:text-cyan-400" },
  exercise: { icon: Dumbbell, label: "Exercise", color: "text-emerald-600 dark:text-emerald-400" },
  meditate: { icon: Wind, label: "Meditation", color: "text-cyan-600 dark:text-cyan-400" },
  tracked: { icon: Wallet, label: "Spending tracked", color: "text-teal-600 dark:text-teal-400" },
};

export function StreaksModule() {
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [cells, setCells] = useState<CalendarCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRollup, setSelectedRollup] = useState<DayInLifeRollup | null>(null);
  const [rollupLoading, setRollupLoading] = useState(false);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const refresh = useCallback(async () => {
    // Recompute today first (in case data changed)
    await recomputeToday();
    const [info, monthCells] = await Promise.all([
      getStreakInfo(),
      getCalendarMonth(year, month),
    ]);
    setStreakInfo(info);
    setCells(monthCells);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await recomputeToday();
      const [info, monthCells] = await Promise.all([
        getStreakInfo(),
        getCalendarMonth(year, month),
      ]);
      if (cancelled) return;
      setStreakInfo(info);
      setCells(monthCells);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [year, month]);

  async function openDay(dateStr: string) {
    setSelectedDate(dateStr);
    setRollupLoading(true);
    setSelectedRollup(null);
    const rollup = await getDayRollup(dateStr);
    setSelectedRollup(rollup);
    setRollupLoading(false);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }
  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
  }

  if (loading || !streakInfo) {
    return <div className="p-8 text-center text-muted-foreground">Loading your streaks...</div>;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCell = cells.find((c) => c.date === todayStr);
  const todayScore = todayCell?.score ?? 0;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-5 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Streaks</h1>
        <p className="text-sm text-muted-foreground">
          Every tracked activity contributes to your day&apos;s score. Click any date to see the full picture.
        </p>
      </div>

      {/* Hero streak card */}
      <Card className="overflow-hidden border-orange-200 dark:border-orange-900/50 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-yellow-950/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-200 to-amber-200 dark:from-orange-900/50 dark:to-amber-900/50">
                <Flame className="h-10 w-10 text-orange-500" />
                <div className="absolute -bottom-1 -right-1 rounded-full bg-background px-2 py-0.5 text-xs font-bold border">
                  {streakInfo.current}
                </div>
              </div>
              <div>
                <div className="text-xl font-bold">
                  {streakInfo.current === 0
                    ? "Start your streak today"
                    : `${streakInfo.current} day${streakInfo.current === 1 ? "" : "s"} strong`}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {streakInfo.current === 0
                    ? "Complete any one activity to begin."
                    : streakInfo.current === streakInfo.longest
                    ? "🔥 On your longest streak ever!"
                    : `${streakInfo.longest - streakInfo.current} days to beat your record of ${streakInfo.longest}.`}
                </p>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{todayScore}</div>
              <div className="text-xs text-muted-foreground">today&apos;s score</div>
            </div>
          </div>

          {/* Today's score progress */}
          <div className="mt-4 space-y-1.5">
            <Progress value={todayScore} className="h-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0</span>
              <span>Today: {todayScore}/100</span>
              <span>100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Current"
          value={String(streakInfo.current)}
          color="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          icon={<Award className="h-4 w-4" />}
          label="Longest"
          value={String(streakInfo.longest)}
          color="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={<CalIcon className="h-4 w-4" />}
          label="Active days"
          value={String(streakInfo.totalActiveDays)}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Avg score"
          value={streakInfo.averageScore.toFixed(0)}
          color="text-sky-600 dark:text-sky-400"
        />
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{MONTH_NAMES[month]} {year}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToday}>Today</Button>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const firstWeekday = new Date(year, month, 1).getDay();
              const blanks = Array.from({ length: firstWeekday }, (_, i) => null);
              return [...blanks, ...cells];
            })().map((cell, i) => {
              if (!cell) return <div key={i} className="aspect-square" />;
              const isToday = cell.date === todayStr;
              return (
                <button
                  key={i}
                  onClick={() => openDay(cell.date)}
                  className={cn(
                    "aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all relative cursor-pointer",
                    "hover:scale-105 hover:shadow-md hover:z-10",
                    isToday && "ring-2 ring-amber-400 ring-offset-1",
                  )}
                  style={scoreToStyle(cell.score)}
                  title={cell.hasData ? `${cell.date} — score ${cell.score}` : cell.date}
                >
                  <span className="font-medium">{parseInt(cell.date.slice(8), 10)}</span>
                  {cell.score > 0 && (
                    <span className="text-[9px] leading-none mt-0.5">{cell.score}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t text-xs text-muted-foreground">
            <span>Score:</span>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded" style={scoreToStyle(0)} />
              <span>none</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded" style={scoreToStyle(30)} />
              <span>low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded" style={scoreToStyle(60)} />
              <span>medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded" style={scoreToStyle(100)} />
              <span>high</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>

      {/* Day-in-Life modal */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setSelectedDate(null)}
        >
          <Card
            className="w-full sm:max-w-lg max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalIcon className="h-4 w-4 text-orange-500" />
                  {formatDateLong(selectedDate)}
                </CardTitle>
                {selectedRollup && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300">
                      Score: {selectedRollup.summary.streak_score}/100
                    </Badge>
                    {selectedRollup.summary.streak_score === 0 && (
                      <span className="text-xs text-muted-foreground">No activity tracked</span>
                    )}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[70vh] space-y-4">
              {rollupLoading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Computing day summary...</div>
              ) : !selectedRollup ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No data for this day.</div>
              ) : (
                <>
                  {/* Activities badges */}
                  {selectedRollup.summary.streak_score > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRollup.summary.journal_id && (
                        <ActivityBadge activity="journal" />
                      )}
                      {selectedRollup.summary.mood && (
                        <ActivityBadge activity="mood" />
                      )}
                      {selectedRollup.summary.tasks_completed > 0 && (
                        <ActivityBadge activity="task" />
                      )}
                      {selectedRollup.summary.water_total_ml >= selectedRollup.summary.water_goal_ml && (
                        <ActivityBadge activity="water" />
                      )}
                      {selectedRollup.summary.exercise.length > 0 && (
                        <ActivityBadge activity="exercise" />
                      )}
                      {selectedRollup.summary.meditation_sessions.length > 0 && (
                        <ActivityBadge activity="meditate" />
                      )}
                    </div>
                  )}

                  {/* Mood */}
                  {selectedRollup.summary.mood && (
                    <DaySection title="Mood">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">
                          {MOOD_EMOJI_MAP[selectedRollup.summary.mood.emoji] ?? "😐"}
                        </span>
                        <div>
                          <div className="text-sm font-medium">
                            Intensity {selectedRollup.summary.mood.intensity}/5
                          </div>
                          <div className="text-xs text-muted-foreground">mood logged</div>
                        </div>
                      </div>
                    </DaySection>
                  )}

                  {/* Journal excerpt */}
                  {selectedRollup.summary.journal_excerpt && (
                    <DaySection title="Journal">
                      <p className="text-sm italic text-muted-foreground">
                        &ldquo;{selectedRollup.summary.journal_excerpt}
                        {selectedRollup.summary.journal_excerpt.length >= 200 ? "..." : ""}&rdquo;
                      </p>
                    </DaySection>
                  )}

                  {/* Tasks */}
                  {selectedRollup.summary.tasks_completed > 0 && (
                    <DaySection title="Tasks">
                      <div className="text-sm">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {selectedRollup.summary.tasks_completed}
                        </span>{" "}
                        task{selectedRollup.summary.tasks_completed === 1 ? "" : "s"} completed
                      </div>
                    </DaySection>
                  )}

                  {/* Exercise */}
                  {selectedRollup.summary.exercise.length > 0 && (
                    <DaySection title="Exercise">
                      <div className="space-y-1">
                        {selectedRollup.summary.exercise.map((e, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{e.name}</span>
                            <span className="text-muted-foreground">
                              {e.total_volume_kg > 0 && `${e.total_volume_kg.toFixed(1)} kg · `}
                              {Math.round(e.duration_s / 60)} min
                            </span>
                          </div>
                        ))}
                      </div>
                    </DaySection>
                  )}

                  {/* Water */}
                  <DaySection title="Water">
                    <div className="flex items-center gap-3">
                      <Droplets className="h-5 w-5 text-cyan-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {selectedRollup.summary.water_total_ml} ml
                          <span className="text-muted-foreground font-normal">
                            {" "}/ {selectedRollup.summary.water_goal_ml} ml
                          </span>
                        </div>
                        <Progress
                          value={Math.min((selectedRollup.summary.water_total_ml / selectedRollup.summary.water_goal_ml) * 100, 100)}
                          className="h-1.5 mt-1"
                        />
                      </div>
                    </div>
                  </DaySection>

                  {/* Meditation */}
                  {selectedRollup.summary.meditation_sessions.length > 0 && (
                    <DaySection title="Meditation">
                      <div className="space-y-1">
                        {selectedRollup.summary.meditation_sessions.map((m, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="font-medium capitalize">{m.type}</span>
                            <span className="text-muted-foreground">{Math.round(m.duration_s / 60)} min</span>
                          </div>
                        ))}
                      </div>
                    </DaySection>
                  )}

                  {/* Spending */}
                  {selectedRollup.summary.spending_total > 0 && (
                    <DaySection title="Spending">
                      <div className="text-sm">
                        <div className="font-semibold">{formatCurrency(selectedRollup.summary.spending_total)} total</div>
                        <div className="space-y-1 mt-1">
                          {selectedRollup.summary.spending_by_category.slice(0, 5).map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{c.emoji} {c.name}</span>
                              <span>{formatCurrency(c.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </DaySection>
                  )}

                  {selectedRollup.summary.streak_score === 0 && (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No activity was tracked on this day. That&apos;s okay — rest days matter too.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className={cn("flex items-center gap-1.5 text-xs mb-1", color)}>
          {icon}
        </div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function DaySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function ActivityBadge({ activity }: { activity: string }) {
  const meta = ACTIVITY_META[activity];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1", meta.color)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

function scoreToStyle(score: number): React.CSSProperties {
  if (score === 0) {
    return { background: "rgba(148, 163, 184, 0.08)", color: "#94a3b8" };
  }
  // Orange gradient: pale → deep as score increases
  const alpha = 0.15 + (score / 100) * 0.65;
  return {
    background: `rgba(249, 115, 22, ${alpha})`,
    color: score >= 50 ? "#fff" : "#9a3412",
  };
}

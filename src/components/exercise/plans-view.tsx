"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell, Flame, Zap, Skull, Play, Clock, ListChecks, ChevronRight,
} from "lucide-react";
import {
  getAllPlans, type ExercisePlan,
} from "@/lib/exercise/library";
import { getExerciseStats, type ExerciseStats } from "@/lib/exercise/queries";
import { SessionPlayer } from "./session-player";
import { cn } from "@/lib/utils";

type View = "plans" | "session" | "history";

interface Props {
  onNavigate: (view: View) => void;
}

export function PlansView({ onNavigate }: Props) {
  const [plans, setPlans] = useState<ExercisePlan[]>([]);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<ExercisePlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllPlans(), getExerciseStats()]).then(([p, s]) => {
      if (cancelled) return;
      setPlans(p); setStats(s); setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading plans...</div>;

  if (selectedPlan) {
    return (
      <SessionPlayer
        plan={selectedPlan}
        dayNum={selectedDay}
        onExit={() => { setSelectedPlan(null); refresh(); }}
      />
    );
  }

  const refresh = async () => {
    const [p, s] = await Promise.all([getAllPlans(), getExerciseStats()]);
    setPlans(p); setStats(s);
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exercise</h1>
        <p className="text-sm text-muted-foreground">
          {plans.length} workout plans available. Pick one and start today's session.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Dumbbell className="h-4 w-4" />} label="Sessions" value={String(stats.totalSessions)} color="text-emerald-600 dark:text-emerald-400" />
          <StatCard icon={<Flame className="h-4 w-4" />} label="This week" value={String(stats.sessionsThisWeek)} color="text-orange-600 dark:text-orange-400" />
          <StatCard icon={<Zap className="h-4 w-4" />} label="Streak" value={`${stats.currentStreak}d`} color="text-amber-600 dark:text-amber-400" />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Total min" value={String(stats.totalDurationMin)} color="text-sky-600 dark:text-sky-400" />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground px-1">Workout Plans</h2>
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onStart={(dayNum) => { setSelectedPlan(plan); setSelectedDay(dayNum); }} />
        ))}
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={() => onNavigate("history")}>
        <ListChecks className="h-4 w-4" />
        View workout history
        <ChevronRight className="h-4 w-4 ml-auto" />
      </Button>

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

function PlanCard({ plan, onStart }: { plan: ExercisePlan; onStart: (dayNum: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const currentDay = plan.days.find((d) => d.day === selectedDay);

  const diffColor =
    plan.difficulty === "Beginner" ? "text-emerald-600 dark:text-emerald-400"
    : plan.difficulty === "Intermediate" ? "text-amber-600 dark:text-amber-400"
    : plan.difficulty === "Advanced" ? "text-rose-600 dark:text-rose-400"
    : "text-violet-600 dark:text-violet-400";

  const diffBorder =
    plan.difficulty === "Beginner" ? "border-emerald-200 dark:border-emerald-900/50"
    : plan.difficulty === "Intermediate" ? "border-amber-200 dark:border-amber-900/50"
    : plan.difficulty === "Advanced" ? "border-rose-200 dark:border-rose-900/50"
    : "border-violet-200 dark:border-violet-900/50";

  return (
    <Card className={cn(diffBorder)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl flex-shrink-0">{plan.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <Badge variant="outline" className={cn("text-[10px]", diffColor)}>
                {plan.difficulty}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" /> {plan.days.length} days</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~15-30 min/day</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Select day</span>
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : "Show all days"}
            </Button>
          </div>
          {expanded ? (
            <div className="grid grid-cols-7 sm:grid-cols-10 gap-1 max-h-32 overflow-y-auto">
              {plan.days.map((d) => (
                <button
                  key={d.day}
                  onClick={() => setSelectedDay(d.day)}
                  className={cn(
                    "aspect-square rounded text-[10px] font-medium transition-colors",
                    d.isRest ? "bg-muted text-muted-foreground" : "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
                    selectedDay === d.day && "ring-2 ring-amber-400 ring-offset-1",
                  )}
                  title={d.isRest ? `Day ${d.day}: Rest` : `Day ${d.day}: ${d.exercises.length} exercises`}
                >
                  {d.day}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Day {selectedDay}</span>
              {currentDay?.isRest ? (
                <Badge variant="outline" className="text-[10px]">Rest day ☕</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                  {currentDay?.exercises.length ?? 0} exercises
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="text-xs ml-auto" onClick={() => setExpanded(true)}>
                Change day
              </Button>
            </div>
          )}
        </div>

        {currentDay && !currentDay.isRest && (
          <div className="mt-3 rounded-md bg-muted/30 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Day {selectedDay} exercises
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentDay.exercises.map((ex, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {ex.name} {ex.type === "reps" ? `×${ex.reps}` : `${ex.durationSec}s`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button
          className="w-full mt-3 gap-2"
          onClick={() => onStart(selectedDay)}
          disabled={currentDay?.isRest}
        >
          <Play className="h-4 w-4" />
          {currentDay?.isRest ? "Rest day — no workout" : `Start Day ${selectedDay}`}
        </Button>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className={cn("flex items-center gap-1.5 text-xs mb-1", color)}>{icon}</div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

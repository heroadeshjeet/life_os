"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus, CheckCircle2, Circle, Flame, ListTodo, Calendar as CalIcon, Clock,
} from "lucide-react";
import {
  getTodaysTasks, getCompletedToday, getStreak, completeTask, uncompleteTask,
  type Task, type StreakInfo,
} from "@/lib/tasks/queries";
import { TaskModal } from "./task-modal";
import { haptic, playSfx } from "@/components/providers/global-ux";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  low: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
};

export function TodayView() {
  const [todays, setTodays] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<Task[]>([]);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [t, c, s] = await Promise.all([getTodaysTasks(), getCompletedToday(), getStreak()]);
    setTodays(t);
    setCompleted(c);
    setStreak(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getTodaysTasks(), getCompletedToday(), getStreak()]).then(([t, c, s]) => {
      if (cancelled) return;
      setTodays(t); setCompleted(c); setStreak(s); setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleToggle(task: Task) {
    if (task.completed_at) {
      await uncompleteTask(task.id);
      playSfx("tap"); haptic("tap");
    } else {
      await completeTask(task.id);
      playSfx("success"); haptic("success");
      // Personalized congratulations
      const { useAuthStore } = await import("@/lib/stores/auth-store");
      const name = useAuthStore.getState().profile?.name ?? "friend";
      const congrats = [
        `Great job, ${name}!`,
        `Nice work, ${name}!`,
        `You're on fire, ${name}!`,
        `One step closer, ${name}!`,
        `That's how it's done, ${name}!`,
      ];
      toast.success(congrats[Math.floor(Math.random() * congrats.length)]);
    }
    refresh();
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const totalToday = todays.length + completed.length;
  const completionPct = totalToday > 0 ? (completed.length / totalToday) * 100 : 0;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-4 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Task</span>
        </Button>
      </div>

      {/* Streak card */}
      {streak && (
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-900/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {streak.current} {streak.current === 1 ? "day" : "days"}
                </div>
                <div className="text-xs text-muted-foreground">
                  longest: {streak.longest} · {streak.totalCompleted} completed total
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Today</div>
              <div className="text-sm font-semibold">
                {completed.length} / {totalToday} done
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress bar */}
      {totalToday > 0 && (
        <div className="space-y-1.5">
          <Progress value={completionPct} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {completionPct === 100
              ? "🎉 All done for today!"
              : `${Math.round(completionPct)}% complete`}
          </p>
        </div>
      )}

      {/* Today's tasks */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
          <ListTodo className="h-4 w-4" />
          To do
        </h2>
        {todays.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {completed.length > 0
                ? "🎉 All tasks done! Enjoy the rest of your day."
                : "📝 No tasks for today yet. Tap + to add one."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {todays.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={() => handleToggle(t)} />
            ))}
          </div>
        )}
      </div>

      {/* Completed today */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Completed today ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={() => handleToggle(t)} completed />
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={refresh} />
    </div>
  );
}

function TaskRow({
  task, onToggle, completed,
}: {
  task: Task;
  onToggle: () => void;
  completed?: boolean;
}) {
  return (
    <Card className={cn(completed && "opacity-60")}>
      <CardContent className="p-3 flex items-center gap-3">
        <button
          onClick={onToggle}
          className={cn(
            "flex-shrink-0 transition-colors",
            completed ? "text-emerald-600" : "text-muted-foreground hover:text-emerald-600",
          )}
        >
          {completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className={cn(
            "text-sm font-medium truncate",
            completed && "line-through text-muted-foreground",
          )}>
            {task.title}
          </div>
          {task.notes && (
            <div className="text-xs text-muted-foreground truncate">{task.notes}</div>
          )}
          {task.due_at && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-2.5 w-2.5" />
              {new Date(task.due_at).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </div>
          )}
        </div>
        <Badge variant="outline" className={cn("text-[10px] capitalize", PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </Badge>
      </CardContent>
    </Card>
  );
}

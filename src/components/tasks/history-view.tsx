"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CheckCircle2, X } from "lucide-react";
import {
  getCalendarMonth, getTasksByDate,
  type CalendarDay, type Task,
} from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function HistoryView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);

  useEffect(() => {
    let cancelled = false;
    getCalendarMonth(year, month).then((d) => {
      if (cancelled) return;
      setDays(d);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [year, month]);

  async function openDay(dateStr: string) {
    const tasks = await getTasksByDate(dateStr);
    if (tasks.length === 0) return;
    setSelectedDate(dateStr);
    setSelectedTasks(tasks);
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

  const firstWeekday = new Date(year, month, 1).getDay();
  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  cells.push(...days);

  const todayStr = new Date().toISOString().slice(0, 10);
  const totalCompleted = days.reduce((sum, d) => sum + d.completedCount, 0);
  const activeDays = days.filter((d) => d.completedCount > 0).length;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">
          Each dot is a completed task. Click any day to see what you finished.
        </p>
      </div>

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
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="aspect-square" />;
                const isToday = day.date === todayStr;
                const isActive = day.completedCount > 0;
                return (
                  <button
                    key={i}
                    onClick={() => isActive && openDay(day.date)}
                    disabled={!isActive}
                    className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all relative",
                      isActive
                        ? "cursor-pointer hover:scale-105 hover:shadow-md"
                        : "cursor-default text-muted-foreground/40",
                      isToday && "ring-2 ring-amber-400 ring-offset-1",
                    )}
                    style={isActive ? completionStyle(day.completedCount) : undefined}
                    title={isActive ? `${day.date} — ${day.completedCount} tasks` : day.date}
                  >
                    <span className="font-medium">{parseInt(day.date.slice(8), 10)}</span>
                    {isActive && (
                      <span className="text-[10px] leading-none mt-0.5">
                        {day.completedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Month summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{totalCompleted}</div>
            <div className="text-xs text-muted-foreground">tasks completed this month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{activeDays}</div>
            <div className="text-xs text-muted-foreground">active days this month</div>
          </CardContent>
        </Card>
      </div>

      {/* Day viewer modal */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setSelectedDate(null)}
        >
          <Card
            className="w-full sm:max-w-md max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Completed tasks</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
              {selectedTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-md border">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{t.title}</div>
                    {t.notes && <div className="text-xs text-muted-foreground">{t.notes}</div>}
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      completed at {new Date(t.completed_at!).toLocaleTimeString("en-US", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

function completionStyle(count: number): React.CSSProperties {
  // More tasks = darker blue
  const alpha = Math.min(0.15 + count * 0.15, 0.7);
  return {
    background: `rgba(56, 189, 248, ${alpha})`,
    color: count >= 4 ? "#fff" : "#0c4a6e",
  };
}

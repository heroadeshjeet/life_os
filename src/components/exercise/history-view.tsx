"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell, Clock, Flame, ChevronLeft, Trash2, Calendar,
} from "lucide-react";
import {
  getRecentSessions, deleteSession, formatDuration, formatTimeAgo,
  type ExerciseSession,
} from "@/lib/exercise/queries";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type View = "plans" | "session" | "history";

interface Props {
  onNavigate: (view: View) => void;
}

export function HistoryView({ onNavigate }: Props) {
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getRecentSessions(30);
    setSessions(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getRecentSessions(30).then((s) => {
      if (cancelled) return;
      setSessions(s);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this session?")) return;
    await deleteSession(id);
    toast.success("Session deleted");
    refresh();
  }

  // Build chart data: last 7 sessions
  const chartData = sessions.slice(0, 7).reverse().map((s) => ({
    name: new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    duration: s.ended_at ? Math.round((s.ended_at - s.started_at) / 60) : 0,
    exercises: s.exercises.length,
  }));

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("plans")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="text-sm text-muted-foreground">{sessions.length} session(s)</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            No workouts yet. Start your first session from the Plans tab.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Duration chart */}
          {chartData.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent sessions (minutes)
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={30} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(15, 23, 42, 0.95)",
                          border: "1px solid rgba(148,163,184,0.2)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#fff",
                        }}
                        formatter={(v: number) => [`${v} min`, "Duration"]}
                      />
                      <Bar dataKey="duration" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session list */}
          <div className="space-y-2">
            {sessions.map((s) => {
              const duration = s.ended_at ? Math.round((s.ended_at - s.started_at) / 1000) : 0;
              return (
                <Card key={s.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex-shrink-0">
                          <Flame className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {s.notes || "Workout session"}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(s.started_at).toLocaleDateString("en-US", {
                              weekday: "short", month: "short", day: "numeric",
                            })}
                            {" · "}
                            <Clock className="h-3 w-3" />
                            {formatDuration(duration)}
                            {" · "}
                            {s.exercises.length} exercises
                          </div>
                          {/* Exercise badges */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {s.exercises.slice(0, 4).map((ex, i) => (
                              <Badge key={i} variant="outline" className="text-[9px]">
                                {ex.name}
                              </Badge>
                            ))}
                            {s.exercises.length > 4 && (
                              <Badge variant="outline" className="text-[9px]">
                                +{s.exercises.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive flex-shrink-0"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

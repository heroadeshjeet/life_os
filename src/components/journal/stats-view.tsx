"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, BookOpen, Type, Heart, TrendingUp, Calendar } from "lucide-react";
import {
  getStats, MOOD_EMOJI_MAP, MOOD_LABELS,
  type JournalStats, type MoodEmoji,
} from "@/lib/journal/queries";

export function StatsView() {
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Crunching numbers...</div>;
  if (!stats) return null;

  const moodsWithData = (Object.entries(stats.moodDistribution) as [MoodEmoji, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalMoods = moodsWithData.reduce((sum, [, c]) => sum + c, 0);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
        <p className="text-sm text-muted-foreground">
          Your writing patterns over time.
        </p>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={<Flame className="h-4 w-4" />}
          accent="text-orange-600 dark:text-orange-400"
          value={stats.currentStreak}
          label="current streak"
          sub={`longest: ${stats.longestStreak}`}
        />
        <MetricCard
          icon={<BookOpen className="h-4 w-4" />}
          accent="text-rose-600 dark:text-rose-400"
          value={stats.totalEntries}
          label="total entries"
          sub={`this month: ${stats.entriesThisMonth}`}
        />
        <MetricCard
          icon={<Type className="h-4 w-4" />}
          accent="text-sky-600 dark:text-sky-400"
          value={stats.totalWords.toLocaleString()}
          label="total words"
          sub={`avg: ${stats.totalEntries > 0 ? Math.round(stats.totalWords / stats.totalEntries) : 0}/entry`}
        />
        <MetricCard
          icon={<Heart className="h-4 w-4" />}
          accent="text-pink-600 dark:text-pink-400"
          value={stats.gratitudeCount}
          label="gratitudes"
          sub="things you're thankful for"
        />
      </div>

      {/* Mood distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-4 w-4" />
            Mood distribution
          </CardTitle>
          <p className="text-xs text-muted-foreground">Last 90 days</p>
        </CardHeader>
        <CardContent>
          {moodsWithData.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No moods logged yet. Add one from the Write tab.
            </div>
          ) : (
            <div className="space-y-2">
              {moodsWithData.map(([emoji, count]) => {
                const pct = totalMoods > 0 ? (count / totalMoods) * 100 : 0;
                return (
                  <div key={emoji} className="flex items-center gap-3">
                    <span className="text-2xl w-8 text-center">{MOOD_EMOJI_MAP[emoji]}</span>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs font-medium">{MOOD_LABELS[emoji]}</span>
                        <span className="text-xs text-muted-foreground">{count}× · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Streak visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-4 w-4" />
            Writing consistency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-3xl font-bold text-orange-500">{stats.currentStreak}</div>
              <div className="text-xs text-muted-foreground mt-1">days current</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-3xl font-bold text-amber-500">{stats.longestStreak}</div>
              <div className="text-xs text-muted-foreground mt-1">days longest</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground text-center">
            {stats.currentStreak === 0
              ? "Write today to start your streak."
              : stats.currentStreak === stats.longestStreak
              ? "🔥 You're on your longest streak ever — keep going!"
              : `${stats.longestStreak - stats.currentStreak} days to beat your record.`}
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

function MetricCard({
  icon, value, label, sub, accent,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sub: string;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${accent}`}>
          {icon}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        <div className="text-[10px] text-muted-foreground/70 mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}

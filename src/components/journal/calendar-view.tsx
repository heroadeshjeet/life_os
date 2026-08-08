"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  getCalendarMonth, getEntryByDate, stripHtml, formatDateLong,
  type CalendarDay,
} from "@/lib/journal/queries";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [selectedTitle, setSelectedTitle] = useState<string>("");

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
    const entry = await getEntryByDate(dateStr);
    if (!entry) return;
    setSelectedDate(dateStr);
    setSelectedTitle(entry.title);
    setSelectedContent(entry.content_html);
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

  // Build calendar grid: leading blanks + days
  const firstWeekday = new Date(year, month, 1).getDay();
  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  cells.push(...days);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Stats summary
  const entriesCount = days.filter((d) => d?.hasEntry).length;
  const totalWords = days.reduce((sum, d) => sum + (d?.wordCount ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Each colored day has a journal entry. Click any day to read it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {MONTH_NAMES[month]} {year}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToday}>
                Today
              </Button>
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
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="aspect-square" />;
                const isToday = day.date === todayStr;
                return (
                  <button
                    key={i}
                    onClick={() => day.hasEntry && openDay(day.date)}
                    disabled={!day.hasEntry}
                    className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all relative",
                      day.hasEntry
                        ? "cursor-pointer hover:scale-105 hover:shadow-md"
                        : "cursor-default text-muted-foreground/40",
                      isToday && "ring-2 ring-amber-400 ring-offset-1",
                    )}
                    style={day.hasEntry ? moodToStyle(day.moodIntensity) : undefined}
                    title={day.hasEntry ? `${day.date} — ${day.wordCount} words` : day.date}
                  >
                    <span className="font-medium">{parseInt(day.date.slice(8), 10)}</span>
                    {day.moodEmoji && (
                      <span className="text-[10px] leading-none mt-0.5">{day.moodEmoji}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t text-xs text-muted-foreground">
            <span>Intensity:</span>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded" style={moodToStyle(1)} />
              <span>low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded" style={moodToStyle(3)} />
              <span>medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded" style={moodToStyle(5)} />
              <span>high</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Month summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{entriesCount}</div>
            <div className="text-xs text-muted-foreground">entries this month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalWords.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">words this month</div>
          </CardContent>
        </Card>
      </div>

      {/* Entry viewer modal */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setSelectedDate(null)}
        >
          <Card
            className="w-full sm:max-w-2xl max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">{selectedTitle || "Untitled"}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{formatDateLong(selectedDate)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[70vh]">
              <div
                className="prose prose-sm dark:prose-invert max-w-none
                           [&_blockquote]:border-l-4 [&_blockquote]:border-rose-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                           [&_ul]:list-disc [&_ul]:pl-6
                           [&_ol]:list-decimal [&_ol]:pl-6"
                dangerouslySetInnerHTML={{ __html: selectedContent }}
              />
              <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                {stripHtml(selectedContent).split(/\s+/).filter(Boolean).length} words
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function moodToStyle(intensity: number | null): React.CSSProperties {
  if (intensity === null) {
    return { background: "rgba(251, 113, 133, 0.15)", color: "#9f1239" };
  }
  // Higher intensity = more saturated rose
  const alpha = 0.15 + (intensity / 5) * 0.55;
  return {
    background: `rgba(244, 63, 94, ${alpha})`,
    color: intensity >= 4 ? "#fff" : "#9f1239",
  };
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PenLine, Calendar, BarChart3, Search } from "lucide-react";
import { WriteView } from "./write-view";
import { CalendarView } from "./calendar-view";
import { StatsView } from "./stats-view";
import { SearchView } from "./search-view";

type Tab = "write" | "calendar" | "stats" | "search";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "write", label: "Write", icon: PenLine },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "search", label: "Search", icon: Search },
];

export function JournalModule() {
  const [tab, setTab] = useState<Tab>("write");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-3xl flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-medium transition-colors relative",
                  active
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "write" && <WriteView />}
        {tab === "calendar" && <CalendarView />}
        {tab === "stats" && <StatsView />}
        {tab === "search" && <SearchView />}
      </div>
    </div>
  );
}

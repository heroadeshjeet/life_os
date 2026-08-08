"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dumbbell, History } from "lucide-react";
import { PlansView } from "./plans-view";
import { HistoryView } from "./history-view";

type View = "plans" | "session" | "history";

const TABS: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "plans", label: "Plans", icon: Dumbbell },
  { id: "history", label: "History", icon: History },
];

export function ExerciseModule() {
  const [view, setView] = useState<View>("plans");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-4xl flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = view === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={cn(
                  "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-medium transition-colors relative",
                  active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
                {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === "plans" && <PlansView onNavigate={setView} />}
        {view === "history" && <HistoryView onNavigate={setView} />}
      </div>
    </div>
  );
}

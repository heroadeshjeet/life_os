"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ListTodo, Calendar, ShoppingCart } from "lucide-react";
import { TodayView } from "./today-view";
import { HistoryView } from "./history-view";
import { GroceryView } from "./grocery-view";
import { startReminderDispatcher } from "@/lib/tasks/queries";

type Tab = "today" | "grocery" | "history";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "today", label: "Today", icon: ListTodo },
  { id: "grocery", label: "Groceries", icon: ShoppingCart },
  { id: "history", label: "History", icon: Calendar },
];

export function TasksModule() {
  const [tab, setTab] = useState<Tab>("today");

  useEffect(() => {
    startReminderDispatcher();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-2xl flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-medium transition-colors relative",
                  active ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
                {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "today" && <TodayView />}
        {tab === "grocery" && <GroceryView />}
        {tab === "history" && <HistoryView />}
      </div>
    </div>
  );
}

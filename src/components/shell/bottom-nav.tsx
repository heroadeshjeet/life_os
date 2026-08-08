"use client";

import { useUIStore } from "@/lib/stores/ui-store";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Flame, Brain, BookHeart, ListTodo, Dumbbell, Wallet, Lock, Wind, BookOpen, Settings as SettingsIcon } from "lucide-react";

// Show a curated set on bottom nav to fit mobile screens
const BOTTOM_NAV_IDS = [
  "dashboard",
  "streaks",
  "counselor",
  "journal",
  "tasks",
  "exercise",
  "finances",
  "vault",
  "meditation",
  "settings",
];

export function BottomNav() {
  const activeModule = useUIStore((s) => s.activeModule);
  const setActiveModule = useUIStore((s) => s.setActiveModule);

  const navModules = MODULES.filter((m) => BOTTOM_NAV_IDS.includes(m.id));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="flex overflow-x-auto scrollbar-none">
        {navModules.map((m) => {
          const Icon = m.icon;
          const active = activeModule === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[60px] transition-colors",
                active
                  ? cn(m.accent, "border-t-2")
                  : "text-muted-foreground border-t-2 border-transparent hover:text-foreground",
              )}
              style={active ? { borderTopColor: "currentColor" } : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-medium">{m.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

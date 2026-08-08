"use client";

import { MODULES } from "@/lib/modules";
import { useUIStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronLeft } from "lucide-react";

export function Sidebar() {
  const { activeModule, setActiveModule, sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card/50 backdrop-blur transition-all duration-200",
        sidebarCollapsed ? "w-[60px]" : "w-[240px]",
      )}
    >
      {/* Logo / brand */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">Life_OS</div>
            <div className="text-[10px] text-muted-foreground leading-tight">v2.0</div>
          </div>
        )}
      </div>

      {/* Module list */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const active = activeModule === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              title={sidebarCollapsed ? m.name : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                active && "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
                sidebarCollapsed && "justify-center px-0",
              )}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", !active && m.accent)} />
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium truncate">{m.name}</div>
                </div>
              )}
              {!sidebarCollapsed && active && (
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <button
          onClick={toggleSidebar}
          className={cn(
            "w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
            sidebarCollapsed && "justify-center px-0",
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

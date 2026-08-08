"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Image, FolderOpen, CreditCard,
  StickyNote, Users, History, Lock,
} from "lucide-react";
import { VaultDashboard } from "./vault-dashboard";
import { VaultItemsView } from "./vault-items-view";
import { VaultContactsView } from "./vault-contacts-view";
import { VaultActivityView } from "./vault-activity-view";
import type { VaultItemKind } from "@/lib/db/life-os-db";

type View = "dashboard" | "document" | "image" | "file" | "card" | "note" | "contact" | "activity";

const NAV_ITEMS: { id: View; label: string; icon: React.ComponentType<{ className?: string }>; kind?: VaultItemKind }[] = [
  { id: "dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { id: "document",  label: "Documents",    icon: FileText,     kind: "document" },
  { id: "image",     label: "Images",       icon: Image,        kind: "image" },
  { id: "file",      label: "Files",        icon: FolderOpen,   kind: "file" },
  { id: "card",      label: "Cards & IDs",  icon: CreditCard,   kind: "card" },
  { id: "note",      label: "Notes",        icon: StickyNote,   kind: "note" },
  { id: "contact",   label: "Contacts",     icon: Users,        kind: "contact" },
  { id: "activity",  label: "Activity Log", icon: History },
];

export function VaultModule() {
  const [view, setView] = useState<View>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const currentNav = NAV_ITEMS.find((n) => n.id === view);

  return (
    <div className="flex flex-col sm:flex-row h-full">
      {/* Sidebar — desktop only */}
      <aside className="hidden sm:flex w-52 flex-col border-r bg-card/50 flex-shrink-0">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">Vault</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Encrypted</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV_ITEMS.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left",
                  active
                    ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", !active && "text-muted-foreground")} />
                <span className="truncate">{n.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav (horizontal scroll) */}
      <div className="sm:hidden border-b bg-background/95 backdrop-blur flex-shrink-0">
        <div className="flex overflow-x-auto">
          {NAV_ITEMS.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors",
                  active
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {n.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {view === "dashboard" && <VaultDashboard key={refreshKey} onNavigate={setView} />}
        {view === "activity" && <VaultActivityView key={refreshKey} />}
        {view === "contact" && <VaultContactsView key={refreshKey} />}
        {currentNav?.kind && view !== "dashboard" && view !== "activity" && view !== "contact" && (
          <VaultItemsView key={refreshKey} kind={currentNav.kind} onChanged={triggerRefresh} />
        )}
      </div>
    </div>
  );
}

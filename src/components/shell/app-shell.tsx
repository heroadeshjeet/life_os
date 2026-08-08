"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNav } from "./bottom-nav";
import { Dashboard } from "@/components/dashboard/dashboard";
import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { JournalModule } from "@/components/journal/journal-module";
import { FinanceModule } from "@/components/finance/finance-module";
import { TasksModule } from "@/components/tasks/tasks-module";
import { CounselorModule } from "@/components/counselor/counselor-module";
import { StreaksModule } from "@/components/streaks/streaks-module";
import { ExerciseModule } from "@/components/exercise/exercise-module";
import { VaultModule } from "@/components/vault/vault-module";
import { MeditationModule } from "@/components/meditation/meditation-module";
import { LifeManualModule } from "@/components/life-manual/life-manual-module";
import { ReaderModule } from "@/components/reader/reader-module";
import { useUIStore } from "@/lib/stores/ui-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { MODULE_MAP } from "@/lib/modules";

export function AppShell() {
  const activeModule = useUIStore((s) => s.activeModule);
  const activeModuleDef = MODULE_MAP[activeModule];
  const profile = useAuthStore((s) => s.profile);
  const navPosition = profile?.preferences.nav_position ?? "auto";

  // Determine if sidebar should be on the left (desktop) or hidden (mobile uses bottom nav)
  // "auto" = left on desktop (sm+), bottom on mobile
  // "left" = always left sidebar
  // "bottom" = always bottom nav
  const showSidebar = navPosition === "left" || (navPosition === "auto");
  const showBottomNav = navPosition === "bottom" || (navPosition === "auto");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left sidebar — hidden on mobile if "auto" (bottom nav takes over) */}
      {showSidebar && (
        <div className="hidden sm:block">
          <Sidebar />
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">
          {activeModule === "dashboard" ? (
            <Dashboard />
          ) : activeModule === "settings" ? (
            <SettingsScreen />
          ) : activeModule === "journal" ? (
            <JournalModule />
          ) : activeModule === "finances" ? (
            <FinanceModule />
          ) : activeModule === "tasks" ? (
            <TasksModule />
          ) : activeModule === "counselor" ? (
            <CounselorModule />
          ) : activeModule === "streaks" ? (
            <StreaksModule />
          ) : activeModule === "exercise" ? (
            <ExerciseModule />
          ) : activeModule === "vault" ? (
            <VaultModule />
          ) : activeModule === "meditation" ? (
            <MeditationModule />
          ) : activeModule === "manual" ? (
            <LifeManualModule />
          ) : activeModule === "reader" ? (
            <ReaderModule />
          ) : activeModuleDef ? (
            <ModulePlaceholder module={activeModuleDef} />
          ) : (
            <div className="p-6 text-muted-foreground">Module not found.</div>
          )}
        </main>
      </div>

      {/* Bottom navigation — mobile only if "auto", always if "bottom" */}
      {showBottomNav && (
        <div className={navPosition === "bottom" ? "block" : "sm:hidden"}>
          <BottomNav />
        </div>
      )}
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Lock, Focus, Clock } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useEffect, useState } from "react";
import { getStreakInfo, recomputeToday, type StreakInfo } from "@/lib/streaks/rollup";
import { GrowthPlant, useGrowthState } from "@/components/growth/growth-plant";

export function Topbar() {
  const profile = useAuthStore((s) => s.profile);
  const lock = useAuthStore((s) => s.lock);
  const touchActivity = useAuthStore((s) => s.touchActivity);
  const { focusMode, setFocusMode, setActiveModule } = useUIStore();

  const [now, setNow] = useState<Date>(new Date());
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const growthState = useGrowthState();

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Fetch streak info on mount + periodically
  useEffect(() => {
    let cancelled = false;
    async function load() {
      await recomputeToday();
      const info = await getStreakInfo();
      if (!cancelled) setStreak(info);
    }
    load();
    const id = setInterval(load, 30_000); // refresh every 30s
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Auto-lock inactivity checker
  useEffect(() => {
    const checkInterval = setInterval(() => {
      useAuthStore.getState().checkAutoLock();
    }, 15_000);

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const onTouch = () => touchActivity();
    events.forEach((e) => window.addEventListener(e, onTouch, { passive: true }));

    return () => {
      clearInterval(checkInterval);
      events.forEach((e) => window.removeEventListener(e, onTouch));
    };
  }, [touchActivity]);

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 sm:px-6">
      {/* Streak counter — clickable to open Streaks module */}
      <button
        onClick={() => setActiveModule("streaks")}
        className="flex items-center gap-2 rounded-md hover:bg-accent px-2 py-1 transition-colors"
        title="View streaks calendar"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
          <Flame className="h-4 w-4 text-orange-500" />
        </div>
        <div className="leading-tight text-left">
          <div className="text-sm font-bold">{streak?.current ?? 0}</div>
          <div className="text-[10px] text-muted-foreground">day streak</div>
        </div>
      </button>

      <div className="h-6 w-px bg-border" />

      {/* Focus mode toggle */}
      <Button
        variant={focusMode ? "default" : "ghost"}
        size="sm"
        className="gap-1.5"
        onClick={() => setFocusMode(!focusMode)}
      >
        <Focus className="h-4 w-4" />
        <span className="hidden sm:inline">Focus</span>
        {focusMode && (
          <Badge variant="secondary" className="ml-1 bg-emerald-500 text-white text-[10px] px-1.5 py-0">
            ON
          </Badge>
        )}
      </Button>

      <div className="flex-1" />

      {/* Live clock */}
      <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span className="tabular-nums">
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* User chip with growth plant */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveModule("streaks")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          title={growthState ? `${growthState.stage === 0 ? "Seed" : growthState.stage === 1 ? "Sprout" : growthState.stage === 2 ? "Small plant" : growthState.stage === 3 ? "Growing" : growthState.stage === 4 ? "Tree" : "Flourishing"} · ${growthState.health}` : "Your growth"}
        >
          {growthState ? (
            <GrowthPlant stage={growthState.stage} health={growthState.health} size={32} />
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          )}
        </button>
        <div className="hidden sm:block leading-tight">
          <div className="text-sm font-medium">{profile?.name ?? "Friend"}</div>
          {profile?.age && (
            <div className="text-[10px] text-muted-foreground">Age {profile.age}</div>
          )}
        </div>
      </div>

      <Button variant="ghost" size="icon" onClick={lock} title="Lock now">
        <Lock className="h-4 w-4" />
      </Button>
    </header>
  );
}

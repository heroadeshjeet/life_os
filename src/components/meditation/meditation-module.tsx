"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Wind, Brain, Timer, Music, Play, Pause, Square, Volume2, VolumeX,
  History, X, AlertCircle,
} from "lucide-react";
import {
  getStats, createSession, formatDuration, formatTimeAgo, TYPE_META,
  type MeditationStats,
} from "@/lib/meditation/queries";
import type { MeditationType } from "@/lib/db/life-os-db";
import {
  playAmbient, stopAmbient, stopAllAmbient, isAmbientPlaying, getActiveSounds,
  AMBIENT_SOUNDS, type AmbientSound,
} from "@/lib/meditation/sounds";
import { haptic, playSfx } from "@/components/providers/global-ux";
import { toast } from "sonner";

type Tab = "breathe" | "focus" | "pomodoro" | "ambient" | "history";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "breathe",  label: "Breathe",  icon: Wind },
  { id: "focus",    label: "Focus",    icon: Brain },
  { id: "pomodoro", label: "Pomodoro", icon: Timer },
  { id: "ambient",  label: "Ambient",  icon: Music },
  { id: "history",  label: "History",  icon: History },
];

const BREATHING_PATTERNS = [
  { id: "478",   label: "4-7-8 Relax",     inhale: 4, hold: 7, exhale: 8, cycles: 4 },
  { id: "box",   label: "Box Breathing",   inhale: 4, hold: 4, exhale: 4, hold2: 4, cycles: 5 },
  { id: "deep",  label: "Deep Calm",       inhale: 5, hold: 2, exhale  : 7, cycles: 6 },
  { id: "energ", label: "Energizing",      inhale: 3, hold: 0, exhale  : 2, cycles: 10 },
];

export function MeditationModule() {
  const [tab, setTab] = useState<Tab>("breathe");
  const [stats, setStats] = useState<MeditationStats | null>(null);

  const refreshStats = useCallback(async () => {
    const s = await getStats();
    setStats(s);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getStats().then((s) => { if (!cancelled) setStats(s); });
    return () => { cancelled = true; };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAllAmbient();
  }, []);

  function handleSessionSaved() {
    refreshStats();
    playSfx("success");
    haptic("success");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-3xl flex overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 min-w-[70px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap",
                  active ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
                {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "breathe" && <BreatheView onSessionSaved={handleSessionSaved} />}
        {tab === "focus" && <FocusView onSessionSaved={handleSessionSaved} />}
        {tab === "pomodoro" && <PomodoroView onSessionSaved={handleSessionSaved} />}
        {tab === "ambient" && <AmbientView />}
        {tab === "history" && <HistoryView stats={stats} onRefresh={refreshStats} />}
      </div>
    </div>
  );
}

// ─── Breathing view ──────────────────────────────────────────────────────────

function BreatheView({ onSessionSaved }: { onSessionSaved: () => void }) {
  const [patternIdx, setPatternIdx] = useState(0);
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale" | "hold2">("inhale");
  const [phaseTime, setPhaseTime] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pattern = BREATHING_PATTERNS[patternIdx];

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function start() {
    setActive(true);
    setPhase("inhale");
    setPhaseTime(pattern.inhale);
    setCycle(0);
    setElapsed(0);
    haptic("unlock");

    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
      setPhaseTime((pt) => {
        if (pt <= 1) {
          // Move to next phase
          setPhase((p) => {
            const next = nextPhase(p, pattern);
            if (p === "exhale" && (!("hold2" in pattern) || !pattern.hold2)) {
              setCycle((c) => {
                if (c + 1 >= pattern.cycles) {
                  complete();
                  return c;
                }
                return c + 1;
              });
            } else if (p === "hold2") {
              setCycle((c) => {
                if (c + 1 >= pattern.cycles) {
                  complete();
                  return c;
                }
                return c + 1;
              });
            }
            return next.duration(pattern);
          });
          return nextDuration(phase, pattern);
        }
        return pt - 1;
      });
    }, 1000);
  }

  function nextPhase(current: typeof phase, pat: typeof pattern): { duration: (p: typeof pattern) => number } {
    if (current === "inhale") return { duration: () => pat.hold };
    if (current === "hold") return { duration: () => pat.exhale ?? 0 };
    if (current === "exhale") {
      if ("hold2" in pat && pat.hold2) return { duration: () => pat.hold2 };
      return { duration: () => pat.inhale };
    }
    return { duration: () => pat.inhale };
  }

  function nextDuration(current: typeof phase, pat: typeof pattern): number {
    if (current === "inhale") return pat.hold;
    if (current === "hold") return pat.exhale ?? 0;
    if (current === "exhale") {
      if ("hold2" in pat && pat.hold2) return pat.hold2;
      return pat.inhale;
    }
    return pat.inhale;
  }

  function complete() {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(false);
    createSession({ type: "breath", duration_s: elapsed, notes: `${pattern.label} (${pattern.cycles} cycles)` });
    onSessionSaved();
    toast.success(`Breathing complete! ${formatDuration(elapsed)}`);
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(false);
    if (elapsed > 5) {
      createSession({ type: "breath", duration_s: elapsed, notes: `${pattern.label} (partial)` });
      onSessionSaved();
      toast.success(`Session saved: ${formatDuration(elapsed)}`);
    }
  }

  const phaseLabel = phase === "inhale" ? "Breathe In" : phase === "hold" ? "Hold" : phase === "exhale" ? "Breathe Out" : "Hold";
  const circleScale = phase === "inhale" ? "scale-110" : phase === "exhale" ? "scale-75" : "scale-100";
  const transitionDuration = `${pattern[phase === "inhale" ? "inhale" : phase === "exhale" ? "exhale" : "hold"] || 1}s`;

  return (
    <div className="mx-auto max-w-md p-4 sm:p-6 space-y-6 pb-12 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Breathing</h1>
        <p className="text-sm text-muted-foreground">Follow the circle. Let your breath guide you.</p>
      </div>

      {/* Pattern selector */}
      {!active && (
        <div className="w-full space-y-2">
          {BREATHING_PATTERNS.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPatternIdx(i)}
              className={cn(
                "w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
                patternIdx === i ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30" : "border-border hover:bg-accent",
              )}
            >
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-muted-foreground">
                  {p.inhale}-{p.hold}-{p.exhale}{("hold2" in p && p.hold2) ? `-${p.hold2}` : ""} · {p.cycles} cycles
                </div>
              </div>
              {patternIdx === i && <div className="h-2 w-2 rounded-full bg-cyan-500" />}
            </button>
          ))}
        </div>
      )}

      {/* Breathing circle */}
      {active && (
        <div className="flex flex-col items-center space-y-6 py-8">
          <div className="relative h-64 w-64 flex items-center justify-center">
            <div
              className={cn(
                "absolute inset-0 rounded-full bg-gradient-to-br from-cyan-200 to-blue-300 dark:from-cyan-900/50 dark:to-blue-900/50 transition-transform ease-in-out",
                circleScale,
              )}
              style={{ transitionDuration }}
            />
            <div className="relative z-10 text-center">
              <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-200">{phaseLabel}</div>
              <div className="text-4xl font-bold tabular-nums text-cyan-700 dark:text-cyan-200 mt-1">{phaseTime}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Cycle {Math.min(cycle + 1, pattern.cycles)} / {pattern.cycles}</span>
            <span>·</span>
            <span>{formatDuration(elapsed)}</span>
          </div>

          <Button variant="outline" onClick={stop} className="gap-2">
            <Square className="h-4 w-4" />
            End session
          </Button>
        </div>
      )}

      {/* Start button */}
      {!active && (
        <Button size="lg" className="w-full gap-2 h-12" onClick={start}>
          <Play className="h-5 w-5" />
          Start breathing
        </Button>
      )}

      <div className="text-center text-xs text-muted-foreground">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

// ─── Focus timer view ────────────────────────────────────────────────────────

function FocusView({ onSessionSaved }: { onSessionSaved: () => void }) {
  const [durationMin, setDurationMin] = useState(10);
  const [timeLeft, setTimeLeft] = useState(600);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showFocusWarning, setShowFocusWarning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTimeLeft(durationMin * 60);
  }, [durationMin]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Focus mode: detect tab switching during active session
  useEffect(() => {
    if (!active || paused) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        setShowFocusWarning(true);
        haptic("warning");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [active, paused]);

  function start() {
    setActive(true);
    setPaused(false);
    haptic("unlock");

    timerRef.current = setInterval(() => {
      if (paused) return;
      setTimeLeft((t) => {
        if (t <= 1) {
          complete();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function complete() {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(false);
    createSession({ type: "focus", duration_s: durationMin * 60 });
    onSessionSaved();
    toast.success(`Focus session complete! ${durationMin} minutes`);
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(false);
    const elapsed = durationMin * 60 - timeLeft;
    if (elapsed > 30) {
      createSession({ type: "focus", duration_s: elapsed });
      onSessionSaved();
      toast.success(`Session saved: ${formatDuration(elapsed)}`);
    }
  }

  function togglePause() {
    setPaused(!paused);
    haptic("tap");
  }

  const progress = ((durationMin * 60 - timeLeft) / (durationMin * 60)) * 100;

  return (
    <div className="mx-auto max-w-md p-4 sm:p-6 space-y-6 pb-12 flex flex-col items-center min-h-[60vh]">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Focus Timer</h1>
        <p className="text-sm text-muted-foreground">Stay present. If you switch tabs, we&apos;ll gently remind you.</p>
      </div>

      {/* Timer circle */}
      <div className="relative h-64 w-64 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
          <circle
            cx="60" cy="60" r="54" fill="none" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 54 * progress / 100} ${2 * Math.PI * 54}`}
          />
        </svg>
        <div className="relative z-10 text-center">
          <div className="text-5xl font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
            {formatDuration(timeLeft)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {active ? (paused ? "Paused" : "Focusing...") : "Ready"}
          </div>
        </div>
      </div>

      {/* Duration selector */}
      {!active && (
        <div className="w-full space-y-2">
          <div className="text-sm font-medium text-center">Duration: {durationMin} minutes</div>
          <div className="grid grid-cols-5 gap-1">
            {[5, 10, 15, 25, 40].map((m) => (
              <button
                key={m}
                onClick={() => setDurationMin(m)}
                className={cn(
                  "rounded-md border py-2 text-sm font-medium transition-colors",
                  durationMin === m ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300" : "border-border hover:bg-accent",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {active ? (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={togglePause}>
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
          <Button variant="outline" onClick={stop} className="gap-2">
            <Square className="h-4 w-4" />
            End session
          </Button>
        </div>
      ) : (
        <Button size="lg" className="w-full gap-2 h-12" onClick={start}>
          <Play className="h-5 w-5" />
          Start focus session
        </Button>
      )}

      <div className="text-center text-xs text-muted-foreground">
        <p>© Adeshjeet_official</p>
      </div>

      {/* Focus warning overlay */}
      {showFocusWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cyan-950/90 backdrop-blur-md p-4">
          <div className="text-center space-y-6 max-w-sm">
            <div className="relative h-32 w-32 mx-auto">
              <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
              <div className="absolute inset-4 rounded-full bg-cyan-500/30 flex items-center justify-center">
                <Brain className="h-12 w-12 text-cyan-300" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">You drifted away</h2>
              <p className="text-sm text-cyan-200">
                You switched tabs during your focus session. Take a breath, then come back when you&apos;re ready.
              </p>
            </div>
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setShowFocusWarning(false)}
            >
              I&apos;m back — resume
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pomodoro view ───────────────────────────────────────────────────────────

function PomodoroView({ onSessionSaved }: { onSessionSaved: () => void }) {
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isBreak, setIsBreak] = useState(false);
  const [active, setActive] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      let cancelled = false;
      Promise.resolve().then(() => {
        if (!cancelled) setTimeLeft(isBreak ? breakMin * 60 : workMin * 60);
      });
      return () => { cancelled = true; };
    }
  }, [workMin, breakMin, isBreak, active]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function start() {
    setActive(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          phaseComplete();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function phaseComplete() {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(false);
    playSfx("success");
    haptic("success");

    if (!isBreak) {
      // Work phase done — save session + start break
      createSession({ type: "pomodoro", duration_s: workMin * 60 });
      onSessionSaved();
      setCompletedPomodoros((c) => c + 1);
      setIsBreak(true);
      setTimeLeft(breakMin * 60);
      toast.success(`Pomodoro ${completedPomodoros + 1} done! Take a ${breakMin}-min break.`);
    } else {
      // Break done — back to work
      setIsBreak(false);
      setTimeLeft(workMin * 60);
      toast.success("Break over. Ready for the next pomodoro?");
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(false);
  }

  const totalSec = (isBreak ? breakMin : workMin) * 60;
  const progress = ((totalSec - timeLeft) / totalSec) * 100;

  return (
    <div className="mx-auto max-w-md p-4 sm:p-6 space-y-6 pb-12 flex flex-col items-center min-h-[60vh]">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Pomodoro</h1>
        <p className="text-sm text-muted-foreground">25 min work · 5 min break · repeat</p>
      </div>

      {/* Phase badge */}
      <Badge variant="outline" className={cn(
        "text-sm px-3 py-1",
        isBreak ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
      )}>
        {isBreak ? "☕ Break" : "🍅 Focus"}
      </Badge>

      {/* Timer */}
      <div className="relative h-64 w-64 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
          <circle
            cx="60" cy="60" r="54" fill="none" stroke={isBreak ? "#10b981" : "#f43f5e"} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 54 * progress / 100} ${2 * Math.PI * 54}`}
          />
        </svg>
        <div className="relative z-10 text-center">
          <div className="text-5xl font-bold tabular-nums">
            {formatDuration(timeLeft)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {active ? "Running" : "Ready"}
          </div>
        </div>
      </div>

      {/* Pomodoro count */}
      <div className="text-sm text-muted-foreground">
        Completed: {completedPomodoros} 🍅
      </div>

      {/* Settings */}
      {!active && completedPomodoros === 0 && (
        <div className="w-full grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-center text-muted-foreground mb-1">Work (min)</div>
            <div className="grid grid-cols-4 gap-1">
              {[15, 25, 30, 45].map((m) => (
                <button
                  key={m}
                  onClick={() => setWorkMin(m)}
                  className={cn(
                    "rounded-md border py-1.5 text-xs font-medium transition-colors",
                    workMin === m ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300" : "border-border hover:bg-accent",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-center text-muted-foreground mb-1">Break (min)</div>
            <div className="grid grid-cols-4 gap-1">
              {[3, 5, 10, 15].map((m) => (
                <button
                  key={m}
                  onClick={() => setBreakMin(m)}
                  className={cn(
                    "rounded-md border py-1.5 text-xs font-medium transition-colors",
                    breakMin === m ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-border hover:bg-accent",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      {active ? (
        <Button variant="outline" onClick={stop} className="gap-2">
          <Pause className="h-4 w-4" />
          Pause
        </Button>
      ) : (
        <Button size="lg" className="w-full gap-2 h-12" onClick={start}>
          <Play className="h-5 w-5" />
          {isBreak ? "Start break" : "Start pomodoro"}
        </Button>
      )}

      <div className="text-center text-xs text-muted-foreground">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

// ─── Ambient sound mixer ─────────────────────────────────────────────────────

function AmbientView() {
  const [activeSounds, setActiveSounds] = useState<AmbientSound[]>([]);
  const [volume, setVolume] = useState(0.5);

  function toggleSound(sound: AmbientSound) {
    if (isAmbientPlaying(sound)) {
      stopAmbient(sound);
      setActiveSounds(getActiveSounds());
      haptic("tap");
    } else {
      playAmbient(sound, volume);
      setActiveSounds(getActiveSounds());
      haptic("tap");
    }
  }

  function stopAll() {
    stopAllAmbient();
    setActiveSounds([]);
    haptic("tap");
  }

  return (
    <div className="mx-auto max-w-md p-4 sm:p-6 space-y-5 pb-12">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Ambient Sounds</h1>
        <p className="text-sm text-muted-foreground">Mix and layer sounds for focus or relaxation.</p>
      </div>

      {/* Sound grid */}
      <div className="grid grid-cols-2 gap-3">
        {AMBIENT_SOUNDS.map((s) => {
          const isActive = activeSounds.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggleSound(s.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                isActive
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 scale-105"
                  : "border-border hover:bg-accent hover:scale-105",
              )}
            >
              <span className="text-3xl">{s.icon}</span>
              <span className="text-sm font-medium">{s.label}</span>
              {isActive && <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* Volume */}
      {activeSounds.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Volume</span>
            <span className="font-medium">{Math.round(volume * 100)}%</span>
          </div>
          <Slider
            value={[volume * 100]}
            onValueChange={(v) => {
              setVolume(v[0] / 100);
              // Update volume for all active sounds (they need to be restarted)
              const current = getActiveSounds();
              current.forEach((s) => {
                stopAmbient(s);
                playAmbient(s, v[0] / 100);
              });
            }}
            max={100}
            step={5}
          />
        </div>
      )}

      {/* Stop all */}
      {activeSounds.length > 0 && (
        <Button variant="outline" className="w-full gap-2" onClick={stopAll}>
          <Square className="h-4 w-4" />
          Stop all sounds
        </Button>
      )}

      <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">All sounds are generated in real-time</p>
        <p>No audio files needed — rain, ocean, wind, forest, and noise are synthesized using the Web Audio API.</p>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

// ─── History view ────────────────────────────────────────────────────────────

function HistoryView({ stats, onRefresh }: { stats: MeditationStats | null; onRefresh: () => void }) {
  const [sessions, setSessions] = useState<MeditationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getRecentSessions(20).then((s) => {
      // We need to import getRecentSessions
      import("@/lib/meditation/queries").then(({ getRecentSessions }) => {
        getRecentSessions(20).then((s) => {
          if (cancelled) return;
          setSessions(s);
          setLoading(false);
        });
      });
    });
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(id: string) {
    const { deleteSession } = await import("@/lib/meditation/queries");
    await deleteSession(id);
    toast.success("Session deleted");
    onRefresh();
    import("@/lib/meditation/queries").then(({ getRecentSessions }) => {
      getRecentSessions(20).then(setSessions);
    });
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-4 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">Your meditation journey</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Sessions" value={String(stats.totalSessions)} color="text-cyan-600 dark:text-cyan-400" />
          <StatCard label="This week" value={String(stats.sessionsThisWeek)} color="text-violet-600 dark:text-violet-400" />
          <StatCard label="Total min" value={String(stats.totalMinutes)} color="text-amber-600 dark:text-amber-400" />
          <StatCard label="Streak" value={`${stats.currentStreak}d`} color="text-emerald-600 dark:text-emerald-400" />
        </div>
      )}

      {/* Session list */}
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <Wind className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            No sessions yet. Start with a breathing exercise or focus timer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const meta = TYPE_META[s.type];
            return (
              <Card key={s.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="text-2xl flex-shrink-0">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(s.duration_s)} · {formatTimeAgo(s.started_at)}
                    </div>
                    {s.notes && <div className="text-xs text-muted-foreground mt-0.5 truncate">{s.notes}</div>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => handleDelete(s.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className={cn("text-xl font-bold", color)}>{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

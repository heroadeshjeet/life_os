"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, Play, Pause, SkipForward, CheckCircle2, Droplets, Volume2, VolumeX,
  Dumbbell, Clock, Flame, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  type ExercisePlan, getGifPath,
} from "@/lib/exercise/library";
import {
  createSession, formatDuration, addWater,
} from "@/lib/exercise/queries";
import {
  coachSpeak, coachStop, getCoachVoice, setCoachVoice,
  cueWorkoutStart, cueExerciseIntro, cueSetStart, cueSetComplete,
  cueExerciseComplete, cueWorkoutComplete, cueRestEnd, cueWaterReminder,
  cueEncouragement, cueLastReps,
  COACH_VOICES, type CoachVoiceId,
} from "@/lib/exercise/coach";
import { haptic, playSfx } from "@/components/providers/global-ux";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Phase = "intro" | "exercise" | "rest" | "complete";

interface Props {
  plan: ExercisePlan;
  dayNum: number;
  onExit: () => void;
}

const BETWEEN_EXERCISE_REST_SEC = 20;

export function SessionPlayer({ plan, dayNum, onExit }: Props) {
  const day = plan.days.find((d) => d.day === dayNum);
  const [phase, setPhase] = useState<Phase>("intro");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [repsDone, setRepsDone] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [coachId, setCoachId] = useState<CoachVoiceId>(getCoachVoice());
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [sessionStartTime] = useState(Date.now());
  const [showComplete, setShowComplete] = useState(false);
  const [gifError, setGifError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { setCoachId(getCoachVoice()); }, []);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      coachStop();
      if (musicRef.current) { musicRef.current.pause(); musicRef.current = null; }
    };
  }, []);

  // Start background music
  useEffect(() => {
    if (musicEnabled && (phase === "exercise" || phase === "rest")) {
      if (!musicRef.current) {
        const tracks = ["high-energy-1.mp3", "steady-push-1.mp3", "uplifting-1.mp3"];
        const track = tracks[Math.floor(Math.random() * tracks.length)];
        musicRef.current = new Audio(`/assets/audio/music/exercise/${track}`);
        musicRef.current.loop = true;
        musicRef.current.volume = 0.25;
        musicRef.current.play().catch(() => {});
      }
    } else {
      if (musicRef.current) { musicRef.current.pause(); }
    }
  }, [musicEnabled, phase]);

  if (!day || day.isRest) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-6xl">☕</div>
        <p className="text-lg font-medium">This is a rest day.</p>
        <p className="text-sm text-muted-foreground">Recovery is part of growth. Come back tomorrow!</p>
        <Button onClick={onExit}>Back to plans</Button>
      </div>
    );
  }

  const exercises = day.exercises;
  const currentExercise = exercises[exerciseIdx];
  const totalExercises = exercises.length;

  function startWorkout() {
    if (voiceEnabled) coachSpeak(cueWorkoutStart(plan.name, exercises[0].name), coachId);
    playSfx("unlock"); haptic("unlock");
    setPhase("exercise");
    setExerciseIdx(0);
    setRepsDone(0);
    setGifError(false);
    if (exercises[0].type === "time") {
      setTimeLeft(exercises[0].durationSec ?? 20);
      startTimer();
    }
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (paused) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleExerciseComplete();
          return 0;
        }
        if (prev === 4 && voiceEnabled) { coachSpeak(cueLastReps(), coachId); haptic("warning"); }
        return prev - 1;
      });
    }, 1000);
  }

  function incrementRep() {
    setRepsDone((prev) => {
      const next = prev + 1;
      const target = currentExercise.reps ?? 10;
      if (next === Math.ceil(target / 2) && voiceEnabled) coachSpeak(cueEncouragement(), coachId);
      if (next === target - 2 && voiceEnabled) { coachSpeak(cueLastReps(), coachId); haptic("warning"); }
      if (next >= target) { handleExerciseComplete(); return target; }
      if (next % 5 === 0 && voiceEnabled) coachSpeak(String(next), coachId);
      haptic("tap");
      return next;
    });
  }

  function handleExerciseComplete() {
    if (timerRef.current) clearInterval(timerRef.current);
    coachStop();
    setCompletedExercises((prev) => [...prev, currentExercise.name]);
    playSfx("success"); haptic("success");

    if (exerciseIdx >= exercises.length - 1) {
      if (voiceEnabled) coachSpeak(cueWorkoutComplete(), coachId);
      setPhase("complete");
      setShowComplete(true);
      saveSession();
      if (musicRef.current) { musicRef.current.pause(); }
    } else {
      if (voiceEnabled) coachSpeak(cueExerciseComplete(exercises[exerciseIdx + 1].name), coachId);
      setPhase("rest");
      setRestLeft(BETWEEN_EXERCISE_REST_SEC);
      startRestTimer(BETWEEN_EXERCISE_REST_SEC);
    }
  }

  function startRestTimer(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestLeft(seconds);
    timerRef.current = setInterval(() => {
      if (paused) return;
      setRestLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleRestEnd();
          return 0;
        }
        if (prev <= 3 && voiceEnabled) coachSpeak(String(prev), coachId);
        return prev - 1;
      });
    }, 1000);
  }

  function handleRestEnd() {
    coachStop();
    if (voiceEnabled) coachSpeak(cueRestEnd(), coachId);
    haptic("success");
    setPhase("exercise");
    setExerciseIdx((prev) => prev + 1);
    setRepsDone(0);
    setGifError(false);
    const nextEx = exercises[exerciseIdx + 1];
    if (nextEx?.type === "time") {
      setTimeLeft(nextEx.durationSec ?? 20);
      startTimer();
    }
    if (voiceEnabled && nextEx) {
      setTimeout(() => {
        const spec = nextEx.type === "reps" ? `${nextEx.reps} reps` : `${nextEx.durationSec} seconds`;
        coachSpeak(cueExerciseIntro(nextEx.name, 1, spec), coachId);
      }, 1500);
    }
  }

  function skipRest() {
    if (timerRef.current) clearInterval(timerRef.current);
    handleRestEnd();
  }

  function skipExercise() {
    if (!confirm("Skip this exercise?")) return;
    if (timerRef.current) clearInterval(timerRef.current);
    coachStop();
    if (exerciseIdx >= exercises.length - 1) {
      setPhase("complete"); setShowComplete(true); saveSession();
      if (musicRef.current) { musicRef.current.pause(); }
    } else {
      setPhase("rest"); setRestLeft(BETWEEN_EXERCISE_REST_SEC); startRestTimer(BETWEEN_EXERCISE_REST_SEC);
    }
  }

  async function saveSession() {
    const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);
    try {
      await createSession({
        plan_id: plan.id,
        category: "strength-core",
        exercises: completedExercises.map((name) => ({ exercise_id: name, name, sets: [{ reps: null, weight_kg: null, duration_s: null, rpe: null, completed: true }] })),
        total_volume_kg: 0,
        perceived_effort: null,
        notes: `${plan.name} — Day ${dayNum}`,
        ended_at: Date.now(),
      });
      toast.success("Workout saved! Streak updated.");
    } catch (err) {
      console.error("[exercise] failed to save session:", err);
    }
  }

  async function logWater() {
    await addWater(250);
    haptic("tap");
    if (voiceEnabled) coachSpeak("Water logged. Stay hydrated!", coachId);
  }

  function toggleVoice() { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) coachStop(); haptic("tap"); }
  function toggleMusic() { setMusicEnabled(!musicEnabled); haptic("tap"); }
  function togglePause() { setPaused(!paused); haptic("tap"); }

  function handleExit() {
    if (phase === "exercise" || phase === "rest") {
      if (!confirm("Exit workout? Progress will be lost.")) return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    coachStop();
    if (musicRef.current) { musicRef.current.pause(); }
    onExit();
  }

  function changeCoach(id: CoachVoiceId) { setCoachId(id); setCoachVoice(id); coachStop(); haptic("tap"); }

  const gifPath = currentExercise?.gifPath;
  const progressPct = currentExercise?.type === "reps"
    ? (repsDone / (currentExercise.reps ?? 1)) * 100
    : currentExercise ? (((currentExercise.durationSec ?? 1) - timeLeft) / (currentExercise.durationSec ?? 1)) * 100 : 0;

  // ─── Complete screen ──────────────────────────────────────────────────────
  if (showComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="text-6xl">🎉</div>
          <div>
            <h2 className="text-2xl font-bold">Workout Complete!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {plan.name} — Day {dayNum} · {completedExercises.length} exercises · {formatDuration(Math.round((Date.now() - sessionStartTime) / 1000))}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/30 p-4">
            <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              +20 points added to today's streak score
            </p>
          </div>
          <Button className="w-full" onClick={onExit}>Back to plans</Button>
        </div>
      </div>
    );
  }

  // ─── Intro screen ─────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="text-4xl">{plan.icon}</div>
            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <p className="text-sm text-muted-foreground">Day {dayNum} · {exercises.length} exercises</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Coach voice</span>
              <Button variant="ghost" size="sm" onClick={toggleVoice} className="gap-1.5">
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
            {voiceEnabled && (
              <div className="grid grid-cols-2 gap-1.5">
                {COACH_VOICES.map((c) => (
                  <button key={c.id} onClick={() => changeCoach(c.id)}
                    className={cn("rounded-md border p-2 text-left text-xs transition-colors",
                      coachId === c.id ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : "border-border hover:bg-accent")}>
                    <div className="font-medium">{c.label.split(" — ")[0]}</div>
                    <div className="text-[10px] text-muted-foreground">{c.label.split(" — ")[1]}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm font-medium">Background music</span>
              <Button variant="ghost" size="sm" onClick={toggleMusic} className="gap-1.5">
                {musicEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-1 max-h-48 overflow-y-auto">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Today's exercises</div>
            {exercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1">
                <span>{i + 1}. {ex.name}</span>
                <span className="text-muted-foreground text-xs">{ex.type === "reps" ? `×${ex.reps}` : `${ex.durationSec}s`}</span>
              </div>
            ))}
          </div>
          <Button className="w-full gap-2 h-12" onClick={startWorkout}>
            <Play className="h-5 w-5" /> Start workout
          </Button>
          <Button variant="ghost" className="w-full" onClick={onExit}>Cancel</Button>
        </div>
      </div>
    );
  }

  // ─── Exercise phase ───────────────────────────────────────────────────────
  if (phase === "exercise") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header with segmented progress */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={handleExit} className="h-9 w-9">
            <X className="h-4 w-4" />
          </Button>
          <div className="flex-1 px-4">
            <div className="text-xs text-muted-foreground text-center mb-1">
              Exercise {exerciseIdx + 1} of {totalExercises}
            </div>
            <div className="flex gap-0.5">
              {exercises.map((_, i) => (
                <div key={i} className={cn(
                  "flex-1 h-1 rounded-full transition-colors",
                  i < exerciseIdx ? "bg-emerald-500" : i === exerciseIdx ? "bg-emerald-400" : "bg-muted"
                )} />
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleVoice}>
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleMusic}>
              {musicEnabled ? <Volume2 className="h-4 w-4 text-emerald-500" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
          {/* GIF with ring */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-200/30 to-teal-300/20 dark:from-emerald-900/20 dark:to-teal-900/10 animate-pulse" />
            <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-muted">
              {gifPath && !gifError ? (
                <img
                  src={gifPath}
                  alt={currentExercise.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={() => setGifError(true)}
                />
              ) : (
                <Dumbbell className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Exercise name + target */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">{currentExercise.name}</h2>
            <div className="text-sm text-muted-foreground">
              {currentExercise.type === "reps"
                ? `${repsDone} / ${currentExercise.reps} reps`
                : `${formatDuration(timeLeft)} remaining`}
            </div>
          </div>

          {/* Progress + counter */}
          <div className="w-full max-w-xs space-y-2">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="text-center text-3xl font-bold tabular-nums">
              {currentExercise.type === "reps" ? (
                <>{repsDone}<span className="text-lg text-muted-foreground"> / {currentExercise.reps}</span></>
              ) : (
                <>{timeLeft}<span className="text-lg text-muted-foreground">s</span></>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {currentExercise.type === "reps" && (
              <Button size="lg" className="h-16 w-16 rounded-full text-lg font-bold" onClick={incrementRep} disabled={paused}>
                +1
              </Button>
            )}
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={togglePause}>
              {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="sm" onClick={skipExercise} className="gap-1.5">
              <SkipForward className="h-4 w-4" /> Skip
            </Button>
          </div>

          {/* Water */}
          <Button variant="ghost" size="sm" onClick={logWater} className="gap-1.5 text-cyan-600 dark:text-cyan-400">
            <Droplets className="h-4 w-4" /> Log water (+250ml)
          </Button>
        </div>
      </div>
    );
  }

  // ─── Rest phase ───────────────────────────────────────────────────────────
  if (phase === "rest") {
    const nextEx = exercises[exerciseIdx + 1];
    const restProgress = ((BETWEEN_EXERCISE_REST_SEC - restLeft) / BETWEEN_EXERCISE_REST_SEC) * 100;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/20 dark:to-cyan-950/20">
        <div className="text-center space-y-2">
          <div className="text-4xl">💧</div>
          <h2 className="text-2xl font-bold">Rest</h2>
          <p className="text-sm text-muted-foreground">Next: {nextEx?.name ?? "Done"}</p>
        </div>
        {/* SVG circular timer */}
        <div className="relative w-40 h-40">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54 * restProgress / 100} ${2 * Math.PI * 54}`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold tabular-nums text-sky-600 dark:text-sky-400">{restLeft}<span className="text-lg text-muted-foreground">s</span></span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={logWater} className="gap-1.5">
            <Droplets className="h-4 w-4" /> Water
          </Button>
          <Button size="sm" onClick={skipRest} className="gap-1.5">
            <SkipForward className="h-4 w-4" /> Skip rest
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

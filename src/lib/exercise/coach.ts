/**
 * Life_OS v2 — Exercise coach TTS.
 *
 * Uses browser SpeechSynthesis for voice cues during workouts.
 * No pre-recorded audio needed — works on every platform.
 *
 * 4 coach personalities, each with gender + rate + pitch.
 * The user picks one in Settings.
 */
"use client";

export type CoachVoiceId =
  | "coach-1-male-energy"
  | "coach-2-female-warm"
  | "coach-3-male-calm"
  | "coach-4-female-strong";

export interface CoachVoiceDef {
  id: CoachVoiceId;
  label: string;
  desc: string;
  gender: "female" | "male";
  rate: number;
  pitch: number;
}

export const COACH_VOICES: CoachVoiceDef[] = [
  { id: "coach-1-male-energy",   label: "Male — high energy",  desc: "Drill-sergeant motivating",      gender: "male",   rate: 1.1, pitch: 1.0 },
  { id: "coach-2-female-warm",   label: "Female — warm",       desc: "Encouraging, supportive",         gender: "female", rate: 1.0, pitch: 1.1 },
  { id: "coach-3-male-calm",     label: "Male — calm",         desc: "Mindfulness-influenced",          gender: "male",   rate: 0.95, pitch: 0.9 },
  { id: "coach-4-female-strong", label: "Female — strong",     desc: "Direct, no-nonsense",             gender: "female", rate: 1.05, pitch: 1.0 },
];

export const DEFAULT_COACH: CoachVoiceId = "coach-1-male-energy";

let currentCoach: CoachVoiceId = DEFAULT_COACH;
let voicesLoaded: SpeechSynthesisVoice[] = [];

export function setCoachVoice(id: CoachVoiceId) {
  currentCoach = id;
  localStorage.setItem("exercise_coach_voice", id);
}

export function getCoachVoice(): CoachVoiceId {
  if (typeof window === "undefined") return DEFAULT_COACH;
  const stored = localStorage.getItem("exercise_coach_voice") as CoachVoiceId | null;
  if (stored) currentCoach = stored;
  return currentCoach;
}

export function getCoachDef(id: CoachVoiceId): CoachVoiceDef {
  return COACH_VOICES.find((v) => v.id === id) ?? COACH_VOICES[0];
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  voicesLoaded = window.speechSynthesis.getVoices();
  return voicesLoaded;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function pickSystemVoice(gender: "female" | "male"): SpeechSynthesisVoice | null {
  const voices = voicesLoaded.length > 0 ? voicesLoaded : loadVoices();
  if (voices.length === 0) return null;
  const english = voices.filter((v) => v.lang.startsWith("en"));
  const pool = english.length > 0 ? english : voices;
  const femaleKeywords = ["female", "samantha", "victoria", "karen", "moira", "zira", "google uk english female", "google us english"];
  const maleKeywords = ["male", "daniel", "alex", "fred", "david", "google uk english male"];
  const keywords = gender === "female" ? femaleKeywords : maleKeywords;
  for (const kw of keywords) {
    const match = pool.find((v) => v.name.toLowerCase().includes(kw));
    if (match) return match;
  }
  return pool[0] ?? null;
}

// ─── Speak ───────────────────────────────────────────────────────────────────

export function coachSpeak(
  text: string,
  coachId: CoachVoiceId = currentCoach,
  options: { onStart?: () => void; onEnd?: () => void } = {},
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    options.onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const def = getCoachDef(coachId);
  const utterance = new SpeechSynthesisUtterance(text);
  const sysVoice = pickSystemVoice(def.gender);
  if (sysVoice) utterance.voice = sysVoice;
  utterance.rate = def.rate;
  utterance.pitch = def.pitch;
  utterance.volume = 1.0;
  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function coachStop(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function isCoachSpeaking(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  return window.speechSynthesis.speaking;
}

// ─── Cue generators ─────────────────────────────────────────────────────────

export function cueWorkoutStart(planName: string, firstExercise: string): string {
  return `Let's go! Starting ${planName}. First exercise: ${firstExercise}.`;
}

export function cueExerciseIntro(name: string, sets: number, repsOrDuration: string): string {
  return `Next: ${name}. ${sets} sets of ${repsOrDuration}.`;
}

export function cueSetStart(setNum: number, totalSets: number): string {
  return `Set ${setNum} of ${totalSets}. Begin!`;
}

export function cueRepCount(count: number): string {
  return String(count);
}

export function cueHalfway(): string {
  const encouragements = ["Halfway there!", "Keep going!", "You're doing great!"];
  return encouragements[Math.floor(Math.random() * encouragements.length)];
}

export function cueLastReps(): string {
  return "Three, two, one...";
}

export function cueSetComplete(restSec: number): string {
  return `Set complete. Rest for ${restSec} seconds.`;
}

export function cueRestEnd(): string {
  return "Three, two, one, go!";
}

export function cueExerciseComplete(nextExercise: string | null): string {
  if (nextExercise) return `Exercise complete. Next up: ${nextExercise}.`;
  return "Exercise complete.";
}

export function cueWorkoutComplete(): string {
  const completes = [
    "Great workout! You crushed it today.",
    "That's a wrap! Be proud of showing up.",
    "Workout complete. See you tomorrow!",
  ];
  return completes[Math.floor(Math.random() * completes.length)];
}

export function cueWaterReminder(): string {
  return "Grab a sip of water.";
}

export function cueEncouragement(): string {
  const cues = ["You got this!", "Push through!", "Almost there!", "Don't quit now!"];
  return cues[Math.floor(Math.random() * cues.length)];
}

export function cueRestCountdown(secondsLeft: number): string {
  if (secondsLeft <= 3 && secondsLeft > 0) return String(secondsLeft);
  return "";
}

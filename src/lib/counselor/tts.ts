/**
 * Life_OS v2 — Counselor TTS layer.
 *
 * Uses the browser's built-in SpeechSynthesis API (system voices). No
 * pre-recorded audio files needed — works on every platform with system
 * TTS voices installed.
 *
 * 4 voice personalities, each mapped to a system voice by gender + language.
 * The user picks one in Settings; the choice persists on user_profile.
 */
"use client";

export type CounselorVoiceId =
  | "counselor-warm"      // empathetic female
  | "counselor-steady"    // grounding male
  | "counselor-direct"    // action-oriented male
  | "counselor-energetic"; // motivational female

export interface VoiceDef {
  id: CounselorVoiceId;
  label: string;
  desc: string;
  gender: "female" | "male";
  rate: number;   // 0.5 - 2.0
  pitch: number;  // 0 - 2
  systemPrompt: string;
}

export const COUNSELOR_VOICES: VoiceDef[] = [
  {
    id: "counselor-warm",
    label: "Warm — empathetic female",
    desc: "Daily check-ins, emotional support",
    gender: "female",
    rate: 0.95,
    pitch: 1.1,
    systemPrompt: `You are the Life_OS Counselor with a warm, empathetic voice. You speak like a caring friend who truly listens. You validate feelings before offering perspective. You're gentle but honest. You reference the user's actual data (journals, moods, habits) when relevant. Keep responses concise (2-4 sentences unless asked for detail). Never invent facts about the user — if you don't know, say so.`,
  },
  {
    id: "counselor-steady",
    label: "Steady — grounding male",
    desc: "Stress, anxiety, meditation reflections",
    gender: "male",
    rate: 0.9,
    pitch: 0.9,
    systemPrompt: `You are the Life_OS Counselor with a calm, steady, grounding presence. You speak slowly and deliberately. You help the user breathe and find perspective. You're like a meditation teacher who also happens to know their data. You reference the user's actual data when relevant. Keep responses concise (2-4 sentences). Never invent facts about the user.`,
  },
  {
    id: "counselor-direct",
    label: "Direct — action male",
    desc: "Goal-setting, accountability",
    gender: "male",
    rate: 1.05,
    pitch: 1.0,
    systemPrompt: `You are the Life_OS Counselor with a direct, action-oriented style. You cut through overthinking and help the user identify the next concrete step. You hold them accountable without judgment. You reference the user's actual data (task completion, spending, habits) when relevant. Keep responses concise (2-4 sentences). Never invent facts about the user.`,
  },
  {
    id: "counselor-energetic",
    label: "Energetic — motivational female",
    desc: "Pre-workout, low-mood days",
    gender: "female",
    rate: 1.1,
    pitch: 1.2,
    systemPrompt: `You are the Life_OS Counselor with high energy and motivation. You're like a supportive coach who believes in the user. You celebrate small wins, reframe setbacks, and get them moving. You reference the user's actual data when relevant. Keep responses concise (2-4 sentences). Never invent facts about the user.`,
  },
];

export const DEFAULT_VOICE: CounselorVoiceId = "counselor-warm";

let currentVoice: CounselorVoiceId = DEFAULT_VOICE;
let voicesLoaded: SpeechSynthesisVoice[] = [];

export function setCounselorVoice(id: CounselorVoiceId) {
  currentVoice = id;
}

export function getCounselorVoice(): CounselorVoiceId {
  return currentVoice;
}

export function getVoiceDef(id: CounselorVoiceId): VoiceDef {
  return COUNSELOR_VOICES.find((v) => v.id === id) ?? COUNSELOR_VOICES[0];
}

// ─── Voice loading ───────────────────────────────────────────────────────────

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

  // Prefer English voices
  const english = voices.filter((v) => v.lang.startsWith("en"));
  const pool = english.length > 0 ? english : voices;

  // Try to find a voice matching the gender by name keywords
  const femaleKeywords = ["female", "woman", "samantha", "victoria", "karen", "moira", "tessa", "fiona", "serena", "zira", "google uk english female", "google us english"];
  const maleKeywords = ["male", "man", "daniel", "alex", "fred", "tom", "david", "george", "oliver", "rishi", "google uk english male"];

  const keywords = gender === "female" ? femaleKeywords : maleKeywords;
  for (const kw of keywords) {
    const match = pool.find((v) => v.name.toLowerCase().includes(kw));
    if (match) return match;
  }

  // Fallback: just pick the first English voice
  return pool[0] ?? null;
}

// ─── Speak ────────────────────────────────────────────────────────────────────

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export function speakCounselor(
  text: string,
  voiceId: CounselorVoiceId = currentVoice,
  options: SpeakOptions = {},
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    options.onEnd?.();
    return;
  }

  // Cancel any in-progress speech
  window.speechSynthesis.cancel();

  const def = getVoiceDef(voiceId);
  const utterance = new SpeechSynthesisUtterance(text);
  const systemVoice = pickSystemVoice(def.gender);
  if (systemVoice) {
    utterance.voice = systemVoice;
  }
  utterance.rate = def.rate;
  utterance.pitch = def.pitch;
  utterance.volume = 1.0;

  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = (e) => options.onError?.(e);

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  return window.speechSynthesis.speaking;
}

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && !!window.speechSynthesis;
}

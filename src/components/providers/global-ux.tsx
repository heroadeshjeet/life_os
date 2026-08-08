/**
 * Life_OS v2 — Global UX provider.
 *
 * Applies user-configurable UX behaviors across the app:
 *   - Haptics (navigator.vibrate) on tap/success/error/unlock
 *   - SFX (Web Audio API) — tap/success/error/unlock/lock/add/delete
 *   - Animation intensity (none / minimal / full) via html data attribute
 *   - Anti-select on body (with editable element exceptions)
 *   - Anti-drag on images and links
 *   - Anti-right-click contextmenu
 *   - -webkit-tap-highlight-color: transparent
 */
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

// ─── Haptics ─────────────────────────────────────────────────────────────────

export type HapticPattern = "tap" | "success" | "error" | "unlock" | "lock" | "warning";

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  success: [10, 40, 10],
  error: [180],
  unlock: [20, 30, 20],
  lock: [40],
  warning: [60, 30, 60],
};

export function haptic(pattern: HapticPattern = "tap") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const { profile } = useAuthStore.getState();
  if (!profile?.preferences?.haptics_enabled) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch {
    // no-op
  }
}

// ─── Sound effects (Web Audio API) ──────────────────────────────────────────

export type SfxName = "tap" | "success" | "error" | "unlock" | "lock" | "add" | "delete";

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.15,
  startAt = 0,
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(ctx.destination);
  const t0 = ctx.currentTime + startAt;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playSfx(name: SfxName) {
  const { profile } = useAuthStore.getState();
  if (!profile?.preferences?.sound_enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  switch (name) {
    case "tap":
      tone(ctx, 800, 0.08, "sine", 0.12);
      break;
    case "success":
      tone(ctx, 523.25, 0.15, "sine", 0.18);
      tone(ctx, 783.99, 0.15, "sine", 0.18, 0.15);
      break;
    case "error":
      tone(ctx, 200, 0.2, "square", 0.12);
      break;
    case "unlock":
      tone(ctx, 440, 0.25, "sine", 0.2);
      tone(ctx, 880, 0.25, "sine", 0.2, 0.25);
      break;
    case "lock":
      tone(ctx, 440, 0.15, "sine", 0.18);
      tone(ctx, 220, 0.2, "sine", 0.18, 0.15);
      break;
    case "add":
      tone(ctx, 600, 0.12, "sine", 0.15);
      tone(ctx, 800, 0.12, "sine", 0.15, 0.12);
      tone(ctx, 1000, 0.12, "sine", 0.15, 0.24);
      break;
    case "delete":
      tone(ctx, 800, 0.2, "sine", 0.15);
      tone(ctx, 400, 0.25, "sine", 0.15, 0.1);
      break;
  }
}

export function feedback(sfx: SfxName, hapticPattern: HapticPattern = "tap") {
  playSfx(sfx);
  haptic(hapticPattern);
}

// ─── Provider component ─────────────────────────────────────────────────────

export function GlobalUXProvider({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const status = useAuthStore((s) => s.status);
  const animationIntensity = profile?.preferences?.animation_intensity ?? "full";

  // Animation intensity → html data attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-animations", animationIntensity);
  }, [animationIntensity]);

  // Anti-right-click + anti-drag (only when unlocked)
  useEffect(() => {
    if (status !== "unlocked") return;

    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
    };

    const onDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]')) return;
      if (target.tagName === "IMG" || target.tagName === "A") {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart, true);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart, true);
    };
  }, [status]);

  // Unlock AudioContext on first user gesture
  useEffect(() => {
    const onFirstGesture = () => {
      getAudioCtx();
    };
    const events = ["pointerdown", "keydown"];
    events.forEach((e) => window.addEventListener(e, onFirstGesture, { once: true, passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, onFirstGesture));
    };
  }, []);

  return <>{children}</>;
}

"use client";

import { useEffect, useState } from "react";
import {
  MOOD_EMOJI_MAP, MOOD_LABELS, MOOD_OPTIONS,
  setMood, getMoodByJournal,
  type MoodEmoji,
} from "@/lib/journal/queries";
import { cn } from "@/lib/utils";

interface Props {
  journalId: string;
  onChange?: () => void;
}

export function MoodPicker({ journalId, onChange }: Props) {
  const [selected, setSelected] = useState<MoodEmoji | null>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [tags, setTags] = useState<string>("");
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMoodByJournal(journalId).then((mood) => {
      if (cancelled || !mood) return;
      setSelected(mood.emoji);
      setIntensity(mood.intensity);
      setTags(mood.tags.join(", "));
    });
    return () => { cancelled = true; };
  }, [journalId]);

  async function pickMood(emoji: MoodEmoji) {
    setSelected(emoji);
    await setMood(journalId, emoji, intensity, parseTags(tags));
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1500);
    onChange?.();
  }

  async function updateIntensity(value: number) {
    setIntensity(value);
    if (selected) {
      await setMood(journalId, selected, value, parseTags(tags));
      onChange?.();
    }
  }

  async function updateTags(value: string) {
    setTags(value);
    if (selected) {
      await setMood(journalId, selected, intensity, parseTags(value));
      onChange?.();
    }
  }

  function parseTags(s: string): string[] {
    return s.split(",").map((t) => t.trim()).filter(Boolean);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-rose-700 dark:text-rose-300">How are you feeling?</div>
        {savedFlag && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">saved ✓</span>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {MOOD_OPTIONS.map((emoji) => {
          const isActive = selected === emoji;
          return (
            <button
              key={emoji}
              onClick={() => pickMood(emoji)}
              title={MOOD_LABELS[emoji]}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-2 transition-all",
                isActive
                  ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 scale-105"
                  : "border-border hover:bg-accent hover:border-rose-200 dark:hover:border-rose-900",
              )}
            >
              <span className="text-2xl leading-none">{MOOD_EMOJI_MAP[emoji]}</span>
              <span className="text-[10px] text-muted-foreground">{MOOD_LABELS[emoji]}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-3 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Intensity</span>
              <span className="font-mono">{intensity}/5</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => updateIntensity(n)}
                  className={cn(
                    "flex-1 h-8 rounded-md border text-xs font-medium transition-colors",
                    n <= intensity
                      ? "border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-100"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Tags (comma-separated)</div>
            <input
              type="text"
              value={tags}
              onChange={(e) => updateTags(e.target.value)}
              placeholder="work, family, tired..."
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

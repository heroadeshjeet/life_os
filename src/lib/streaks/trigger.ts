/**
 * Life_OS v2 — Rollup trigger helper.
 *
 * Other modules import this and call `triggerRollup()` after any mutation
 * that affects a day's score. This keeps the rollup table fresh without
 * the rollup worker needing to poll.
 *
 * Uses a debounce so rapid mutations (e.g., typing in the journal) don't
 * trigger hundreds of recomputations.
 */
import { recomputeToday } from "./rollup";

let pendingTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 1500;

export function triggerRollup(dateStr?: string): void {
  // For now we only recompute today (the common case).
  // If dateStr is provided and different from today, the calendar view
  // will recompute on-demand when the user clicks that date.
  if (dateStr && dateStr !== new Date().toISOString().slice(0, 10)) {
    return;
  }

  if (pendingTimeout) clearTimeout(pendingTimeout);
  pendingTimeout = setTimeout(() => {
    recomputeToday().catch((err) => {
      console.error("[streaks] rollup failed:", err);
    });
    pendingTimeout = null;
  }, DEBOUNCE_MS);
}

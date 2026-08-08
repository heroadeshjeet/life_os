"use client";

import { useEffect, useState } from "react";
import { getStreakInfo } from "@/lib/streaks/rollup";
import { getExerciseStats } from "@/lib/exercise/queries";
import { getStats as getMeditationStats } from "@/lib/meditation/queries";
import { getWaterToday, getWaterGoal } from "@/lib/exercise/queries";
import { getStats as getJournalStats } from "@/lib/journal/queries";
import { db, todayStr } from "@/lib/db/life-os-db";

/**
 * Life_OS v2 — Growth Tracker.
 *
 * A small plant/tree SVG that grows based on the user's overall activity:
 *   - Streak length (primary growth driver)
 *   - Recent exercise, water, meditation, journal, tasks
 *   - If user is inactive for 3+ days, the plant starts drying
 *
 * Growth stages (0-5):
 *   0: Seed (new user, no activity)
 *   1: Sprout (1-2 day streak)
 *   2: Small plant (3-6 day streak)
 *   3: Medium plant (7-13 day streak)
 *   4: Tree (14-29 day streak)
 *   5: Flourishing tree (30+ day streak)
 *
 * Health states:
 *   healthy: active within last 2 days
 *   drying: 3-5 days inactive
 *   wilted: 6+ days inactive
 */

export type GrowthStage = 0 | 1 | 2 | 3 | 4 | 5;
export type HealthState = "healthy" | "drying" | "wilted";

export interface GrowthState {
  stage: GrowthStage;
  health: HealthState;
  score: number; // 0-100 composite
  lastActiveDaysAgo: number;
}

export async function computeGrowthState(): Promise<GrowthState> {
  const [streakInfo, exerciseStats, meditationStats, journalStats, waterToday, waterGoal] = await Promise.all([
    getStreakInfo(),
    getExerciseStats(),
    getMeditationStats(),
    getJournalStats(),
    getWaterToday().catch(() => ({ total: 0 })),
    getWaterGoal().catch(() => 2500),
  ]);

  // Determine last active day (any activity tracked)
  const allStreakDays = await db.streak_days.toArray();
  const activeDates = allStreakDays
    .filter((d) => d.score > 0)
    .map((d) => d.date)
    .sort()
    .reverse();

  const today = todayStr();
  let lastActiveDaysAgo = 999;
  if (activeDates.length > 0) {
    const lastDate = activeDates[0];
    const diff = Math.round((new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000);
    lastActiveDaysAgo = diff;
  }

  // Composite score (0-100)
  let score = 0;
  // Streak: up to 40 points (1.3 per day, capped at 30 days)
  score += Math.min(streakInfo.current * 1.3, 40);
  // Exercise this week: up to 15 points
  score += Math.min(exerciseStats.sessionsThisWeek * 5, 15);
  // Meditation this week: up to 15 points
  score += Math.min(meditationStats.sessionsThisWeek * 5, 15);
  // Water today: up to 15 points
  const waterPct = waterGoal > 0 ? waterToday.total / waterGoal : 0;
  score += Math.min(waterPct * 15, 15);
  // Journal streak: up to 15 points
  score += Math.min(journalStats.currentStreak * 2, 15);
  score = Math.min(100, score);

  // Determine stage from streak
  let stage: GrowthStage = 0;
  const streak = streakInfo.current;
  if (streak === 0 && score === 0) stage = 0;
  else if (streak <= 2) stage = 1;
  else if (streak <= 6) stage = 2;
  else if (streak <= 13) stage = 3;
  else if (streak <= 29) stage = 4;
  else stage = 5;

  // Determine health
  let health: HealthState = "healthy";
  if (lastActiveDaysAgo >= 6) health = "wilted";
  else if (lastActiveDaysAgo >= 3) health = "drying";

  // If wilted, reduce visible stage
  if (health === "wilted") stage = Math.max(0, Math.min(stage, 2) as GrowthStage) as GrowthStage;
  if (health === "drying") stage = Math.max(0, Math.min(stage, 3) as GrowthStage) as GrowthStage;

  return { stage, health, score, lastActiveDaysAgo };
}

// ─── SVG rendering ───────────────────────────────────────────────────────────

const LEAF_GREEN = "#4ade80";
const LEAF_GREEN_DARK = "#16a34a";
const TRUNK_BROWN = "#92400e";
const DRY_YELLOW = "#d4d400";
const DRY_BROWN = "#92400e";
const SOIL_BROWN = "#451a03";

export function GrowthPlant({
  stage,
  health,
  size = 36,
}: {
  stage: GrowthStage;
  health: HealthState;
  size?: number;
}) {
  const leafColor = health === "healthy" ? LEAF_GREEN : health === "drying" ? DRY_YELLOW : DRY_BROWN;
  const leafColorDark = health === "healthy" ? LEAF_GREEN_DARK : health === "drying" ? "#a3a300" : "#6b3a0a";
  const trunkColor = TRUNK_BROWN;
  const droop = health !== "healthy";

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="flex-shrink-0">
      {/* Soil */}
      <ellipse cx="50" cy="88" rx="22" ry="6" fill={SOIL_BROWN} opacity="0.6" />

      {stage === 0 && (
        // Seed
        <g>
          <ellipse cx="50" cy="85" rx="8" ry="5" fill="#6b4423" />
          <ellipse cx="50" cy="83" rx="6" ry="3" fill="#8b5e3c" opacity="0.6" />
        </g>
      )}

      {stage >= 1 && (
        // Sprout — small stem with 2 tiny leaves
        <g>
          <path d={`M50 85 Q50 75 50 65`} stroke={trunkColor} strokeWidth="2" fill="none" />
          {droop ? (
            <>
              <ellipse cx="42" cy="68" rx="5" ry="3" fill={leafColor} transform="rotate(30 42 68)" opacity="0.7" />
              <ellipse cx="58" cy="68" rx="5" ry="3" fill={leafColor} transform="rotate(-30 58 68)" opacity="0.7" />
            </>
          ) : (
            <>
              <ellipse cx="42" cy="62" rx="6" ry="4" fill={leafColor} transform="rotate(-30 42 62)" />
              <ellipse cx="58" cy="62" rx="6" ry="4" fill={leafColor} transform="rotate(30 58 62)" />
            </>
          )}
        </g>
      )}

      {stage >= 2 && (
        // Small plant — taller stem, more leaves
        <g>
          <path d={`M50 85 Q50 70 50 55`} stroke={trunkColor} strokeWidth="2.5" fill="none" />
          {/* Lower leaves */}
          <ellipse cx="40" cy="70" rx="7" ry="4" fill={leafColor} transform={`rotate(${-30 - (droop ? 15 : 0)} 40 70)`} />
          <ellipse cx="60" cy="70" rx="7" ry="4" fill={leafColor} transform={`rotate(${30 + (droop ? 15 : 0)} 60 70)`} />
          {/* Upper leaves */}
          <ellipse cx="42" cy="58" rx="6" ry="3.5" fill={leafColorDark} transform={`rotate(${-35 - (droop ? 15 : 0)} 42 58)`} />
          <ellipse cx="58" cy="58" rx="6" ry="3.5" fill={leafColorDark} transform={`rotate(${35 + (droop ? 15 : 0)} 58 58)`} />
          {/* Top bud */}
          <circle cx="50" cy="52" r="3" fill={leafColor} />
        </g>
      )}

      {stage >= 3 && (
        // Medium plant — branching stem
        <g>
          <path d={`M50 85 Q50 65 50 45`} stroke={trunkColor} strokeWidth="3" fill="none" />
          {/* Branches */}
          <path d={`M50 65 Q40 60 35 55`} stroke={trunkColor} strokeWidth="2" fill="none" />
          <path d={`M50 65 Q60 60 65 55`} stroke={trunkColor} strokeWidth="2" fill="none" />
          <path d={`M50 55 Q42 50 38 45`} stroke={trunkColor} strokeWidth="2" fill="none" />
          <path d={`M50 55 Q58 50 62 45`} stroke={trunkColor} strokeWidth="2" fill="none" />
          {/* Leaves on branches */}
          <ellipse cx="35" cy="54" rx="8" ry="5" fill={leafColor} transform={`rotate(${-20 - (droop ? 20 : 0)} 35 54)`} />
          <ellipse cx="65" cy="54" rx="8" ry="5" fill={leafColor} transform={`rotate(${20 + (droop ? 20 : 0)} 65 54)`} />
          <ellipse cx="38" cy="44" rx="7" ry="4" fill={leafColorDark} transform={`rotate(${-25 - (droop ? 20 : 0)} 38 44)`} />
          <ellipse cx="62" cy="44" rx="7" ry="4" fill={leafColorDark} transform={`rotate(${25 + (droop ? 20 : 0)} 62 44)`} />
          {/* Top cluster */}
          <circle cx="50" cy="40" r="5" fill={leafColor} />
          <circle cx="46" cy="38" r="3" fill={leafColorDark} />
          <circle cx="54" cy="38" r="3" fill={leafColorDark} />
        </g>
      )}

      {stage >= 4 && (
        // Tree — trunk + canopy
        <g>
          {/* Trunk */}
          <path d={`M50 85 Q48 65 50 40 Q52 35 50 30`} stroke={trunkColor} strokeWidth="4" fill="none" />
          {/* Branches */}
          <path d={`M50 50 Q35 45 28 38`} stroke={trunkColor} strokeWidth="2.5" fill="none" />
          <path d={`M50 50 Q65 45 72 38`} stroke={trunkColor} strokeWidth="2.5" fill="none" />
          <path d={`M50 40 Q40 32 33 28`} stroke={trunkColor} strokeWidth="2" fill="none" />
          <path d={`M50 40 Q60 32 67 28`} stroke={trunkColor} strokeWidth="2" fill="none" />
          {/* Canopy */}
          <ellipse cx="50" cy="25" rx="20" ry="15" fill={leafColor} opacity={droop ? 0.6 : 0.9} />
          <ellipse cx="35" cy="32" rx="12" ry="9" fill={leafColorDark} opacity={droop ? 0.5 : 0.8} />
          <ellipse cx="65" cy="32" rx="12" ry="9" fill={leafColorDark} opacity={droop ? 0.5 : 0.8} />
          <ellipse cx="28" cy="35" rx="8" ry="6" fill={leafColor} opacity={droop ? 0.4 : 0.7} />
          <ellipse cx="72" cy="35" rx="8" ry="6" fill={leafColor} opacity={droop ? 0.4 : 0.7} />
        </g>
      )}

      {stage >= 5 && (
        // Flourishing tree — flowers/fruit
        <g>
          {/* Flowers */}
          {health === "healthy" && (
            <>
              <circle cx="40" cy="20" r="2.5" fill="#fbbf24" />
              <circle cx="55" cy="15" r="2.5" fill="#f472b6" />
              <circle cx="65" cy="25" r="2.5" fill="#fbbf24" />
              <circle cx="30" cy="28" r="2" fill="#f472b6" />
              <circle cx="70" cy="20" r="2" fill="#fbbf24" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}

// ─── Hook for components ────────────────────────────────────────────────────

export function useGrowthState() {
  const [state, setState] = useState<GrowthState | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const s = await computeGrowthState();
      if (!cancelled) setState(s);
    }
    load();
    const id = setInterval(load, 60000); // refresh every minute
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return state;
}

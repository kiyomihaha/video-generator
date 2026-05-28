// Cache Visualization — Per-Frame State (Phase 2)
// Pure function: CacheSchedule + frame → CacheState
// Called every frame. Only computes opacity/highlight/phase, no schedule mutation.

import type {
  CacheSchedule,
  CacheState,
  CellState,
  AccessState,
  TimelineEntry,
} from "./types";
import { clamp01, easeOutCubic } from "../utils";

// Phase boundaries within one clockPeriod (as fractions)
const PHASE_ADDRESS_END = 0.15;
const PHASE_DECOMPOSE_END = 0.35;
const PHASE_INDEX_END = 0.55;
const PHASE_COMPARE_END = 0.80;
// result: 0.80 - 1.0

function getPhase(progress: number): AccessState["phase"] {
  if (progress < PHASE_ADDRESS_END) return "address";
  if (progress < PHASE_DECOMPOSE_END) return "decompose";
  if (progress < PHASE_INDEX_END) return "index";
  if (progress < PHASE_COMPARE_END) return "compare";
  return "result";
}

function getPhaseProgress(progress: number): number {
  const p = progress;
  if (p < PHASE_ADDRESS_END) return p / PHASE_ADDRESS_END;
  if (p < PHASE_DECOMPOSE_END) return (p - PHASE_ADDRESS_END) / (PHASE_DECOMPOSE_END - PHASE_ADDRESS_END);
  if (p < PHASE_INDEX_END) return (p - PHASE_DECOMPOSE_END) / (PHASE_INDEX_END - PHASE_DECOMPOSE_END);
  if (p < PHASE_COMPARE_END) return (p - PHASE_INDEX_END) / (PHASE_COMPARE_END - PHASE_INDEX_END);
  return (p - PHASE_COMPARE_END) / (1 - PHASE_COMPARE_END);
}

export function cacheState(
  schedule: CacheSchedule,
  frame: number,
  fps: number,
  clockPeriod: number,
): CacheState {
  const cyclePeriod = clockPeriod * fps;
  const activeIndex = Math.floor(frame / cyclePeriod);
  const withinCycle = (frame % cyclePeriod) / cyclePeriod;

  const { timeline, numSets, associativity } = schedule;

  // ── Build grid cell states ─────────────────────────────────────

  // Track the committed cache state up to the current access
  // We need to replay accesses to know the current tag/valid/dirty for each way
  const grid: CellState[][] = Array.from({ length: numSets }, () =>
    Array.from({ length: associativity }, (): CellState => ({
      tag: null,
      valid: false,
      dirty: false,
      opacity: 0,
      highlight: 0,
      evictionFlash: 0,
    })),
  );

  // Replay accesses up to and including the active one
  const maxReplay = Math.min(activeIndex, timeline.length - 1);
  for (let i = 0; i <= maxReplay; i++) {
    const entry = timeline[i];
    const { index, fillWay, hitWay, victimWay, tag, result } = entry;

    // Eviction flash: visible for a few frames after the miss
    if (i === activeIndex && victimWay !== null && result !== "hit") {
      const evictProgress = clamp01((withinCycle - 0.5) / 0.3);
      grid[index][victimWay].evictionFlash = 1 - easeOutCubic(evictProgress);
    }

    // Apply the access result to grid
    if (i < activeIndex || (i === activeIndex && withinCycle > PHASE_INDEX_END)) {
      // After index phase: cell content is committed
      grid[index][fillWay].valid = true;
      grid[index][fillWay].tag = tag;
      grid[index][fillWay].dirty = entry.dirtyAfter;
      grid[index][fillWay].opacity = 1;
    } else if (i === activeIndex) {
      // During address/decompose phase: previous state still visible
      // Don't update cell content yet
    }

    // Progressive reveal: cells become visible when first accessed
    for (let s = 0; s < numSets; s++) {
      for (let w = 0; w < associativity; w++) {
        const cellFirstSeen = findFirstAccess(timeline, s, w);
        if (cellFirstSeen !== null && cellFirstSeen <= i) {
          const fadeIn = clamp01((i - cellFirstSeen) * 0.3);
          grid[s][w].opacity = Math.max(grid[s][w].opacity, easeOutCubic(fadeIn));
        }
      }
    }
  }

  // ── Highlight / eviction flash for current access ──────────────

  let currentAccess: AccessState | null = null;

  if (activeIndex >= 0 && activeIndex < timeline.length) {
    const entry = timeline[activeIndex];

    currentAccess = {
      entry,
      phase: getPhase(withinCycle),
      phaseProgress: getPhaseProgress(withinCycle),
    };

    const { index, fillWay, hitWay, victimWay, result } = entry;

    // Hit highlight: green pulse on the hit way during compare+result phase
    if (result === "hit" && hitWay !== null && withinCycle > PHASE_INDEX_END) {
      const pulseProgress = clamp01((withinCycle - PHASE_INDEX_END) / 0.2);
      grid[index][hitWay].highlight = easeOutCubic(pulseProgress);
    }

    // Miss: all ways flash blue during compare, then victim flashes amber
    if (result !== "hit" && withinCycle > PHASE_INDEX_END && withinCycle < PHASE_COMPARE_END) {
      // Parallel comparison: all ways in set get a blue flash
      for (let w = 0; w < associativity; w++) {
        if (grid[index][w].valid) {
          grid[index][w].highlight = 0.3;
        }
      }
    }

    // Eviction flash during result phase
    if (victimWay !== null && withinCycle > PHASE_COMPARE_END) {
      const evictProgress = clamp01((withinCycle - PHASE_COMPARE_END) / 0.15);
      grid[index][victimWay].evictionFlash = 1 - easeOutCubic(evictProgress);
    }
  }

  return {
    grid,
    currentAccess,
    title: null,
  };
}

// Find the first access that places data into a specific set/way
function findFirstAccess(
  timeline: TimelineEntry[],
  setIndex: number,
  wayIndex: number,
): number | null {
  for (let i = 0; i < timeline.length; i++) {
    const e = timeline[i];
    if (e.index === setIndex && e.fillWay === wayIndex) {
      return i;
    }
  }
  return null;
}

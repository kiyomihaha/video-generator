// Cache Visualization — Per-Frame State (Phase 2)
// Pure function: CacheSchedule + frame → CacheState
// Called every frame. Only computes opacity/highlight/phase, no schedule mutation.

import type {
  CacheSchedule,
  CacheState,
  CellState,
  AccessState,
} from "./types";
import { clamp01, easeOutCubic } from "../utils";

// Phase boundaries within one clockPeriod (as fractions) — default values,
// overridden dynamically for consecutive same-type accesses
const PHASE_ADDRESS_END = 0.15;
const PHASE_DECOMPOSE_END = 0.35;
const PHASE_INDEX_END = 0.55;
const PHASE_COMPARE_END = 0.80;
// result: 0.80 - 1.0

// Commit fill after eviction flash completes (old data fully visible first)
const COMMIT_TIME = PHASE_COMPARE_END + 0.15; // 0.95

function getPhase(progress: number, addrEnd: number, decompEnd: number, indexEnd: number, compEnd: number): AccessState["phase"] {
  if (progress < addrEnd) return "address";
  if (progress < decompEnd) return "decompose";
  if (progress < indexEnd) return "index";
  if (progress < compEnd) return "compare";
  return "result";
}

function getPhaseProgress(progress: number, addrEnd: number, decompEnd: number, indexEnd: number, compEnd: number): number {
  const p = progress;
  if (p < addrEnd) return p / addrEnd;
  if (p < decompEnd) return (p - addrEnd) / (decompEnd - addrEnd);
  if (p < indexEnd) return (p - decompEnd) / (indexEnd - decompEnd);
  if (p < compEnd) return (p - indexEnd) / (compEnd - indexEnd);
  return (p - compEnd) / (1 - compEnd);
}

/** Compress early phases for consecutive same-type accesses (temporal pacing). */
function getDynamicBoundaries(timeline: CacheSchedule["timeline"], activeIndex: number, withinCycle: number): {
  addrEnd: number; decompEnd: number; indexEnd: number; compEnd: number; commitTime: number;
} {
  let addrEnd = PHASE_ADDRESS_END;
  let decompEnd = PHASE_DECOMPOSE_END;
  let indexEnd = PHASE_INDEX_END;
  const compEnd = PHASE_COMPARE_END;

  if (activeIndex < 0 || activeIndex >= timeline.length) {
    return { addrEnd, decompEnd, indexEnd, compEnd, commitTime: COMMIT_TIME };
  }

  // Count consecutive same-category accesses before this one
  const currentIsHit = timeline[activeIndex].result === "hit";
  let consecutive = 1;
  for (let i = activeIndex - 1; i >= 0; i--) {
    if ((timeline[i].result === "hit") === currentIsHit) consecutive++;
    else break;
  }

  // Consecutive hits: aggressively compress preamble (address/decompose/index)
  if (currentIsHit && consecutive >= 3) {
    const f = Math.min((consecutive - 2) / 4, 1); // 0→1 for consecutive 2→6
    addrEnd = PHASE_ADDRESS_END * (1 - f * 0.6);
    decompEnd = PHASE_ADDRESS_END + (PHASE_DECOMPOSE_END - PHASE_ADDRESS_END) * (1 - f * 0.5);
    indexEnd = PHASE_DECOMPOSE_END + (PHASE_INDEX_END - PHASE_DECOMPOSE_END) * (1 - f * 0.4);
  }
  // Consecutive misses: mild compression
  if (!currentIsHit && consecutive >= 2) {
    const f = Math.min((consecutive - 1) / 3, 1);
    addrEnd = PHASE_ADDRESS_END * (1 - f * 0.3);
    decompEnd = PHASE_ADDRESS_END + (PHASE_DECOMPOSE_END - PHASE_ADDRESS_END) * (1 - f * 0.2);
    indexEnd = PHASE_DECOMPOSE_END + (PHASE_INDEX_END - PHASE_DECOMPOSE_END) * (1 - f * 0.15);
  }

  return { addrEnd, decompEnd, indexEnd, compEnd, commitTime: compEnd + 0.15 };
}

export type FirstFillMap = Map<string, number>;

export function computeFirstFillMap(timeline: CacheSchedule["timeline"]): FirstFillMap {
  const map: FirstFillMap = new Map();
  for (let i = 0; i < timeline.length; i++) {
    const e = timeline[i];
    if (e.filled && e.fillWay !== null) {
      const key = `${e.index}-${e.fillWay}`;
      if (!map.has(key)) map.set(key, i);
    }
  }
  return map;
}

export function cacheState(
  schedule: CacheSchedule,
  frame: number,
  fps: number,
  clockPeriod: number,
  firstFillMap: FirstFillMap,
): CacheState {
  const cyclePeriod = clockPeriod * fps;
  const activeIndex = Math.floor(frame / cyclePeriod);
  const withinCycle = (frame % cyclePeriod) / cyclePeriod;

  const { timeline, numSets, associativity } = schedule;

  // Track the committed cache state up to the current access
  const grid: CellState[][] = Array.from({ length: numSets }, () =>
    Array.from({ length: associativity }, (): CellState => ({
      tag: null,
      valid: false,
      dirty: false,
      opacity: 0,
      highlight: 0,
      compareHighlight: 0,
      evictionFlash: 0,
      ageRank: -1,
    })),
  );

  // Per-set LRU recency list: [wayIndex, wayIndex, ...], front = most recently used
  const recencyList: number[][] = Array.from({ length: numSets }, () => []);

  // Compute dynamic phase boundaries for temporal pacing (consecutive same-type)
  const bounds = getDynamicBoundaries(timeline, activeIndex, withinCycle);
  const { compEnd, commitTime } = bounds;

  // Replay accesses up to and including the active one
  const maxReplay = Math.min(activeIndex, timeline.length - 1);
  for (let i = 0; i <= maxReplay; i++) {
    const entry = timeline[i];
    const { index, fillWay, hitWay, victimWay, tag, result } = entry;

    // Apply the access result to grid
    if (i < activeIndex) {
      // Past accesses: fully committed
      if (entry.filled && fillWay !== null) {
        grid[index][fillWay].valid = true;
        grid[index][fillWay].tag = tag;
        grid[index][fillWay].dirty = entry.dirtyAfter;
        grid[index][fillWay].opacity = 1;
      }
      // Hit: update dirty bit on existing cell
      if (result === "hit" && hitWay !== null) {
        grid[index][hitWay].dirty = entry.dirtyAfter;
      }
    } else if (i === activeIndex) {
      // Hit effects: commit dirty bit during result phase
      if (result === "hit" && hitWay !== null && withinCycle >= compEnd) {
        grid[index][hitWay].dirty = entry.dirtyAfter;
      }
      // Fill: commit after eviction flash completes
      const fillCommitTime = entry.victimWay !== null ? commitTime : compEnd;
      if (withinCycle >= fillCommitTime && entry.filled && fillWay !== null) {
        grid[index][fillWay].valid = true;
        grid[index][fillWay].tag = tag;
        grid[index][fillWay].dirty = entry.dirtyAfter;
        grid[index][fillWay].opacity = 1;
      }
    }

    // ── Update per-set recency list ──
    // For committed accesses (past) or current access past commit point
    const committed = i < activeIndex
      || (i === activeIndex && result === "hit" && withinCycle >= compEnd)
      || (i === activeIndex && entry.filled && fillWay !== null
        && withinCycle >= (victimWay !== null ? commitTime : compEnd));
    if (committed) {
      const rl = recencyList[index];
      let accessedWay: number | null = null;
      if (result === "hit" && hitWay !== null) {
        accessedWay = hitWay;
      } else if (entry.filled && fillWay !== null) {
        accessedWay = fillWay;
      }
      if (accessedWay !== null) {
        // Remove from current position
        const pos = rl.indexOf(accessedWay);
        if (pos !== -1) rl.splice(pos, 1);
        // Add to front (most recently used)
        rl.unshift(accessedWay);
      }
    }
  }

  // Assign ageRank from recency lists
  for (let s = 0; s < numSets; s++) {
    const rl = recencyList[s];
    for (let r = 0; r < rl.length; r++) {
      grid[s][rl[r]].ageRank = r;
    }
  }

  // Progressive reveal: cells become visible when first filled (hoisted out of replay loop)
  for (let s = 0; s < numSets; s++) {
    for (let w = 0; w < associativity; w++) {
      const cellFirstSeen = firstFillMap.get(`${s}-${w}`) ?? null;
      if (cellFirstSeen !== null && cellFirstSeen <= maxReplay) {
        const age = maxReplay - cellFirstSeen;
        if (age >= 4) {
          grid[s][w].opacity = Math.max(grid[s][w].opacity, 1);
        } else {
          const fadeIn = clamp01(age * 0.3);
          grid[s][w].opacity = Math.max(grid[s][w].opacity, easeOutCubic(fadeIn));
        }
      }
    }
  }

  // ── Highlight / eviction flash for current access ──────────────

  let currentAccess: AccessState | null = null;

  if (activeIndex >= 0 && activeIndex < timeline.length) {
    const entry = timeline[activeIndex];
    const { addrEnd, decompEnd, indexEnd } = bounds;

    currentAccess = {
      entry,
      phase: getPhase(withinCycle, addrEnd, decompEnd, indexEnd, compEnd),
      phaseProgress: getPhaseProgress(withinCycle, addrEnd, decompEnd, indexEnd, compEnd),
    };

    const { index, hitWay, victimWay, result } = entry;

    // Hit highlight: green pulse on the hit way during compare+result phase
    if (result === "hit" && hitWay !== null && withinCycle > indexEnd) {
      const pulseProgress = clamp01((withinCycle - indexEnd) / 0.2);
      grid[index][hitWay].highlight = easeOutCubic(pulseProgress);
    }

    // Miss: all ways flash blue during compare (compareHighlight, not highlight)
    if (result !== "hit" && withinCycle > indexEnd && withinCycle < compEnd) {
      for (let w = 0; w < associativity; w++) {
        if (grid[index][w].valid) {
          grid[index][w].compareHighlight = 0.3;
        }
      }
    }

    // Eviction flash during result phase
    if (victimWay !== null && withinCycle >= compEnd && withinCycle < commitTime) {
      const evictProgress = clamp01((withinCycle - compEnd) / 0.15);
      grid[index][victimWay].evictionFlash = 1 - easeOutCubic(evictProgress);
    }
  }

  return {
    grid,
    currentAccess,
    title: null,
  };
}

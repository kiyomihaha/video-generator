// Cache Visualization — Schedule Computation (Phase 1)
// Pure function: CacheSpec → CacheSchedule
// Called once per composition mount, cached with useMemo.
//
// Algorithm: discrete-event cache simulator with shadow fully-associative
// cache for accurate cold/conflict/capacity miss classification.

import type {
  CacheSpec,
  CacheSchedule,
  BitFieldInfo,
  TimelineEntry,
} from "./types";

// ── Internal state ────────────────────────────────────────────────

interface Way {
  valid: boolean;
  tag: number;
  dirty: boolean;
  lastAccessCycle: number;      // for LRU
  loadCycle: number;            // for FIFO
}

interface SetState {
  ways: Way[];
}

// ── Helpers ───────────────────────────────────────────────────────

function isPowerOf2(n: number): boolean {
  return Number.isInteger(n) && n > 0 && Math.log2(n) % 1 === 0;
}

function log2(n: number): number {
  return Math.round(Math.log2(n));
}

function seededHash(...args: number[]): number {
  let h = 0;
  for (const v of args) {
    h = ((h << 5) - h + v) | 0;
  }
  // Convert to 0-1 range
  const x = Math.sin(h * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ── Shadow fully-associative cache ────────────────────────────────

// Shadow fully-associative cache for miss classification.
// NOTE: Always uses LRU eviction regardless of the real cache's replacement
// policy. This is intentional — the FA cache classifies misses as
// cold/conflict/capacity, and LRU is the standard baseline for that analysis.
interface ShadowFA {
  capacity: number;
  blocks: Map<number, { lastAccess: number }>;
  everSeen: Set<number>;
}

function createShadowFA(capacity: number): ShadowFA {
  return { capacity, blocks: new Map(), everSeen: new Set() };
}

function shadowFAAccess(
  fa: ShadowFA,
  blockAddress: number,
  cycle: number,
  shouldAllocate: boolean,
): { seen: boolean; wouldHit: boolean } {
  // everSeen tracks "first reference in the access trace" regardless of
  // allocation policy. This means a no-write-allocate write miss counts
  // as seen, so a later read miss to the same block is classified as
  // conflict/capacity (not cold). This is intentional: cold = never
  // referenced before in the trace, not "never allocated."
  const seen = fa.everSeen.has(blockAddress);
  fa.everSeen.add(blockAddress);

  if (fa.blocks.has(blockAddress)) {
    // Hit in FA
    fa.blocks.get(blockAddress)!.lastAccess = cycle;
    return { seen, wouldHit: true };
  }

  // Miss in FA — only allocate if the real cache would
  if (shouldAllocate) {
    if (fa.blocks.size >= fa.capacity) {
      // Evict LRU
      let lruBlock = -1;
      let lruCycle = Infinity;
      for (const [block, state] of fa.blocks) {
        if (state.lastAccess < lruCycle) {
          lruCycle = state.lastAccess;
          lruBlock = block;
        }
      }
      if (lruBlock >= 0) fa.blocks.delete(lruBlock);
    }
    fa.blocks.set(blockAddress, { lastAccess: cycle });
  }

  return { seen, wouldHit: false };
}

// ── Main schedule computation ─────────────────────────────────────

export function computeCacheSchedule(spec: CacheSpec): CacheSchedule {
  const { numSets, associativity, blockSize, addressBits, accesses } = spec;

  // ── Step 0: Validate ──────────────────────────────────────────

  if (!isPowerOf2(numSets)) throw new Error(`numSets must be power of 2, got ${numSets}`);
  if (numSets < 1) throw new Error("numSets must be >= 1");
  if (!isPowerOf2(blockSize)) throw new Error(`blockSize must be power of 2, got ${blockSize}`);
  if (blockSize < 1) throw new Error("blockSize must be >= 1");
  if (!Number.isInteger(associativity) || associativity < 1) {
    throw new Error(`associativity must be integer >= 1, got ${associativity}`);
  }
  if (!Number.isInteger(addressBits) || addressBits < 1 || addressBits > 52) {
    throw new Error(`addressBits must be integer between 1 and 52, got ${addressBits}`);
  }
  if (!Array.isArray(accesses) || accesses.length < 1) {
    throw new Error("accesses must be a non-empty array");
  }
  if (!Number.isFinite(spec.clockPeriod) || spec.clockPeriod <= 0) {
    throw new Error(`clockPeriod must be a positive number, got ${spec.clockPeriod}`);
  }
  if (!["LRU", "FIFO", "random"].includes(spec.replacement)) {
    throw new Error(`replacement must be LRU|FIFO|random, got "${spec.replacement}"`);
  }
  if (!["write-back", "write-through"].includes(spec.writeHitPolicy)) {
    throw new Error(`writeHitPolicy must be write-back|write-through, got "${spec.writeHitPolicy}"`);
  }
  if (!["write-allocate", "no-write-allocate"].includes(spec.writeMissPolicy)) {
    throw new Error(`writeMissPolicy must be write-allocate|no-write-allocate, got "${spec.writeMissPolicy}"`);
  }
  if (spec.seed !== undefined && !Number.isFinite(spec.seed)) {
    throw new Error(`seed must be a finite number, got ${spec.seed}`);
  }
  if (numSets > 16) throw new Error(`numSets too large for visualization (max 16, got ${numSets})`);
  if (associativity > 16) throw new Error(`associativity too large for visualization (max 16, got ${associativity})`);
  if (accesses.length > 32) {
    throw new Error(`too many accesses for visualization (max 32, got ${accesses.length})`);
  }

  const offsetBits = log2(blockSize);
  const indexBits = log2(numSets);
  const tagBits = addressBits - indexBits - offsetBits;

  if (tagBits < 1) throw new Error(
    `addressBits (${addressBits}) must be > log2(numSets) + log2(blockSize) = ${indexBits + offsetBits}`,
  );

  const maxAddress = Math.pow(2, addressBits);

  const seenIds = new Set<string>();

  for (let i = 0; i < accesses.length; i++) {
    const acc = accesses[i];
    if (acc === null || typeof acc !== "object") {
      throw new Error(`accesses[${i}] must be an object`);
    }
    if (typeof acc.id !== "string" || acc.id.trim() === "") {
      throw new Error(`accesses[${i}] must have a non-empty string id`);
    }
    if (seenIds.has(acc.id)) throw new Error(`Duplicate access id: ${acc.id}`);
    seenIds.add(acc.id);
    // Cycles must be contiguous 1,2,3,...,N to match dense animation timing
    if (!Number.isInteger(acc.cycle) || acc.cycle !== i + 1) {
      throw new Error(`Access "${acc.id}" cycle must be ${i + 1} (contiguous 1-based), got ${acc.cycle}`);
    }
    if (!Number.isInteger(acc.address) || acc.address < 0) {
      throw new Error(`Access "${acc.id}" address must be non-negative integer, got ${acc.address}`);
    }
    if (acc.address >= maxAddress) {
      throw new Error(`Access "${acc.id}" address ${acc.address} exceeds 2^${addressBits} = ${maxAddress}`);
    }
    if (acc.address % blockSize !== 0) {
      throw new Error(
        `Access "${acc.id}" address ${acc.address} not aligned to blockSize ${blockSize}`,
      );
    }
    if (typeof acc.type !== "string" || !["read", "write"].includes(acc.type)) {
      throw new Error(`Access "${acc.id}" type must be read|write, got "${acc.type}"`);
    }
  }

  // ── Step 1: Compute bit field info ────────────────────────────

  const bitFields: BitFieldInfo = {
    totalBits: addressBits,
    offsetBits,
    indexBits,
    tagBits,
  };

  // ── Step 2: Initialize cache state ────────────────────────────

  const sets: SetState[] = Array.from({ length: numSets }, () => ({
    ways: Array.from({ length: associativity }, (): Way => ({
      valid: false,
      tag: 0,
      dirty: false,
      lastAccessCycle: 0,
      loadCycle: 0,
    })),
  }));

  // Shadow FA for miss classification
  const shadowFA = createShadowFA(numSets * associativity);

  // ── Step 3: Process accesses in cycle order ───────────────────

  const sorted = [...accesses].sort((a, b) => a.cycle - b.cycle);
  const timeline: TimelineEntry[] = [];

  for (const acc of sorted) {
    const blockAddress = Math.floor(acc.address / blockSize);
    const index = blockAddress % numSets;
    const tag = Math.floor(blockAddress / numSets);
    const offset = acc.address % blockSize;

    const set = sets[index];

    // Tag compare: scan valid ways for match
    let hitWay: number | null = null;
    for (let w = 0; w < associativity; w++) {
      if (set.ways[w].valid && set.ways[w].tag === tag) {
        hitWay = w;
        break;
      }
    }

    let result: TimelineEntry["result"];
    let victimWay: number | null = null;
    let fillWay: number | null = null;
    let evictedBlock: number | null = null;
    let evictedDirty = false;

    if (hitWay !== null) {
      // ── Hit ──
      result = "hit";
      // fillWay stays null for hits (no new line placed)
      set.ways[hitWay].lastAccessCycle = acc.cycle;

      // Write hit: mark dirty if write-back
      if (acc.type === "write" && spec.writeHitPolicy === "write-back") {
        set.ways[hitWay].dirty = true;
      }
      // Write-through: dirty stays false

      // Shadow FA: hit updates recency regardless of shouldAllocate.
      // If FA would miss, allocation follows the same access-type/write-miss policy.
      const hitAllocate = acc.type === "read" || spec.writeMissPolicy === "write-allocate";
      shadowFAAccess(shadowFA, blockAddress, acc.cycle, hitAllocate);
    } else {
      // ── Miss ──

      // Write miss policy: no-write-allocate skips fill entirely
      const shouldFill = acc.type === "read" || spec.writeMissPolicy === "write-allocate";

      // Shadow FA: only allocate if real cache would fill
      const faResult = shadowFAAccess(shadowFA, blockAddress, acc.cycle, shouldFill);

      // Classify miss
      if (!faResult.seen) {
        result = "cold-miss";
      } else if (faResult.wouldHit) {
        result = "conflict-miss";
      } else {
        result = "capacity-miss";
      }

      if (shouldFill) {
        // Check for an invalid way first (no eviction needed)
        let invalidWay: number | null = null;
        for (let w = 0; w < associativity; w++) {
          if (!set.ways[w].valid) {
            invalidWay = w;
            break;
          }
        }

        if (invalidWay !== null) {
          fillWay = invalidWay;
        } else {
          // All ways valid — must evict
          victimWay = selectVictim(set, spec, blockAddress, index, acc.cycle);
          evictedBlock = set.ways[victimWay].tag * numSets + index;
          evictedDirty = set.ways[victimWay].dirty;
          fillWay = victimWay;
        }

        // Fill the way
        set.ways[fillWay].valid = true;
        set.ways[fillWay].tag = tag;
        set.ways[fillWay].dirty = acc.type === "write" && spec.writeHitPolicy === "write-back";
        set.ways[fillWay].lastAccessCycle = acc.cycle;
        set.ways[fillWay].loadCycle = acc.cycle;
      }
      // no-write-allocate + write miss: no fill, no eviction; write is forwarded to lower memory
    }

    const filled = fillWay !== null && hitWay === null;
    const affectedWay = hitWay ?? fillWay;
    const dirtyAfter = affectedWay !== null ? set.ways[affectedWay].dirty : false;

    timeline.push({
      accessId: acc.id,
      cycle: acc.cycle,
      address: acc.address,
      blockAddress,
      tag,
      index,
      offset,
      result,
      hitWay,
      victimWay,
      fillWay,
      evictedBlock,
      evictedDirty,
      filled,
      dirtyAfter,
    });
  }

  // ── Step 4: Return ────────────────────────────────────────────

  const totalCycles = timeline.length;

  return {
    timeline,
    bitFields,
    numSets,
    associativity,
    totalCycles,
  };
}

// ── Victim selection ──────────────────────────────────────────────

function selectVictim(
  set: SetState,
  spec: CacheSpec,
  blockAddress: number,
  index: number,
  cycle: number,
): number {
  const { replacement, seed } = spec;

  switch (replacement) {
    case "LRU": {
      let lruWay = 0;
      let lruCycle = set.ways[0].lastAccessCycle;
      for (let w = 1; w < set.ways.length; w++) {
        if (set.ways[w].lastAccessCycle < lruCycle) {
          lruCycle = set.ways[w].lastAccessCycle;
          lruWay = w;
        }
      }
      return lruWay;
    }

    case "FIFO": {
      let fifoWay = 0;
      let fifoCycle = set.ways[0].loadCycle;
      for (let w = 1; w < set.ways.length; w++) {
        if (set.ways[w].loadCycle < fifoCycle) {
          fifoCycle = set.ways[w].loadCycle;
          fifoWay = w;
        }
      }
      return fifoWay;
    }

    case "random": {
      const hash = seededHash(blockAddress, index, cycle, seed ?? 0);
      return Math.floor(hash * set.ways.length);
    }

    default:
      return 0; // unreachable — validated upstream
  }
}

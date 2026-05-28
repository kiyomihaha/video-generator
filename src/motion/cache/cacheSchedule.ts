// Cache Visualization — Schedule Computation (Phase 1)
// Pure function: CacheSpec → CacheSchedule
// Called once per composition mount, cached with useMemo.
//
// Algorithm: discrete-event cache simulator with shadow fully-associative
// cache for accurate cold/conflict/capacity miss classification.

import type {
  CacheSpec,
  CacheSchedule,
  CacheAccess,
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
  return n > 0 && (n & (n - 1)) === 0;
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

interface ShadowFA {
  capacity: number;
  blocks: Map<number, { lastAccess: number; loadCycle: number }>;
  everSeen: Set<number>;
}

function createShadowFA(capacity: number): ShadowFA {
  return { capacity, blocks: new Map(), everSeen: new Set() };
}

function shadowFAAccess(
  fa: ShadowFA,
  blockAddress: number,
  cycle: number,
): { seen: boolean; wouldHit: boolean } {
  const seen = fa.everSeen.has(blockAddress);
  fa.everSeen.add(blockAddress);

  if (fa.blocks.has(blockAddress)) {
    // Hit in FA
    fa.blocks.get(blockAddress)!.lastAccess = cycle;
    return { seen, wouldHit: true };
  }

  // Miss in FA
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

  fa.blocks.set(blockAddress, { lastAccess: cycle, loadCycle: cycle });
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
  if (associativity < 1) throw new Error("associativity must be >= 1");
  if (addressBits < 1) throw new Error("addressBits must be >= 1");

  const offsetBits = log2(blockSize);
  const indexBits = log2(numSets);
  const tagBits = addressBits - indexBits - offsetBits;

  if (tagBits < 1) throw new Error(
    `addressBits (${addressBits}) must be > log2(numSets) + log2(blockSize) = ${indexBits + offsetBits}`,
  );

  const maxAddress = Math.pow(2, addressBits);

  const seenIds = new Set<string>();
  const seenCycles = new Set<number>();

  for (const acc of accesses) {
    if (!acc.id) throw new Error("Each access must have an id");
    if (seenIds.has(acc.id)) throw new Error(`Duplicate access id: ${acc.id}`);
    seenIds.add(acc.id);
    if (!Number.isInteger(acc.cycle) || acc.cycle < 1) {
      throw new Error(`Access "${acc.id}" cycle must be >= 1, got ${acc.cycle}`);
    }
    if (seenCycles.has(acc.cycle)) {
      throw new Error(`Duplicate cycle ${acc.cycle} (access "${acc.id}") — unique cycles required`);
    }
    seenCycles.add(acc.cycle);
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

    // Shadow FA result for miss classification
    const faResult = shadowFAAccess(shadowFA, blockAddress, acc.cycle);

    let result: TimelineEntry["result"];
    let victimWay: number | null = null;
    let fillWay: number;
    let evictedBlock: number | null = null;
    let evictedDirty = false;

    if (hitWay !== null) {
      // ── Hit ──
      result = "hit";
      fillWay = hitWay;

      // Update access tracking
      set.ways[hitWay].lastAccessCycle = acc.cycle;

      // Write hit: mark dirty if write-back
      if (acc.type === "write" && spec.writeHitPolicy === "write-back") {
        set.ways[hitWay].dirty = true;
      }
      // Write-through: dirty stays false
    } else {
      // ── Miss ──

      // Classify miss
      if (!faResult.seen) {
        result = "cold-miss";
      } else if (faResult.wouldHit) {
        result = "conflict-miss";
      } else {
        result = "capacity-miss";
      }

      // Check for an invalid way first (no eviction needed)
      let invalidWay: number | null = null;
      for (let w = 0; w < associativity; w++) {
        if (!set.ways[w].valid) {
          invalidWay = w;
          break;
        }
      }

      if (invalidWay !== null) {
        // Use invalid way — no eviction
        fillWay = invalidWay;
      } else {
        // All ways valid — must evict
        victimWay = selectVictim(set, spec, blockAddress, index);
        evictedBlock = set.ways[victimWay].tag * numSets + index; // reconstruct block addr
        evictedDirty = set.ways[victimWay].dirty;
        fillWay = victimWay;
      }

      // Write miss policy
      const shouldFill = acc.type === "read" || spec.writeMissPolicy === "write-allocate";

      if (shouldFill) {
        // Fill the way
        set.ways[fillWay].valid = true;
        set.ways[fillWay].tag = tag;
        set.ways[fillWay].dirty = acc.type === "write" && spec.writeHitPolicy === "write-back";
        set.ways[fillWay].lastAccessCycle = acc.cycle;
        set.ways[fillWay].loadCycle = acc.cycle;
      }
      // no-write-allocate + write: don't fill, just write-through
    }

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
      dirtyAfter: set.ways[fillWay].dirty,
    });
  }

  // ── Step 4: Return ────────────────────────────────────────────

  const totalCycles = sorted.length > 0
    ? sorted[sorted.length - 1].cycle
    : 0;

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
      const hash = seededHash(blockAddress, index, seed ?? 0);
      return Math.floor(hash * set.ways.length);
    }
  }
}

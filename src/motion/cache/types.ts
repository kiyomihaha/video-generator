// Cache Visualization — Type Definitions

// ─── Spec types (JSON input) ───

export type ReplacementPolicy = "LRU" | "FIFO" | "random";
export type WriteHitPolicy = "write-back" | "write-through";
export type WriteMissPolicy = "write-allocate" | "no-write-allocate";
export type AccessType = "read" | "write";

export interface CacheSpec {
  id?: string;
  title?: string;
  numSets: number;                         // must be power of 2
  associativity: number;                   // >= 1
  blockSize: number;                       // bytes, must be power of 2
  addressBits: number;                     // total address width (e.g. 16, 32)
  replacement: ReplacementPolicy;
  writeHitPolicy: WriteHitPolicy;
  writeMissPolicy: WriteMissPolicy;
  clockPeriod: number;                     // seconds per access
  color?: string;                          // default accent color
  hitColor?: string;                       // default: #10b981
  missColor?: string;                      // default: #ef4444
  evictionColor?: string;                  // default: #f59e0b
  seed?: number;                           // for deterministic random replacement
  accesses: CacheAccess[];
  annotations?: CacheAnnotation[];
}

export interface CacheAccess {
  id: string;                              // unique ID (e.g. "A1")
  address: number;                         // raw byte address, non-negative, aligned to blockSize
  type: AccessType;
  cycle: number;                           // 1-based, unique across all accesses
  label?: string;                          // display text (e.g. "LW R1, 0(R2)")
}

export interface CacheAnnotation {
  type: "label" | "bracket" | "arrow";
  text?: string;
  fromAccess?: string;                     // access ID
  toAccess?: string;
  color?: string;
}

// ─── Schedule types (computed once) ───

export interface BitFieldInfo {
  totalBits: number;
  offsetBits: number;                      // log2(blockSize)
  indexBits: number;                       // log2(numSets)
  tagBits: number;                         // addressBits - indexBits - offsetBits
}

export interface TimelineEntry {
  accessId: string;
  cycle: number;
  address: number;
  blockAddress: number;                    // floor(address / blockSize)
  tag: number;
  index: number;
  offset: number;
  result: "hit" | "cold-miss" | "conflict-miss" | "capacity-miss";
  hitWay: number | null;                   // way index if hit
  victimWay: number | null;                // way chosen for eviction (on miss)
  fillWay: number;                         // way where new line is placed
  evictedBlock: number | null;             // evicted block address
  evictedDirty: boolean;
  dirtyAfter: boolean;                     // dirty bit state after this access
}

export interface CacheSchedule {
  timeline: TimelineEntry[];
  bitFields: BitFieldInfo;
  numSets: number;
  associativity: number;
  totalCycles: number;
}

// ─── Per-frame render state ───

export interface CacheState {
  grid: CellState[][];                     // [setIndex][wayIndex]
  currentAccess: AccessState | null;
  title: string | null;
}

export interface CellState {
  tag: number | null;
  valid: boolean;
  dirty: boolean;
  opacity: number;                         // 0-1
  highlight: number;                       // 0-1 pulse on hit
  evictionFlash: number;                   // 0-1 flash on eviction
}

export interface AccessState {
  entry: TimelineEntry;
  phase: "address" | "decompose" | "index" | "compare" | "result";
  phaseProgress: number;                   // 0-1 within current phase
}

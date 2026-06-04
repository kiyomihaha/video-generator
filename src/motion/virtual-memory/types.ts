// Virtual Memory — Type definitions
// TLB + multi-level page table + address translation visualization

// --- Spec types (JSON input) ---

export type ReplacementPolicy = "LRU" | "FIFO" | "random";

export interface VirtualMemorySpec {
  id?: string;
  title?: string;
  addressBits: number;
  pageSize: number;
  numLevels: number;
  entriesPerLevel: number[];
  tlbSets: number;
  tlbAssociativity: number;
  replacement: ReplacementPolicy;
  clockPeriod: number;
  color?: string;
  tlbHitColor?: string;
  tlbMissColor?: string;
  pageFaultColor?: string;
  accesses: VMAccess[];
  annotations?: VMAnnotation[];
}

export interface VMAccess {
  id: string;
  virtualAddress: number;
  type: "read" | "write" | "execute";
  cycle: number;
  label?: string;
}

export interface VMAnnotation {
  type: "label" | "bracket" | "arrow";
  text?: string;
  fromAccess?: string;
  toAccess?: string;
  color?: string;
}

// --- Schedule types (computed once) ---

export interface VMSchedule {
  timeline: VMTimelineEntry[];
  bitFields: VMBitFieldInfo;
  tlbSets: number;
  tlbAssociativity: number;
  numLevels: number;
  entriesPerLevel: number[];
  totalCycles: number;
}

export interface VMBitFieldInfo {
  totalBits: number;
  offsetBits: number;
  vpnBits: number[];
  vpnLabels: string[];
}

export interface VMTimelineEntry {
  accessId: string;
  cycle: number;
  virtualAddress: number;
  vpn: number[];
  vpnKey: number;
  offset: number;
  result: "tlb-hit" | "tlb-miss-walk" | "page-fault";
  tlbSet: number;
  tlbWay: number | null;
  walkPath: WalkStep[];
  physicalFrame: number | null;
  evictedTlbEntry: { set: number; way: number; vpn: number } | null;
}

export interface WalkStep {
  level: number;
  entryIndex: number;
  result: "hit" | "fault";
}

// --- Per-frame render state ---

export interface VMState {
  tlbGrid: TLBCellState[][];
  pageTables: PageTableState[];
  currentAccess: VMAccessState | null;
  title: string | null;
}

export interface TLBCellState {
  vpn: number | null;
  physicalFrame: number | null;
  valid: boolean;
  opacity: number;
  highlight: number;
  evictionFlash: number;
  walkHighlight: number;
}

export interface PageTableState {
  level: number;
  cells: PTECellState[][];
}

export interface PTECellState {
  valid: boolean;
  physicalFrame: number | null;
  opacity: number;
  walkHighlight: number;
  faultFlash: number;
}

export interface VMAccessState {
  entry: VMTimelineEntry;
  phase: "address" | "decompose" | "tlb-lookup" | "walk" | "translate" | "result";
  phaseProgress: number;
}

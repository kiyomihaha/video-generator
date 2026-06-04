// Branch Prediction — Type definitions
// Extends pipeline grid paradigm with speculative execution and flush animation

// --- Spec types (JSON input) ---

export type PredictorType = "always-taken" | "1-bit" | "2-bit-saturating";

export type CounterState = "strongly-not-taken" | "weakly-not-taken" | "weakly-taken" | "strongly-taken";

export interface BranchPredictionSpec {
  id?: string;
  title?: string;
  stages: string[];
  totalCycles: number;
  clockPeriod?: number;
  predictor: PredictorType;
  btbSize: number;
  instructions: BPInstruction[];
  branches: BranchEvent[];
  annotations?: BPAnnotation[];
}

export interface BPInstruction {
  id: string;
  mnemonic: string;
  entryCycle: number;
  color?: string;
  isSpeculative?: boolean;
}

export interface BranchEvent {
  instructionId: string;
  resolveCycle: number;
  resolveStage: number;
  predicted: "taken" | "not-taken";
  actual: "taken" | "not-taken";
  targetCycle?: number;
  penaltyCycles: number;
  btbIndex: number;
}

export interface BPAnnotation {
  type: "label" | "bracket" | "arrow";
  text?: string;
  fromCycle?: number;
  fromStage?: number;
  toCycle?: number;
  toStage?: number;
  color?: string;
}

// --- Schedule types (computed once) ---

export interface BranchPredictionSchedule {
  cells: BPScheduledCell[][];
  btbTimeline: BTBSnapshot[];
  branches: ResolvedBranch[];
  totalCycles: number;
  numStages: number;
}

export interface BPScheduledCell {
  instructionId: string | null;
  mnemonic: string | null;
  state: "active" | "speculative" | "flushed" | "bubble" | "empty";
  stage: number;
  cycle: number;
  color?: string;
}

export interface BTBSnapshot {
  cycle: number;
  entries: BTBEntry[];
}

export interface BTBEntry {
  index: number;
  counter: CounterState;
  branchId: string | null;
}

export interface ResolvedBranch {
  branchId: string;
  instructionId: string;
  resolveCycle: number;
  resolveStage: number;
  predicted: "taken" | "not-taken";
  actual: "taken" | "not-taken";
  isCorrect: boolean;
  flushedCells: { stage: number; cycle: number }[];
  penaltyCycles: number;
  btbIndex: number;
  counterBefore: CounterState;
  counterAfter: CounterState;
}

// --- Per-frame render state ---

export interface BranchPredictionState {
  cells: BPCellState[][];
  btb: BTBState[];
  currentCycle: number;
  activeBranch: ResolvedBranch | null;
  flushProgress: number;
}

export interface BPCellState {
  cell: BPScheduledCell;
  opacity: number;
  highlight: number;
  flushFlash: number;
}

export interface BTBState {
  entry: BTBEntry;
  updateFlash: number;
}

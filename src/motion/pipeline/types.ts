// Pipeline Visualization — Type Definitions

// ─── Spec types (JSON input) ───

export interface PipelineSpec {
  id?: string;
  stages: string[];                         // e.g. ["IF", "ID", "EX", "MEM", "WB"]
  totalCycles: number;                      // 1-based count
  instructions: PipelineInstruction[];
  hazards?: PipelineHazard[];
  annotations?: PipelineAnnotation[];
  clockPeriod?: number;                     // seconds per cycle (default: 1.0)
  color?: string;                           // default accent (default: #3b82f6)
  title?: string;
}

export interface PipelineInstruction {
  id: string;                               // unique ID (e.g. "I1", "ADD")
  mnemonic: string;                         // display text (e.g. "ADD R1,R2,R3")
  color?: string;
  entryCycle: number;                       // 1-based cycle entering IF
}

// Discriminated union — each hazard type has its own fields
export type PipelineHazard = StallHazard | ForwardHazard | FlushHazard;

export interface StallHazard {
  type: "stall";
  affectedInstruction: string;              // instruction ID
  atCycle: number;                          // 1-based cycle where stall is detected
  holdStage: number;                        // 0-based stage index where instruction is held
  bubbleStage: number;                      // 0-based stage index where bubble is inserted
  duration: number;                         // stall duration in cycles (default: 1)
  reason?: string;
}

export interface ForwardHazard {
  type: "forward";
  producerInstruction: string;
  producerStage: number;                    // 0-based stage index (engine resolves cycle from grid)
  consumerInstruction: string;
  consumerStage: number;                    // 0-based stage index (engine resolves cycle from grid)
  operand?: "rs1" | "rs2" | "rt";
  reason?: string;
}

export interface FlushHazard {
  type: "flush";
  branchInstruction: string;
  resolveStage: number;                     // 0-based stage index
  resolveCycle: number;                     // 1-based cycle
  flushedInstructions: string[];            // instruction IDs
  redirectCycle?: number;                   // 1-based cycle for branch target
  reason?: string;
}

export interface PipelineAnnotation {
  type: "label" | "bracket" | "arrow";
  text?: string;
  fromCycle?: number;                       // 1-based
  fromStage?: number;                       // 0-based
  toCycle?: number;                         // 1-based
  toStage?: number;                         // 0-based
  color?: string;
}

// ─── Schedule types (computed once) ───

export interface PipelineSchedule {
  cells: ScheduledCell[][];                 // [stageIndex][cycleIndex] (0-based internally)
  forwards: ResolvedForward[];
  flushes: ResolvedFlush[];
  stages: string[];
  totalCycles: number;
}

export interface ScheduledCell {
  stageIndex: number;                       // 0-based
  cycleIndex: number;                       // 0-based (display as +1)
  instruction: string | null;               // mnemonic or null
  instructionId: string | null;
  color: string | null;
  state: "active" | "bubble" | "flushed" | "held" | "empty";
}

export interface ResolvedForward {
  producerCell: { stageIndex: number; cycleIndex: number };
  consumerCell: { stageIndex: number; cycleIndex: number };
  producerColor: string;
  operand?: string;
  reason?: string;
}

export interface ResolvedFlush {
  instructionId: string;
  cells: { stageIndex: number; cycleIndex: number }[];
  color: string;
}

// ─── Per-frame render state ───

export interface PipelineState {
  cells: CellRenderState[][];
  forwards: ForwardRenderState[];
  title: string | null;
}

export interface CellRenderState {
  cell: ScheduledCell;
  opacity: number;                          // 0-1
}

export interface ForwardRenderState {
  forward: ResolvedForward;
  progress: number;                         // 0-1 draw-on
}

// ─── Layout constants (used by scene) ───

export interface PipelineLayout {
  canvasWidth: number;
  canvasHeight: number;
  stageLabelWidth: number;
  headerHeight: number;
  cellPadding: number;
  borderRadius: number;
}

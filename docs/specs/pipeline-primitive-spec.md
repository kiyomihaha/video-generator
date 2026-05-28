# Pipeline Visualization Motion Primitive — Design Spec (v2)

## 1. Problem Statement

We have 5 timing-diagram primitives (propagateSignal, fanout, latch, glitch, metastability). These visualize **signal-level** behavior — single wires toggling over time.

The next level of abstraction is **pipeline visualization**: showing how instructions flow through a CPU pipeline across clock cycles. This is the first "structural" primitive — it visualizes a **grid of stages × cycles**, not a single waveform.

This is the bridge between Phase 2 (signal-level primitives) and the ultimate vision (knowledge expression engine). Pipeline diagrams are the most common visual in computer architecture education.

## 2. Domain Model

### What a pipeline diagram shows

A classic CPU pipeline diagram is a **grid**:
- **Rows** = pipeline stages (IF, ID, EX, MEM, WB)
- **Columns** = clock cycles (1-based: C1, C2, C3, ...)
- **Cells** = which instruction occupies which stage at which cycle
- **Dependencies** = arrows showing data hazards between instructions

### Cycle indexing

**All cycles are 1-based.** `entryCycle: 1` means the instruction enters IF at cycle C1. The `totalCycles` field counts from C1 to Cn. The reveal animation maps frame 0 → C1 reveal start.

### Visual conventions (established by Patterson & Hennessy, CMU lectures)

- **Active cell**: filled rectangle with instruction mnemonic
- **Bubble**: hatched or shaded cell, labeled "bubble" (not "stall" — the stall is the hold, the bubble is what fills the gap)
- **Forwarding path**: curved arrow from producer stage to consumer stage
- **Flushed cells**: dashed outline (after branch misprediction)
- **Color coding**: each instruction gets a distinct color; bubbles are grey

### Pedagogical scenarios to support

1. **Basic 5-stage pipeline** — instructions flowing normally, no hazards
2. **Data hazard with stall** — RAW dependency, pipeline stalls 1 cycle
3. **Data hazard with forwarding** — same dependency, forwarding eliminates stall
4. **Control hazard (branch)** — branch resolved at EX, 2-cycle penalty, flushed instructions
5. **Load-use hazard** — load in MEM, dependent instruction in EX must stall 1 cycle even with forwarding

## 3. Spec Design

### PipelineSpec (JSON)

```typescript
{
  id?: string;                              // optional
  stages: string[];                         // stage names, e.g. ["IF", "ID", "EX", "MEM", "WB"]
  totalCycles: number;                      // number of clock cycles to display (1-based)
  instructions: PipelineInstruction[];      // instruction flow definitions
  hazards?: PipelineHazard[];               // stall/forwarding/flush events
  annotations?: PipelineAnnotation[];       // optional labels
  clockPeriod?: number;                     // seconds per cycle (default: 1.0)
  color?: string;                           // default accent color (default: #3b82f6 blue)
  title?: string;                           // optional diagram title
}
```

### PipelineInstruction

```typescript
{
  id: string;                               // unique instruction ID (e.g. "I1", "ADD", "LW")
  mnemonic: string;                         // display text (e.g. "ADD R1,R2,R3")
  color?: string;                           // per-instruction color override
  entryCycle: number;                       // 1-based cycle when instruction enters IF
}
```

Stages are auto-computed: `stage[i] = entryCycle + i` before hazard adjustment. No `stageOverrides` — if an instruction has non-standard stage timing, express it through hazards.

### PipelineHazard (discriminated union)

```typescript
type PipelineHazard = StallHazard | ForwardHazard | FlushHazard;

interface StallHazard {
  type: "stall";
  affectedInstruction: string;              // instruction ID that is stalled
  atCycle: number;                          // 1-based cycle where stall is detected
  holdStage: number;                        // stage index where instruction is held (e.g. 1 = ID)
  bubbleStage: number;                      // stage index where bubble is inserted (e.g. 2 = EX)
  duration: number;                         // stall duration in cycles (default: 1)
  reason?: string;                          // annotation text (e.g. "RAW on R1")
}

interface ForwardHazard {
  type: "forward";
  producerInstruction: string;              // instruction that produces the data
  producerStage: number;                    // stage index of producer when data is available
  producerCycle: number;                    // 1-based cycle when data is available
  consumerInstruction: string;              // instruction that needs the data
  consumerStage: number;                    // stage index of consumer when data is needed
  consumerCycle: number;                    // 1-based cycle when consumer needs data
  operand?: "rs1" | "rs2" | "rt";          // which operand is forwarded (for multi-forward arrows)
  reason?: string;                          // annotation text (e.g. "EX/MEM → EX forwarding")
}

interface FlushHazard {
  type: "flush";
  branchInstruction: string;                // the branch instruction ID
  resolveStage: number;                     // stage index where branch resolves (e.g. 2 = EX)
  resolveCycle: number;                     // 1-based cycle when branch resolves
  flushedInstructions: string[];            // instruction IDs that are flushed
  redirectCycle?: number;                   // 1-based cycle when target instruction enters IF
  reason?: string;                          // annotation text (e.g. "branch mispredict")
}
```

**Why explicit cycles?** Without `atCycle`, `producerCycle`, `consumerCycle`, the scheduler cannot place forwarding arrows or bubbles correctly once stalls shift instructions. Cycle coordinates are required.

**Why discriminated union?** Each hazard type has completely different fields. A single flat interface with optional fields creates ambiguity.

### PipelineAnnotation

```typescript
{
  type: "label" | "bracket" | "arrow";
  text?: string;
  fromCycle?: number;                       // 1-based
  fromStage?: number;                       // 0-based stage index
  toCycle?: number;                         // 1-based
  toStage?: number;                         // 0-based stage index
  color?: string;
}
```

## 4. Two-Phase Architecture

Schedule computation and frame rendering are **separated**. This is the most important architectural decision in this spec.

### Phase 1: Schedule computation (once, cached with `useMemo`)

```typescript
computePipelineSchedule(spec: PipelineSpec): PipelineSchedule
```

- Input: PipelineSpec (static JSON)
- Output: immutable grid of cells + resolved hazard coordinates
- Pure function, no frame/fps dependency
- Called once per composition mount

**Algorithm:**

1. Build ideal occupancy grid: for each instruction, place it at `stage[i] = entryCycle + i`
2. Sort hazards by `atCycle` (stalls), then `resolveCycle` (flushes), then by array order
3. Apply stalls:
   - At `atCycle`, freeze `affectedInstruction` at `holdStage`
   - Insert bubble at `bubbleStage`
   - Shift all younger instructions (higher entryCycle) right by `duration`
   - Shift cascades: if I2 stalls 1 cycle, I3/I4/I5 all shift 1 cycle
4. Apply flushes:
   - At `resolveCycle`, mark `flushedInstructions` cells from `resolveStage` onward as "flushed"
   - Flushed instructions stop progressing (no cells after flush point)
5. Apply forwards:
   - Locate producer cell at `(producerCycle, producerStage)` — must exist after stall resolution
   - Locate consumer cell at `(consumerCycle, consumerStage)` — must exist after stall resolution
   - Attach forward arrow metadata to consumer cell
   - Support multiple forwards to same consumer (different `operand` values)
6. Validate:
   - No two instructions occupy the same (cycle, stage) cell → throw
   - All hazard instruction IDs exist in instructions array → throw
   - All hazard cycle/stage coordinates are within bounds → throw
   - Forward producer/consumer cells exist after schedule resolution → throw

**Output type:**

```typescript
interface PipelineSchedule {
  cells: ScheduledCell[][];                 // [stageIndex][cycleIndex], 0-based indexing internally
  forwards: ResolvedForward[];              // resolved arrow coordinates
  flushes: ResolvedFlush[];                 // resolved flush regions
}

interface ScheduledCell {
  stageIndex: number;                       // 0-based
  cycleIndex: number;                       // 0-based (internal), displayed as 1-based
  instruction: string | null;               // mnemonic or null
  instructionId: string | null;             // ID or null
  color: string | null;
  state: "active" | "bubble" | "flushed" | "empty";
}

interface ResolvedForward {
  producerCell: { stageIndex: number; cycleIndex: number };
  consumerCell: { stageIndex: number; cycleIndex: number };
  producerColor: string;
  operand?: string;
  reason?: string;
}

interface ResolvedFlush {
  instructionId: string;
  cells: { stageIndex: number; cycleIndex: number }[];  // flushed cell positions
  color: string;
}
```

### Phase 2: Frame rendering (every frame)

```typescript
pipelineState(schedule: PipelineSchedule, frame: number, fps: number, clockPeriod: number): PipelineState
```

- Input: immutable schedule + animation clock
- Output: per-cell opacity + hazard animation progress
- Pure function, no schedule mutation

**Reveal formula:**

```typescript
const cyclePeriod = clockPeriod * fps;                // frames per cycle
const cycleProgress = frame / cyclePeriod;            // continuous cycle position
const revealCycle = Math.floor(cycleProgress);        // which column is currently revealing
const withinCycle = cycleProgress - revealCycle;      // 0-1 progress within current cycle

// Per cell:
const cellCycleStart = cell.cycleIndex * cyclePeriod; // frame when this column starts revealing
const staggerFrames = cell.stageIndex * 2;            // top-to-bottom stagger (2 frames per stage)
const appearStart = cellCycleStart + staggerFrames;
const fadeFrames = 4;                                 // cell fade-in duration
const opacity = easeOutCubic(clamp01((frame - appearStart) / fadeFrames));

// Per forward arrow:
const arrowStartFrame = max(producerCell.appearStart, consumerCell.appearStart) + fadeFrames;
const arrowDuration = 12;                             // frames to draw arrow
const arrowProgress = clamp01((frame - arrowStartFrame) / arrowDuration);
```

**Output type:**

```typescript
interface PipelineState {
  cells: CellRenderState[][];               // same dimensions as schedule
  forwards: ForwardRenderState[];
  title: string | null;
}

interface CellRenderState {
  cell: ScheduledCell;                      // reference to immutable schedule cell
  opacity: number;                          // 0-1
  pixelX: number;                           // computed from layout
  pixelY: number;
  pixelWidth: number;
  pixelHeight: number;
}

interface ForwardRenderState {
  forward: ResolvedForward;                 // reference to immutable forward
  progress: number;                         // 0-1 draw-on progress
  pathD: string;                            // SVG path data (bezier curve)
}
```

### Why separate?

- Schedule is **semantic** (what instruction is where, what hazards exist) — depends only on spec
- State is **visual** (what opacity, what pixel position) — depends on frame + layout
- Separating them means schedule computation is O(n) once, not O(n) per frame
- Schedule is immutable → safe for React memoization
- Layout changes (resize) only recompute pixel positions, not the schedule

## 5. Visual Rendering

### Grid layout

```
┌─────────────────────────────────────────────────┐
│  Stage labels  │     Cycle numbers (1, 2, 3...) │
│  (left column) │                                 │
├────────────────┼─────────────────────────────────┤
│  IF            │  [I1] [I2] [I3] [   ] [   ]    │
│  ID            │  [   ] [I1] [I2] [stl] [I3]    │
│  EX            │  [   ] [   ] [I1] [I2] [fwd]   │
│  MEM           │  [   ] [   ] [   ] [I1] [I2]   │
│  WB            │  [   ] [   ] [   ] [   ] [I1]   │
└─────────────────────────────────────────────────┘
```

### Cell rendering

- **Active cell**: Rounded rect, filled with instruction color at 80% opacity, instruction mnemonic centered
- **Bubble cell**: Rounded rect, grey (#94a3b8) with diagonal hatch pattern (reuse metastability hatch), "bubble" text
- **Flushed cell**: Rounded rect, dashed outline (#ef4444 red), instruction text at 30% opacity
- **Forwarded cell**: Same as active, with small arrow indicator on the left edge
- **Empty cell**: Transparent (no rect drawn)

### Cell dimensions

- Cell width: `(canvasWidth - stageLabelWidth) / visibleCycles`
- Cell height: `(canvasHeight - headerHeight) / stages.length`
- Stage label column: 60px fixed
- Header (cycle numbers): 30px fixed
- Cell padding: 4px
- Border radius: 4px

### Forwarding arrows

- Curved SVG path from producer cell to consumer cell
- Path: cubic bezier — exits right edge of producer at mid-height, enters left edge of consumer at mid-height
- Control points: horizontal offset = 30% of cell width (gentle curve)
- Stroke: 2px, dashed (6px dash, 3px gap)
- Color: same as producer instruction color
- Arrowhead at consumer end (SVG marker)
- **Animation**: stroke-dashoffset from full length to 0 (draw-on effect)
- **Multiple arrows**: if two forwards target the same consumer (different operands), offset endpoints vertically by ±4px

### Stall semantics (precise definition)

A stall is **not** just "shift everything right." The precise behavior:

1. **Detection**: at `atCycle`, the hazard is detected in the pipeline
2. **Hold**: the `affectedInstruction` stays at `holdStage` for `duration` extra cycles (the instruction is frozen)
3. **Bubble insertion**: a bubble is inserted at `bubbleStage` at `atCycle`
4. **Upstream freeze**: stages before `holdStage` are frozen for the stall duration (IF cannot accept new instructions)
5. **Downstream shift**: the bubble flows through subsequent stages (MEM, WB) in later cycles
6. **Cascade**: all instructions with `entryCycle > affectedInstruction.entryCycle` shift right by `duration`
7. **Visual**: the held instruction's cell remains visible (not replaced by "bubble"). The bubble appears at `bubbleStage` and propagates downstream.

Example — load-use stall (I2 is `LW R1,0(R3)`, I3 is `ADD R4,R1,R5`):

```
         C1    C2    C3    C4    C5    C6    C7    C8
  IF  | I1  | I2  | I3  | bubble| I3  | I4  |     |     |
  ID  |     | I1  | I2  | I3  | bubble| I3  | I4  |     |
  EX  |     |     | I1  | I2  | I3* | bubble| I3  | I4  |
  MEM |     |     |     | I1  | I2  | I3* | I3  | I4  |
  WB  |     |     |     |     | I1  | I2  | I3* | I3  |
```

I3 is held at ID for 1 cycle (C4), bubble appears at EX (C4), I3 resumes at ID→EX in C5. Forwarding from I2 MEM to I3 EX at C6 (after I2 reaches MEM). `*` = forwarded cell.

### Branch flush semantics (precise definition)

A flush invalidates **speculatively fetched instructions** after the branch:

1. **Branch instruction** enters pipeline at its `entryCycle`
2. **Resolution**: at `resolveCycle`, branch outcome is known at `resolveStage`
3. **Flush**: instructions fetched in cycles `(branch.entryCycle + 1)` through `(resolveCycle)` at stages before `resolveStage` are marked "flushed"
4. **Redirect**: new target instruction enters IF at `redirectCycle`
5. **Visual**: flushed cells show dashed outline + faded text. They remain visible (showing what was speculatively fetched) but clearly marked as invalid.

Example — branch at I2 resolves at EX (C4), flushes I3 and I4:

```
         C1    C2    C3    C4    C5    C6    C7    C8
  IF  | I1  | I2  | I3  | I4  | I5  | I6  |     |     |
  ID  |     | I1  | I2  | I3̲  | I4̲  | I5  | I6  |     |
  EX  |     |     | I1  | I2  | I3̲  | I4̲  | I5  | I6  |
  MEM |     |     |     | I1  | I2  | I3̲  | I4̲  | I5  |
  WB  |     |     |     |     | I1  | I2  | I3̲  | I4̲  |
```

I3 and I4 are flushed (dashed outline). I5 is the branch target, entering IF at C5 (redirectCycle).

### Collision validation

If two instructions occupy the same (cycle, stage) cell after schedule resolution, `computePipelineSchedule` **throws** with a descriptive error:

```
PipelineSchedule collision: I3 and I4 both occupy EX at cycle C5
```

This catches spec errors early rather than silently overwriting cells.

### Color palette

Default instruction colors (cycled if more instructions than colors):
```
#3b82f6  blue      (I1)
#10b981  emerald   (I2)
#f59e0b  amber     (I3)
#8b5cf6  violet    (I4)
#ef4444  red       (I5)
#ec4899  pink      (I6)
#06b6d4  cyan      (I7)
#84cc16  lime      (I8)
```

Bubble: `#94a3b8` (slate)
Flush: `#ef4444` (red) at 30% opacity
Forward arrow: producer instruction color

## 6. Edge Case Guards

| Case | Behavior |
|------|----------|
| Instruction with no matching hazard | Renders normally, no hazard visualization |
| Multiple hazards on same instruction | Apply in chronological order by cycle |
| Stall duration = 0 | Treat as no-op (no visual effect) |
| totalCycles exceeded after stall | Clamp: last visible cycle = totalCycles - 1 |
| Empty instructions array | Render empty grid (stages × cycles, all cells empty) |
| Forwarding with missing producer cell | Throw: "Forward producer I1 not found at EX:C4" |
| Two instructions same cell | Throw: collision error |
| Invalid instruction ID in hazard | Throw: "Unknown instruction ID: IX" |
| Hazard referencing flushed instruction | Skip: flushed instruction has no further cells |
| Multiple instructions same entryCycle | Allowed — they occupy different stages at same cycle |
| Long mnemonic overflow | Truncate with ellipsis if text exceeds cell width |
| >8 instructions, color reuse | Colors cycle; instruction labels (I1, I2) disambiguate |
| 0-based vs 1-based mismatch | Spec is 1-based throughout; internal conversion documented |

## 7. Integration Points

### types.ts (new file: `src/motion/pipeline/types.ts`)

- `PipelineSpec` interface
- `PipelineInstruction` type
- `PipelineHazard` discriminated union
- `PipelineAnnotation` interface
- `PipelineSchedule`, `ScheduledCell`, `ResolvedForward`, `ResolvedFlush` interfaces
- `PipelineState`, `CellRenderState`, `ForwardRenderState` interfaces

### pipelineSchedule.ts (new: `src/motion/pipeline/pipelineSchedule.ts`)

- `computePipelineSchedule(spec: PipelineSpec): PipelineSchedule`
- Pure function, deterministic, no side effects
- Runs once per composition (cached with `useMemo`)

### pipelineState.ts (new: `src/motion/pipeline/pipelineState.ts`)

- `pipelineState(schedule, frame, fps, clockPeriod): PipelineState`
- Pure function, per-frame
- Imports `clamp01` from shared utils

### PipelineScene.tsx (new: `src/scenes/PipelineScene.tsx`)

- New Remotion composition component
- Fetches spec from JSON (same pattern as DigitalTimingScene)
- Calls `computePipelineSchedule` in `useMemo`
- Calls `pipelineState` per frame
- Renders grid with SVG
- Renders forwarding arrows as SVG paths
- Shares utilities with DigitalTimingScene: color palette, hatch pattern, easing functions

### Root.tsx

- Register new `PipelineDemo` Composition
- 60fps, 480 frames (8 seconds at 60fps), 1280×720

### Demo spec

- `public/specs/pipeline-demo.json`
- Scenario: 5 instructions with 1 load-use hazard (stall + forwarding)
- Classic: `ADD R1,R2,R3` → `LW R1,0(R3)` → `ADD R4,R1,R5` (load-use: stall 1 cycle, forward from MEM)

## 8. Example Scenarios

### Example A: Basic pipeline (no hazards)

```json
{
  "stages": ["IF", "ID", "EX", "MEM", "WB"],
  "totalCycles": 9,
  "clockPeriod": 0.8,
  "instructions": [
    { "id": "I1", "mnemonic": "ADD R1,R2,R3", "entryCycle": 1 },
    { "id": "I2", "mnemonic": "SUB R4,R1,R5", "entryCycle": 2 },
    { "id": "I3", "mnemonic": "AND R6,R1,R7", "entryCycle": 3 },
    { "id": "I4", "mnemonic": "OR  R8,R9,R10", "entryCycle": 4 },
    { "id": "I5", "mnemonic": "XOR R11,R12,R13", "entryCycle": 5 }
  ]
}
```

```
         C1    C2    C3    C4    C5    C6    C7    C8    C9
  IF  | ADD | SUB | AND | OR  | XOR |     |     |     |     |
  ID  |     | ADD | SUB | AND | OR  | XOR |     |     |     |
  EX  |     |     | ADD | SUB | AND | OR  | XOR |     |     |
  MEM |     |     |     | ADD | SUB | AND | OR  | XOR |     |
  WB  |     |     |     |     | ADD | SUB | AND | OR  | XOR |
```

No hazards, no forwarding. 5 instructions × 5 stages = 25 cells.

### Example B: Load-use hazard (stall + forwarding)

```json
{
  "stages": ["IF", "ID", "EX", "MEM", "WB"],
  "totalCycles": 10,
  "clockPeriod": 0.8,
  "instructions": [
    { "id": "I1", "mnemonic": "LW R1,0(R3)", "entryCycle": 1 },
    { "id": "I2", "mnemonic": "NOP", "entryCycle": 2 },
    { "id": "I3", "mnemonic": "ADD R4,R1,R5", "entryCycle": 3 },
    { "id": "I4", "mnemonic": "SUB R6,R1,R7", "entryCycle": 4 },
    { "id": "I5", "mnemonic": "AND R8,R1,R9", "entryCycle": 5 }
  ],
  "hazards": [
    {
      "type": "stall",
      "affectedInstruction": "I3",
      "atCycle": 4,
      "holdStage": 1,
      "bubbleStage": 2,
      "duration": 1,
      "reason": "load-use: R1 not available until MEM"
    },
    {
      "type": "forward",
      "producerInstruction": "I1",
      "producerStage": 3,
      "producerCycle": 5,
      "consumerInstruction": "I3",
      "consumerStage": 2,
      "consumerCycle": 5,
      "operand": "rs1",
      "reason": "MEM/WB → EX forwarding"
    }
  ]
}
```

```
         C1    C2    C3    C4    C5    C6    C7    C8    C9   C10
  IF  | LW  | NOP | ADD | bubble| ADD | SUB | AND |     |     |     |
  ID  |     | LW  | NOP | ADD  | bubble| ADD | SUB | AND |     |     |
  EX  |     |     | LW  | NOP  | ADD* | bubble| ADD | SUB | AND |     |
  MEM |     |     |     | LW   | NOP  | ADD* | bubble| ADD | SUB | AND |
  WB  |     |     |     |     | LW   | NOP  | ADD* | bubble| ADD | SUB |
```

I3 (ADD) stalls 1 cycle at ID (C4). Bubble propagates through EX→MEM→WB. Forwarding arrow from I1 MEM (C5) to I3 EX (C5). `*` = forwarded cell.

### Example C: Branch flush

```json
{
  "stages": ["IF", "ID", "EX", "MEM", "WB"],
  "totalCycles": 10,
  "clockPeriod": 0.8,
  "instructions": [
    { "id": "I1", "mnemonic": "ADD R1,R2,R3", "entryCycle": 1 },
    { "id": "I2", "mnemonic": "BEQ R1,R0,TGT", "entryCycle": 2 },
    { "id": "I3", "mnemonic": "SUB R4,R5,R6", "entryCycle": 3 },
    { "id": "I4", "mnemonic": "AND R7,R8,R9", "entryCycle": 4 },
    { "id": "I5", "mnemonic": "LW R10,0(R11)", "entryCycle": 6 }
  ],
  "hazards": [
    {
      "type": "flush",
      "branchInstruction": "I2",
      "resolveStage": 2,
      "resolveCycle": 4,
      "flushedInstructions": ["I3", "I4"],
      "redirectCycle": 6,
      "reason": "branch taken, mispredict"
    }
  ]
}
```

```
         C1    C2    C3    C4    C5    C6    C7    C8    C9   C10
  IF  | ADD | BEQ | SUB | AND |     | LW  |     |     |     |     |
  ID  |     | ADD | BEQ | SUB̲  | AND̲  |     | LW  |     |     |     |
  EX  |     |     | ADD | BEQ | SUB̲  | AND̲  |     | LW  |     |     |
  MEM |     |     |     | ADD | BEQ | SUB̲  | AND̲  |     | LW  |     |
  WB  |     |     |     |     | ADD | BEQ | SUB̲  | AND̲  |     | LW  |
```

I3 (SUB) and I4 (AND) are flushed — dashed outline. I5 (LW) is the branch target entering IF at C6. `̲` = flushed cell.

## 9. Resolved Questions

| Question | Answer (v2) |
|----------|-------------|
| Primitive type | New standalone primitive (not extending DigitalTimingSpec) |
| Grid vs waveform | Grid layout — this is structural, not temporal |
| Cycle indexing | 1-based throughout (C1, C2, ...). Internal arrays 0-based with documented mapping. |
| Stall semantics | Hold instruction at holdStage, insert bubble at bubbleStage, cascade shift |
| Forwarding coordinates | Explicit producerCycle/consumerCycle required (no ambiguity after stalls) |
| Flush semantics | Flush from resolveCycle onward for younger instructions |
| Multiple forwards | Supported via `operand` field; vertically offset arrows |
| Collision handling | Throw on schedule computation (fail-fast, not silent overwrite) |
| Color scheme | Per-instruction cycling from default palette |
| Animation style | Progressive column reveal with stagger and fade |
| Reveal formula | `opacity = easeOutCubic(clamp01((frame - appearStart) / 4))` |
| Arrow animation | `stroke-dashoffset` draw-on, 12 frames, starts after both endpoints visible |
| Cell dimensions | Dynamic based on canvas size and grid dimensions |
| Hatch pattern | Reuse metastability hatch (same SVG pattern, different color) |
| Hazard ordering | Chronological by cycle, not by type |
| Spec format | JSON, same fetch-from-public pattern as timing demos |
| Scene component | New PipelineScene.tsx (not modifying DigitalTimingScene) |
| Schedule caching | `useMemo` — schedule computed once, state computed per frame |
| Shared utilities | Color palette, hatch pattern, easing/clamp from shared utils |
| Clock period | Configurable per spec, default 1.0s |
| Stage names | Configurable array, default ["IF", "ID", "EX", "MEM", "WB"] |

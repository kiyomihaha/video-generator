// Pipeline Visualization — Schedule Computation (Phase 1)
// Pure function: PipelineSpec → PipelineSchedule
// Called once per composition mount, cached with useMemo.
//
// Algorithm: single-pass placement using per-instruction per-stage offsets.
// Stalls delay the affected instruction only from holdStage onward;
// younger instructions (entryCycle > affected) cascade uniformly.
// Bubbles fill cells where the instruction would have been without the stall.

import type {
  PipelineSpec,
  PipelineSchedule,
  ScheduledCell,
  ResolvedForward,
  ResolvedFlush,
  StallHazard,
  ForwardHazard,
  FlushHazard,
} from "./types";

const DEFAULT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
];

const BUBBLE_COLOR = "#94a3b8";
const FLUSH_COLOR = "#ef4444";

function getInstructionColor(
  spec: PipelineSpec,
  instrId: string,
  instrIndex: number,
): string {
  const instr = spec.instructions.find((i) => i.id === instrId);
  if (instr?.color) return instr.color;
  return spec.color ?? DEFAULT_COLORS[instrIndex % DEFAULT_COLORS.length];
}

export function computePipelineSchedule(spec: PipelineSpec): PipelineSchedule {
  const stages = spec.stages;
  const totalCycles = spec.totalCycles;
  const numStages = stages.length;

  // ── Collect & sort hazards ──────────────────────────────────────────

  const stallHazards = (spec.hazards ?? [])
    .filter((h): h is StallHazard => h.type === "stall")
    .sort((a, b) => a.atCycle - b.atCycle);

  const flushHazards = (spec.hazards ?? [])
    .filter((h): h is FlushHazard => h.type === "flush")
    .sort((a, b) => a.resolveCycle - b.resolveCycle);

  const forwardHazards = (spec.hazards ?? [])
    .filter((h): h is ForwardHazard => h.type === "forward");

  const instructionIndex = new Map<string, number>();
  spec.instructions.forEach((instr, idx) => instructionIndex.set(instr.id, idx));

  // ── Step 0: Validate spec + hazard references BEFORE computation ──
  //
  // Fails fast on malformed specs so errors are clear instead of producing
  // silently wrong grids or runtime crashes.

  if (totalCycles < 1) throw new Error("totalCycles must be >= 1");
  if (numStages < 1) throw new Error("stages must have at least 1 stage");

  const seenIds = new Set<string>();
  for (const instr of spec.instructions) {
    if (!instr.id) throw new Error("Each instruction must have an id");
    if (seenIds.has(instr.id)) throw new Error(`Duplicate instruction id: ${instr.id}`);
    seenIds.add(instr.id);
    if (instr.entryCycle < 1) throw new Error(
      `Instruction "${instr.id}" entryCycle must be >= 1, got ${instr.entryCycle}`,
    );
    if (!Number.isInteger(instr.entryCycle)) throw new Error(
      `Instruction "${instr.id}" entryCycle must be an integer`,
    );
  }

  for (const hazard of spec.hazards ?? []) {
    if (hazard.type === "stall") {
      if (!instructionIndex.has(hazard.affectedInstruction)) {
        throw new Error(`Stall references unknown instruction: ${hazard.affectedInstruction}`);
      }
      if (hazard.holdStage < 0 || hazard.holdStage >= numStages) {
        throw new Error(
          `Stall holdStage ${hazard.holdStage} out of bounds ` +
          `(stages: ${stages.join(", ")})`,
        );
      }
      if (hazard.bubbleStage < 0 || hazard.bubbleStage >= numStages) {
        throw new Error(
          `Stall bubbleStage ${hazard.bubbleStage} out of bounds ` +
          `(stages: ${stages.join(", ")})`,
        );
      }
      if (!Number.isInteger(hazard.duration) || hazard.duration < 1) {
        throw new Error(
          `Stall duration must be a positive integer, got ${hazard.duration}`,
        );
      }
      if (!Number.isInteger(hazard.atCycle) || hazard.atCycle < 1) {
        throw new Error(
          `Stall atCycle must be >= 1, got ${hazard.atCycle}`,
        );
      }
    } else if (hazard.type === "forward") {
      if (!instructionIndex.has(hazard.producerInstruction)) {
        throw new Error(`Forward references unknown producer: ${hazard.producerInstruction}`);
      }
      if (!instructionIndex.has(hazard.consumerInstruction)) {
        throw new Error(`Forward references unknown consumer: ${hazard.consumerInstruction}`);
      }
      if (hazard.producerStage < 0 || hazard.producerStage >= numStages) {
        throw new Error(
          `Forward producer stage ${hazard.producerStage} out of bounds ` +
          `(stages: ${stages.join(", ")})`,
        );
      }
      if (hazard.consumerStage < 0 || hazard.consumerStage >= numStages) {
        throw new Error(
          `Forward consumer stage ${hazard.consumerStage} out of bounds ` +
          `(stages: ${stages.join(", ")})`,
        );
      }
    } else if (hazard.type === "flush") {
      if (!instructionIndex.has(hazard.branchInstruction)) {
        throw new Error(`Flush references unknown branch: ${hazard.branchInstruction}`);
      }
      for (const fid of hazard.flushedInstructions) {
        if (!instructionIndex.has(fid)) {
          throw new Error(`Flush references unknown instruction: ${fid}`);
        }
      }
      if (hazard.resolveStage < 0 || hazard.resolveStage >= numStages) {
        throw new Error(
          `Flush resolveStage ${hazard.resolveStage} out of bounds ` +
          `(stages: ${stages.join(", ")})`,
        );
      }
      if (!Number.isInteger(hazard.resolveCycle) || hazard.resolveCycle < 1) {
        throw new Error(
          `Flush resolveCycle must be >= 1, got ${hazard.resolveCycle}`,
        );
      }
    }
  }

  // ── Step 1: Pre-compute per-instruction, per-stage offsets ──────────
  //
  // stageOffsets[instrId][stageIndex] = how many extra cycles delay
  // this instruction at this stage.
  //
  // Stall effect on the **affected** instruction:
  //   stages ≤ holdStage → offset 0  (arrive at normal time)
  //   stages > holdStage → offset += duration
  //
  // Stall effect on **younger** instructions (entryCycle > affected):
  //   ALL stages → offset += duration   (cascade shift)

  const stageOffsets = new Map<string, number[]>();
  for (const instr of spec.instructions) {
    stageOffsets.set(instr.id, new Array(numStages).fill(0));
  }

  for (const stall of stallHazards) {
    const { affectedInstruction, holdStage, duration } = stall;
    const affIdx = instructionIndex.get(affectedInstruction);
    if (affIdx === undefined) continue;
    const affEntry = spec.instructions[affIdx].entryCycle;

    // a) Affected instruction: offset only for stages past holdStage
    const affOff = stageOffsets.get(affectedInstruction)!;
    for (let s = holdStage + 1; s < numStages; s++) {
      affOff[s] += duration;
    }

    // b) Younger instructions: cascade, but IF entry varies
    //
    // Instructions that enter IF DURING the stall window (entryCycle in
    // [atCycle, atCycle+duration)) arrive at their normal cycle but are
    // held in IF for the stall duration.  Their IF stage is NOT offset.
    // All downstream stages are offset by duration.
    //
    // Instructions that enter AFTER the stall window (entryCycle >=
    // atCycle+duration) have their entire schedule (including IF)
    // delayed by the stall duration.
    for (const other of spec.instructions) {
      if (other.id === affectedInstruction) continue;
      if (other.entryCycle > affEntry) {
        const otherOff = stageOffsets.get(other.id)!;
        if (
          other.entryCycle >= stall.atCycle &&
          other.entryCycle < stall.atCycle + stall.duration
        ) {
          // Enters during stall window: IF at normal time,
          // rest delayed by remaining stall cycles
          const remaining = stall.atCycle + stall.duration - other.entryCycle;
          for (let s = 1; s < numStages; s++) {
            otherOff[s] += remaining;
          }
        } else {
          // Enters after stall window: whole schedule delayed
          for (let s = 0; s < numStages; s++) {
            otherOff[s] += duration;
          }
        }
      }
    }
  }

  // ── Step 2: Build empty grid ────────────────────────────────────────

  const cells: ScheduledCell[][] = Array.from({ length: numStages }, (_, si) =>
    Array.from({ length: totalCycles }, (_, ci) => ({
      stageIndex: si,
      cycleIndex: ci,
      instruction: null as string | null,
      instructionId: null as string | null,
      color: null as string | null,
      state: "empty" as const,
    })),
  );

  // ── Step 3: Place instructions (single-pass, collision-checked) ────

  const occupancy = new Set<string>(); // "si,ci" → used for collision detection

  // Sort by entryCycle for deterministic placement
  const sortedInstrs = [...spec.instructions].sort(
    (a, b) => a.entryCycle - b.entryCycle,
  );

  for (const instr of sortedInstrs) {
    const idx = instructionIndex.get(instr.id)!;
    const color = getInstructionColor(spec, instr.id, idx);
    const offsets = stageOffsets.get(instr.id)!;

    for (let si = 0; si < numStages; si++) {
      const ci = instr.entryCycle - 1 + si + offsets[si];
      if (ci < 0 || ci >= totalCycles) continue;

      const key = `${si},${ci}`;
      if (occupancy.has(key)) {
        const existing = cells[si][ci];
        throw new Error(
          `Collision at stage ${si} (${stages[si]}) cycle ${ci + 1}: ` +
          `instruction "${instr.id}" (${instr.mnemonic}) conflicts with ` +
          `"${existing.instructionId}" (${existing.instruction})`,
        );
      }

      cells[si][ci] = {
        stageIndex: si,
        cycleIndex: ci,
        instruction: instr.mnemonic,
        instructionId: instr.id,
        color,
        state: "active",
      };
      occupancy.add(key);
    }
  }

  // ── Step 3b: Fill stall holdStage cells ("held" state) ─────────────
  //
  // Without this step, the stalled instruction's row at holdStage has a
  // "ghost cell" — an empty gap where the instruction was held but not
  // placed.  Fill consecutive cells at holdStage for the stall duration
  // so the instruction appears to stay in place.
  //
  // Also fill "held" cells at IF (stage 0) for younger instructions that
  // enter during the stall window — they arrive at their normal entry
  // cycle but cannot advance until the stall resolves.
  //
  // The first cycle (atCycle-1) is already filled by Step 3 (the normal
  // position).  This step fills atCycle-1+d for d in [1, duration].
  //
  // This is purely a visual fix: the instruction appears repeated at
  // holdStage so the viewer can follow it horizontally without a gap.

  for (const stall of stallHazards) {
    const { affectedInstruction, holdStage, atCycle, duration } = stall;
    const affIdx = instructionIndex.get(affectedInstruction);
    if (affIdx === undefined) continue;
    const instr = spec.instructions[affIdx];
    const color = getInstructionColor(spec, instr.id, affIdx);
    const heldBaseCycle =
      instr.entryCycle - 1 + holdStage + stageOffsets.get(instr.id)![holdStage];

    // Held cells for the affected instruction at holdStage
    for (let d = 1; d <= duration; d++) {
      const heldCycle = heldBaseCycle + d;
      if (heldCycle < 0 || heldCycle >= totalCycles) continue;
      const existing = cells[holdStage][heldCycle];
      if (existing.state === "empty") {
        cells[holdStage][heldCycle] = {
          stageIndex: holdStage,
          cycleIndex: heldCycle,
          instruction: instr.mnemonic,
          instructionId: instr.id,
          color,
          state: "held",
        };
      }
    }

    // Held cells at IF (stage 0) for younger instructions entering
    // during the stall window (entryCycle in [atCycle, atCycle+duration))
    const affEntry = spec.instructions[instructionIndex.get(affectedInstruction)!].entryCycle;
    for (const other of spec.instructions) {
      if (other.id === affectedInstruction) continue;
      if (other.entryCycle <= affEntry) continue;
      if (
        other.entryCycle >= stall.atCycle &&
        other.entryCycle < stall.atCycle + stall.duration
      ) {
        const otherColor = getInstructionColor(
          spec,
          other.id,
          instructionIndex.get(other.id)!,
        );
        const numHeld = duration - (other.entryCycle - stall.atCycle);
        for (let h = 1; h <= numHeld; h++) {
          const heldCycle = other.entryCycle - 1 + h;
          if (heldCycle < 0 || heldCycle >= totalCycles) continue;
          const existing = cells[0][heldCycle];
          if (existing.state === "empty") {
            cells[0][heldCycle] = {
              stageIndex: 0,
              cycleIndex: heldCycle,
              instruction: other.mnemonic,
              instructionId: other.id,
              color: otherColor,
              state: "held",
            };
          }
        }
      }
    }
  }

  // ── Step 4: Apply bubbles ──────────────────────────────────────────
  //
  // The bubble occupies the cell where the instruction WOULD have been at
  // bubbleStage without this stall (accounting for prior stall offsets).
  // It then flows downstream cycle by cycle.
  //
  // Position: entryCycle - 1 + bubbleStage + priorOffset + d
  // Downstream: entryCycle - 1 + si + priorOffset + d  (for si > bubbleStage)

  for (const stall of stallHazards) {
    const { affectedInstruction, bubbleStage, duration } = stall;
    const affIdx = instructionIndex.get(affectedInstruction);
    if (affIdx === undefined) continue;
    const instr = spec.instructions[affIdx];
    const offsets = stageOffsets.get(instr.id)!;

    // Prior offset (stalls before this one) at bubble stage
    const priorOffset = offsets[bubbleStage] - duration;

    for (let d = 0; d < duration; d++) {
      // Initial bubble at bubbleStage
      const bubbleCycle = instr.entryCycle - 1 + bubbleStage + priorOffset + d;
      if (bubbleCycle >= 0 && bubbleCycle < totalCycles) {
        const existing = cells[bubbleStage][bubbleCycle];
        if (existing.state === "empty") {
          cells[bubbleStage][bubbleCycle] = {
            stageIndex: bubbleStage,
            cycleIndex: bubbleCycle,
            instruction: "bubble",
            instructionId: null,
            color: BUBBLE_COLOR,
            state: "bubble",
          };
        }
      }

      // Downstream flow
      for (let si = bubbleStage + 1; si < numStages; si++) {
        const downPrior = offsets[si] - duration;
        const downCycle = instr.entryCycle - 1 + si + downPrior + d;
        if (downCycle >= 0 && downCycle < totalCycles) {
          const existing = cells[si][downCycle];
          if (existing.state === "empty") {
            cells[si][downCycle] = {
              stageIndex: si,
              cycleIndex: downCycle,
              instruction: "bubble",
              instructionId: null,
              color: BUBBLE_COLOR,
              state: "bubble",
            };
          }
        }
      }
    }
  }

  // ── Step 5: Apply flushes ──────────────────────────────────────────

  const resolvedFlushes: ResolvedFlush[] = [];

  for (const flush of flushHazards) {
    const flushedCells: { stageIndex: number; cycleIndex: number }[] = [];

    for (const flushedId of flush.flushedInstructions) {
      const flushedIdx = instructionIndex.get(flushedId);
      if (flushedIdx === undefined) continue;
      const flushedInstr = spec.instructions[flushedIdx];
      if (!flushedInstr) continue;

      const color = getInstructionColor(spec, flushedId, flushedIdx);
      const offsets = stageOffsets.get(flushedId) ?? new Array(numStages).fill(0);

      for (let si = flush.resolveStage; si < numStages; si++) {
        const cycle = flushedInstr.entryCycle - 1 + si + offsets[si];
        if (cycle >= flush.resolveCycle - 1 && cycle >= 0 && cycle < totalCycles) {
          cells[si][cycle] = {
            stageIndex: si,
            cycleIndex: cycle,
            instruction: flushedInstr.mnemonic,
            instructionId: flushedId,
            color,
            state: "flushed",
          };
          flushedCells.push({ stageIndex: si, cycleIndex: cycle });
        }
      }
    }

    resolvedFlushes.push({
      instructionId: flush.branchInstruction,
      cells: flushedCells,
      color: FLUSH_COLOR,
    });
  }

  // ── Step 6: Resolve forwarding arrows ──────────────────────────────
  //
  // Auto-locate producer/consumer cells by searching the resolved grid
  // for (instructionId, stage).  No manual cycle fields needed — the
  // engine always finds the correct cell after stall/flush offsets.

  function findCellCycle(
    cells: ScheduledCell[][],
    stageIndex: number,
    instructionId: string,
  ): number | null {
    for (let ci = 0; ci < cells[stageIndex].length; ci++) {
      const cell = cells[stageIndex][ci];
      if (cell.instructionId === instructionId && cell.state === "active") {
        return ci;
      }
    }
    return null;
  }

  const resolvedForwards: ResolvedForward[] = [];

  for (const fwd of forwardHazards) {
    const producerIdx = instructionIndex.get(fwd.producerInstruction);
    const consumerIdx = instructionIndex.get(fwd.consumerInstruction);

    // Find producer cell in resolved grid
    const producerCycle0 = findCellCycle(cells, fwd.producerStage, fwd.producerInstruction);
    if (producerCycle0 === null) {
      throw new Error(
        `Forward producer "${fwd.producerInstruction}" not found at stage "${stages[fwd.producerStage]}" ` +
        `(stage ${fwd.producerStage}). Verify stall/entryCycle alignment.`,
      );
    }

    // Find consumer cell in resolved grid
    const consumerCycle0 = findCellCycle(cells, fwd.consumerStage, fwd.consumerInstruction);
    if (consumerCycle0 === null) {
      throw new Error(
        `Forward consumer "${fwd.consumerInstruction}" not found at stage "${stages[fwd.consumerStage]}" ` +
        `(stage ${fwd.consumerStage}). Verify stall/entryCycle alignment.`,
      );
    }

    const producerColor = getInstructionColor(spec, fwd.producerInstruction, producerIdx!);

    resolvedForwards.push({
      producerCell: { stageIndex: fwd.producerStage, cycleIndex: producerCycle0 },
      consumerCell: { stageIndex: fwd.consumerStage, cycleIndex: consumerCycle0 },
      producerColor,
      operand: fwd.operand,
      reason: fwd.reason,
    });
  }

  // ── Step 7: Return result ──────────────────────────────────────────

  return {
    cells,
    forwards: resolvedForwards,
    flushes: resolvedFlushes,
    stages,
    totalCycles,
  };
}

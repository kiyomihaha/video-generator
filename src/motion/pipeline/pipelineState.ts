// Pipeline Visualization — Per-Frame State (Phase 2)
// Pure function: PipelineSchedule + frame → PipelineState
// Called every frame. Only computes opacity/progress, no schedule mutation.

import type {
  PipelineSchedule,
  PipelineState,
  CellRenderState,
  ForwardRenderState,
} from "./types";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function pipelineState(
  schedule: PipelineSchedule,
  frame: number,
  fps: number,
  clockPeriod: number,
): PipelineState {
  const cyclePeriod = clockPeriod * fps; // frames per cycle
  const numStages = schedule.stages.length;
  const totalCycles = schedule.totalCycles;

  // Per-cell opacity based on progressive reveal
  const cells: CellRenderState[][] = Array.from({ length: numStages }, (_, si) =>
    Array.from({ length: totalCycles }, (_, ci) => {
      const cell = schedule.cells[si][ci];
      if (cell.state === "empty") {
        return { cell, opacity: 0 };
      }

      // Column reveal timing
      const cellCycleStart = ci * cyclePeriod; // frame when this column starts
      const staggerFrames = si * 2; // top-to-bottom stagger (2 frames per stage)
      const appearStart = cellCycleStart + staggerFrames;
      const fadeFrames = 4;

      const opacity =
        frame < appearStart
          ? 0
          : easeOutCubic(clamp01((frame - appearStart) / fadeFrames));

      return { cell, opacity };
    }),
  );

  // Per-forward arrow progress
  const forwards: ForwardRenderState[] = schedule.forwards.map((fwd) => {
    const prodSi = fwd.producerCell.stageIndex;
    const prodCi = fwd.producerCell.cycleIndex;
    const consSi = fwd.consumerCell.stageIndex;
    const consCi = fwd.consumerCell.cycleIndex;

    // Arrow starts after both endpoint cells are fully visible
    const prodAppearEnd = prodCi * cyclePeriod + prodSi * 2 + 4;
    const consAppearEnd = consCi * cyclePeriod + consSi * 2 + 4;
    const arrowStartFrame = Math.max(prodAppearEnd, consAppearEnd);
    const arrowDuration = 12; // frames to draw arrow

    const progress = clamp01((frame - arrowStartFrame) / arrowDuration);

    return { forward: fwd, progress };
  });

  return {
    cells,
    forwards,
    title: schedule.stages.length > 0 ? null : null, // title from spec, not schedule
  };
}

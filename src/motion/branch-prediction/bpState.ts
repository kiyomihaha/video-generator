// Branch Prediction — Per-frame state computation
// Pure function: (BranchPredictionSchedule, frame, fps, clockPeriod) → BranchPredictionState

import type {
  BranchPredictionSchedule,
  BranchPredictionState,
  BPCellState,
  BTBState,
} from "./types";
import { clamp01, easeOutCubic } from "../utils";
import { spring } from "remotion";

export function bpState(
  schedule: BranchPredictionSchedule,
  frame: number,
  fps: number,
  clockPeriod: number,
): BranchPredictionState {
  const cyclePeriod = clockPeriod * fps;
  const currentCycle = Math.floor(frame / cyclePeriod);
  const cycleFraction = (frame % cyclePeriod) / cyclePeriod;

  // Cell reveal: column-by-column with top-to-bottom stagger
  const cells: BPCellState[][] = schedule.cells.map((row, si) =>
    row.map((cell, ci): BPCellState => {
      if (cell.state === "empty") {
        return { cell, opacity: 0, highlight: 0, flushFlash: 0 };
      }

      const appearStart = ci * cyclePeriod + si * 2;
      const appearDuration = 4;
      const appearProgress = clamp01((frame - appearStart) / appearDuration);
      const opacity = easeOutCubic(appearProgress);

      // Highlight for correct prediction (green pulse at resolve cycle)
      let highlight = 0;
      const activeBranch = schedule.branches.find(
        (b) => b.resolveCycle - 1 === ci && b.isCorrect
      );
      if (activeBranch && cell.instructionId === activeBranch.instructionId) {
        const resolveFrame = (activeBranch.resolveCycle - 1) * cyclePeriod;
        const highlightStart = resolveFrame + si * 2;
        const highlightProgress = clamp01((frame - highlightStart) / 8);
        highlight = highlightProgress < 0.5
          ? highlightProgress * 2
          : 2 - highlightProgress * 2;
      }

      // Flush animation for mispredicted cells — per-cell branch matching
      let flushFlash = 0;
      if (cell.state === "flushed") {
        // Find which mispredicted branch caused this cell's flush
        const flushBranch = schedule.branches.find(
          (b) => !b.isCorrect && b.flushedCells.some(
            (fc) => fc.stage === si && fc.cycle === ci
          )
        );
        if (flushBranch) {
          const flushStartFrame = (flushBranch.resolveCycle - 1) * cyclePeriod;
          const flushFrame = frame - flushStartFrame;
          if (flushFrame > 0) {
            flushFlash = spring({
              frame: flushFrame,
              fps,
              config: { damping: 12, mass: 0.8, stiffness: 120 },
              from: 1,
              to: 0,
            });
            flushFlash = clamp01(flushFlash);
          }
        }
      }

      return { cell, opacity, highlight, flushFlash };
    })
  );

  // BTB state with update flash
  const latestSnapshot = schedule.btbTimeline
    .filter((s) => s.cycle <= currentCycle + 1)
    .pop() ?? schedule.btbTimeline[0];

  const btb: BTBState[] = (latestSnapshot?.entries ?? []).map((entry): BTBState => {
    // Flash when counter updates
    let updateFlash = 0;
    for (const branch of schedule.branches) {
      if (branch.btbIndex === entry.index) {
        const updateFrame = (branch.resolveCycle - 1) * cyclePeriod;
        const flashProgress = clamp01((frame - updateFrame) / 12);
        if (flashProgress > 0 && flashProgress < 1) {
          updateFlash = flashProgress < 0.5
            ? flashProgress * 2
            : 2 - flashProgress * 2;
        }
      }
    }
    return { entry, updateFlash };
  });

  // Active branch (most recent misprediction at current cycle)
  const activeBranch = schedule.branches.find(
    (b) => !b.isCorrect && currentCycle >= b.resolveCycle - 1 &&
    currentCycle < b.resolveCycle - 1 + b.penaltyCycles
  ) ?? null;

  // Flush progress (0-1 across penalty period)
  let flushProgress = 0;
  if (activeBranch) {
    const flushStart = (activeBranch.resolveCycle - 1) * cyclePeriod;
    const flushDuration = activeBranch.penaltyCycles * cyclePeriod;
    flushProgress = clamp01((frame - flushStart) / flushDuration);
  }

  return { cells, btb, currentCycle, activeBranch, flushProgress };
}

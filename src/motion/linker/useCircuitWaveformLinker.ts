// CircuitWaveformLinker — React Hook
// Manages cycle/cycleFrame computation from absolute frame progression.
// Decay state is computed deterministically inside the pure function — no mutable refs.

import { useMemo } from "react";
import type {
  LinkedFrameState,
  CircuitWaveformLinkerAuthoring,
} from "./types";
import { computeLinkedFrame } from "./linkerState";

export function useCircuitWaveformLinker(
  frame: number,
  fps: number,
  authoring: CircuitWaveformLinkerAuthoring,
): LinkedFrameState {
  return useMemo(() => {
    const framesPerCycle = authoring.framesPerCycle;

    // 1-based cycle; cycles[0].cycle is the first active cycle
    const firstCycle = authoring.cycles[0]?.cycle ?? 1;
    const leadIn = Math.max(0, firstCycle - 1) * framesPerCycle;

    let currentCycle: number;
    let cycleFrame: number;

    if (frame < leadIn) {
      currentCycle = Math.max(1, Math.floor(frame / framesPerCycle) + 1);
      cycleFrame = frame % framesPerCycle;
    } else {
      const activeFrames = frame - leadIn;
      const cycleIndex = Math.floor(activeFrames / framesPerCycle);
      currentCycle = firstCycle + cycleIndex;
      cycleFrame = activeFrames % framesPerCycle;
    }

    return computeLinkedFrame(currentCycle, cycleFrame, frame, authoring, fps);
  }, [frame, fps, authoring]);
}

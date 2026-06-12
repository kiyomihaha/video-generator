// Legend — Per-frame state computation
// Computes box opacity (entrance/exit fade) and item active highlights

import type { LegendSchedule, LegendState, LegendItemRenderState } from "./types";
import { clamp01 } from "../utils";

export function computeLegendState(
  schedule: LegendSchedule,
  frame: number,
): LegendState {
  const { startFrame, endFrame, entranceFrames, exitFrames, items, activeTokenSet } = schedule;

  // Outside active range
  if (frame < startFrame || frame >= endFrame) {
    return { boxOpacity: 0, items: [], visible: false };
  }

  // Entrance fade
  const entranceProgress = clamp01((frame - startFrame) / entranceFrames);

  // Exit fade
  const exitStart = endFrame - exitFrames;
  const exitFactor = frame >= exitStart
    ? clamp01((endFrame - frame) / exitFrames)
    : 1;

  const finalOpacity = entranceProgress * exitFactor;

  // Item states
  const itemStates: LegendItemRenderState[] = items.map((item) => ({
    id: item.id,
    opacity: finalOpacity,
    activeOpacity: activeTokenSet.has(item.id) ? 1 : 0.4,
  }));

  return {
    boxOpacity: finalOpacity,
    items: itemStates,
    visible: true,
  };
}

// VideoShell — Aspect ratio helpers
// The container is always MASTER_WIDTH x MASTER_HEIGHT.
// For 9:16, transform: scale() handles visual scaling.
// No double-scaling: container size is not pre-scaled.
import type { TargetAspect } from "./types";
import { MASTER_WIDTH, MASTER_HEIGHT, PORTRAIT_WIDTH, PORTRAIT_HEIGHT, PORTRAIT_TOP_RAIL } from "./types";

export interface CompositionDimensions {
  width: number;
  height: number;
  scale: number;       // scale factor to apply via CSS transform
  sceneX: number;      // container offsetX within composition
  sceneY: number;      // container offsetY within composition
}

/**
 * Compute composition dimensions and scene container placement.
 * "fit" policy: master canvas scaled uniformly to fit, no cropping.
 * Container stays at native size; transform: scale() handles visual fit.
 */
export function compositionDimensions(
  targetAspect: TargetAspect,
  masterW = MASTER_WIDTH,
  masterH = MASTER_HEIGHT,
): CompositionDimensions {
  if (targetAspect === "16:9") {
    return { width: masterW, height: masterH, scale: 1, sceneX: 0, sceneY: 0 };
  }

  // 9:16 — scale to fit width; center vertically in the middle tier
  const scale = PORTRAIT_WIDTH / masterW; // 720/1280 = 0.5625
  const centerH = PORTRAIT_HEIGHT - PORTRAIT_TOP_RAIL - 438; // 405
  const sceneH = Math.round(masterH * scale); // 405
  const sceneY = PORTRAIT_TOP_RAIL + Math.round((centerH - sceneH) / 2);

  return {
    width: PORTRAIT_WIDTH,
    height: PORTRAIT_HEIGHT,
    scale,
    sceneX: 0,
    sceneY,
  };
}

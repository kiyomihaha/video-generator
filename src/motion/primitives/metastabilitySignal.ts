import type { MetastabilitySpec } from "./types";
import { clamp01 } from "../utils";

export interface MetastabilityState {
  /** True from startTime through end of scene; false before startTime */
  active: boolean;
  /** Current rendering phase */
  phase: "indeterminate" | "resolving" | "settled";
  /** 0-1 progress through indeterminate+resolving intervals (clamped) */
  progress: number;
  /** Current "voltage" level (0-1, where 0.5 = mid-rail) */
  voltage: number;
  /** Width of indeterminate band (0-1, shrinks over time) */
  bandWidth: number;
  /** Current ringing oscillation amplitude (decays) */
  ringAmplitude: number;
  /** Which rail to resolve toward (from spec) */
  resolvedValue: 0 | 1;
  /** 0-1 through overshoot decay (0 = no overshoot, >0 = decaying) */
  overshootProgress: number;
}

/**
 * Compute metastability animation state at a given frame.
 * Models setup/hold violation → indeterminate region → resolution with damped ringing.
 * Ringing is a pedagogical abstraction, not literal electrical behavior.
 */
export function metastabilitySignal(
  spec: MetastabilitySpec,
  frame: number,
  fps: number,
): MetastabilityState {
  const minDur = 2 / fps;
  if (spec.duration < minDur) {
    throw new Error(
      `metastabilitySignal: duration (${spec.duration}) must be >= 2/fps (${minDur})`,
    );
  }

  const startFrame = spec.startTime * fps;
  const durFrames = spec.duration * fps;
  const localFrame = frame - startFrame;

  // Before startTime: inactive
  if (localFrame < 0) {
    return {
      active: false,
      phase: "settled",
      progress: 0,
      voltage: spec.resolvedValue,
      bandWidth: 0,
      ringAmplitude: 0,
      resolvedValue: spec.resolvedValue,
      overshootProgress: 0,
    };
  }

  const raw = localFrame / durFrames;
  const progress = clamp01(raw);

  // Phase boundaries within duration
  const indeterminateEnd = 0.80;
  const resolvingEnd = 0.95;

  // Phase determination
  let phase: "indeterminate" | "resolving" | "settled";
  if (progress < indeterminateEnd) {
    phase = "indeterminate";
  } else if (progress < resolvingEnd) {
    phase = "resolving";
  } else {
    phase = "settled";
  }

  // Band width: full swing during indeterminate, shrinks during resolving
  const bandWidth =
    phase === "indeterminate"
      ? 1.0
      : phase === "resolving"
        ? 1.0 - (progress - indeterminateEnd) / (resolvingEnd - indeterminateEnd)
        : 0;

  // Ringing amplitude: exponential decay over full duration
  const ringAmplitude = Math.exp((-3 * progress) / 1.0); // e^(-3*progress)

  // Voltage: mid-rail during indeterminate, converges to resolvedValue during resolving
  const midRail = 0.5;
  const settleFactor =
    phase === "indeterminate"
      ? 0 // stay at mid-rail
      : phase === "resolving"
        ? (progress - indeterminateEnd) / (resolvingEnd - indeterminateEnd) // linear approach
        : 1.0; // settled

  let voltage: number;
  if (spec.settleBehavior === "snap") {
    // Direct linear ramp from mid-rail to resolved rail during resolving
    voltage = midRail + (spec.resolvedValue - midRail) * settleFactor;
  } else {
    // Ringing: damped sinusoid only during resolving phase
    // During indeterminate, voltage stays at mid-rail (ringing is visual-only)
    const ringFreq = spec.ringCount ?? 3;
    const ringPhase = progress * ringFreq * Math.PI * 2;
    const ringOffset = Math.sin(ringPhase) * ringAmplitude * 0.5;
    if (phase === "indeterminate") {
      voltage = midRail;
    } else {
      const settleOffset = (spec.resolvedValue - midRail) * settleFactor;
      voltage = midRail + settleOffset + ringOffset * (1 - settleFactor);
    }
  }

  // Overshoot: starts after resolving completes, decays over overshoot interval
  // Quadratic decay (spec: quadratic for visual smoothness)
  let overshootProgress = 0;
  if (progress >= resolvingEnd) {
    const overshootRaw = (progress - resolvingEnd) / (1 - resolvingEnd);
    overshootProgress = clamp01(1 - overshootRaw * overshootRaw); // quadratic decay
  }

  return {
    active: true,
    phase,
    progress,
    voltage,
    bandWidth,
    ringAmplitude,
    resolvedValue: spec.resolvedValue,
    overshootProgress,
  };
}

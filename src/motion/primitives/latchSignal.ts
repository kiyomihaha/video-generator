import type { LatchSpec, TimelineSignal, TimelineTransition } from "./types";
import { clamp01, easeOutCubic } from "../utils";

export interface LatchState {
  /** Whether enable is currently active (transparent window open) */
  enableActive: boolean;
  /** Whether data is currently being captured */
  capturing: boolean;
  /** Computed output value at current time (0 or 1) */
  outputValue: 0 | 1;
  /** 0-1 progress of the current transparent window */
  windowProgress: number;
  /** 0-1 progress of hold-highlight fade (visual only) */
  holdFadeProgress: number;
  /** Intensity for the transparent-region glow (0-1) */
  glowIntensity: number;
  /** Intensity for the output latch indicator (0-1) */
  latchIntensity: number;
  /** Snap-lock flash intensity (0-1), eases out from latch close */
  snapLockIntensity: number;
}

/** Resolve signal value at time t from initial value + transitions */
function signalValueAt(
  initialValue: 0 | 1,
  transitions: { at: number; to: 0 | 1 }[],
  t: number,
): 0 | 1 {
  let val = initialValue;
  for (const tr of transitions) {
    if (tr.at > t + 0.0001) break;
    val = tr.to as 0 | 1;
  }
  return val;
}

/** Find the most recent transition at or before time t */
function lastTransitionBefore(
  transitions: { at: number; to: 0 | 1 }[],
  t: number,
): { at: number; to: 0 | 1 } | null {
  let found: { at: number; to: 0 | 1 } | null = null;
  for (const tr of transitions) {
    if (tr.at > t + 0.0001) break;
    found = tr;
  }
  return found;
}

export function latchSignal(
  spec: LatchSpec,
  enableSignal: TimelineSignal,
  dataSignal: TimelineSignal,
  frame: number,
  fps: number,
): LatchState {
  const t = frame / fps;
  const isTransparentHigh = spec.latchMode === "transparent_high";
  const transparentValue = isTransparentHigh ? 1 : 0;
  const propDelay = (spec.propagationDelay ?? 0) / 1000; // ms → s
  const holdHighlightMs = spec.visual?.holdHighlightDuration ?? 600;
  const holdHighlightS = holdHighlightMs / 1000;

  // Resolve current enable state using signal's initialValue
  const enableActive =
    signalValueAt(enableSignal.initialValue, enableSignal.transitions, t) ===
    transparentValue;

  // Find current/last transparent window boundaries
  let windowStart = 0;
  let windowEnd = Infinity;
  let lastCloseTime = -Infinity;

  // Walk enable transitions to find window boundaries
  const initialEnableActive =
    enableSignal.initialValue === transparentValue;
  let inWindow = initialEnableActive;
  if (inWindow) windowStart = 0;

  for (let i = 0; i < enableSignal.transitions.length; i++) {
    const tr = enableSignal.transitions[i];
    if (tr.at > t + 0.0001) break;
    const wasActive = inWindow;
    inWindow = tr.to === transparentValue;
    if (inWindow && !wasActive) {
      windowStart = tr.at;
    } else if (!inWindow && wasActive) {
      windowEnd = tr.at;
      lastCloseTime = tr.at;
    }
  }
  // If currently in a window that hasn't closed yet
  if (inWindow) windowEnd = Infinity;

  const windowDuration =
    windowEnd === Infinity ? Math.max(0.001, t - windowStart + 0.001) : Math.max(0.001, windowEnd - windowStart);
  const windowProgress = enableActive
    ? clamp01((t - windowStart) / windowDuration)
    : 0;

  // Compute Q: during transparent window, Q follows D (with propagation delay)
  // After window closes, Q holds the value D had at (closeTime - propDelay)
  let outputValue: 0 | 1;
  if (enableActive && windowEnd === Infinity) {
    // Currently transparent — Q follows D with propagation delay
    outputValue = signalValueAt(
      dataSignal.initialValue,
      dataSignal.transitions,
      t - propDelay,
    );
  } else if (!enableActive && lastCloseTime > -Infinity) {
    // Latched — Q holds D value at (close - propDelay) to avoid discontinuity
    outputValue = signalValueAt(
      dataSignal.initialValue,
      dataSignal.transitions,
      lastCloseTime - propDelay,
    );
  } else {
    // Before first window — use initialOutput or data's initial value
    outputValue = spec.initialOutput ?? dataSignal.initialValue;
  }

  // Hold-highlight fade (visual only): decays after latch closes
  const timeSinceClose = lastCloseTime > -Infinity ? t - lastCloseTime : holdHighlightS + 1;
  const inHoldHighlight = timeSinceClose >= 0 && timeSinceClose < holdHighlightS;
  const holdFadeProgress = inHoldHighlight
    ? easeOutCubic(clamp01(timeSinceClose / holdHighlightS))
    : timeSinceClose >= holdHighlightS ? 1 : 0;

  // Snap-lock flash: detect EN falling edge, easeOutCubic fade over ~15 frames
  const snapWindow = 15 / fps; // ~500ms at 30fps — enough for human perception
  let snapLockIntensity = 0;
  if (lastCloseTime > -Infinity) {
    const delta = t - lastCloseTime;
    if (delta >= 0 && delta < snapWindow) {
      snapLockIntensity = 1 - easeOutCubic(delta / snapWindow); // peak → fade
    }
  }

  // Visual intensities
  const glowIntensity = enableActive
    ? 0.05 + windowProgress * 0.05 // <10% opacity per Gemini
    : 0;
  const latchIntensity = enableActive
    ? 0.8
    : inHoldHighlight
      ? 0.8 * (1 - holdFadeProgress) + 0.15 * holdFadeProgress // fade from 0.8 to 0.15
      : 0.15;

  return {
    enableActive,
    capturing: enableActive,
    outputValue,
    windowProgress,
    holdFadeProgress,
    glowIntensity,
    latchIntensity,
    snapLockIntensity,
  };
}

/**
 * Derive the full Q output signal from latch semantics.
 * Shared between latchSignal (per-frame) and DigitalTimingScene (waveform rendering).
 */
export function deriveLatchOutputSignal(
  spec: LatchSpec,
  enableSignal: TimelineSignal,
  dataSignal: TimelineSignal,
): TimelineSignal {
  const isHigh = spec.latchMode === "transparent_high";
  const transparentVal = isHigh ? 1 : 0;
  const propDelay = (spec.propagationDelay ?? 0) / 1000;
  const initialQ = spec.initialOutput ?? dataSignal.initialValue;

  const signalValAt = (initial: 0 | 1, trs: { at: number; to: 0 | 1 }[], t: number): 0 | 1 => {
    let v = initial;
    for (const tr of trs) { if (tr.at > t + 0.0001) break; v = tr.to as 0 | 1; }
    return v;
  };

  // Collect all times where Q might change: enable edges, D edges, D edges + propDelay
  const allTimes = new Set<number>();
  allTimes.add(0);
  for (const tr of enableSignal.transitions) allTimes.add(tr.at);
  for (const tr of dataSignal.transitions) {
    allTimes.add(tr.at);
    if (propDelay > 0) allTimes.add(tr.at + propDelay);
  }
  const sorted = [...allTimes].sort((a, b) => a - b);

  const transitions: TimelineTransition[] = [];
  let prevQ: 0 | 1 = initialQ;
  let lastClose = -Infinity;
  let inWin = enableSignal.initialValue === transparentVal;

  for (const t of sorted) {
    // Update enable window state up to time t
    for (const tr of enableSignal.transitions) {
      if (tr.at > t + 0.0001) break;
      const wasIn = inWin;
      inWin = tr.to === transparentVal;
      if (!inWin && wasIn) lastClose = tr.at;
    }

    let q: 0 | 1;
    if (inWin) {
      q = signalValAt(dataSignal.initialValue, dataSignal.transitions, t - propDelay);
    } else if (lastClose > -Infinity) {
      q = signalValAt(dataSignal.initialValue, dataSignal.transitions, lastClose - propDelay);
    } else {
      q = initialQ;
    }

    if (q !== prevQ) {
      transitions.push({ at: t, to: q });
      prevQ = q;
    }
  }

  return {
    ...enableSignal, // inherit componentId structure
    name: spec.outputPin.portName ?? "Q",
    pinId: spec.outputPin.pinId,
    initialValue: initialQ,
    transitions,
  };
}

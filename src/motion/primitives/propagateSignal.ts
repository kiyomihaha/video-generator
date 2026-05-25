import type { PropagateSignalSpec } from "./types";

export interface AnimationState {
  progress: number;
  sourceGlow: number;
  targetPulse: number;
  arrowOffset: number;
  arrowLength: number;
  targetReached: boolean;
}

const DEFAULT_ARROW_LEN = 260;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const easeOutCubic = (value: number) => {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
};

const pulseEnvelope = (elapsedFrames: number, fps: number) => {
  if (elapsedFrames < 0) return 0;
  const seconds = elapsedFrames / fps;
  return Math.exp(-seconds * 5.5) * Math.sin(seconds * Math.PI * 6);
};

export function propagateSignal(
  spec: PropagateSignalSpec,
  frame: number,
  fps: number,
): AnimationState {
  const scale = spec.timeScale || 1;
  const startFrame = spec.delay * fps * scale;
  const durationFrames = Math.max(1, spec.duration * fps * scale);
  const rawProgress = (frame - startFrame) / durationFrames;
  const progress = clamp01(rawProgress);
  const easedProgress = easeOutCubic(progress);

  const sourceGlow =
    rawProgress < 0
      ? 0
      : rawProgress < 0.3
        ? clamp01(rawProgress / 0.3)
        : clamp01(1 - (rawProgress - 0.3) / 0.75);

  const targetPulse = Math.max(
    0,
    pulseEnvelope(frame - (startFrame + durationFrames), fps),
  );

  return {
    progress: easedProgress,
    sourceGlow,
    targetPulse,
    arrowOffset: (1 - easedProgress) * DEFAULT_ARROW_LEN,
    arrowLength: DEFAULT_ARROW_LEN,
    targetReached: progress >= 1,
  };
}

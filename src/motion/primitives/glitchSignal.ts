import type { GlitchSpec } from "./types";

export interface GlitchState {
  /** Whether the glitch is currently active (within its time window) */
  active: boolean;
  /** 0-1 progress through the glitch duration */
  progress: number;
  /** Current glitch amplitude (0-1) */
  amplitude: number;
  /** Jagged offset for SVG path perturbation (scales with amplitude) */
  jitter: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Deterministic pseudo-random based on glitch id + local frame (no Math.random) */
function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Compute glitch animation state at a given frame.
 * Digital glitch = sharp rectangular pulse with slight overshoot on edges.
 * Not analog decay — digital glitches are crisp transients.
 */
export function glitchSignal(
  spec: GlitchSpec,
  frame: number,
  fps: number,
): GlitchState {
  const startFrame = spec.startTime * fps;
  const durFrames = Math.max(1, spec.duration * fps);
  const localFrame = frame - startFrame;
  const raw = localFrame / durFrames;

  if (raw < 0 || raw > 1) {
    return { active: false, progress: 0, amplitude: 0, jitter: 0 };
  }

  const progress = clamp01(raw);

  // Sharp rectangular pulse: 15% rise, 70% flat, 15% fall
  // With slight overshoot at edges for realism
  const riseEnd = 0.15;
  const fallStart = 0.85;
  let envelope: number;

  if (progress < riseEnd) {
    // Sharp rise with slight overshoot (easeInQuad → peaks at ~1.05)
    const t = progress / riseEnd;
    envelope = t < 0.8
      ? t * 1.3 // fast rise, overshoots to 1.3
      : 1.0 + 0.05 * Math.sin(t * Math.PI); // slight overshoot, settle to 1.0
  } else if (progress < fallStart) {
    // Flat top at full amplitude
    envelope = 1.0;
  } else {
    // Sharp fall
    const t = (progress - fallStart) / (1 - fallStart);
    envelope = 1 - t * t; // quadratic fall — fast then decelerates
  }

  const amplitude = envelope * spec.amplitude;

  // Jagged jitter: high-frequency perturbation that scales with envelope
  let jitter = 0;
  if (spec.jagged !== false) {
    // Use local glitch frame for stability across renders
    const seed = hashString(spec.id ?? "g") + Math.floor(localFrame);
    const noise1 = seededNoise(seed);
    const noise2 = seededNoise(seed * 1.7 + 0.3);
    jitter = (noise1 - noise2) * 0.25 * envelope;
  }

  return {
    active: true,
    progress,
    amplitude, // allow > 1.0 for overshoot
    jitter,
  };
}

/** Simple string hash for deterministic seeding */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

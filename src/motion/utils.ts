// Shared animation utilities

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 3);
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 4);
}

// TextEmphasis — Schedule Computation
// Pure function: TextEmphasisSpec → TextEmphasisSchedule
// Called once per composition mount, cached with useMemo.

import type {
  TextEmphasisSpec,
  TextEmphasisSchedule,
  ResolvedTextPhrase,
  ResolvedEntrance,
  ResolvedExit,
  ResolvedEmphasisEvent,
  TextAnchor,
} from "./types";

const FONT_MAP = { text: "Inter, sans-serif", code: "JetBrains Mono, SF Mono, monospace" } as const;
const DEFAULT_FONT_SIZE = 40;
const DEFAULT_LINE_HEIGHT = 1.6;

function entranceDefaults(type: string, fps: number): ResolvedEntrance {
  switch (type) {
    case "none": return { type: "none", durationFrames: 0 };
    case "fade-in": return { type: "fade-in", durationFrames: Math.round(0.35 * fps) };
    case "scale-up": return { type: "scale-up", durationFrames: Math.round(0.5 * fps) };
    case "slide-up": return { type: "slide-up", durationFrames: Math.round(0.4 * fps) };
    case "wipe-left": return { type: "wipe-left", durationFrames: Math.round(0.4 * fps) };
    case "typewriter": return { type: "typewriter", durationFrames: Math.round(0.5 * fps) };
    default: return { type: "fade-in", durationFrames: Math.round(0.35 * fps) };
  }
}

function exitDefaults(type: string, fps: number): ResolvedExit {
  switch (type) {
    case "none": return { type: "none", durationFrames: 0 };
    case "fade-out": return { type: "fade-out", durationFrames: Math.round(0.3 * fps) };
    default: return { type: "fade-out", durationFrames: Math.round(0.3 * fps) };
  }
}

export function computeTESchedule(spec: TextEmphasisSpec, fps: number): TextEmphasisSchedule {
  const width = spec.width ?? 1280;
  const height = spec.height ?? 720;

  const beatFrames = spec.beats.map(b => Math.round(b * fps));

  const resolveEmphasis = (e: { beat: number; type: "color-shift" | "glow" | "scale-pulse"; durationBeats?: number; color?: string; intensity?: number }, beats: number[], fps: number): ResolvedEmphasisEvent => {
    return {
      frame: beatFrames[e.beat],
      type: e.type,
      durationFrames: Math.max(1, Math.round((e.durationBeats ?? 1) * (beats[Math.min(e.beat + 1, beats.length - 1)] - beats[e.beat]) * fps)),
      color: e.color ?? "#38bdf8",
      intensity: e.intensity ?? 1,
    };
  };

  const phrases: ResolvedTextPhrase[] = spec.phrases.map((p) => {
    const entrance = entranceDefaults(p.entrance ?? "fade-in", fps);
    const exit = exitDefaults(p.exit ?? (p.endBeat !== undefined ? "fade-out" : "none"), fps);
    const startFrame = beatFrames[p.startBeat];
    const endFrame = p.endBeat !== undefined ? beatFrames[p.endBeat] : startFrame + entrance.durationFrames + 60;

    return {
      id: p.id,
      text: p.text,
      lines: p.text.split("\n").filter(l => l.length > 0),
      startFrame,
      endFrame,
      entrance,
      emphasis: (p.emphasis ?? []).map(e => resolveEmphasis(e, spec.beats, fps)),
      exit,
      color: p.color ?? "#e2e8f0",
      fontSize: p.fontSize ?? DEFAULT_FONT_SIZE,
      fontWeight: p.fontWeight ?? 700,
      fontFamily: FONT_MAP[p.fontFamily ?? "text"],
      x: p.x ?? 0.5,
      y: p.y ?? 0.5,
      anchor: p.anchor ?? "center",
      lineHeight: p.lineHeight ?? DEFAULT_LINE_HEIGHT,
    };
  });

  const maxEndFrame = phrases.reduce((max, p) => Math.max(max, p.endFrame + p.exit.durationFrames), 0);
  const lastBeatFrame = beatFrames[beatFrames.length - 1];
  const totalFrames = Math.max(maxEndFrame, lastBeatFrame + fps);

  return { phrases, beatFrames, totalFrames, width, height };
}

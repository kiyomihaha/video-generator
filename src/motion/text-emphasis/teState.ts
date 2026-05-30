// TextEmphasis — Per-frame State Computation
// Pure function: (schedule, frame, fps) → TextEmphasisState

import type { TextEmphasisSchedule, TextEmphasisState, TextPhraseRenderState, ResolvedEmphasisEvent } from "./types";
import { clamp01, easeOutCubic } from "../utils";
import { spring } from "remotion";

// Simple hex color lerp
function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => {
    const c = h.replace("#", "");
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  try {
    const [ar, ag, ab] = parse(a);
    const [br, bg, bb] = parse(b);
    const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);
    return `#${lerp(ar, br).toString(16).padStart(2, "0")}${lerp(ag, bg).toString(16).padStart(2, "0")}${lerp(ab, bb).toString(16).padStart(2, "0")}`;
  } catch {
    return b;
  }
}

function computeEmphasisState(
  f: number,
  emphasisEvents: ResolvedEmphasisEvent[],
  baseColor: string,
  fps: number,
): { colorShift: string | null; glowIntensity: number; scalePulse: number } {
  let colorShift: string | null = null;
  let glowIntensity = 0;
  let scalePulse = 0;

  for (const evt of emphasisEvents) {
    const elapsed = f - evt.frame;
    if (elapsed < 0 || elapsed > evt.durationFrames) continue;
    const progress = clamp01(elapsed / evt.durationFrames);

    switch (evt.type) {
      case "color-shift":
        colorShift = lerpHex(evt.color, baseColor, easeOutCubic(progress));
        break;
      case "glow":
        glowIntensity = Math.max(glowIntensity, Math.sin(progress * Math.PI) * evt.intensity);
        break;
      case "scale-pulse": {
        const pulse = spring({ frame: elapsed, fps, config: { damping: 10, stiffness: 150 } });
        scalePulse = Math.max(scalePulse, 1 + (pulse - 1) * 0.15);
        break;
      }
    }
  }

  return { colorShift, glowIntensity, scalePulse: Math.max(1, scalePulse) };
}

export function teState(
  schedule: TextEmphasisSchedule,
  frame: number,
  fps: number,
): TextEmphasisState {
  const state: TextEmphasisState = {
    phrases: schedule.phrases.map((p) => {
      const sf = p.startFrame;
      const ed = p.entrance.durationFrames;
      const exitStart = p.endFrame;
      const xd = p.exit.durationFrames;
      const relFrame = frame - sf;
      const exitRel = frame - exitStart;

      // Phase detection
      const isBefore = frame < sf;
      const isEntering = !isBefore && frame < sf + ed;
      const isExiting = !isBefore && !isEntering && exitRel >= 0 && exitRel < xd;
      const isAfter = !isBefore && exitRel >= xd;

      const defaultState: TextPhraseRenderState = {
        opacity: 1, scale: 1, color: p.color, clipProgress: 1,
        charCount: p.text.length, glowOpacity: 0, translateY: 0, visible: true,
      };

      if (isBefore || isAfter) {
        return { ...defaultState, opacity: 0, visible: false };
      }

      const state: TextPhraseRenderState = { ...defaultState };

      // ── Entering phase ──
      if (isEntering) {
        const progress = clamp01(relFrame / ed);
        switch (p.entrance.type) {
          case "none":
            break;
          case "fade-in":
            state.opacity = easeOutCubic(progress);
            break;
          case "scale-up":
            state.scale = spring({ frame: relFrame, fps, config: { damping: 12, stiffness: 80 } });
            state.opacity = clamp01(relFrame / Math.max(ed * 0.3, 1));
            break;
          case "slide-up":
            state.opacity = easeOutCubic(progress);
            state.translateY = (1 - easeOutCubic(progress)) * 20;
            break;
          case "wipe-left":
            state.opacity = 1;
            state.clipProgress = easeOutCubic(progress);
            break;
          case "typewriter": {
            const progress = clamp01(relFrame / ed);
            state.charCount = Math.min(Math.floor(progress * p.text.length), p.text.length);
            state.opacity = 1;
            break;
          }
        }
      }

      // ── Emphasis ──
      if (!isExiting) {
        const emph = computeEmphasisState(frame, p.emphasis, p.color, fps);
        if (emph.colorShift) state.color = emph.colorShift;
        state.glowOpacity = emph.glowIntensity;
        state.scale *= emph.scalePulse;
      }

      // ── Exiting phase ──
      if (isExiting) {
        const progress = clamp01(exitRel / xd);
        switch (p.exit.type) {
          case "none":
            state.visible = false;
            break;
          case "fade-out":
            state.opacity = 1 - easeOutCubic(progress);
            break;
        }
      }

      return state;
    }),
    currentFrame: frame,
  };

  return state;
}

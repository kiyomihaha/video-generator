// VideoShell — Type definitions
// Shell wraps scenes with title card, subtitles, aspect ratio handling

import type { TextEmphasisSpec } from "../motion/text-emphasis/types";

export type TargetAspect = "16:9" | "9:16";

// aspectPolicy reserved for future use — only "fit" implemented currently
export type AspectPolicy = "fit";

export interface SubtitleEntry {
  startFrame: number;
  endFrame: number;
  text: string;
  y?: number;
  fontSize?: number;
  fadeOutEndFrame?: number;  // Optional: frame at which subtitle fully fades out (for smooth fade before endFrame)
}

export interface VideoShellConfig {
  targetAspect?: TargetAspect;
  aspectPolicy?: AspectPolicy;
  title?: TextEmphasisSpec;
  titleDurationSec?: number;
  subtitles?: SubtitleEntry[];
  outro?: TextEmphasisSpec;
  outroDurationSec?: number;
}

// Master canvas dimensions — the fixed design space all scenes target
export const MASTER_WIDTH = 1280;
export const MASTER_HEIGHT = 720;

// 9:16 layout constants (Gemini's 3-tier blueprint)
export const PORTRAIT_WIDTH = 720;
export const PORTRAIT_HEIGHT = 1280;
export const PORTRAIT_TOP_RAIL = 437;    // title + progress + legend
export const PORTRAIT_BOTTOM_RAIL = 438; // subtitles
export const PORTRAIT_CENTER = PORTRAIT_HEIGHT - PORTRAIT_TOP_RAIL - PORTRAIT_BOTTOM_RAIL; // 405

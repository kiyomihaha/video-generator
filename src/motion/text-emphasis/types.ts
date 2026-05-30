// TextEmphasis — Type definitions
// Three layers: Spec (JSON input) → Schedule (resolved) → State (per-frame)

// ─── Spec 层 ───

export type EntranceType = "none" | "fade-in" | "scale-up" | "slide-up" | "wipe-left" | "typewriter";
export type EmphasisType = "color-shift" | "glow" | "scale-pulse";
export type ExitType = "none" | "fade-out";
export type TextAnchor = "left" | "center" | "right";
export type FontCategory = "text" | "code";

export interface EmphasisEvent {
  beat: number;
  type: EmphasisType;
  durationBeats?: number;
  color?: string;
  intensity?: number;
}

export interface TextPhraseSpec {
  id: string;
  text: string;
  startBeat: number;
  endBeat?: number;
  entrance?: EntranceType;
  emphasis?: EmphasisEvent[];
  exit?: ExitType;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: FontCategory;
  x?: number;
  y?: number;
  anchor?: TextAnchor;
  lineHeight?: number;
}

export interface TextEmphasisSpec {
  phrases: TextPhraseSpec[];
  beats: number[];
  width?: number;
  height?: number;
}

// ─── Schedule 层 ───

export interface ResolvedEntrance {
  type: EntranceType;
  durationFrames: number;
}

export interface ResolvedExit {
  type: ExitType;
  durationFrames: number;
}

export interface ResolvedEmphasisEvent {
  frame: number;
  type: EmphasisType;
  durationFrames: number;
  color: string;
  intensity: number;
}

export interface ResolvedTextPhrase {
  id: string;
  text: string;
  lines: string[];
  startFrame: number;
  endFrame: number;
  entrance: ResolvedEntrance;
  emphasis: ResolvedEmphasisEvent[];
  exit: ResolvedExit;
  color: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  x: number;
  y: number;
  anchor: TextAnchor;
  lineHeight: number;
}

export interface TextEmphasisSchedule {
  phrases: ResolvedTextPhrase[];
  beatFrames: number[];
  totalFrames: number;
  width: number;
  height: number;
}

// ─── State 层 ───

export interface TextPhraseRenderState {
  opacity: number;
  scale: number;
  color: string;
  clipProgress: number;
  charCount: number;
  glowOpacity: number;
  translateY: number;
  visible: boolean;
}

export interface TextEmphasisState {
  phrases: TextPhraseRenderState[];
  currentFrame: number;
}

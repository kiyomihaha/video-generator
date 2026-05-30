// CircuitWaveformLinker — Type Definitions

// ─── Visual states ───

export type VisualBaseState = "IDLE" | "ACTIVE" | "HOLD" | "ERROR" | "METASTABLE";
export type VisualModifier = "flash" | "shake" | "glitch";

export const BASE_STATE_COLORS: Record<VisualBaseState, string> = {
  IDLE: "#1e293b",
  ACTIVE: "#38bdf8",
  HOLD: "#10b981",
  ERROR: "#ef4444",
  METASTABLE: "#c084fc",
};

// ─── Per-zone token (computed per frame) ───

export interface ZoneToken {
  zoneId: string;
  baseState: VisualBaseState;
  activeModifiers: VisualModifier[];
  intensity: number;   // 0-1 (IDLE=0.2, ACTIVE/HOLD/ERROR=1, with decay)
  residual: number;    // 0-1: fading memory of previous non-IDLE state for smooth transition
  prevState: VisualBaseState; // for rendering color blend
}

// ─── Pulse along a link (computed per frame) ───

export interface PulseEvent {
  linkId: string;
  progress: number;       // 0-1 along path
  durationFrames: number;
  delayFrames: number;    // frames before start (for cascading)
}

// ─── Authoring: zone rectangle definitions ───

export interface ZoneDef {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  labelAnchor?: "left" | "center" | "right";
}

// ─── Authoring: link (path between zones) ───

export interface LinkDef {
  id: string;
  fromZoneId: string;
  toZoneId: string;
  path: string;      // SVG path d attribute
  label?: string;
}

// ─── Authoring: what happens per cycle ───

export interface ZoneStateSpec {
  zoneId: string;
  state: VisualBaseState;
  modifiers?: VisualModifier[];
}

export interface PulseSpec {
  linkId: string;
}

export interface CycleAction {
  cycle: number;
  zoneStates: ZoneStateSpec[];
  pulses: PulseSpec[];
}

// ─── Authoring spec (JSON input) ───

export interface CircuitWaveformLinkerAuthoring {
  zones: ZoneDef[];
  links: LinkDef[];
  cycles: CycleAction[];
  framesPerCycle: number;
  busGroups?: string[][];       // link IDs sharing bus — single pulse per group
  cascadeOrder?: string[][];    // link groups that execute serially
  width?: number;
  height?: number;
  title?: string;
}

// ─── Per-frame output ───

export interface LinkedFrameState {
  tokens: ZoneToken[];
  pulses: PulseEvent[];
  activePathIds: string[];
  focalZoneId: string | null;
  currentCycle: number;
}

// ─── Spec 层 ───

export type SignalEncoding = "binary" | "bus";
export type TDSignalState = "normal" | "x" | "z" | "invalid";
export type TDEdgeType = "rising" | "falling" | "none";
export type TDEventType = "assert" | "deassert" | "handshake" | "violation" | "note";
export type TDPosition = "top" | "bottom";

export interface TimingDiagramSpec {
  id?: string;
  title?: string;
  clockPeriod: number;
  totalCycles: number;
  visibleCycles?: [number, number];
  signals: TDSignal[];
  groups?: TDSignalGroup[];
  events?: TDEvent[];
  setupHoldWindows?: TDSetupHoldWindow[];
  annotations?: TDAnnotation[];
}

export interface TDSignalGroup {
  name: string;
  signalIds: string[];
}

export interface TDSignal {
  id: string;
  name: string;
  label?: string;
  encoding: SignalEncoding;
  busWidth?: number;
  color?: string;
  values: TDSignalValue[];
}

export interface TDSignalValue {
  cycle: number;
  value: number | string;
  edge?: TDEdgeType;
  state?: TDSignalState;
  displayValue?: string;
}

export interface TDEvent {
  id: string;
  cycle: number;
  signalId: string;
  type: TDEventType;
  edge?: TDEdgeType;
  label: string;
  color?: string;
}

export interface TDSetupHoldWindow {
  signalId: string;
  referenceCycle: number;
  setupStart: number;
  holdEnd: number;
  color?: string;
  label?: string;
}

export interface TDAnnotation {
  cycle: number;
  text: string;
  position: TDPosition;
  color?: string;
  offsetX?: number;
  offsetY?: number;
}

// ─── Schedule 层 ───

export interface TimingDiagramSchedule {
  tracks: TDTrackSchedule[];
  totalCycles: number;
  clockPeriod: number;
  visibleCycles: [number, number];
  events: ResolvedTDEvent[];
  setupHoldWindows: ResolvedTDSetupHoldWindow[];
  annotations: ResolvedTDAnnotation[];
}

export interface TDTrackSchedule {
  id: string;
  name: string;
  label?: string;
  encoding: SignalEncoding;
  busWidth?: number;
  color: string;
  segments: TDSegment[];
}

export interface TDSegment {
  startCycle: number;
  endCycle: number;
  value: number | string;
  state: TDSignalState;
  displayValue?: string;
}

export interface ResolvedTDEvent {
  id: string;
  cycle: number;
  signalId: string;
  type: TDEventType;
  edge?: TDEdgeType;
  label: string;
  color: string;
  trackIndex: number;
}

export interface ResolvedTDSetupHoldWindow {
  signalId: string;
  referenceCycle: number;
  setupStartCycle: number;
  holdEndCycle: number;
  color: string;
  label: string;
  trackIndex: number;
}

export interface ResolvedTDAnnotation {
  cycle: number;
  text: string;
  position: TDPosition;
  color: string;
  offsetX: number;
  offsetY: number;
}

// ─── Per-frame State ───

export interface TimingDiagramState {
  tracks: TDTrackState[];
  cursorCycle: number;
  cursorProgress: number;
  activeEvents: ActiveTDEvent[];
  activeWindows: ActiveTDWindow[];
  title: string | null;
  titleOpacity: number;
  annotationAnimStates: AnnotationAnimState[];
}

export interface AnnotationAnimState {
  opacity: number;
  yOffset: number;
}

export interface TDTrackState {
  id: string;
  name: string;
  label?: string;
  encoding: SignalEncoding;
  segments: TDSegmentState[];
  opacity: number;
}

export interface TDSegmentState {
  segment: TDSegment;
  opacity: number;
  highlight: number;
}

export interface ActiveTDEvent {
  event: ResolvedTDEvent;
  opacity: number;
  pulse: number;
}

export interface ActiveTDWindow {
  window: ResolvedTDSetupHoldWindow;
  opacity: number;
}

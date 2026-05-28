export interface SignalPin {
  componentId: string;
  pinId: string;
  portName?: string;
}

export type TriggerEdge = "posedge" | "negedge" | "both";
export type EdgePolarity = "active_high" | "active_low";
export type Emphasis = "glow-trace" | "pulse" | "ripple" | "none";

export interface FanoutEdge {
  pinId: string;
  delay: number;
  duration: number;
  label?: string;
}

export interface PropagateSignalSpec {
  signalName: string;
  from: SignalPin;
  to: SignalPin;
  fanoutEdges?: FanoutEdge[];
  timelineId: string;
  groupId?: string;
  triggerEdge: TriggerEdge;
  edgePolarity?: EdgePolarity;
  initialState: string;
  finalState: string;
  delay: number;
  duration: number;
  timeScale: number;
  emphasis: Emphasis;
  stylePreset?: string;
  annotation?: string;
}

export interface TimelineTransition {
  at: number;
  to: 0 | 1;
  label?: string;
}

export interface TimelineSignal {
  name: string;
  componentId: string;
  pinId: string;
  initialValue: 0 | 1;
  transitions: TimelineTransition[];
}

export interface TimingAnnotation {
  at: number;
  text: string;
  position: "top" | "bottom";
}

export type LatchMode = "transparent_high" | "transparent_low";

export interface LatchVisual {
  /** Duration (ms) for the hold-highlight fade after latch closes */
  holdHighlightDuration?: number;
  /** Glow color during transparent window (default: #c084fc lavender) */
  glowColor?: string;
  /** Max glow opacity 0-1 (default: 0.1) */
  glowMaxOpacity?: number;
}

export interface LatchSpec {
  type: "latch";
  id?: string;
  enablePin: SignalPin;
  dataPin: SignalPin;
  outputPin: SignalPin;
  latchMode: LatchMode;
  /** D→Q propagation delay in ms while transparent */
  propagationDelay?: number;
  /** EN open/close effect delay in ms */
  enableDelay?: number;
  /** Initial Q value before any transparent window */
  initialOutput?: 0 | 1;
  /** Setup time constraint (ms) — visual annotation only */
  setupTime?: number;
  /** Hold time constraint (ms) — visual annotation only */
  holdTime?: number;
  /** Visual-only parameters */
  visual?: LatchVisual;
}

export type GlitchType = "positive" | "negative" | "runt" | "overshoot" | "undershoot";

export interface GlitchSpec {
  id?: string;
  signalPin: SignalPin;
  glitchType: GlitchType;
  /** Start time in seconds */
  startTime: number;
  /** Duration in seconds (typically very short: 0.02-0.1s) */
  duration: number;
  /** Amplitude as fraction of full logic swing (0-1). 1.0 = reaches opposite rail */
  amplitude: number;
  /** Human-readable cause description for annotation */
  cause?: string;
  /** Whether to render jagged edges (true) or smooth pulse (false) */
  jagged?: boolean;
  /** Visual color override (default: #ef4444 red) */
  color?: string;
}

export type MetastabilitySettle = "ringing" | "snap";

export interface MetastabilitySpec {
  id?: string;
  signalPin: SignalPin;
  /** When the setup/hold violation occurs (seconds) */
  startTime: number;
  /** Total visible event duration (seconds), minimum 2/fps */
  duration: number;
  /** What the signal settles to after resolution */
  resolvedValue: 0 | 1;
  /** Settling behavior — "ringing" = damped oscillation, "snap" = direct jump */
  settleBehavior?: MetastabilitySettle;
  /** Width of setup/hold violation window for annotation (seconds). No default — omit to skip marker. */
  violationWindow?: number;
  /** Post-resolution overshoot fraction (0-1, default: 0.15, deliberately exaggerated) */
  settlingOvershoot?: number;
  /** Number of damped oscillation cycles (default: 3) */
  ringCount?: number;
  /** Visual color override (default: #f97316 orange) */
  color?: string;
}

export interface DigitalTimingSpec {
  title: string;
  fps: number;
  totalDuration: number;
  signals: TimelineSignal[];
  propagations: PropagateSignalSpec[];
  latches?: LatchSpec[];
  glitches?: GlitchSpec[];
  metastabilities?: MetastabilitySpec[];
  annotations?: TimingAnnotation[];
}

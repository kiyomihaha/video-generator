export interface SignalPin {
  componentId: string;
  pinId: string;
  portName?: string;
}

export type TriggerEdge = "posedge" | "negedge" | "both";
export type EdgePolarity = "active_high" | "active_low";
export type Emphasis = "glow-trace" | "pulse" | "ripple" | "none";

export interface PropagateSignalSpec {
  signalName: string;
  from: SignalPin;
  to: SignalPin;
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

export interface DigitalTimingSpec {
  title: string;
  fps: number;
  totalDuration: number;
  signals: TimelineSignal[];
  propagations: PropagateSignalSpec[];
  annotations?: TimingAnnotation[];
}

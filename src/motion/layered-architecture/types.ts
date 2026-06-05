// LayeredArchitecture — Type Definitions
// Spec → Schedule → State pipeline

import type { TIMELINE_EVENT_TYPES } from "./schemas";

// ─── Spec (authoring JSON) ───

export type BuildOrder = "top-down" | "bottom-up";
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export interface LayerDef {
  id: string;
  label: string;
  description?: string;
  color?: string;
  labelAnchor?: "left" | "center";
}

export interface TimelineEvent {
  beat: number;
  type: TimelineEventType;
  layerId?: string;
  layerIds?: string[];
  targetLayerId?: string;
  direction?: "up" | "down";
  label?: string;
  durationBeats?: number;
}

export interface LayeredArchitectureSpec {
  layers: LayerDef[];
  timeline: TimelineEvent[];
  beats: number[];
  buildOrder?: BuildOrder;
  staggerEnter?: boolean;
  layerHeight?: number;
  layerWidth?: number;
  layerGap?: number;
  width?: number;
  height?: number;
}

// ─── Schedule (frame-resolved) ───

export interface ResolvedTimelineEvent {
  type: TimelineEventType;
  layerId?: string;
  layerIds?: string[];
  targetLayerId?: string;
  direction?: "up" | "down";
  label?: string;
  frame: number;
  endFrame: number; // frame when effect ends (0 = persists)
}

export interface LAScheduledLayer {
  id: string;
  label: string;
  description?: string;
  color: string;
  anchor: "left" | "center";
  y: number; // top edge in SVG coords
}

export interface LASchedule {
  layers: LAScheduledLayer[];
  events: ResolvedTimelineEvent[];
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  layerHeight: number;
  layerWidth: number;
  layerGap: number;
}

// ─── State (per frame) ───

export interface LALayerState {
  id: string;
  opacity: number;
  translateY: number;
  brightness: number;  // 1 = full, 0.3 = dim
  borderGlow: number;  // 0-1 glow intensity
  entered: boolean;
  visible: boolean;
}

export interface LADataFlowRender {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  direction: "up" | "down";
}

export interface LACalloutRender {
  layerId: string;
  label: string;
  opacity: number;
  x: number;
  y: number;
}

export interface LAState {
  layers: LALayerState[];
  dataFlows: LADataFlowRender[];
  callouts: LACalloutRender[];
}

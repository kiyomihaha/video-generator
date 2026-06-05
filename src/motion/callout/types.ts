// CalloutOverlay + ConnectorSystem — Type definitions
// Scene-level SVG annotations for technical education videos

export type Quadrant = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type CalloutRouting = "hv" | "vh";       // horizontal-first | vertical-first
export type ConnectorRouting = "hvh" | "vhv";
export type FlowDirection = "forward" | "backward" | "bidirectional" | "none";

// ─── Spec layer (authoring JSON) ───

export interface CalloutDef {
  id: string;
  targetX: number;
  targetY: number;
  label: string;
  sublabel?: string;
  preferredQuadrant?: Quadrant;
  dx?: number;                  // manual offset override
  dy?: number;
  color?: string;
  fontSize?: number;
  boxWidth?: number;            // determined in schedule phase
  boxHeight?: number;
  routing?: CalloutRouting;     // default determined by quadrant
  startFrame: number;
  endFrame?: number;            // undefined = persistent
}

export interface ConnectorDef {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  routing?: ConnectorRouting;
  color?: string;
  strokeWidth?: number;
  animated?: boolean;           // stroke-dashoffset drawing animation
  direction?: FlowDirection;
  dashed?: boolean;             // dashed line for walk/fault paths
  startFrame: number;
  endFrame?: number;
}

// ─── Schedule layer (computed layout) ───

export interface CalloutSchedule {
  callouts: ResolvedCallout[];
  connectors: ResolvedConnector[];
}

export interface ResolvedCallout {
  id: string;
  labelX: number;              // computed label box top-left X
  labelY: number;              // computed label box top-left Y
  elbowX: number;              // elbow turn point
  elbowY: number;
  targetX: number;
  targetY: number;
  label: string;
  sublabel?: string;
  color: string;
  fontSize: number;
  boxWidth: number;
  boxHeight: number;
  quadrant: Quadrant;
  routing: CalloutRouting;
  startFrame: number;
  endFrame?: number;
}

export interface ResolvedConnector {
  id: string;
  path: string;                // SVG path d="..."
  color: string;
  strokeWidth: number;
  animated: boolean;
  direction: FlowDirection;
  dashed: boolean;
  startFrame: number;
  endFrame?: number;
}

// ─── State layer (per-frame animation) ───

export interface CalloutState {
  callouts: CalloutRenderState[];
  connectors: ConnectorRenderState[];
}

export interface CalloutRenderState {
  id: string;
  opacity: number;
  scale: number;
  pathProgress: number;        // 0-1 for stroke-dashoffset drawing
  labelX: number;
  labelY: number;
  targetX: number;
  targetY: number;
  label: string;
  sublabel?: string;
  color: string;
  fontSize: number;
  boxWidth: number;
  boxHeight: number;
  path: string;                // elbow connector SVG path
}

export interface ConnectorRenderState {
  id: string;
  path: string;
  opacity: number;
  strokeDashoffset: number;
  color: string;
  strokeWidth: number;
  direction: FlowDirection;
  dashed: boolean;
  animated: boolean;
}

// ─── Shared layout context (Gemini: unified useAnnotationSystem) ───

export interface AnnotationLayout {
  callouts: ResolvedCallout[];
  connectors: ResolvedConnector[];
}

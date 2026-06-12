// Legend — Type definitions
// Persistent semantic key/legend card for educational diagrams

export type LegendPosition = "top-right" | "bottom-left" | "bottom-right";
export type LegendSymbol = "square" | "circle" | "dash";

// --- Spec (authoring JSON) ---
export interface LegendItemDef {
  id: string;
  label: string;
  color: string;
  symbol?: LegendSymbol;
}

export interface LegendSpec {
  id: string;
  title?: string;
  position: LegendPosition;
  items: LegendItemDef[];
  activeTokens: string[];
  startFrame: number;
  endFrame: number;
}

// --- Schedule (resolved layout, computed once) ---
export interface LegendSchedule {
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  items: ResolvedLegendItem[];
  startFrame: number;
  endFrame: number;
  entranceFrames: number;
  exitFrames: number;
  activeTokenSet: Set<string>;
}

export interface ResolvedLegendItem {
  id: string;
  label: string;
  color: string;
  symbol: LegendSymbol;
  y: number;
}

// --- State (per-frame) ---
export interface LegendState {
  boxOpacity: number;
  items: LegendItemRenderState[];
  visible: boolean;
}

export interface LegendItemRenderState {
  id: string;
  opacity: number;
  activeOpacity: number;
}

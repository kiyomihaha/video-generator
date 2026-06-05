// CalloutOverlay — Schedule computation
// Pure function: CalloutDef[] + ConnectorDef[] → ResolvedCallout[] + ResolvedConnector[]
//
// Quadrant collision: per-target-cluster spatial binning with resolved-quadrant tracking.
// When 4+ callouts target the same area, auto-stack vertically via dy offset.

import type {
  CalloutDef, ConnectorDef, Quadrant, CalloutRouting,
  ResolvedCallout, ResolvedConnector, AnnotationLayout,
} from "./types";
import { wrappedLineCount, MAX_CHARS_PER_LINE } from "./textUtils";

const CANVAS_W = 1280;
const CANVAS_H = 720;
const DEFAULT_BOX_W = 180;
const DEFAULT_BOX_H = 72;
const LABEL_MARGIN = 20;
const VIEWPORT_PAD = 20;
const MOBILE_PAD = 40;
const CLUSTER_RADIUS = 100;
const STACK_GAP = 8;

/** Compute box height needed to fit wrapped text, matching renderer layout */
function estimateBoxHeight(label: string, sublabel: string | undefined, fontSize: number): number {
  const labelLines = wrappedLineCount(label, MAX_CHARS_PER_LINE);
  const subLines = wrappedLineCount(sublabel, MAX_CHARS_PER_LINE);
  const subFontSize = fontSize - 2;
  const labelLineH = fontSize + 4;
  const subLineH = subFontSize + 4;
  const gap = subLines > 0 ? 6 : 0;
  const pad = 12;
  const totalTextH = labelLines * labelLineH + gap + subLines * subLineH;
  return Math.max(DEFAULT_BOX_H, totalTextH + pad * 2);
}

/** Get the label position and elbow path for a callout based on quadrant */
function resolveCalloutQuadrant(
  targetX: number, targetY: number,
  boxW: number, boxH: number,
  quadrant: Quadrant,
): { labelX: number; labelY: number; elbowX: number; elbowY: number; routing: CalloutRouting } {
  switch (quadrant) {
    case "top-left":
      return {
        labelX: targetX - boxW - LABEL_MARGIN,
        labelY: targetY - boxH - LABEL_MARGIN,
        elbowX: targetX - LABEL_MARGIN,
        elbowY: targetY - LABEL_MARGIN,
        routing: "hv",
      };
    case "top-right":
      return {
        labelX: targetX + LABEL_MARGIN,
        labelY: targetY - boxH - LABEL_MARGIN,
        elbowX: targetX + LABEL_MARGIN,
        elbowY: targetY - LABEL_MARGIN,
        routing: "hv",
      };
    case "bottom-left":
      return {
        labelX: targetX - boxW - LABEL_MARGIN,
        labelY: targetY + LABEL_MARGIN,
        elbowX: targetX - LABEL_MARGIN,
        elbowY: targetY + LABEL_MARGIN,
        routing: "hv",
      };
    case "bottom-right":
      return {
        labelX: targetX + LABEL_MARGIN,
        labelY: targetY + LABEL_MARGIN,
        elbowX: targetX + LABEL_MARGIN,
        elbowY: targetY + LABEL_MARGIN,
        routing: "hv",
      };
  }
}

/** Clamp position so the entire box stays within viewport */
function clampToViewport(
  labelX: number, labelY: number,
  boxW: number, boxH: number,
  canvasW: number, canvasH: number,
  pad: number,
): { labelX: number; labelY: number } {
  let lx = labelX;
  let ly = labelY;

  if (lx < pad) lx = pad;
  if (lx + boxW > canvasW - pad) lx = canvasW - boxW - pad;
  if (ly < pad) ly = pad;
  if (ly + boxH > canvasH - pad) ly = canvasH - boxH - pad;

  return { labelX: lx, labelY: ly };
}

/** Build orthogonal SVG path for data-flow connectors */
function buildConnectorPath(
  fromX: number, fromY: number, toX: number, toY: number,
  routing: "hvh" | "vhv",
): string {
  // Guard against negative coordinates
  const fx = Math.max(0, fromX);
  const fy = Math.max(0, fromY);
  const tx = Math.max(0, toX);
  const ty = Math.max(0, toY);

  if (routing === "hvh") {
    const midX = (fx + tx) / 2;
    return `M ${fx} ${fy} L ${midX} ${fy} L ${midX} ${ty} L ${tx} ${ty}`;
  } else {
    const midY = (fy + ty) / 2;
    return `M ${fx} ${fy} L ${fx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
  }
}

/** Determine best routing for connector based on relative positions */
function autoConnectorRouting(fromX: number, fromY: number, toX: number, toY: number): "hvh" | "vhv" {
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  return dx >= dy ? "hvh" : "vhv";
}

/** Cluster targets by proximity (within CLUSTER_RADIUS) */
function clusterTargets(
  defs: CalloutDef[],
): Map<number, number[]> {
  const groups: Map<number, number[]> = new Map();
  let groupId = 0;

  for (let i = 0; i < defs.length; i++) {
    // Find existing cluster within radius
    let found = -1;
    for (const [gid, indices] of groups) {
      for (const idx of indices) {
        const a = defs[idx];
        const b = defs[i];
        const dist = Math.hypot(b.targetX - a.targetX, b.targetY - a.targetY);
        if (dist <= CLUSTER_RADIUS) {
          found = gid;
          break;
        }
      }
      if (found >= 0) break;
    }

    if (found >= 0) {
      groups.get(found)!.push(i);
    } else {
      groups.set(groupId++, [i]);
    }
  }

  return groups;
}

/** Resolve callout and connector layout. Pure function. */
export function computeAnnotationLayout(
  calloutDefs: CalloutDef[],
  connectorDefs: ConnectorDef[],
  canvasW = CANVAS_W,
  canvasH = CANVAS_H,
  aspectRatio?: "16:9" | "9:16",
): AnnotationLayout {
  const pad = aspectRatio === "9:16" ? MOBILE_PAD : VIEWPORT_PAD;

  // Cluster callouts by target proximity for local quadrant collision
  const clusters = clusterTargets(calloutDefs);

  // Track resolved quadrants per callout ID for collision avoidance
  const resolvedQuadrants = new Map<string, Quadrant>();

  const callouts: ResolvedCallout[] = calloutDefs.map((c, idx) => {
    const fontSize = c.fontSize ?? 16;
    const boxW = c.boxWidth ?? DEFAULT_BOX_W;
    const boxH = Math.max(c.boxHeight ?? 0, estimateBoxHeight(c.label, c.sublabel, fontSize), DEFAULT_BOX_H);

    // Compute used quadrants from already-resolved callouts in this cluster
    const clusterId = findClusterFor(clusters, idx);
    const usedQuadrants = new Set<Quadrant>();
    for (const ci of clusters.get(clusterId) ?? []) {
      if (ci >= idx) break;
      const prevId = calloutDefs[ci].id;
      const resolved = resolvedQuadrants.get(prevId);
      if (resolved) usedQuadrants.add(resolved);
    }

    // Resolve quadrant: preferred → default → adjacent on collision
    let quadrant = c.preferredQuadrant ?? defaultQuadrant(c.targetX, c.targetY, canvasW, canvasH);
    let attempts = 0;
    const tried = new Set<Quadrant>();
    tried.add(quadrant);
    while (usedQuadrants.has(quadrant) && attempts < 4) {
      quadrant = adjacentQuadrant(quadrant, 1);
      if (tried.has(quadrant)) break;
      tried.add(quadrant);
      attempts++;
    }
    resolvedQuadrants.set(c.id, quadrant);

    let { labelX, labelY, elbowX, elbowY, routing } = resolveCalloutQuadrant(
      c.targetX, c.targetY, boxW, boxH, quadrant,
    );

    // Apply manual override
    if (c.dx !== undefined) labelX += c.dx;
    if (c.dy !== undefined) labelY += c.dy;

    // Overflow stacking: if cluster has 4+ callouts, stack vertically
    const clusterSize = clusters.get(clusterId)?.length ?? 0;
    if (clusterSize >= 4) {
      const order = clusters.get(clusterId)!.indexOf(idx);
      const stackDir = quadrant.includes("top") ? -1 : 1;
      labelY += order * (boxH + STACK_GAP) * stackDir;
    }

    // Viewport clamping with aspect-aware padding
    const clamped = clampToViewport(labelX, labelY, boxW, boxH, canvasW, canvasH, pad);
    labelX = clamped.labelX;
    labelY = clamped.labelY;

    return {
      id: c.id,
      labelX, labelY, elbowX, elbowY,
      targetX: c.targetX, targetY: c.targetY,
      label: c.label, sublabel: c.sublabel,
      color: c.color ?? "#f8fafc",
      fontSize: c.fontSize ?? 16,
      boxWidth: boxW, boxHeight: boxH,
      quadrant, routing: c.routing ?? routing,
      startFrame: c.startFrame,
      endFrame: c.endFrame,
    };
  });

  const connectors: ResolvedConnector[] = connectorDefs.map((c) => {
    const routing = c.routing ?? autoConnectorRouting(c.fromX, c.fromY, c.toX, c.toY);
    return {
      id: c.id,
      path: buildConnectorPath(c.fromX, c.fromY, c.toX, c.toY, routing),
      color: c.color ?? "#38bdf8",
      strokeWidth: c.strokeWidth ?? 2,
      animated: c.animated ?? true,
      direction: c.direction ?? "forward",
      dashed: c.dashed ?? false,
      startFrame: c.startFrame,
      endFrame: c.endFrame,
    };
  });

  return { callouts, connectors };
}

function defaultQuadrant(x: number, y: number, cw: number, ch: number): Quadrant {
  const cx = cw / 2, cy = ch / 2;
  if (x <= cx && y <= cy) return "bottom-right";
  if (x > cx && y <= cy) return "bottom-left";
  if (x <= cx && y > cy) return "top-right";
  return "top-left";
}

function adjacentQuadrant(q: Quadrant, dir: 1 | -1): Quadrant {
  const order: Quadrant[] = ["top-left", "top-right", "bottom-right", "bottom-left"];
  const idx = order.indexOf(q);
  return order[(idx + dir + 4) % 4];
}

function findClusterFor(clusters: Map<number, number[]>, idx: number): number {
  for (const [gid, indices] of clusters) {
    if (indices.includes(idx)) return gid;
  }
  return 0;
}

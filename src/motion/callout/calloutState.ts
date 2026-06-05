// CalloutOverlay — Per-frame state computation
// Schedule → State: resolves per-frame animation (opacity, scale, strokeDashoffset)
// Gemini: split spring — label card gets snappy entrance, connector path gets smooth non-oscillating
import { spring, interpolate } from "remotion";
import type {
  CalloutSchedule, CalloutState,
  ResolvedCallout, ResolvedConnector,
  CalloutRenderState, ConnectorRenderState,
} from "./types";
import { clamp01 } from "../utils";

/** Compute callout & connector state for a given frame */
export function computeCalloutState(
  layout: CalloutSchedule,
  frame: number,
  fps: number,
): CalloutState {
  const callouts: CalloutRenderState[] = layout.callouts.map((c: ResolvedCallout) => {
    // Frame zero gate: Gemini — prevent spring flash artifacts
    if (frame < c.startFrame) {
      return {
        id: c.id, opacity: 0, scale: 0.96, pathProgress: 0,
        labelX: c.labelX, labelY: c.labelY,
        targetX: c.targetX, targetY: c.targetY,
        label: c.label, sublabel: c.sublabel,
        color: c.color, fontSize: c.fontSize,
        boxWidth: c.boxWidth, boxHeight: c.boxHeight,
        path: buildElbowSvgPath(c, frame),
      };
    }

    // Persistent check: endFrame undefined = persistent
    if (c.endFrame !== undefined && frame >= c.endFrame) {
      return {
        id: c.id, opacity: 0, scale: 0.96, pathProgress: 1,
        labelX: c.labelX, labelY: c.labelY,
        targetX: c.targetX, targetY: c.targetY,
        label: c.label, sublabel: c.sublabel,
        color: c.color, fontSize: c.fontSize,
        boxWidth: c.boxWidth, boxHeight: c.boxHeight,
        path: buildElbowSvgPath(c, frame),
      };
    }

    const elapsed = frame - c.startFrame;

    // Gemini label spring: snappy single-overshoot pop
    const labelSpring = spring({
      frame: elapsed,
      fps,
      config: { damping: 12, stiffness: 80 },
    });

    // Gemini path spring: critically-damped smooth draw (no overshoot)
    const pathSpring = spring({
      frame: elapsed,
      fps,
      config: { damping: 20, stiffness: 100 },
    });

    // Clamp spring values to valid range
    const clampedPathSpring = clamp01(pathSpring);

    // Scale from 0.96 to 1 — Codex suggestion to avoid pop-up sticker feel
    const scale = interpolate(clamp01(labelSpring), [0, 1], [0.96, 1]);
    const opacity = clamp01(labelSpring * 1.5);

    return {
      id: c.id, opacity, scale, pathProgress: clampedPathSpring,
      labelX: c.labelX, labelY: c.labelY,
      targetX: c.targetX, targetY: c.targetY,
      label: c.label, sublabel: c.sublabel,
      color: c.color, fontSize: c.fontSize,
      boxWidth: c.boxWidth, boxHeight: c.boxHeight,
      path: buildElbowSvgPath(c, frame),
    };
  });

  const connectors: ConnectorRenderState[] = layout.connectors.map((c: ResolvedConnector) => {
    if (frame < c.startFrame) {
      return {
        id: c.id, path: c.path, opacity: 0,
        strokeDashoffset: 1000, color: c.color,
        strokeWidth: c.strokeWidth, direction: c.direction,
        dashed: c.dashed, animated: c.animated,
      };
    }

    if (c.endFrame !== undefined && frame >= c.endFrame) {
      return {
        id: c.id, path: c.path, opacity: 0,
        strokeDashoffset: 0, color: c.color,
        strokeWidth: c.strokeWidth, direction: c.direction,
        dashed: c.dashed, animated: c.animated,
      };
    }

    const elapsed = frame - c.startFrame;
    const smoothSpring = spring({
      frame: elapsed,
      fps,
      config: { damping: 20, stiffness: 100 },
    });

    const clampedSpring = clamp01(smoothSpring);

    return {
      id: c.id,
      path: c.path,
      opacity: clamp01(smoothSpring * 1.2),
      strokeDashoffset: c.animated ? 1000 * (1 - clampedSpring) : 0,
      color: c.color,
      strokeWidth: c.strokeWidth,
      direction: c.direction,
      dashed: c.dashed,
      animated: c.animated,
    };
  });

  return { callouts, connectors };
}

function buildElbowSvgPath(c: ResolvedCallout, _frame: number): string {
  const {
    targetX, targetY, elbowX, elbowY,
    labelX, labelY, boxWidth, boxHeight, routing,
  } = c;

  if (routing === "hv") {
    // Horizontal-first: target → horizontal to elbow → vertical to label row → horizontal to label
    const midY = labelY + boxHeight / 2;
    // Attach to the edge facing the target
    const attachX = labelX < targetX ? labelX + boxWidth : labelX;
    return `M ${targetX} ${targetY} L ${elbowX} ${targetY} L ${elbowX} ${midY} L ${attachX} ${midY}`;
  } else {
    // Vertical-first: target → vertical to elbow → horizontal to label column → vertical to label
    const midX = labelX + boxWidth / 2;
    // Attach to the edge facing the target
    const attachY = labelY < targetY ? labelY + boxHeight : labelY;
    return `M ${targetX} ${targetY} L ${targetX} ${elbowY} L ${midX} ${elbowY} L ${midX} ${attachY}`;
  }
}

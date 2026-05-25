import React from "react";
import type { TimelineSignal, TriggerEdge } from "../../motion/primitives/types";

interface Props {
  signal: TimelineSignal;
  timeScale: number;
  canvasWidth: number;
  canvasHeight: number;
  glowIntensity?: number;
  pulseIntensity?: number;
  color?: string;
  triggerEdge?: TriggerEdge;
  eventAt?: number;
}

const EDGE_MARKER_SIZE = 8;

const transitionEdge = (from: 0 | 1, to: 0 | 1) => {
  if (from === to) return undefined;
  return from === 0 && to === 1 ? "rise" : "fall";
};

export const SignalWave: React.FC<Props> = ({
  signal, timeScale, canvasWidth, canvasHeight,
  glowIntensity = 0, pulseIntensity = 0,
  color = "#4ade80", triggerEdge, eventAt,
}) => {
  const scaleX = (time: number) => (time / timeScale) * canvasWidth;
  const yHigh = canvasHeight * 0.25;
  const yLow = canvasHeight * 0.75;
  const centerY = canvasHeight / 2;

  const sorted = [...signal.transitions].sort((a, b) => a.at - b.at);
  const points: Array<{ x: number; y: number; at: number; value: 0 | 1; isTransition?: boolean; edge?: "rise" | "fall" }> = [];

  let currentValue = signal.initialValue;
  points.push({ x: 0, y: currentValue === 1 ? yHigh : yLow, at: 0, value: currentValue });

  for (const t of sorted) {
    const x = scaleX(t.at);
    const edge = transitionEdge(currentValue, t.to);
    points.push({ x, y: currentValue === 1 ? yHigh : yLow, at: t.at, value: currentValue });
    currentValue = t.to;
    points.push({ x, y: currentValue === 1 ? yHigh : yLow, at: t.at, value: currentValue, isTransition: true, edge });
  }

  points.push({ x: canvasWidth, y: currentValue === 1 ? yHigh : yLow, at: timeScale, value: currentValue });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

  const triggerPoints = points.filter(p => {
    if (!triggerEdge || !p.isTransition || !p.edge) return false;
    return triggerEdge === "both" ||
      (triggerEdge === "posedge" && p.edge === "rise") ||
      (triggerEdge === "negedge" && p.edge === "fall");
  });

  const eventPoint = typeof eventAt === "number"
    ? points.find(p => p.isTransition && Math.abs(p.at - eventAt) < 0.001)
    : undefined;

  const glowId = `wave-glow-${signal.componentId}-${signal.pinId}`;

  return (
    <g>
      <defs>
        <filter id={glowId} x="-15%" y="-60%" width="130%" height="220%">
          <feGaussianBlur stdDeviation={2.5 + glowIntensity * 4} result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <text x={-74} y={centerY + 5} fill="#e2e8f0" fontSize={16} fontFamily="monospace" fontWeight={800}>{signal.name}</text>

      <line x1={0} y1={centerY} x2={canvasWidth} y2={centerY} stroke="#1e293b" strokeWidth={1} strokeDasharray="4 8" />

      <text x={-22} y={yHigh + 5} fill="#94a3b8" fontSize={12} fontFamily="monospace">1</text>
      <text x={-22} y={yLow + 5} fill="#94a3b8" fontSize={12} fontFamily="monospace">0</text>

      <path d={pathD} fill="none" stroke={color} strokeWidth={3 + glowIntensity * 2}
        strokeLinejoin="round" strokeLinecap="round"
        filter={glowIntensity > 0.05 ? `url(#${glowId})` : undefined} />

      {triggerPoints.map((p) => (
        <polygon key={`${p.at}-${p.edge}`}
          points={p.edge === "rise"
            ? `${p.x},${yLow + 4} ${p.x - EDGE_MARKER_SIZE},${yLow + 20} ${p.x + EDGE_MARKER_SIZE},${yLow + 20}`
            : `${p.x},${yHigh - 4} ${p.x - EDGE_MARKER_SIZE},${yHigh - 20} ${p.x + EDGE_MARKER_SIZE},${yHigh - 20}`}
          fill={color} opacity={0.72 + glowIntensity * 0.28} />
      ))}

      {eventPoint && pulseIntensity > 0.03 && (
        <circle cx={eventPoint.x} cy={eventPoint.y} r={8 + pulseIntensity * 20}
          fill="none" stroke={color} strokeWidth={2.5} opacity={pulseIntensity} />
      )}
    </g>
  );
};

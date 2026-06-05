// LayeredArchitecture — SVG Scene Renderer

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { LASchedule } from "../motion/layered-architecture/types";
import { computeLAState } from "../motion/layered-architecture/laState";
import { THEME } from "../theme";
import { clamp01 } from "../motion/utils";

interface Props {
  schedule: LASchedule;
}

const S = THEME.canvas;
const GRID_COLOR = THEME.canvas.grid;
const FLOW_COLOR = THEME.digital.arrow;
const FLOW_FADED = THEME.text.dim;
const CALLOUT_COLOR = THEME.text.bright;
const CALLOUT_FONT = 16;
const CALLOUT_BG = "rgba(30, 41, 59, 0.85)";

// Simple data-flow arrow: vertical line with arrowhead
const DataFlowArrow: React.FC<{
  fromX: number; fromY: number; toX: number; toY: number; progress: number;
}> = ({ fromX, fromY, toX, toY, progress }) => {
  const tipY = fromY + (toY - fromY) * progress;
  const head = toY > fromY ? 1 : -1;
  const x = fromX;

  return (
    <g>
      {/* Dotted path line */}
      <line
        x1={fromX} y1={fromY}
        x2={toX} y2={toY}
        stroke={FLOW_FADED}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.5}
      />
      {/* Animated dot */}
      <circle cx={x} cy={tipY} r={5} fill={FLOW_COLOR} />
      {/* Arrowhead at target */}
      <polygon
        points={`${x},${toY} ${x - 5},${toY - head * 7} ${x + 5},${toY - head * 7}`}
        fill={FLOW_FADED}
        opacity={0.6}
      />
    </g>
  );
};

export const LayeredArchitectureScene: React.FC<Props> = ({ schedule }) => {
  const frame = useCurrentFrame();
  const state = computeLAState(schedule, frame);

  const { width, height, layerWidth, layerHeight } = schedule;
  const layerX = Math.floor((width - layerWidth) / 2);
  const borderRadius = 8;
  const fontSize = 20;
  const descFontSize = 15;

  // Closing fade-out in the last second
  const tailFrames = schedule.fps;
  const fadeStart = schedule.totalFrames - tailFrames;
  const closingOpacity = frame >= fadeStart ? clamp01(1 - (frame - fadeStart) / tailFrames) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        fontFamily="'PingFang SC','Microsoft YaHei','Noto Sans SC','sans-serif'"
        style={{ opacity: closingOpacity }}>
        {/* Subtle grid background */}
        <defs>
          <pattern id="la-grid" width={40} height={40} patternUnits="userSpaceOnUse">
            <path d={`M 40 0 L 0 0 0 40`} fill="none" stroke={GRID_COLOR} strokeWidth={0.5} opacity={0.3} />
          </pattern>
          {/* Glow filter for highlights */}
          <filter id="la-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={4} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={width} height={height} fill="url(#la-grid)" />

        {/* Layer rectangles */}
        {schedule.layers.map((layer, i) => {
          const st = state.layers[i];
          if (!st.visible && st.opacity === 0) return null;

          const layerFill = layer.color;
          const borderColor = st.borderGlow > 0 ? layer.color : "transparent";
          const borderWidth = st.borderGlow > 0 ? 2 : 0;

          return (
            <g
              key={layer.id}
              opacity={st.opacity}
              transform={st.translateY ? `translate(0, ${st.translateY})` : undefined}
              filter={st.borderGlow > 0 ? "url(#la-glow)" : undefined}
            >
              {/* Layer rect */}
              <rect
                x={layerX}
                y={layer.y}
                width={layerWidth}
                height={layerHeight}
                rx={borderRadius}
                ry={borderRadius}
                fill={layerFill}
                opacity={0.85}
                stroke={borderColor}
                strokeWidth={borderWidth}
              />
              {/* Brightness overlay */}
              {st.brightness < 1 && (
                <rect
                  x={layerX}
                  y={layer.y}
                  width={layerWidth}
                  height={layerHeight}
                  rx={borderRadius}
                  ry={borderRadius}
                  fill={S.bg}
                  opacity={1 - st.brightness}
                />
              )}

              {/* Layer label */}
              <text
                x={layer.anchor === "center" ? layerX + layerWidth / 2 : layerX + 16}
                y={layer.y + layerHeight / 2 - (layer.description ? 6 : 0)}
                fill={THEME.text.onColor}
                fontSize={fontSize}
                fontWeight={600}
                textAnchor={layer.anchor === "center" ? "middle" : "start"}
                dominantBaseline="central"
              >
                {layer.label}
              </text>

              {/* Layer description */}
              {layer.description && (
                <text
                  x={layer.anchor === "center" ? layerX + layerWidth / 2 : layerX + 16}
                  y={layer.y + layerHeight / 2 + 18}
                  fill={THEME.text.onColor}
                  fontSize={descFontSize}
                  opacity={0.9}
                  textAnchor={layer.anchor === "center" ? "middle" : "start"}
                  dominantBaseline="central"
                >
                  {layer.description}
                </text>
              )}
            </g>
          );
        })}

        {/* Data-flow arrows */}
        {state.dataFlows.map((df, i) => (
          <DataFlowArrow
            key={`flow-${i}`}
            fromX={df.fromX}
            fromY={df.fromY}
            toX={df.toX}
            toY={df.toY}
            progress={df.progress}
          />
        ))}

        {/* Callout labels (on left side) */}
        {state.callouts.map((c, i) => {
          const connectorStart = layerX - 20;
          const connectorEnd = layerX - 150;
          const textX = connectorEnd - 8;
          const maxChars = 14;
          const lines: string[] = [];
          for (let j = 0; j < c.label.length; j += maxChars) {
            lines.push(c.label.slice(j, j + maxChars));
          }
          const lineHeight = CALLOUT_FONT + 4;
          const boxH = lines.length * lineHeight + 8;
          const boxW = maxChars * CALLOUT_FONT * 0.65 + 16;

          return (
            <g key={`callout-${i}`} opacity={c.opacity}>
              {/* Connector: solid line from layer edge to callout */}
              <line
                x1={connectorStart} y1={c.y}
                x2={connectorEnd} y2={c.y}
                stroke={CALLOUT_COLOR}
                strokeWidth={1.5}
                opacity={0.6}
              />
              {/* Dot at layer edge */}
              <circle cx={connectorStart} cy={c.y} r={3} fill={CALLOUT_COLOR} opacity={0.8} />
              {/* Background pill */}
              <rect
                x={textX - 8}
                y={c.y - boxH / 2}
                width={boxW}
                height={boxH}
                rx={6}
                ry={6}
                fill={CALLOUT_BG}
                stroke={CALLOUT_COLOR}
                strokeWidth={0.5}
                opacity={0.9}
              />
              {/* Text */}
              <text
                x={textX}
                y={c.y - ((lines.length - 1) * lineHeight) / 2}
                fill={CALLOUT_COLOR}
                fontSize={CALLOUT_FONT}
                fontWeight={500}
                textAnchor="start"
                dominantBaseline="central"
              >
                {lines.map((line, j) => (
                  <tspan key={j} x={textX} dy={j === 0 ? 0 : lineHeight}>{line}</tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

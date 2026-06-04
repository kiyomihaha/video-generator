// LayeredArchitecture — SVG Scene Renderer

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { LASchedule } from "../motion/layered-architecture/types";
import { computeLAState } from "../motion/layered-architecture/laState";
import { THEME } from "../theme";

interface Props {
  schedule: LASchedule;
}

const S = THEME.canvas;
const GRID_COLOR = THEME.canvas.grid;

// Simple data-flow arrow: vertical line with arrowhead
const DataFlowArrow: React.FC<{
  fromY: number; toY: number; progress: number; x: number;
}> = ({ fromY, toY, progress, x }) => {
  const tipY = fromY + (toY - fromY) * progress;
  const head = tipY > fromY ? 1 : -1;

  return (
    <g>
      {/* Dotted path line */}
      <line
        x1={x} y1={fromY}
        x2={x} y2={toY}
        stroke="#94a3b8"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.5}
      />
      {/* Animated dot */}
      <circle cx={x} cy={tipY} r={5} fill="#38bdf8" />
      {/* Arrowhead */}
      <polygon
        points={`${x},${toY + head * 8} ${x - 5},${toY - head * 4} ${x + 5},${toY - head * 4}`}
        fill="#94a3b8"
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
  const descFontSize = 14;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fontFamily="'PingFang SC','Microsoft YaHei','Noto Sans SC','sans-serif'">
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
                  opacity={0.75}
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
            fromY={df.fromY}
            toY={df.toY}
            progress={df.progress}
            x={width * 0.85}
          />
        ))}

        {/* Callout labels (on left side) */}
        {state.callouts.map((c, i) => {
          const lineX = 44;
          const textX = 52;
          const maxChars = 25;
          const lines: string[] = [];
          for (let j = 0; j < c.label.length; j += maxChars) {
            lines.push(c.label.slice(j, j + maxChars));
          }

          return (
            <g key={`callout-${i}`} opacity={c.opacity}>
              <line
                x1={4} y1={c.y}
                x2={lineX} y2={c.y}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <text
                x={textX}
                y={c.y - ((lines.length - 1) * 16) / 2}
                fill="#94a3b8"
                fontSize={14}
                dominantBaseline="central"
              >
                {lines.map((line, j) => (
                  <tspan key={j} x={textX} dy={j === 0 ? 0 : 16}>{line}</tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

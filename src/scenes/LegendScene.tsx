// Legend — SVG scene component
// Renders a semantic legend card with color/symbol entries + active highlights

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { THEME } from "../theme";
import { computeLegendLayout } from "../motion/legend/lgSchedule";
import { computeLegendState } from "../motion/legend/lgState";
import type { LegendSpec } from "../motion/legend/types";

const S = THEME.canvas;
const T = THEME.text;
const SYMBOL_SIZE = 10;
const SYMBOL_LABEL_GAP = 8;
const ITEM_H = 28;

export const LegendScene: React.FC<{ spec: LegendSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const schedule = React.useMemo(() => computeLegendLayout(spec, fps), [spec, fps]);
  const state = computeLegendState(schedule, frame);

  if (!state.visible) {
    return <AbsoluteFill style={{ backgroundColor: S.bg }} />;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        {/* Card background */}
        <rect
          x={schedule.boxX} y={schedule.boxY}
          width={schedule.boxW} height={schedule.boxH}
          rx={8} ry={8}
          fill={S.panel}
          stroke={S.grid}
          strokeWidth={1}
          opacity={state.boxOpacity}
        />

        {/* Title */}
        {spec.title && (
          <text
            x={schedule.boxX + 12} y={schedule.boxY + 24}
            fill={T.bright}
            fontSize={13}
            fontFamily="Inter, sans-serif"
            fontWeight="bold"
            opacity={state.boxOpacity}
          >
            {spec.title}
          </text>
        )}

        {/* Items */}
        {schedule.items.map((item, i) => {
          const itemState = state.items[i];
          if (!itemState) return null;

          const sx = schedule.boxX + 12;
          const sy = schedule.boxY + item.y;
          const alpha = itemState.opacity * itemState.activeOpacity;

          return (
            <g key={item.id} opacity={alpha}>
              {/* Symbol */}
              {item.symbol === "square" && (
                <rect
                  x={sx} y={sy + (ITEM_H - SYMBOL_SIZE) / 2}
                  width={SYMBOL_SIZE} height={SYMBOL_SIZE}
                  rx={2} ry={2}
                  fill={item.color}
                />
              )}
              {item.symbol === "circle" && (
                <circle
                  cx={sx + SYMBOL_SIZE / 2} cy={sy + ITEM_H / 2}
                  r={SYMBOL_SIZE / 2}
                  fill={item.color}
                />
              )}
              {item.symbol === "dash" && (
                <line
                  x1={sx} y1={sy + ITEM_H / 2}
                  x2={sx + SYMBOL_SIZE} y2={sy + ITEM_H / 2}
                  stroke={item.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              )}

              {/* Label */}
              <text
                x={sx + SYMBOL_SIZE + SYMBOL_LABEL_GAP}
                y={sy + ITEM_H / 2 + 4}
                fill={T.primary}
                fontSize={12}
                fontFamily="Inter, sans-serif"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

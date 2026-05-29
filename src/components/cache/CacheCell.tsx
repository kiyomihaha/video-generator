// Cache Visualization — Cell Sub-Component
// Renders a single cache way cell with 3-layer layout: Title / Status / Data.
// Handles 5 visual states: empty, valid, hit, miss, eviction.

import React from "react";
import { THEME } from "../../theme";
import type { CellState } from "../../motion/cache/types";

interface Props {
  cell: CellState;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  wayIndex: number;
  hitColor: string;
  evictionColor: string;
}

const TAG_COLOR = THEME.architecture.tag;
const DIRTY_COLOR = THEME.status.dirty;

export const CacheCell: React.FC<Props> = ({
  cell, x, y, w, h, opacity, wayIndex,
  hitColor, evictionColor,
}) => {
  if (opacity <= 0.01) return null;

  const { tag, valid, dirty, highlight, compareHighlight, evictionFlash } = cell;

  // Cell background
  let bgColor: string = THEME.canvas.panel;
  let borderColor: string = THEME.canvas.grid;
  let borderOpacity = 0.3;

  // Miss compare: blue flash (not hitColor)
  if (compareHighlight > 0.01) {
    bgColor = "#3b82f6";
    borderColor = "#3b82f6";
    borderOpacity = compareHighlight;
  }
  // Hit: green pulse
  if (highlight > 0.01) {
    bgColor = hitColor;
    borderColor = hitColor;
    borderOpacity = highlight;
  }
  if (evictionFlash > 0.01) {
    bgColor = evictionColor;
    borderColor = evictionColor;
    borderOpacity = evictionFlash;
  }

  const cellPad = 2;
  const cx = x + cellPad;
  const cy = y + cellPad;
  const cw = w - cellPad * 2;
  const ch = h - cellPad * 2;

  // Compact mode: hide way label and collapse layers when cell is small
  const compact = ch < 36;
  const titleH = compact ? 0 : ch * 0.2;
  const statusH = compact ? ch * 0.4 : ch * 0.3;
  const dataH = compact ? ch * 0.6 : ch * 0.5;

  // Truncate long hex tags for narrow cells
  const maxHexChars = Math.max(3, Math.floor(cw / 8));
  const tagStr = tag !== null ? tag.toString(16).toUpperCase() : "";
  const displayTag = tagStr.length > maxHexChars ? tagStr.slice(-maxHexChars) : tagStr;

  return (
    <g opacity={opacity}>
      {/* Cell background */}
      <rect
        x={cx}
        y={cy}
        width={cw}
        height={ch}
        fill={bgColor}
        fillOpacity={valid ? 0.15 + highlight * 0.5 : 0.05}
        stroke={borderColor}
        strokeWidth={1.5}
        strokeOpacity={borderOpacity}
        rx={3}
      />

      {/* Dirty indicator: amber triangle in top-right corner */}
      {dirty && (
        <polygon
          points={`${cx + cw - 12},${cy} ${cx + cw},${cy} ${cx + cw},${cy + 12}`}
          fill={DIRTY_COLOR}
          opacity={0.8}
        />
      )}

      {/* Layer 1: Title — way index (hidden in compact mode) */}
      {!compact && (
        <text
          x={cx + cw / 2}
          y={cy + titleH - 2}
          fill={THEME.text.dim}
          fontSize={9}
          fontFamily="Inter, sans-serif"
          textAnchor="middle"
          dominantBaseline="auto"
        >
          Way {wayIndex}
        </text>
      )}

      {/* Layer 2: Status — V/D bits (always visible) */}
      <text
        x={cx + 4}
        y={cy + titleH + statusH * 0.7}
        fill={valid ? THEME.status.hit : THEME.text.muted}
        fontSize={10}
        fontFamily="JetBrains Mono, SF Mono, monospace"
      >
        V:{valid ? 1 : 0}
      </text>
      {/* LRU age rank indicator (center of status layer) */}
      {valid && cell.ageRank >= 0 && (
        <text
          x={cx + cw / 2}
          y={cy + titleH + statusH * 0.7}
          fill={THEME.text.muted}
          fontSize={8}
          fontFamily="JetBrains Mono, SF Mono, monospace"
          textAnchor="middle"
          opacity={0.5}
        >
          [{cell.ageRank}]
        </text>
      )}
      <text
        x={cx + cw - 4}
        y={cy + titleH + statusH * 0.7}
        fill={dirty ? DIRTY_COLOR : THEME.text.muted}
        fontSize={10}
        fontFamily="JetBrains Mono, SF Mono, monospace"
        textAnchor="end"
      >
        D:{dirty ? 1 : 0}
      </text>

      {/* Layer 3: Data — tag value (only when valid) */}
      {valid && tag !== null ? (
        <>
          <rect
            x={cx + 2}
            y={cy + titleH + statusH + 1}
            width={cw - 4}
            height={dataH - 3}
            fill={THEME.canvas.deep}
            rx={2}
          />
          <text
            x={cx + cw / 2}
            y={cy + titleH + statusH + dataH * 0.6}
            fill={TAG_COLOR}
            fontSize={compact ? 9 : 11}
            fontFamily="JetBrains Mono, SF Mono, monospace"
            fontWeight={600}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {displayTag ? `0x${displayTag}` : "—"}
          </text>
        </>
      ) : (
        <text
          x={cx + cw / 2}
          y={cy + titleH + statusH + dataH * 0.6}
          fill={THEME.text.faint}
          fontSize={compact ? 9 : 11}
          fontFamily="JetBrains Mono, SF Mono, monospace"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          —
        </text>
      )}

      {/* Eviction: data sink effect (fade text) */}
      {evictionFlash > 0.5 && valid && (
        <rect
          x={cx}
          y={cy}
          width={cw}
          height={ch}
          fill={evictionColor}
          fillOpacity={0.1}
          rx={3}
        />
      )}
    </g>
  );
};

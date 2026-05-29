// Cache Visualization — Bit Field Sub-Component
// Renders the address decomposition strip with color-coded tag/index/offset segments.
// Animated highlight per phase, Bezier connection point to grid.

import React from "react";
import { THEME } from "../../theme";
import type { BitFieldInfo } from "../../motion/cache/types";

interface Props {
  bitFields: BitFieldInfo;
  address: number;
  x: number;
  y: number;
  width: number;
  height: number;
  activePhase: "address" | "decompose" | "index" | "compare" | "result" | null;
  phaseProgress: number;
}

const TAG_COLOR = THEME.architecture.tag;
const INDEX_COLOR = THEME.architecture.index;
const OFFSET_COLOR = THEME.architecture.offset;

export const BitField: React.FC<Props> = ({
  bitFields, address, x, y, width, height, activePhase, phaseProgress,
}) => {
  const { totalBits, tagBits, indexBits, offsetBits } = bitFields;

  // Convert address to binary string, padded to totalBits
  const binaryStr = address.toString(2).padStart(totalBits, "0");

  // Segment widths proportional to bit count
  const totalWidth = width;
  const tagW = (tagBits / totalBits) * totalWidth;
  const indexW = (indexBits / totalBits) * totalWidth;
  const offsetW = (offsetBits / totalBits) * totalWidth;

  // Latch highlights: once revealed, stay revealed through later phases
  const phaseOrder = activePhase === "address" ? 0
    : activePhase === "decompose" ? 1
    : activePhase === "index" ? 2
    : activePhase === "compare" ? 3
    : activePhase === "result" ? 4
    : -1;

  // Tag+offset: highlight during decompose onwards
  const tagHighlight = phaseOrder >= 1
    ? (phaseOrder === 1 ? Math.min(1, phaseProgress * 2) : 1)
    : 0;
  const offsetHighlight = tagHighlight;

  // Index: highlight during index phase onwards
  const indexHighlight = phaseOrder >= 2
    ? (phaseOrder === 2 ? Math.min(1, phaseProgress * 2) : 1)
    : 0;

  // Filter out zero-width segments
  const rawSegments = [
    { label: "Tag", bits: binaryStr.slice(0, tagBits), color: TAG_COLOR, w: tagW, highlight: tagHighlight },
    { label: "Index", bits: binaryStr.slice(tagBits, tagBits + indexBits), color: INDEX_COLOR, w: indexW, highlight: indexHighlight },
    { label: "Offset", bits: binaryStr.slice(tagBits + indexBits), color: OFFSET_COLOR, w: offsetW, highlight: offsetHighlight },
  ];
  const segments = rawSegments.filter((s) => s.w > 0.5);

  // Compute segment positions as a pure fold
  const positions: number[] = [];
  let curX = x;
  for (const seg of segments) {
    positions.push(curX);
    curX += seg.w;
  }

  return (
    <g>
      {/* Address value */}
      <text
        x={x}
        y={y - 6}
        fill={THEME.text.bright}
        fontSize={13}
        fontFamily="JetBrains Mono, SF Mono, monospace"
        fontWeight={600}
      >
        0x{address.toString(16).toUpperCase().padStart(Math.ceil(totalBits / 4), "0")}
      </text>

      {segments.map((seg, i) => {
        const segX = positions[i];

        const bgOpacity = seg.highlight > 0.01 ? 0.15 + seg.highlight * 0.2 : 0.05;
        const borderOpacity = seg.highlight > 0.01 ? 0.6 + seg.highlight * 0.4 : 0.2;
        const textOpacity = 0.4 + seg.highlight * 0.6;

        return (
          <g key={seg.label}>
            {/* Segment background */}
            <rect
              x={segX}
              y={y}
              width={seg.w}
              height={height}
              fill={seg.color}
              fillOpacity={bgOpacity}
              stroke={seg.color}
              strokeWidth={1}
              strokeOpacity={borderOpacity}
              rx={2}
            />

            {/* Label */}
            <text
              x={segX + seg.w / 2}
              y={y + height * 0.3}
              fill={seg.color}
              fontSize={9}
              fontFamily="Inter, sans-serif"
              fontWeight={600}
              textAnchor="middle"
              opacity={textOpacity}
            >
              {seg.label}
            </text>

            {/* Bit characters */}
            <text
              x={segX + seg.w / 2}
              y={y + height * 0.75}
              fill={seg.color}
              fontSize={11}
              fontFamily="JetBrains Mono, SF Mono, monospace"
              textAnchor="middle"
              opacity={textOpacity}
              letterSpacing={2}
            >
              {seg.bits}
            </text>
          </g>
        );
      })}

      {/* Connection dot for Bezier curve (from index segment bottom center) */}
      {indexHighlight > 0.01 && indexW > 0 && (
        <circle
          cx={x + tagW + indexW / 2}
          cy={y + height}
          r={3}
          fill={INDEX_COLOR}
          opacity={indexHighlight}
        />
      )}
    </g>
  );
};

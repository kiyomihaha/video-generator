// PadBlock — Pad焊盘图形

import React from "react";

interface PadBlockProps {
  cx: number;
  cy: number;
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  label?: string;
}

export const PadBlock: React.FC<PadBlockProps> = ({
  cx, cy, width = 60, height = 30, color = "#fbbf24", opacity = 1, label,
}) => (
  <g opacity={opacity}>
    <rect
      x={cx - width / 2} y={cy - height / 2}
      width={width} height={height}
      rx={4} ry={4}
      fill={color} fillOpacity={0.3}
      stroke={color} strokeWidth={2}
    />
    {label && (
      <text
        x={cx} y={cy + 1}
        textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={11} fontWeight={500}
        fontFamily="Inter, sans-serif"
      >
        {label}
      </text>
    )}
  </g>
);

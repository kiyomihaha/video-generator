// ChipBlock — reusable chip rectangle with label

import React from "react";

interface ChipBlockProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  color: string;
  opacity?: number;
}

export const ChipBlock: React.FC<ChipBlockProps> = ({
  x, y, width, height, label, sublabel, color, opacity = 1,
}) => (
  <g opacity={opacity}>
    <rect
      x={x} y={y} width={width} height={height}
      rx={8} ry={8}
      fill={color} fillOpacity={0.15}
      stroke={color} strokeWidth={2}
    />
    <text
      x={x + width / 2} y={y + height / 2 - (sublabel ? 6 : 0)}
      textAnchor="middle" dominantBaseline="central"
      fill={color} fontSize={16} fontWeight={600}
      fontFamily="Inter, sans-serif"
    >
      {label}
    </text>
    {sublabel && (
      <text
        x={x + width / 2} y={y + height / 2 + 14}
        textAnchor="middle" dominantBaseline="central"
        fill={color} fillOpacity={0.7} fontSize={12}
        fontFamily="Inter, sans-serif"
      >
        {sublabel}
      </text>
    )}
  </g>
);

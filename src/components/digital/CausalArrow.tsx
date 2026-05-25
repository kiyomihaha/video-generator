import React from "react";

interface Props {
  x1: number; y1: number; x2: number; y2: number;
  strokeDashoffset: number; strokeDasharray: number;
  color?: string; opacity?: number;
}

export const CausalArrow: React.FC<Props> = ({
  x1, y1, x2, y2,
  strokeDashoffset, strokeDasharray,
  color = "#38bdf8", opacity = 1,
}) => (
  <g opacity={opacity}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2.5}
      strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
      strokeLinecap="round" />
  </g>
);

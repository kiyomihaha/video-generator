// CurrentArrow — animated current flow arrow

import React from "react";

interface CurrentArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  progress?: number;   // 0-1, how much of the arrow is drawn
  opacity?: number;
  strokeWidth?: number;
}

export const CurrentArrow: React.FC<CurrentArrowProps> = ({
  x1, y1, x2, y2, color = "#38bdf8", progress = 1, opacity = 1, strokeWidth = 2.5,
}) => {
  if (progress <= 0) return null;

  const mx = x1 + (x2 - x1) * progress;
  const my = y1 + (y2 - y1) * progress;

  // Arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 8;
  const ha1x = mx - headLen * Math.cos(angle - 0.4);
  const ha1y = my - headLen * Math.sin(angle - 0.4);
  const ha2x = mx - headLen * Math.cos(angle + 0.4);
  const ha2y = my - headLen * Math.sin(angle + 0.4);

  return (
    <g opacity={opacity}>
      <line
        x1={x1} y1={y1} x2={mx} y2={my}
        stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {progress > 0.1 && (
        <polygon
          points={`${mx},${my} ${ha1x},${ha1y} ${ha2x},${ha2y}`}
          fill={color}
        />
      )}
    </g>
  );
};

// MosSwitch — PMOS/NMOS transistor symbol

import React from "react";

interface MosSwitchProps {
  cx: number;
  cy: number;
  type: "pmos" | "nmos";
  conducting?: boolean;   // true = ON (low resistance), false = OFF
  color?: string;
  opacity?: number;
  label?: string;
}

export const MosSwitch: React.FC<MosSwitchProps> = ({
  cx, cy, type, conducting = false, color, opacity = 1, label,
}) => {
  const isPmos = type === "pmos";
  const fillColor = color ?? (isPmos ? "#f472b6" : "#60a5fa");
  const w = 40;
  const h = 50;

  // Gate terminal (left), Source/Drain (right side, vertical)
  const gateX = cx - w / 2 - 15;
  const gateY = cy;
  const sdX = cx + w / 2;

  return (
    <g opacity={opacity}>
      {/* Body rectangle */}
      <rect
        x={cx - w / 2} y={cy - h / 2}
        width={w} height={h}
        rx={4} ry={4}
        fill={fillColor} fillOpacity={conducting ? 0.35 : 0.1}
        stroke={fillColor} strokeWidth={conducting ? 2.5 : 1.5}
        strokeDasharray={conducting ? "none" : "4 3"}
      />

      {/* Gate terminal line */}
      <line
        x1={gateX} y1={gateY}
        x2={cx - w / 2} y2={gateY}
        stroke={fillColor} strokeWidth={1.5}
      />
      {/* Gate label */}
      <text
        x={gateX - 4} y={gateY + 4}
        textAnchor="end"
        fill={fillColor} fontSize={10}
        fontFamily="Inter, sans-serif"
      >
        G
      </text>

      {/* Source (top) */}
      <line
        x1={sdX} y1={cy - h / 4}
        x2={sdX + 15} y2={cy - h / 4}
        stroke={fillColor} strokeWidth={1.5}
      />

      {/* Drain (bottom) */}
      <line
        x1={sdX} y1={cy + h / 4}
        x2={sdX + 15} y2={cy + h / 4}
        stroke={fillColor} strokeWidth={1.5}
      />

      {/* Type label inside */}
      <text
        x={cx} y={cy + 4}
        textAnchor="middle" dominantBaseline="central"
        fill={fillColor} fontSize={11} fontWeight={600}
        fontFamily="Inter, sans-serif"
      >
        {isPmos ? "P" : "N"}
      </text>

      {/* Optional label below */}
      {label && (
        <text
          x={cx} y={cy + h / 2 + 14}
          textAnchor="middle"
          fill={fillColor} fillOpacity={0.7} fontSize={10}
          fontFamily="Inter, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  );
};

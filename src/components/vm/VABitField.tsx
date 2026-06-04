// Virtual Memory — VA Bit Field decomposition bar

import React from "react";
import { THEME } from "../../theme";
import type { VMBitFieldInfo } from "../../motion/virtual-memory/types";

const T = THEME.text;

interface VABitFieldProps {
  bitFields: VMBitFieldInfo;
  vpn: number[];
  offset: number;
  x: number;
  y: number;
  w: number;
  h: number;
  activePhase: string;
}

const FIELD_COLORS = [
  THEME.vm.decompose,   // VPN1
  THEME.vm.decomposeAlt, // VPN2
  THEME.vm.address,      // Offset
];

export const VABitField: React.FC<VABitFieldProps> = ({
  bitFields, vpn, offset, x, y, w, h, activePhase,
}) => {
  const { vpnBits, vpnLabels, offsetBits, totalBits } = bitFields;
  const totalFieldBits = vpnBits.reduce((s, b) => s + b, 0) + offsetBits;
  const segments: { label: string; bits: number; value: number; color: string }[] = [];

  for (let i = 0; i < vpnBits.length; i++) {
    segments.push({
      label: vpnLabels[i],
      bits: vpnBits[i],
      value: vpn[i] ?? 0,
      color: FIELD_COLORS[i % FIELD_COLORS.length],
    });
  }
  segments.push({
    label: "Offset",
    bits: offsetBits,
    value: offset,
    color: FIELD_COLORS[FIELD_COLORS.length - 1],
  });

  // Compute segment positions declaratively
  const positions: { x: number; seg: typeof segments[0] }[] = [];
  let accX = x;
  for (const seg of segments) {
    const segW = (seg.bits / totalFieldBits) * w;
    positions.push({ x: accX, seg });
    accX += segW;
  }

  const isDecompose = activePhase === "decompose" || activePhase === "tlb-lookup" ||
    activePhase === "walk" || activePhase === "translate" || activePhase === "result";

  return (
    <g>
      {/* VA label */}
      <text
        x={x} y={y - 6}
        fill={T.muted}
        fontSize={10}
        fontFamily="Inter, sans-serif"
      >
        VA: 0x{vpn.concat([offset]).reduce((acc, v, i) => {
          const bits = i < vpnBits.length ? vpnBits[i] : offsetBits;
          return (acc << bits) | v;
        }, 0).toString(16).toUpperCase().padStart(Math.ceil(totalBits / 4), "0")}
      </text>

      {positions.map(({ x: segX, seg }) => {
        const segW = (seg.bits / totalFieldBits) * w;
        const isActive = isDecompose;
        const segOpacity = isActive ? 0.9 : 0.3;

        const result = (
          <g key={seg.label}>
            <rect
              x={segX} y={y}
              width={segW - 2} height={h}
              rx={3} ry={3}
              fill={seg.color}
              fillOpacity={segOpacity * 0.4}
              stroke={seg.color}
              strokeWidth={isActive ? 1.5 : 0.5}
              strokeOpacity={segOpacity}
            />
            {/* Segment label */}
            <text
              x={segX + segW / 2 - 1} y={y + h * 0.32}
              textAnchor="middle"
              fill={seg.color}
              fontSize={Math.min(10, h * 0.25)}
              fontFamily="Inter, sans-serif"
              fontWeight="bold"
              opacity={segOpacity}
            >
              {seg.label}
            </text>
            {/* Value */}
            <text
              x={segX + segW / 2 - 1} y={y + h * 0.72}
              textAnchor="middle"
              fill={T.onColor}
              fontSize={Math.min(11, h * 0.28)}
              fontFamily="JetBrains Mono, SF Mono, monospace"
              fontWeight="bold"
              opacity={segOpacity}
            >
              0x{seg.value.toString(16).toUpperCase()}
            </text>
            {/* Bit count */}
            <text
              x={segX + segW / 2 - 1} y={y + h + 12}
              textAnchor="middle"
              fill={T.faint}
              fontSize={8}
              fontFamily="Inter, sans-serif"
            >
              {seg.bits}b
            </text>
          </g>
        );

        return result;
      })}
    </g>
  );
};

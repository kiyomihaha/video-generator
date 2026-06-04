// Virtual Memory — TLB Cell sub-component

import React from "react";
import { THEME } from "../../theme";
import type { TLBCellState } from "../../motion/virtual-memory/types";

const S = THEME.canvas;
const T = THEME.text;

interface TLBCellProps {
  state: TLBCellState;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const TLBCell: React.FC<TLBCellProps> = ({ state, x, y, w, h }) => {
  const { vpn, physicalFrame, valid, opacity, highlight, evictionFlash, walkHighlight } = state;

  let fillColor: string = S.panel;
  let fillOpacity = opacity * 0.3;
  let strokeColor: string = S.grid;
  let strokeWidth = 0.5;

  if (valid) {
    fillColor = THEME.vm.tlb;
    fillOpacity = opacity * 0.6;
    strokeColor = THEME.vm.tlb;
    strokeWidth = 1;
  }

  // TLB hit highlight (green pulse)
  if (highlight > 0) {
    fillColor = THEME.status.hit;
    fillOpacity = Math.max(fillOpacity, highlight * 0.7);
    strokeColor = THEME.status.hit;
    strokeWidth = 2;
  }

  // Walk highlight (blue)
  if (walkHighlight > 0) {
    fillColor = THEME.vm.walk;
    fillOpacity = Math.max(fillOpacity, walkHighlight * 0.5);
    strokeColor = THEME.vm.walk;
    strokeWidth = 1.5;
  }

  // Eviction flash (amber)
  if (evictionFlash > 0) {
    fillColor = THEME.status.eviction;
    fillOpacity = Math.max(fillOpacity, evictionFlash * 0.6);
    strokeColor = THEME.status.eviction;
    strokeWidth = 2;
  }

  const fontSize = Math.min(10, h * 0.3);

  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        rx={3} ry={3}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {valid && vpn !== null && (
        <>
          <text
            x={x + 4} y={y + h * 0.35}
            fill={T.muted}
            fontSize={fontSize * 0.8}
            fontFamily="Inter, sans-serif"
          >
            VPN
          </text>
          <text
            x={x + 4 + fontSize * 1.5} y={y + h * 0.35}
            fill={T.bright}
            fontSize={fontSize}
            fontFamily="JetBrains Mono, SF Mono, monospace"
            fontWeight="bold"
          >
            0x{vpn.toString(16).toUpperCase()}
          </text>
          {physicalFrame !== null && (
            <>
              <text
                x={x + 4} y={y + h * 0.72}
                fill={T.muted}
                fontSize={fontSize * 0.8}
                fontFamily="Inter, sans-serif"
              >
                PFN
              </text>
              <text
                x={x + 4 + fontSize * 1.5} y={y + h * 0.72}
                fill={THEME.status.hit}
                fontSize={fontSize}
                fontFamily="JetBrains Mono, SF Mono, monospace"
                fontWeight="bold"
              >
                0x{physicalFrame.toString(16).toUpperCase()}
              </text>
            </>
          )}
        </>
      )}
      {!valid && (
        <text
          x={x + w / 2} y={y + h / 2 + 3}
          textAnchor="middle"
          fill={T.faint}
          fontSize={fontSize * 0.8}
          fontFamily="Inter, sans-serif"
        >
          —
        </text>
      )}
    </g>
  );
};

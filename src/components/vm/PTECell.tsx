// Virtual Memory — Page Table Entry Cell sub-component

import React from "react";
import { THEME } from "../../theme";
import type { PTECellState } from "../../motion/virtual-memory/types";

const S = THEME.canvas;
const T = THEME.text;

interface PTECellProps {
  state: PTECellState;
  x: number;
  y: number;
  w: number;
  h: number;
  index: number;
}

export const PTECell: React.FC<PTECellProps> = ({ state, x, y, w, h, index }) => {
  const { valid, physicalFrame, opacity, walkHighlight, faultFlash } = state;

  let fillColor: string = S.panel;
  let fillOpacity = opacity * 0.3;
  let strokeColor: string = S.grid;
  let strokeWidth = 0.5;

  if (walkHighlight > 0) {
    fillColor = valid ? THEME.vm.walk : THEME.vm.fault;
    fillOpacity = Math.max(fillOpacity, walkHighlight * 0.6);
    strokeColor = fillColor;
    strokeWidth = 1.5;
  }

  if (faultFlash > 0) {
    fillColor = THEME.vm.fault;
    fillOpacity = Math.max(fillOpacity, faultFlash * 0.7);
    strokeColor = THEME.vm.fault;
    strokeWidth = 2;
  }

  const fontSize = Math.min(9, h * 0.3);

  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        rx={2} ry={2}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Index label */}
      <text
        x={x + 3} y={y + h * 0.3}
        fill={T.faint}
        fontSize={fontSize * 0.75}
        fontFamily="JetBrains Mono, SF Mono, monospace"
      >
        [{index}]
      </text>
      {/* Valid bit */}
      <circle
        cx={x + w - 8} cy={y + 8}
        r={3}
        fill={valid ? THEME.status.hit : THEME.status.miss}
        opacity={opacity}
      />
      {/* PFN or dash */}
      <text
        x={x + w / 2} y={y + h * 0.72}
        textAnchor="middle"
        fill={valid ? T.bright : T.faint}
        fontSize={fontSize}
        fontFamily="JetBrains Mono, SF Mono, monospace"
        fontWeight="bold"
      >
        {valid && physicalFrame !== null
          ? `0x${physicalFrame.toString(16).toUpperCase()}`
          : "—"}
      </text>
    </g>
  );
};

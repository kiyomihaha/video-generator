// ConnectorSystem — SVG renderer for data-flow orthogonal paths
import React from "react";
import type { ConnectorRenderState } from "./types";
import { THEME } from "../../theme";

interface Props {
  connectors: ConnectorRenderState[];
  defsId?: string;
}

const MARKER_SIZE = 8;

function colorKey(color: string): string {
  return color.replace(/[^a-zA-Z0-9_-]/g, "");
}

/** Create arrowhead marker ID for a given color and direction */
function markerId(defsId: string, color: string, suffix: "start" | "end"): string {
  return `arrow-${defsId}-${colorKey(color)}-${suffix}`;
}

export const ConnectorSystem: React.FC<Props> = ({ connectors, defsId = "cs" }) => {
  const colors = new Set(connectors.map((c) => c.color));
  const uniqueColors = [...colors].filter(Boolean);

  return (
    <g>
      <defs>
        {uniqueColors.map((color) => (
          <React.Fragment key={color}>
            <marker
              id={markerId(defsId, color, "end")}
              viewBox={`0 0 ${MARKER_SIZE} ${MARKER_SIZE}`}
              refX={MARKER_SIZE - 1}
              refY={MARKER_SIZE / 2}
              markerWidth={MARKER_SIZE}
              markerHeight={MARKER_SIZE}
              orient="auto"
            >
              <path
                d={`M 0 1 L ${MARKER_SIZE} ${MARKER_SIZE / 2} L 0 ${MARKER_SIZE - 1} z`}
                fill={color}
              />
            </marker>
            <marker
              id={markerId(defsId, color, "start")}
              viewBox={`0 0 ${MARKER_SIZE} ${MARKER_SIZE}`}
              refX={1}
              refY={MARKER_SIZE / 2}
              markerWidth={MARKER_SIZE}
              markerHeight={MARKER_SIZE}
              orient="auto"
            >
              <path
                d={`M ${MARKER_SIZE} 1 L 0 ${MARKER_SIZE / 2} L ${MARKER_SIZE} ${MARKER_SIZE - 1} z`}
                fill={color}
              />
            </marker>
          </React.Fragment>
        ))}
      </defs>

      {connectors.map((c) => {
        if (c.opacity < 0.01) return null;

        const isForward = c.direction === "forward" || c.direction === "bidirectional";
        const isBackward = c.direction === "backward" || c.direction === "bidirectional";

        // Hide arrowheads during draw animation to prevent marker appearing before line.
        // Dashed connectors fade in (no draw animation) so always show their markers.
        const hideMarkers = c.animated && !c.dashed && c.strokeDashoffset > 1;

        // Dashed connectors fade in (no draw animation); solid connectors draw-on
        const dashStyle = c.dashed
          ? { strokeDasharray: "8 4" as const, strokeDashoffset: undefined as number | undefined }
          : c.animated
            ? { strokeDasharray: c.strokeDashoffset > 0 ? 1000 : undefined,
                strokeDashoffset: c.strokeDashoffset > 0 ? c.strokeDashoffset : undefined }
            : { strokeDasharray: undefined as string | undefined,
                strokeDashoffset: undefined as number | undefined };

        return (
          <path
            key={c.id}
            d={c.path}
            fill="none"
            stroke={c.color}
            strokeWidth={c.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={dashStyle.strokeDasharray}
            strokeDashoffset={dashStyle.strokeDashoffset}
            markerEnd={isForward && !hideMarkers ? `url(#${markerId(defsId, c.color, "end")})` : undefined}
            markerStart={isBackward && !hideMarkers ? `url(#${markerId(defsId, c.color, "start")})` : undefined}
            opacity={c.opacity}
          />
        );
      })}
    </g>
  );
};

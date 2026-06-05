import React from "react";
import { AbsoluteFill } from "remotion";
import { THEME } from "../theme";
import { AnnotationProvider, useAnnotation } from "../motion/callout/AnnotationProvider";
import { CalloutOverlay } from "../motion/callout/CalloutOverlay";
import { ConnectorSystem } from "../motion/callout/ConnectorSystem";
import type { CalloutDemoSpec, DiagramNode } from "./types";

const S = THEME.canvas;
const T = THEME.text;
const VW = 1280;
const VH = 720;

const SceneContent: React.FC<{ spec: CalloutDemoSpec }> = ({ spec }) => {
  const { state } = useAnnotation();

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
      {/* Title */}
      <text
        x={VW / 2} y={36}
        textAnchor="middle"
        fill={T.primary}
        fontSize={18}
        fontFamily="Inter, sans-serif"
        fontWeight="bold"
      >
        {spec.title}
      </text>

      {/* Diagram nodes */}
      {spec.diagram.nodes.map((n: DiagramNode) => (
        <g key={n.id}>
          <rect
            x={n.x} y={n.y}
            width={n.w} height={n.h}
            rx={8} ry={8}
            fill={n.color}
            fillOpacity={0.15}
            stroke={n.color}
            strokeWidth={2}
          />
          <text
            x={n.x + n.w / 2}
            y={n.y + n.h / 2 + 5}
            textAnchor="middle"
            fill={n.color}
            fontSize={14}
            fontFamily="Inter, sans-serif"
            fontWeight={600}
          >
            {n.label}
          </text>
        </g>
      ))}

      {/* Data-flow connectors (z-index matches SVG layer order spec) */}
      <ConnectorSystem connectors={state.connectors} defsId="demo" />

      {/* Annotation callouts */}
      <CalloutOverlay callouts={state.callouts} />
    </svg>
  );
};

export const CalloutDemoScene: React.FC<{ spec: CalloutDemoSpec }> = ({ spec }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <AnnotationProvider callouts={spec.callouts} connectors={spec.connectors}>
        <SceneContent spec={spec} />
      </AnnotationProvider>
    </AbsoluteFill>
  );
};

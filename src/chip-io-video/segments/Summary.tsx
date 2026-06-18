// Segment 9: Summary — Continuous ending sequence
// I/O path → progressive highlight → focus I/O Cell → final title → fade out
// No blank frames, no hard cuts, smooth transition to end

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { THEME } from "../../theme";
import { clamp01, easeOutCubic } from "../../motion/utils";
import type { TextEmphasisSpec } from "../../motion/text-emphasis/types";

const T = THEME.text;
const S = THEME.canvas;
const VW = 1280;
const VH = 720;

// I/O path nodes
const NODES = [
  { id: "core", label: "Core\nLogic", x: 200, color: "#a78bfa" },
  { id: "io-cell", label: "I/O\nCell", x: 450, color: "#60a5fa" },
  { id: "pad", label: "Pad", x: 700, color: "#fbbf24" },
  { id: "physical", label: "Physical\nWorld", x: 950, color: "#34d399" },
];

// I/O Cell capabilities to highlight
const CAPABILITIES = [
  { label: "接收", x: 380 },
  { label: "驱动", x: 430 },
  { label: "切换", x: 480 },
  { label: "保护", x: 530 },
  { label: "电气适配", x: 580 },
];

const NODE_W = 120;
const NODE_H = 70;
const NODE_Y = 280;

export const Summary: React.FC<{ spec?: TextEmphasisSpec }> = () => {
  const frame = useCurrentFrame();
  const totalFrames = 920; // segment duration

  // Phase timing (% of total)
  const p0 = 0;           // path appears
  const p1 = 0.20;        // capabilities highlight
  const p2 = 0.55;        // focus I/O Cell
  const p3 = 0.75;        // final title
  const p4 = 0.90;        // stable hold
  const p5 = 0.96;        // fade out

  const progress = frame / totalFrames;

  // Node opacity — all visible from start, others dim after p2
  const getNodeOpacity = (nodeId: string) => {
    const fadeIn = easeOutCubic(clamp01(frame / 60));
    if (progress < p2) return fadeIn;

    // After p2, dim non-io-cell nodes
    const dimProgress = clamp01((progress - p2) / (p3 - p2));
    if (nodeId === "io-cell") return fadeIn;
    return fadeIn * (1 - dimProgress * 0.7); // dim to 30%
  };

  // Link opacity
  const getLinkOpacity = () => {
    const fadeIn = easeOutCubic(clamp01(frame / 60));
    if (progress < p2) return fadeIn;
    const dimProgress = clamp01((progress - p2) / (p3 - p2));
    return fadeIn * (1 - dimProgress * 0.6);
  };

  // Capability highlight
  const getCapabilityOpacity = (index: number) => {
    const capStart = p1 + index * 0.05;
    const capEnd = capStart + 0.08;
    if (progress < capStart) return 0;
    if (progress > p2) {
      const dimProgress = clamp01((progress - p2) / (p3 - p2));
      return (1 - dimProgress * 0.8);
    }
    return easeOutCubic(clamp01((progress - capStart) / (capEnd - capStart)));
  };

  // Final title
  const titleOpacity = progress >= p3
    ? easeOutCubic(clamp01((progress - p3) / (p4 - p3)))
    : 0;
  const titleY = 440 - titleOpacity * 20; // slight upward movement

  // Overall fade out
  const overallOpacity = progress >= p5
    ? 1 - clamp01((progress - p5) / (1 - p5))
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg, opacity: overallOpacity }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        {/* Links between nodes */}
        <g opacity={getLinkOpacity()}>
          {NODES.slice(0, -1).map((node, i) => {
            const next = NODES[i + 1];
            return (
              <line key={node.id}
                x1={node.x + NODE_W / 2} y1={NODE_Y + NODE_H / 2}
                x2={next.x - NODE_W / 2} y2={NODE_Y + NODE_H / 2}
                stroke={T.muted} strokeWidth={2}
              />
            );
          })}
        </g>

        {/* Nodes */}
        {NODES.map((node) => {
          const opacity = getNodeOpacity(node.id);
          const isIOCell = node.id === "io-cell";
          const glowIntensity = isIOCell && progress >= p2
            ? easeOutCubic(clamp01((progress - p2) / (p3 - p2)))
            : 0;

          return (
            <g key={node.id} opacity={opacity}>
              {/* Glow for I/O Cell */}
              {isIOCell && glowIntensity > 0 && (
                <rect
                  x={node.x - 5} y={NODE_Y - 5}
                  width={NODE_W + 10} height={NODE_H + 10}
                  rx={10} ry={10}
                  fill="none" stroke={node.color}
                  strokeWidth={3} opacity={glowIntensity * 0.6}
                />
              )}
              <rect
                x={node.x} y={NODE_Y}
                width={NODE_W} height={NODE_H}
                rx={8} ry={8}
                fill={node.color} fillOpacity={isIOCell ? 0.25 : 0.12}
                stroke={node.color} strokeWidth={isIOCell ? 2.5 : 1.5}
              />
              {node.label.split("\n").map((line, li) => (
                <text key={li}
                  x={node.x + NODE_W / 2}
                  y={NODE_Y + NODE_H / 2 + (li - 0.5) * 18 + 5}
                  textAnchor="middle" dominantBaseline="central"
                  fill={node.color} fontSize={isIOCell ? 18 : 15}
                  fontWeight={isIOCell ? 700 : 500}
                  fontFamily="Inter, sans-serif"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}

        {/* Bidirectional arrows */}
        <g opacity={getLinkOpacity()}>
          {[0, 1, 2].map(i => {
            const n1 = NODES[i];
            const n2 = NODES[i + 1];
            const midX = (n1.x + NODE_W / 2 + n2.x - NODE_W / 2) / 2;
            return (
              <g key={i}>
                <text x={midX} y={NODE_Y + NODE_H / 2 - 12} textAnchor="middle"
                  fill={T.muted} fontSize={11} fontFamily="Inter, sans-serif">↔</text>
              </g>
            );
          })}
        </g>

        {/* I/O Cell capabilities */}
        <g>
          {CAPABILITIES.map((cap, i) => (
            <g key={cap.label} opacity={getCapabilityOpacity(i)}>
              <text x={cap.x} y={NODE_Y + NODE_H + 40} textAnchor="middle"
                fill={NODES[1].color} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">
                {cap.label}
              </text>
            </g>
          ))}
        </g>

        {/* Final title — appears after p3 */}
        {titleOpacity > 0 && (
          <g opacity={titleOpacity}>
            {/* Main title */}
            <text x={VW / 2} y={titleY} textAnchor="middle"
              fill={T.bright} fontSize={48} fontWeight={700} fontFamily="Inter, sans-serif">
              I/O Cell
            </text>
            {/* Subtitle */}
            <text x={VW / 2} y={titleY + 40} textAnchor="middle"
              fill={T.primary} fontSize={22} fontWeight={500} fontFamily="Inter, sans-serif">
              数字逻辑连接物理世界的边界
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

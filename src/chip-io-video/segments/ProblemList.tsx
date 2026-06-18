// Segment 8: ProblemList — 6 common I/O design problems
// Cumulative 2×3 card grid with SVG icons

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { THEME } from "../../theme";
import { clamp01, easeOutCubic } from "../../motion/utils";
import type { ProblemListSpec, ProblemItem } from "../types";

const T = THEME.text;
const VW = 1280;
const VH = 720;

// SVG icon components (replacing emoji)
const IconVoltage: React.FC = () => (
  <g>
    <line x1={12} y1={4} x2={12} y2={20} stroke="#ef4444" strokeWidth={2} />
    <polyline points="8,10 12,4 16,10" fill="none" stroke="#ef4444" strokeWidth={2} />
    <line x1={8} y1={14} x2={16} y2={14} stroke="#ef4444" strokeWidth={1.5} />
    <text x={12} y={30} textAnchor="middle" fill="#ef4444" fontSize={8}>×</text>
  </g>
);

const IconDrive: React.FC = () => (
  <g>
    <path d="M6,20 Q12,4 18,20" fill="none" stroke="#fbbf24" strokeWidth={2} />
    <line x1={6} y1={20} x2={18} y2={20} stroke="#fbbf24" strokeWidth={1} strokeDasharray="2 2" />
    <text x={12} y={30} textAnchor="middle" fill="#fbbf24" fontSize={8}>slow</text>
  </g>
);

const IconRinging: React.FC = () => (
  <g>
    <path d="M4,16 Q8,4 12,16 Q16,28 20,16" fill="none" stroke="#f97316" strokeWidth={2} />
    <line x1={4} y1={16} x2={20} y2={16} stroke="#f97316" strokeWidth={1} strokeDasharray="2 2" />
  </g>
);

const IconContention: React.FC = () => (
  <g>
    <line x1={6} y1={12} x2={18} y2={12} stroke="#ef4444" strokeWidth={2} />
    <line x1={6} y1={18} x2={18} y2={18} stroke="#ef4444" strokeWidth={2} />
    <text x={12} y={30} textAnchor="middle" fill="#ef4444" fontSize={8}>⚡</text>
  </g>
);

const IconESD: React.FC = () => (
  <g>
    <circle cx={12} cy={12} r={10} fill="none" stroke="#a78bfa" strokeWidth={2} />
    <line x1={12} y1={6} x2={12} y2={18} stroke="#a78bfa" strokeWidth={2} />
    <line x1={6} y1={12} x2={18} y2={12} stroke="#a78bfa" strokeWidth={2} />
  </g>
);

const IconCrosstalk: React.FC = () => (
  <g>
    <line x1={4} y1={8} x2={20} y2={8} stroke="#60a5fa" strokeWidth={2} />
    <line x1={4} y1={16} x2={20} y2={16} stroke="#60a5fa" strokeWidth={2} />
    <path d="M10,8 Q12,12 14,16" fill="none" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="2 2" />
    <path d="M14,8 Q12,12 10,16" fill="none" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="2 2" />
  </g>
);

const ICONS = [IconVoltage, IconDrive, IconRinging, IconContention, IconESD, IconCrosstalk];

const defaultItems: ProblemItem[] = [
  { icon: "", label: "电平不兼容", description: "1.8V × 3.3V — 电平不匹配", color: "#ef4444" },
  { icon: "", label: "驱动不足", description: "大负载 → 边沿缓慢", color: "#fbbf24" },
  { icon: "", label: "过冲与振铃", description: "阻抗不匹配 → 信号反射", color: "#f97316" },
  { icon: "", label: "总线争用", description: "两输出同时驱动", color: "#ef4444" },
  { icon: "", label: "ESD 风险", description: "无保护 → 静电击穿", color: "#a78bfa" },
  { icon: "", label: "串扰噪声", description: "长走线耦合干扰", color: "#60a5fa" },
];

const defaultSpec: ProblemListSpec = {
  items: defaultItems,
  itemFrames: 90,
};

// 2×3 grid layout
const GRID_COLS = 3;
const CARD_W = 320;
const CARD_H = 120;
const CARD_GAP = 20;
const GRID_START_X = (VW - (GRID_COLS * CARD_W + (GRID_COLS - 1) * CARD_GAP)) / 2;
const GRID_START_Y = 120;

export const ProblemList: React.FC<{ spec?: ProblemListSpec }> = ({ spec: customSpec }) => {
  const spec = customSpec ?? defaultSpec;
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        {/* Title */}
        <text x={VW / 2} y={60} textAnchor="middle" fill={T.primary} fontSize={22} fontWeight={700} fontFamily="Inter, sans-serif">
          常见 I/O 设计问题
        </text>

        {/* Cards */}
        {spec.items.map((item, i) => {
          const itemStart = i * spec.itemFrames;
          const localFrame = frame - itemStart;
          if (localFrame < 0) return null;

          const enter = easeOutCubic(clamp01(localFrame / 25));
          const alpha = enter;

          const col = i % GRID_COLS;
          const row = Math.floor(i / GRID_COLS);
          const x = GRID_START_X + col * (CARD_W + CARD_GAP);
          const y = GRID_START_Y + row * (CARD_H + CARD_GAP);

          const IconComponent = ICONS[i];

          return (
            <g key={i} opacity={alpha} transform={`translate(${x}, ${y + (1 - enter) * 30})`}>
              {/* Card background */}
              <rect x={0} y={0} width={CARD_W} height={CARD_H}
                rx={8} ry={8}
                fill={THEME.canvas.panel} stroke={item.color} strokeWidth={2}
                strokeOpacity={0.6} />

              {/* Number badge */}
              <circle cx={24} cy={24} r={14} fill={item.color} fillOpacity={0.2} stroke={item.color} strokeWidth={1.5} />
              <text x={24} y={28} textAnchor="middle" fill={item.color} fontSize={14} fontWeight={700} fontFamily="Inter, sans-serif">
                {i + 1}
              </text>

              {/* SVG Icon */}
              <g transform={`translate(${CARD_W - 50}, 10) scale(1.2)`}>
                {IconComponent && <IconComponent />}
              </g>

              {/* Label */}
              <text x={50} y={30} fill={item.color} fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">
                {item.label}
              </text>

              {/* Description */}
              <text x={50} y={55} fill={T.muted} fontSize={13} fontFamily="Inter, sans-serif">
                {item.description}
              </text>

              {/* Bottom accent line */}
              <line x1={12} y1={CARD_H - 8} x2={CARD_W - 12} y2={CARD_H - 8}
                stroke={item.color} strokeWidth={1.5} strokeOpacity={0.3} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

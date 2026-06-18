// Segment 8: ProblemList — 6 common I/O design problems
// Rapid-fire list with slide-in animation

import React from "react";
import { AbsoluteFill, useCurrentFrame, Sequence } from "remotion";
import { THEME } from "../../theme";
import { clamp01, easeOutCubic } from "../../motion/utils";
import type { ProblemListSpec, ProblemItem } from "../types";

const T = THEME.text;
const VW = 1280;
const VH = 720;

const defaultItems: ProblemItem[] = [
  { icon: "⚡", label: "电平不兼容", description: "1.8V × 3.3V — 电平不匹配导致误触发或损坏", color: "#ef4444" },
  { icon: "📉", label: "驱动不足", description: "大负载电容导致边沿缓慢，时序违例", color: "#fbbf24" },
  { icon: "〰️", label: "过冲与振铃", description: "阻抗不匹配引起信号反射", color: "#f97316" },
  { icon: "💥", label: "总线争用", description: "两个输出同时驱动，电流过大", color: "#ef4444" },
  { icon: "🛡️", label: "ESD 风险", description: "无保护引脚被静电击穿", color: "#a78bfa" },
  { icon: "📡", label: "串扰噪声", description: "长平行走线耦合干扰信号", color: "#60a5fa" },
];

const defaultSpec: ProblemListSpec = {
  items: defaultItems,
  itemFrames: 90,
};

const ProblemItemRow: React.FC<{ item: ProblemItem; frame: number }> = ({ item, frame }) => {
  const enter = easeOutCubic(clamp01(frame / 20));
  const exit = frame > 70 ? 1 - clamp01((frame - 70) / 20) : 1;
  const alpha = enter * exit;

  const tx = (1 - enter) * -200;

  return (
    <g opacity={alpha} transform={`translate(${tx}, 0)`}>
      <text x={0} y={0} fontSize={24} fontFamily="Inter, sans-serif">
        {item.icon}
      </text>
      <text x={45} y={0} fill={item.color} fontSize={18} fontWeight={700} fontFamily="Inter, sans-serif"
        dominantBaseline="central">
        {item.label}
      </text>
      <text x={45} y={24} fill={T.muted} fontSize={13} fontFamily="Inter, sans-serif">
        {item.description}
      </text>
    </g>
  );
};

export const ProblemList: React.FC<{ spec?: ProblemListSpec }> = ({ spec: customSpec }) => {
  const spec = customSpec ?? defaultSpec;
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        {/* Title */}
        <text x={VW / 2} y={50} textAnchor="middle" fill={T.primary} fontSize={20} fontWeight={700} fontFamily="Inter, sans-serif">
          常见 I/O 设计问题
        </text>

        {/* Items */}
        {spec.items.map((item, i) => {
          const itemStart = i * spec.itemFrames;
          const localFrame = frame - itemStart;

          if (localFrame < 0) return null;

          const yBase = 130 + i * 90;

          return (
            <g key={i} transform={`translate(200, ${yBase})`}>
              <ProblemItemRow item={item} frame={localFrame} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// Segment 1: ProblemStatement — CalloutDemoScene reuse
// Shows Core → Pad → PCB with 4 risk callouts

import React from "react";
import { AbsoluteFill } from "remotion";
import { CalloutDemoScene } from "../../callout-demo/CalloutDemoScene";
import type { CalloutDemoSpec } from "../../callout-demo/types";

const CORE_COLOR = "#a78bfa";
const PAD_COLOR = "#fbbf24";
const PCB_COLOR = "#34d399";
const RISK_COLOR = "#f87171";

const spec: CalloutDemoSpec = {
  title: "芯片内部已经产生了 0 和 1，为什么不能直接连到引脚？",
  durationInFrames: 420,
  fps: 60,
  diagram: {
    nodes: [
      { id: "core", x: 180, y: 280, w: 220, h: 140, label: "Core Logic", color: CORE_COLOR },
      { id: "pad", x: 530, y: 280, w: 220, h: 140, label: "Pad", color: PAD_COLOR },
      { id: "pcb", x: 880, y: 280, w: 220, h: 140, label: "PCB", color: PCB_COLOR },
    ],
  },
  callouts: [
    {
      id: "voltage",
      targetX: 400,
      targetY: 320,
      label: "电平不同",
      sublabel: "0.8V vs 3.3V",
      preferredQuadrant: "top-left",
      color: RISK_COLOR,
      startFrame: 60,
    },
    {
      id: "drive",
      targetX: 640,
      targetY: 380,
      label: "驱动不足",
      sublabel: "核心晶体管能力弱",
      preferredQuadrant: "bottom-left",
      color: RISK_COLOR,
      startFrame: 120,
    },
    {
      id: "noise",
      targetX: 990,
      targetY: 320,
      label: "外部噪声",
      sublabel: "PCB 走线拾取干扰",
      preferredQuadrant: "top-right",
      color: RISK_COLOR,
      startFrame: 180,
    },
    {
      id: "esd",
      targetX: 640,
      targetY: 280,
      label: "静电冲击",
      sublabel: "ESD 远超工作电压",
      preferredQuadrant: "top-left",
      color: RISK_COLOR,
      dx: 0,
      dy: -60,
      startFrame: 240,
    },
  ],
  connectors: [
    {
      id: "core-pad",
      fromX: 400,
      fromY: 350,
      toX: 530,
      toY: 350,
      color: CORE_COLOR,
      direction: "forward",
      animated: true,
      startFrame: 30,
    },
    {
      id: "pad-pcb",
      fromX: 750,
      fromY: 350,
      toX: 880,
      toY: 350,
      color: PCB_COLOR,
      direction: "forward",
      animated: true,
      startFrame: 30,
    },
  ],
};

export const ProblemStatement: React.FC<{ spec?: CalloutDemoSpec }> = ({ spec: customSpec }) => {
  return (
    <AbsoluteFill>
      <CalloutDemoScene spec={customSpec ?? spec} />
    </AbsoluteFill>
  );
};

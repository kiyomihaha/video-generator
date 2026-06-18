// Segment 2: IOBoundary — LayeredArchitecture reuse
// Shows the I/O path: External ↔ Pad ↔ I/O Cell ↔ Core Logic

import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { LayeredArchitectureScene } from "../../scenes/LayeredArchitectureScene";
import { computeLASchedule } from "../../motion/layered-architecture/laSchedule";
import type { LayeredArchitectureSpec } from "../../motion/layered-architecture/types";

const ioBoundarySpec: LayeredArchitectureSpec = {
  width: 1280,
  height: 720,
  layerWidth: 700,
  layerHeight: 90,
  layerGap: 20,
  buildOrder: "top-down",
  layers: [
    { id: "external", label: "External Devices", description: "按键 · 传感器 · 存储器 · 显示屏", color: "#34d399" },
    { id: "pad", label: "Pad", description: "金属焊盘 — 芯片与 PCB 的物理连接点", color: "#fbbf24" },
    { id: "io-cell", label: "I/O Cell", description: "输入缓冲 · 输出驱动 · OE · 上拉下拉 · ESD", color: "#60a5fa" },
    { id: "core", label: "Core Logic", description: "数字逻辑核心", color: "#a78bfa" },
  ],
  beats: [0, 1, 2, 3],
  timeline: [
    // Beat 0-1: layers enter one by one
    { beat: 0, type: "enter" as const, layerId: "external" },
    { beat: 1, type: "enter" as const, layerId: "pad" },
    { beat: 2, type: "enter" as const, layerId: "io-cell" },
    { beat: 3, type: "enter" as const, layerId: "core" },
    // Beat 4: I/O Cell highlights
    { beat: 4, type: "highlight" as const, layerId: "io-cell" },
    // Beat 5: data flow arrows
    { beat: 5, type: "data-flow" as const, layerId: "external", targetLayerId: "pad" },
    { beat: 5, type: "data-flow" as const, layerId: "pad", targetLayerId: "io-cell" },
    { beat: 5, type: "data-flow" as const, layerId: "io-cell", targetLayerId: "core" },
    // Beat 6: callout for I/O Cell sub-modules
    { beat: 6, type: "callout" as const, layerId: "io-cell", label: "5 个子模块协同工作" },
    // Beat 7: reverse data flow
    { beat: 7, type: "data-flow" as const, layerId: "core", targetLayerId: "io-cell" },
    { beat: 7, type: "data-flow" as const, layerId: "io-cell", targetLayerId: "pad" },
    { beat: 7, type: "data-flow" as const, layerId: "pad", targetLayerId: "external" },
  ],
};

export const IOBoundary: React.FC<{ spec?: LayeredArchitectureSpec }> = ({ spec: customSpec }) => {
  const resolved = customSpec ?? ioBoundarySpec;
  const schedule = useMemo(() => computeLASchedule(resolved, 60), [resolved]);
  return (
    <AbsoluteFill>
      <LayeredArchitectureScene schedule={schedule} />
    </AbsoluteFill>
  );
};

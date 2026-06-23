// Segment 1: Overview — NVMe read path introduction

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { THEME } from "../../theme";
import { NVMeTopology, TOPO } from "../base/NVMeTopology";
import { clamp01, easeOutCubic } from "../../motion/utils";

const T = THEME.text;

export const Overview: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in the topology
  const topoOpacity = easeOutCubic(clamp01(frame / 60));

  // Title appears at 1s
  const titleOpacity = frame >= 60 ? easeOutCubic(clamp01((frame - 60) / 40)) : 0;

  // Flow arrows appear at 2s
  const flowOpacity = frame >= 120 ? easeOutCubic(clamp01((frame - 120) / 40)) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <div style={{ opacity: topoOpacity, width: "100%", height: "100%" }}>
        <NVMeTopology
          highlight={["host", "memory", "pcie", "controller", "namespace"]}
          flows={[
            { from: "host", to: "memory", label: "Submit", color: THEME.nvme.host },
            { from: "memory", to: "pcie", label: "Doorbell", color: THEME.nvme.doorbell },
            { from: "pcie", to: "controller", label: "DMA", color: THEME.nvme.pcie },
            { from: "controller", to: "namespace", label: "Read", color: THEME.nvme.storage },
          ]}
        />
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: TOPO.titleY, left: 0, right: 0,
        textAlign: "center", opacity: titleOpacity,
      }}>
        <span style={{
          color: T.bright, fontSize: 22, fontWeight: 700,
          fontFamily: "Inter, sans-serif",
        }}>
          一次 NVMe 读取的完整路径
        </span>
      </div>

      {/* Flow explanation */}
      {flowOpacity > 0 && (
        <div style={{
          position: "absolute", bottom: TOPO.subtitleTop - 40, left: 0, right: 0,
          textAlign: "center", opacity: flowOpacity,
        }}>
          <span style={{
            color: T.muted, fontSize: 14,
            fontFamily: "Inter, sans-serif",
          }}>
            Host Memory → Doorbell → Controller → Storage → DMA → Completion
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};

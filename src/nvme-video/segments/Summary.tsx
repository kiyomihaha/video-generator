// Segment 11: Summary — NVMe high-performance factors

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { THEME } from "../../theme";
import { NVMeTopology, TOPO } from "../base/NVMeTopology";
import { clamp01, easeOutCubic } from "../../motion/utils";

const T = THEME.text;

export const Summary: React.FC = () => {
  const frame = useCurrentFrame();
  const totalFrames = 720;

  // Progressive reveal of key points
  const point1 = frame >= 30 ? easeOutCubic(clamp01((frame - 30) / 40)) : 0;
  const point2 = frame >= 90 ? easeOutCubic(clamp01((frame - 90) / 40)) : 0;
  const point3 = frame >= 150 ? easeOutCubic(clamp01((frame - 150) / 40)) : 0;
  const point4 = frame >= 210 ? easeOutCubic(clamp01((frame - 210) / 40)) : 0;

  // Final title
  const titleOpacity = frame >= 300 ? easeOutCubic(clamp01((frame - 300) / 60)) : 0;
  const titleY = 440 - titleOpacity * 16;

  // Fade out
  const fadeOut = frame >= totalFrames - 30
    ? 1 - clamp01((frame - (totalFrames - 30)) / 30)
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg, opacity: fadeOut }}>
      <NVMeTopology
        highlight={["host", "memory", "pcie", "controller", "namespace"]}
      />

      {/* Key points */}
      <div style={{ position: "absolute", top: 120, left: 80, right: 80 }}>
        {[
          { opacity: point1, text: "命令队列位于共享内存", color: THEME.nvme.memory },
          { opacity: point2, text: "Doorbell 只负责通知", color: THEME.nvme.doorbell },
          { opacity: point3, text: "数据通过 DMA 直接搬运", color: THEME.nvme.pcie },
          { opacity: point4, text: "多组队列可以并行工作", color: THEME.nvme.controller },
        ].map((p, i) => (
          <div key={i} style={{
            opacity: p.opacity, marginBottom: 16,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: p.color,
            }} />
            <span style={{
              color: T.bright, fontSize: 18, fontWeight: 500,
              fontFamily: "Inter, sans-serif",
            }}>
              {p.text}
            </span>
          </div>
        ))}
      </div>

      {/* Final title */}
      {titleOpacity > 0 && (
        <div style={{
          position: "absolute", top: titleY, left: 0, right: 0,
          textAlign: "center", opacity: titleOpacity,
        }}>
          <div style={{
            color: T.bright, fontSize: 48, fontWeight: 700,
            fontFamily: "Inter, sans-serif",
          }}>
            NVMe
          </div>
          <div style={{
            color: T.primary, fontSize: 24, fontWeight: 400,
            fontFamily: "'Noto Sans SC', sans-serif",
            marginTop: 18,
          }}>
            一次请求的完整旅程
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

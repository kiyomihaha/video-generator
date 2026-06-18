// Segment 3: IODirectConnection — Core vs External comparison
// Shows why direct connection is dangerous: voltage mismatch, weak drive, noise

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { THEME } from "../../theme";
import { ChipBlock } from "../base/ChipBlock";
import { clamp01, easeOutCubic } from "../../motion/utils";
import type { DirectConnectionSpec } from "../types";

const T = THEME.text;
const VW = 1280;
const VH = 720;

export const IODirectConnection: React.FC<{ spec?: DirectConnectionSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();

  // Phase timing
  const phase1End = 90;    // show both sides
  const phase2End = 180;   // red prohibition
  const phase3End = 480;   // consequences (slow edge + noise)
  const phase4End = 720;   // fade out

  const phase1 = clamp01(frame / 60);
  const phase2 = frame >= 80 ? clamp01((frame - 80) / 60) : 0;
  const phase3 = frame >= 170 ? clamp01((frame - 170) / 60) : 0;

  // Slow edge wave animation
  const waveProgress = frame >= 200 ? (frame - 200) / 200 : 0;
  const waveX = 300 + waveProgress * 680;

  // Noise pulse
  const noiseFrame = frame >= 350 ? frame - 350 : 0;
  const noiseVisible = noiseFrame > 0 && noiseFrame < 150;
  const noiseAlpha = noiseVisible ? Math.sin(noiseFrame * 0.3) * 0.5 + 0.5 : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        {/* Section title */}
        <text x={VW / 2} y={50} textAnchor="middle" fill={T.primary} fontSize={20} fontWeight={700} fontFamily="Inter, sans-serif">
          为什么核心逻辑不能直接连接引脚？
        </text>

        {/* Core side */}
        <g opacity={easeOutCubic(phase1)}>
          <ChipBlock x={180} y={180} width={240} height={180} label="Core Logic" color="#a78bfa" />
          {/* Attributes */}
          <text x={300} y={400} textAnchor="middle" fill="#a78bfa" fontSize={14} fontFamily="Inter, sans-serif">0.8V 供电</text>
          <text x={300} y={422} textAnchor="middle" fill="#a78bfa" fontSize={14} fontFamily="Inter, sans-serif">弱驱动能力</text>
          <text x={300} y={444} textAnchor="middle" fill="#a78bfa" fontSize={14} fontFamily="Inter, sans-serif">对噪声敏感</text>
        </g>

        {/* External side */}
        <g opacity={easeOutCubic(phase1)}>
          <ChipBlock x={860} y={180} width={240} height={180} label="External" color="#34d399" />
          <text x={980} y={400} textAnchor="middle" fill="#34d399" fontSize={14} fontFamily="Inter, sans-serif">3.3V 接口</text>
          <text x={980} y={422} textAnchor="middle" fill="#34d399" fontSize={14} fontFamily="Inter, sans-serif">大负载电容</text>
          <text x={980} y={444} textAnchor="middle" fill="#34d399" fontSize={14} fontFamily="Inter, sans-serif">有电气噪声</text>
        </g>

        {/* Red prohibition sign */}
        <g opacity={easeOutCubic(phase2)}>
          <line x1={480} y1={220} x2={800} y2={380} stroke="#ef4444" strokeWidth={6} strokeLinecap="round" />
          <line x1={800} y1={220} x2={480} y2={380} stroke="#ef4444" strokeWidth={6} strokeLinecap="round" />
          <circle cx={640} cy={300} r={100} fill="none" stroke="#ef4444" strokeWidth={5} />
          <text x={640} y={310} textAnchor="middle" fill="#ef4444" fontSize={24} fontWeight={700} fontFamily="Inter, sans-serif">
            禁止直连
          </text>
        </g>

        {/* Consequence: slow edge waveform */}
        {phase3 > 0 && (
          <g opacity={easeOutCubic(phase3)}>
            <text x={VW / 2} y={530} textAnchor="middle" fill={T.muted} fontSize={14} fontFamily="Inter, sans-serif">
              直连后果：慢边沿 + 噪声穿透
            </text>

            {/* Slow rising edge */}
            <path
              d={`M200,650 L${Math.min(waveX, 500)},650 L${Math.min(waveX + 100, 600)},570 L${Math.min(waveX + 200, 880)},570`}
              fill="none" stroke="#fbbf24" strokeWidth={2.5}
              opacity={waveProgress > 0 ? 1 : 0}
            />

            {/* Ideal fast edge (dashed, for comparison) */}
            <path
              d="M200,650 L500,650 L510,570 L880,570"
              fill="none" stroke="#a78bfa" strokeWidth={1.5}
              strokeDasharray="6 4" opacity={0.5}
            />

            {/* Noise overlay */}
            {noiseVisible && (
              <g opacity={noiseAlpha * 0.8}>
                {Array.from({ length: 20 }, (_, i) => {
                  const nx = 300 + i * 30;
                  const ny = 600 + Math.sin(i * 2.3 + noiseFrame * 0.5) * 25;
                  return (
                    <line key={i} x1={nx} y1={600} x2={nx} y2={ny}
                      stroke="#ef4444" strokeWidth={1.5} opacity={0.6}
                    />
                  );
                })}
              </g>
            )}

            {/* Labels */}
            <text x={250} y={690} fill="#a78bfa" fontSize={11} fontFamily="Inter, sans-serif">理想边沿</text>
            <text x={600} y={690} fill="#fbbf24" fontSize={11} fontFamily="Inter, sans-serif">实际边沿（慢）</text>
            <text x={850} y={690} fill="#ef4444" fontSize={11} fontFamily="Inter, sans-serif">噪声</text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

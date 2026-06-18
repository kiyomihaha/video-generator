// Segment 7: IOESDProtection — ESD clamp diodes and discharge path
// Shows ESD pulse hitting Pad, current diverted to VDD/VSS via diodes

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { THEME } from "../../theme";
import { PadBlock } from "../base/PadBlock";
import { ChipBlock } from "../base/ChipBlock";
import { CurrentArrow } from "../base/CurrentArrow";
import { clamp01, easeOutCubic } from "../../motion/utils";
import type { ESDProtectionSpec } from "../types";

const T = THEME.text;
const VW = 1280;
const VH = 720;

const defaultSpec: ESDProtectionSpec = {
  phaseFrames: 135, // 4 phases × ~135f = 540f total
};

export const IOESDProtection: React.FC<{ spec?: ESDProtectionSpec }> = ({ spec: customSpec }) => {
  const spec = customSpec ?? defaultSpec;
  const frame = useCurrentFrame();
  const pf = spec.phaseFrames;

  const phaseIndex = Math.min(Math.floor(frame / pf), 3);
  const phaseFrame = frame - phaseIndex * pf;
  const p = easeOutCubic(clamp01(phaseFrame / 50));

  // Layout
  const padCX = 640;
  const padCY = 360;
  const vddY = 100;
  const vssY = 620;
  const coreCX = 950;
  const coreCY = 360;
  const diodeSize = 30;

  // ESD pulse animation
  const pulseProgress = phaseIndex === 0 ? p : (phaseIndex > 0 ? 1 : 0);
  const pulseR = pulseProgress * 60;

  // Diode conduction
  const diodeConducting = phaseIndex >= 1;
  const diodeAlpha = phaseIndex === 1 ? p : (phaseIndex >= 2 ? 1 : 0);

  // Shield
  const shieldAlpha = phaseIndex === 2 ? p : (phaseIndex === 3 ? 1 - p * 0.5 : 0);

  // Recovery
  const recovery = phaseIndex === 3;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        {/* Title */}
        <text x={VW / 2} y={40} textAnchor="middle" fill={T.primary} fontSize={20} fontWeight={700} fontFamily="Inter, sans-serif">
          ESD 保护 — 静电泄放路径
        </text>

        {/* VDD rail */}
        <line x1={padCX} y1={vddY} x2={padCX} y2={padCY - 120} stroke="#ef4444" strokeWidth={3} />
        <text x={padCX + 15} y={vddY + 20} fill="#ef4444" fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">VDD</text>

        {/* D1 (top diode — anode at pad, cathode at VDD) */}
        <g opacity={diodeAlpha}>
          <polygon
            points={`${padCX},${padCY - 90} ${padCX - 12},${padCY - 120} ${padCX + 12},${padCY - 120}`}
            fill={diodeConducting ? "#ef4444" : "#475569"} fillOpacity={0.5}
            stroke={diodeConducting ? "#ef4444" : "#475569"} strokeWidth={1.5}
          />
          <line x1={padCX - 12} y1={padCY - 90} x2={padCX + 12} y2={padCY - 90}
            stroke={diodeConducting ? "#ef4444" : "#475569"} strokeWidth={2} />
          <text x={padCX + 25} y={padCY - 100} fill={diodeConducting ? "#ef4444" : T.muted} fontSize={11} fontFamily="Inter, sans-serif">
            D1
          </text>
        </g>

        {/* D2 (bottom diode — cathode at pad, anode at VSS) */}
        <g opacity={diodeAlpha}>
          <polygon
            points={`${padCX},${padCY + 90} ${padCX - 12},${padCY + 120} ${padCX + 12},${padCY + 120}`}
            fill={diodeConducting ? "#3b82f6" : "#475569"} fillOpacity={0.5}
            stroke={diodeConducting ? "#3b82f6" : "#475569"} strokeWidth={1.5}
          />
          <line x1={padCX - 12} y1={padCY + 90} x2={padCX + 12} y2={padCY + 90}
            stroke={diodeConducting ? "#3b82f6" : "#475569"} strokeWidth={2} />
          <text x={padCX + 25} y={padCY + 105} fill={diodeConducting ? "#3b82f6" : T.muted} fontSize={11} fontFamily="Inter, sans-serif">
            D2
          </text>
        </g>

        {/* VSS rail */}
        <line x1={padCX} y1={padCY + 120} x2={padCX} y2={vssY} stroke="#3b82f6" strokeWidth={3} />
        <text x={padCX + 15} y={vssY - 10} fill="#3b82f6" fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">VSS</text>

        {/* Pad */}
        <PadBlock cx={padCX} cy={padCY} width={90} height={45} label="Pad" color="#fbbf24" />

        {/* Pad → Core connection */}
        <line x1={padCX + 45} y1={padCY} x2={coreCX - 80} y2={padCY} stroke={T.muted} strokeWidth={2} />

        {/* Core */}
        <ChipBlock x={coreCX - 80} y={coreCY - 50} width={160} height={100} label="Core" color="#a78bfa" />

        {/* ESD pulse (phase 0) */}
        {phaseIndex === 0 && (
          <g>
            {/* Pulse wavefront */}
            <circle cx={padCX - 100} cy={padCY} r={pulseR} fill="none" stroke="#ef4444" strokeWidth={3}
              opacity={1 - pulseProgress * 0.5} />
            <circle cx={padCX - 100} cy={padCY} r={pulseR * 0.6} fill="#ef4444" fillOpacity={0.15} />

            {/* ESD source icon */}
            <text x={padCX - 100} y={padCY - 70} textAnchor="middle" fill="#ef4444" fontSize={28} fontFamily="Inter, sans-serif">
              ⚡
            </text>
            <text x={padCX - 100} y={padCY - 45} textAnchor="middle" fill="#ef4444" fontSize={12} fontWeight={600} fontFamily="Inter, sans-serif">
              ESD
            </text>
          </g>
        )}

        {/* Current arrows through diodes (phase 1+) */}
        {phaseIndex >= 1 && (
          <g>
            <CurrentArrow x1={padCX} y1={padCY - 45} x2={padCX} y2={vddY + 20}
              color="#ef4444" progress={diodeAlpha} opacity={diodeAlpha} />
            <CurrentArrow x1={padCX} y1={padCY + 45} x2={padCX} y2={vssY - 20}
              color="#3b82f6" progress={diodeAlpha} opacity={diodeAlpha} />
          </g>
        )}

        {/* Shield around Core (phase 2+) */}
        {shieldAlpha > 0 && (
          <g opacity={shieldAlpha}>
            <rect x={coreCX - 100} y={coreCY - 70} width={200} height={140}
              rx={12} ry={12} fill="none" stroke="#a78bfa" strokeWidth={3} strokeDasharray="8 4" />
            <text x={coreCX} y={coreCY - 75} textAnchor="middle" fill="#a78bfa" fontSize={12} fontWeight={600} fontFamily="Inter, sans-serif">
              🛡️ Protected
            </text>
          </g>
        )}

        {/* Phase label */}
        <text x={VW / 2} y={VH - 40} textAnchor="middle" fill={T.bright} fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
          {phaseIndex === 0 && "① 静电脉冲击中 Pad"}
          {phaseIndex === 1 && "② 钳位二极管导通，电流泄放到 VDD/VSS"}
          {phaseIndex === 2 && "③ Core 前形成保护屏障"}
          {phaseIndex === 3 && "④ 能量泄放完毕，恢复正常"}
        </text>
      </svg>
    </AbsoluteFill>
  );
};

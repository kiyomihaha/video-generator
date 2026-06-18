// Segment 7: IOESDProtection — ESD clamp diodes and discharge path
// Phase 0: ESD pulse hits Pad
// Phase 1: Positive ESD → D1 conducts to VDD
// Phase 2: Negative ESD → D2 conducts to VSS
// Phase 3: Recovery

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

  // ESD pulse animation (phase 0)
  const pulseProgress = phaseIndex === 0 ? p : (phaseIndex > 0 ? 1 : 0);

  // Phase 1: positive ESD → D1 conducts
  const d1Conducting = phaseIndex === 1;
  const d1Alpha = phaseIndex === 1 ? p : 0;

  // Phase 2: negative ESD → D2 conducts
  const d2Conducting = phaseIndex === 2;
  const d2Alpha = phaseIndex === 2 ? p : 0;

  // Phase 3: recovery
  const recoveryAlpha = phaseIndex === 3 ? p : 0;

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
        {/* Triangle pointing up (anode at bottom, cathode at top) */}
        <polygon
          points={`${padCX},${padCY - 80} ${padCX - 12},${padCY - 110} ${padCX + 12},${padCY - 110}`}
          fill={d1Conducting ? "#ef4444" : "#475569"} fillOpacity={d1Conducting ? 0.6 : 0.2}
          stroke={d1Conducting ? "#ef4444" : "#475569"} strokeWidth={1.5}
        />
        <line x1={padCX - 12} y1={padCY - 80} x2={padCX + 12} y2={padCY - 80}
          stroke={d1Conducting ? "#ef4444" : "#475569"} strokeWidth={2} />
        <text x={padCX + 25} y={padCY - 90} fill={d1Conducting ? "#ef4444" : T.muted} fontSize={12} fontFamily="Inter, sans-serif">
          D1
        </text>

        {/* D2 (bottom diode — cathode at pad, anode at VSS) */}
        {/* Triangle pointing down (anode at top, cathode at bottom) */}
        <polygon
          points={`${padCX},${padCY + 80} ${padCX - 12},${padCY + 110} ${padCX + 12},${padCY + 110}`}
          fill={d2Conducting ? "#3b82f6" : "#475569"} fillOpacity={d2Conducting ? 0.6 : 0.2}
          stroke={d2Conducting ? "#3b82f6" : "#475569"} strokeWidth={1.5}
        />
        <line x1={padCX - 12} y1={padCY + 80} x2={padCX + 12} y2={padCY + 80}
          stroke={d2Conducting ? "#3b82f6" : "#475569"} strokeWidth={2} />
        <text x={padCX + 25} y={padCY + 95} fill={d2Conducting ? "#3b82f6" : T.muted} fontSize={12} fontFamily="Inter, sans-serif">
          D2
        </text>

        {/* VSS rail */}
        <line x1={padCX} y1={padCY + 120} x2={padCX} y2={vssY} stroke="#3b82f6" strokeWidth={3} />
        <text x={padCX + 15} y={vssY - 10} fill="#3b82f6" fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">VSS</text>

        {/* Pad */}
        <PadBlock cx={padCX} cy={padCY} width={90} height={45} label="Pad" color="#fbbf24" />

        {/* Pad → Core connection */}
        <line x1={padCX + 45} y1={padCY} x2={coreCX - 80} y2={padCY} stroke={T.muted} strokeWidth={2} />

        {/* Core */}
        <ChipBlock x={coreCX - 80} y={coreCY - 50} width={160} height={100} label="Core" color="#a78bfa" />

        {/* ── Phase 0: ESD pulse hits Pad ── */}
        {phaseIndex === 0 && (
          <g>
            <circle cx={padCX - 120} cy={padCY} r={pulseProgress * 60} fill="none" stroke="#ef4444" strokeWidth={3}
              opacity={1 - pulseProgress * 0.5} />
            <circle cx={padCX - 120} cy={padCY} r={pulseProgress * 35} fill="#ef4444" fillOpacity={0.15} />
            <text x={padCX - 120} y={padCY - 70} textAnchor="middle" fill="#ef4444" fontSize={28} fontFamily="Inter, sans-serif">
              ⚡
            </text>
            <text x={padCX - 120} y={padCY - 45} textAnchor="middle" fill="#ef4444" fontSize={13} fontWeight={600} fontFamily="Inter, sans-serif">
              ESD 脉冲
            </text>
          </g>
        )}

        {/* ── Phase 1: Positive ESD → D1 conducts to VDD ── */}
        {phaseIndex === 1 && (
          <g>
            <text x={VW / 2} y={80} textAnchor="middle" fill="#ef4444" fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
              正向 ESD：D1 导通，电流泄放到 VDD
            </text>
            <CurrentArrow x1={padCX} y1={padCY - 45} x2={padCX} y2={vddY + 20}
              color="#ef4444" progress={d1Alpha} opacity={d1Alpha} strokeWidth={3} />
            {/* D1 glow */}
            <circle cx={padCX} cy={padCY - 95} r={20} fill="#ef4444" fillOpacity={d1Alpha * 0.3} />
          </g>
        )}

        {/* ── Phase 2: Negative ESD → D2 conducts to VSS ── */}
        {phaseIndex === 2 && (
          <g>
            <text x={VW / 2} y={80} textAnchor="middle" fill="#3b82f6" fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
              负向 ESD：D2 导通，电流泄放到 VSS
            </text>
            <CurrentArrow x1={padCX} y1={padCY + 45} x2={padCX} y2={vssY - 20}
              color="#3b82f6" progress={d2Alpha} opacity={d2Alpha} strokeWidth={3} />
            {/* D2 glow */}
            <circle cx={padCX} cy={padCY + 95} r={20} fill="#3b82f6" fillOpacity={d2Alpha * 0.3} />
          </g>
        )}

        {/* ── Phase 3: Recovery ── */}
        {phaseIndex === 3 && (
          <g opacity={recoveryAlpha}>
            {/* Shield around Core */}
            <rect x={coreCX - 100} y={coreCY - 70} width={200} height={140}
              rx={12} ry={12} fill="none" stroke="#a78bfa" strokeWidth={3} strokeDasharray="8 4" />
            <text x={coreCX} y={coreCY - 75} textAnchor="middle" fill="#a78bfa" fontSize={13} fontWeight={600} fontFamily="Inter, sans-serif">
              🛡️ Protected
            </text>
            <text x={VW / 2} y={VH - 40} textAnchor="middle" fill="#34d399" fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
              能量泄放完毕，核心器件安全
            </text>
          </g>
        )}

        {/* Phase label (except recovery which has its own) */}
        {phaseIndex < 3 && (
          <text x={VW / 2} y={VH - 40} textAnchor="middle" fill={T.bright} fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
            {phaseIndex === 0 && "① 静电脉冲击中 Pad"}
            {phaseIndex === 1 && "② 正向冲击：D1 导通 → VDD 泄放"}
            {phaseIndex === 2 && "③ 负向冲击：D2 导通 → VSS 泄放"}
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
};

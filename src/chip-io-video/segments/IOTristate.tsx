// Segment 6: IOTristate — Tri-state output with OE control
// Shows PMOS/NMOS with output enable, high-Z state, bidirectional I/O

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { THEME } from "../../theme";
import { MosSwitch } from "../base/MosSwitch";
import { PadBlock } from "../base/PadBlock";
import { clamp01, easeOutCubic } from "../../motion/utils";
import type { TristateSpec } from "../types";

const T = THEME.text;
const VW = 1280;
const VH = 720;

const defaultSpec: TristateSpec = {
  phases: [
    { label: "OE=1, DATA=0 → NMOS 导通, Pad=0", oe: 1, data: 0, padOutput: 0 },
    { label: "OE=1, DATA=1 → PMOS 导通, Pad=1", oe: 1, data: 1, padOutput: 1 },
    { label: "OE=0 → 高阻态 Z, 引脚断开", oe: 0, data: "Z", padOutput: "Z" },
  ],
  phaseFrames: 260,
};

export const IOTristate: React.FC<{ spec?: TristateSpec }> = ({ spec: customSpec }) => {
  const spec = customSpec ?? defaultSpec;
  const frame = useCurrentFrame();
  const pf = spec.phaseFrames;

  const phaseIndex = Math.min(Math.floor(frame / pf), spec.phases.length - 1);
  const phase = spec.phases[phaseIndex];
  const phaseFrame = frame - phaseIndex * pf;
  const phaseProgress = easeOutCubic(clamp01(phaseFrame / 50));

  const isHighZ = phase.padOutput === "Z";
  const pmosOn = phase.oe === 1 && phase.data === 1;
  const nmosOn = phase.oe === 1 && phase.data === 0;

  // Layout
  const mosCX = 450;
  const pmosCY = 240;
  const nmosCY = 420;
  const padCX = 750;
  const padCY = (pmosCY + nmosCY) / 2;

  // OE control signal visualization
  const oeColor = phase.oe ? "#34d399" : "#94a3b8";

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        {/* Title */}
        <text x={VW / 2} y={40} textAnchor="middle" fill={T.primary} fontSize={20} fontWeight={700} fontFamily="Inter, sans-serif">
          三态输出与双向 I/O
        </text>

        {/* VDD rail */}
        <line x1={mosCX} y1={80} x2={mosCX} y2={pmosCY - 25} stroke="#ef4444" strokeWidth={2} />
        <text x={mosCX + 15} y={95} fill="#ef4444" fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">VDD</text>

        {/* PMOS with OE gate */}
        <MosSwitch cx={mosCX} cy={pmosCY} type="pmos" conducting={pmosOn} />
        {/* OE label on gate */}
        <text x={mosCX - 70} y={pmosCY - 5} fill={oeColor} fontSize={12} fontWeight={600} fontFamily="Inter, sans-serif">
          OE
        </text>

        {/* Connection to Pad */}
        <line x1={mosCX + 55} y1={pmosCY + 12} x2={mosCX + 55} y2={nmosCY - 12}
          stroke={isHighZ ? "#475569" : (pmosOn ? "#f472b6" : "#60a5fa")} strokeWidth={2}
          strokeDasharray={isHighZ ? "6 4" : "none"} />
        <line x1={mosCX + 55} y1={padCY} x2={padCX - 40} y2={padCY}
          stroke={isHighZ ? "#475569" : (pmosOn ? "#f472b6" : "#60a5fa")} strokeWidth={2}
          strokeDasharray={isHighZ ? "6 4" : "none"} />

        {/* NMOS with OE gate */}
        <MosSwitch cx={mosCX} cy={nmosCY} type="nmos" conducting={nmosOn} />
        <text x={mosCX - 70} y={nmosCY - 5} fill={oeColor} fontSize={12} fontWeight={600} fontFamily="Inter, sans-serif">
          OE
        </text>

        {/* VSS rail */}
        <line x1={mosCX} y1={nmosCY + 25} x2={mosCX} y2={620} stroke="#3b82f6" strokeWidth={2} />
        <text x={mosCX + 15} y={608} fill="#3b82f6" fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">VSS</text>

        {/* Pad */}
        <PadBlock cx={padCX} cy={padCY} width={80} height={40}
          color={isHighZ ? "#475569" : "#fbbf24"}
          label={isHighZ ? "Z" : String(phase.padOutput)} />

        {/* Pad value display */}
        <text x={padCX} y={padCY + 55} textAnchor="middle"
          fill={isHighZ ? "#94a3b8" : (phase.padOutput === 1 ? "#34d399" : "#ef4444")}
          fontSize={28} fontWeight={700} fontFamily="Inter, sans-serif">
          {isHighZ ? "Z (高阻)" : String(phase.padOutput)}
        </text>

        {/* OE signal indicator */}
        <g transform={`translate(100, 200)`}>
          <text x={0} y={0} fill={T.primary} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">OE</text>
          <rect x={0} y={10} width={80} height={30} rx={4}
            fill={phase.oe ? "#34d399" : "#475569"} fillOpacity={0.3}
            stroke={phase.oe ? "#34d399" : "#475569"} strokeWidth={1.5} />
          <text x={40} y={30} textAnchor="middle" fill={phase.oe ? "#34d399" : "#94a3b8"}
            fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">
            {phase.oe ? "1" : "0"}
          </text>
        </g>

        {/* DATA signal indicator */}
        <g transform={`translate(100, 280)`}>
          <text x={0} y={0} fill={T.primary} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">DATA</text>
          <rect x={0} y={10} width={80} height={30} rx={4}
            fill={phase.data === "Z" ? "#475569" : (phase.data ? "#34d399" : "#ef4444")} fillOpacity={0.3}
            stroke={phase.data === "Z" ? "#475569" : (phase.data ? "#34d399" : "#ef4444")} strokeWidth={1.5} />
          <text x={40} y={30} textAnchor="middle"
            fill={phase.data === "Z" ? "#94a3b8" : (phase.data ? "#34d399" : "#ef4444")}
            fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">
            {phase.data === "Z" ? "Z" : String(phase.data)}
          </text>
        </g>

        {/* Phase label */}
        <text x={VW / 2} y={VH - 60} textAnchor="middle" fill={T.bright} fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
          {phase.label}
        </text>

        {/* Application note */}
        <g opacity={phaseIndex === 2 ? phaseProgress : 0.2}>
          <text x={VW / 2} y={VH - 30} textAnchor="middle" fill={T.muted} fontSize={13} fontFamily="Inter, sans-serif">
            GPIO、存储器数据总线 — 多设备共享引脚的基础
          </text>
        </g>

        {/* High-Z visual effect: disconnected wire sparks */}
        {isHighZ && phaseProgress > 0 && (
          <g opacity={phaseProgress * 0.6}>
            {[0, 1, 2].map(i => {
              const sx = padCX - 40 + Math.sin(phaseFrame * 0.3 + i * 2) * 10;
              const sy = padCY + Math.cos(phaseFrame * 0.4 + i * 1.5) * 15;
              return (
                <circle key={i} cx={sx} cy={sy} r={3} fill="#94a3b8" opacity={0.5 + Math.sin(phaseFrame * 0.5 + i) * 0.3} />
              );
            })}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// Segment 6: IOTristate — Tri-state output with OE control
// Shows PMOS/NMOS with output enable, high-Z state
// Circuit: VDD → PMOS → output node → Pad
//          VSS → NMOS → output node
// OE controls both gates (with inverter on PMOS)

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

  // ── Circuit coordinates (same as IOOutputDriver) ──
  const mosCX = 350;
  const pmosCY = 220;
  const nmosCY = 420;
  const pmosSourceY = pmosCY - 12.5;
  const pmosDrainY = pmosCY + 12.5;
  const nmosDrainY = nmosCY - 12.5;
  const nmosSourceY = nmosCY + 12.5;
  const outputY = (pmosDrainY + nmosDrainY) / 2;
  const sdX = mosCX + 20;

  const padCX = 680;
  const vddY = 80;
  const vssY = 620;

  const oeColor = phase.oe ? "#34d399" : "#94a3b8";
  const wireColor = isHighZ ? "#475569" : (pmosOn ? "#f472b6" : "#60a5fa");

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        {/* Title */}
        <text x={VW / 2} y={40} textAnchor="middle" fill={T.primary} fontSize={20} fontWeight={700} fontFamily="Inter, sans-serif">
          三态输出与总线共享
        </text>

        {/* ── VDD → PMOS source ── */}
        <line x1={sdX} y1={vddY} x2={sdX} y2={pmosSourceY} stroke="#ef4444" strokeWidth={2} />
        <text x={sdX + 12} y={vddY + 18} fill="#ef4444" fontSize={14} fontWeight={700} fontFamily="Inter, sans-serif">VDD</text>

        {/* ── PMOS ── */}
        <MosSwitch cx={mosCX} cy={pmosCY} type="pmos" conducting={pmosOn} />
        <circle cx={mosCX - 33} cy={pmosCY} r={5} fill="none" stroke={wireColor} strokeWidth={1.5} />

        {/* ── PMOS drain → output node ── */}
        <line x1={sdX} y1={pmosDrainY} x2={sdX} y2={outputY}
          stroke={wireColor} strokeWidth={2} strokeDasharray={isHighZ ? "6 4" : "none"} />

        {/* ── NMOS drain → output node ── */}
        <line x1={sdX} y1={nmosDrainY} x2={sdX} y2={outputY}
          stroke={wireColor} strokeWidth={2} strokeDasharray={isHighZ ? "6 4" : "none"} />

        {/* ── NMOS ── */}
        <MosSwitch cx={mosCX} cy={nmosCY} type="nmos" conducting={nmosOn} />

        {/* ── NMOS source → VSS ── */}
        <line x1={sdX} y1={nmosSourceY} x2={sdX} y2={vssY} stroke="#3b82f6" strokeWidth={2} />
        <text x={sdX + 12} y={vssY - 10} fill="#3b82f6" fontSize={14} fontWeight={700} fontFamily="Inter, sans-serif">VSS</text>

        {/* ── Output node dot ── */}
        <circle cx={sdX} cy={outputY} r={4} fill={isHighZ ? "#475569" : wireColor} />

        {/* ── Output node → Pad ── */}
        <line x1={sdX} y1={outputY} x2={padCX - 40} y2={outputY}
          stroke={wireColor} strokeWidth={2.5} strokeDasharray={isHighZ ? "6 4" : "none"} />

        {/* Pad */}
        <PadBlock cx={padCX} cy={outputY} width={80} height={40}
          color={isHighZ ? "#475569" : "#fbbf24"}
          label={isHighZ ? "Z" : String(phase.padOutput)} />

        {/* Pad value display */}
        <text x={padCX} y={outputY + 55} textAnchor="middle"
          fill={isHighZ ? "#94a3b8" : (phase.padOutput === 1 ? "#34d399" : "#ef4444")}
          fontSize={28} fontWeight={700} fontFamily="Inter, sans-serif">
          {isHighZ ? "Z (高阻)" : String(phase.padOutput)}
        </text>

        {/* ── OE signal indicator ── */}
        <g transform="translate(80, 180)">
          <text x={0} y={0} fill={T.primary} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">OE</text>
          <rect x={0} y={10} width={80} height={30} rx={4}
            fill={phase.oe ? "#34d399" : "#475569"} fillOpacity={0.3}
            stroke={phase.oe ? "#34d399" : "#475569"} strokeWidth={1.5} />
          <text x={40} y={30} textAnchor="middle" fill={phase.oe ? "#34d399" : "#94a3b8"}
            fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">
            {phase.oe ? "1" : "0"}
          </text>
        </g>

        {/* ── DATA signal indicator ── */}
        <g transform="translate(80, 260)">
          <text x={0} y={0} fill={T.primary} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">DATA</text>
          <rect x={0} y={10} width={80} height={30} rx={4}
            fill={phase.data === "Z" ? "#475569" : (phase.data ? "#34d399" : "#ef4444")} fillOpacity={0.3}
            stroke={phase.data === "Z" ? "#475569" : (phase.data ? "#34d399" : "#ef4444")} strokeWidth={1.5} />
          <text x={40} y={30} textAnchor="middle"
            fill={phase.data === "Z" ? "#94a3b8" : (phase.data ? "#34d399" : "#ef4444")}
            fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">
            {phase.data === "Z" ? "X" : String(phase.data)}
          </text>
        </g>

        {/* ── OE control lines to gates ── */}
        <line x1={80} y1={210} x2={mosCX - 38} y2={pmosCY} stroke={oeColor} strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={80} y1={290} x2={mosCX - 38} y2={nmosCY} stroke={oeColor} strokeWidth={1.5} strokeDasharray="4 3" />

        {/* ── Phase label ── */}
        <text x={VW / 2} y={VH - 60} textAnchor="middle" fill={T.bright} fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
          {phase.label}
        </text>

        {/* ── Application note ── */}
        <g opacity={phaseIndex === 2 ? phaseProgress : 0.2}>
          <text x={VW / 2} y={VH - 50} textAnchor="middle" fill={T.muted} fontSize={13} fontFamily="Inter, sans-serif">
            GPIO、存储器数据总线 — 多设备共享引脚的基础
          </text>
        </g>

        {/* ── Bidirectional note during high-Z ── */}
        {isHighZ && phaseProgress > 0.3 && (
          <g opacity={(phaseProgress - 0.3) / 0.7}>
            {/* Input path: Pad → Input Buffer → Core */}
            <line x1={padCX + 40} y1={outputY} x2={padCX + 120} y2={outputY - 60}
              stroke="#34d399" strokeWidth={2} strokeDasharray="6 4" />
            <rect x={padCX + 120} y={outputY - 80} width={100} height={40} rx={6}
              fill="#34d399" fillOpacity={0.15} stroke="#34d399" strokeWidth={1.5} />
            <text x={padCX + 170} y={outputY - 55} textAnchor="middle" fill="#34d399" fontSize={12} fontWeight={600} fontFamily="Inter, sans-serif">
              Input Buffer
            </text>
            <text x={padCX + 170} y={outputY - 40} textAnchor="middle" fill="#34d399" fontSize={11} fontFamily="Inter, sans-serif">
              Pad → Core
            </text>
            <text x={VW / 2} y={VH - 25} textAnchor="middle" fill="#34d399" fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">
              OE=0 时可作为输入使用
            </text>
          </g>
        )}

        {/* ── High-Z disconnected sparks ── */}
        {isHighZ && phaseProgress > 0 && (
          <g opacity={phaseProgress * 0.6}>
            {[0, 1, 2].map(i => {
              const sx = padCX - 40 + Math.sin(phaseFrame * 0.3 + i * 2) * 10;
              const sy = outputY + Math.cos(phaseFrame * 0.4 + i * 1.5) * 15;
              return (
                <circle key={i} cx={sx} cy={sy} r={3} fill="#94a3b8"
                  opacity={0.5 + Math.sin(phaseFrame * 0.5 + i) * 0.3} />
              );
            })}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

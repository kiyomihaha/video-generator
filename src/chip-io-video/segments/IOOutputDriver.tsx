// Segment 5: IOOutputDriver — Push-pull output stage
// Shows PMOS/NMOS totem-pole driving a pad and PCB load
// Circuit topology: VDD → PMOS(source) → drain → output node → Pad → Load
//                                   NMOS(drain) → output node
//                  VSS → NMOS(source)

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { THEME } from "../../theme";
import { MosSwitch } from "../base/MosSwitch";
import { CurrentArrow } from "../base/CurrentArrow";
import { PadBlock } from "../base/PadBlock";
import { clamp01, easeOutCubic } from "../../motion/utils";
import type { OutputDriverSpec } from "../types";

const T = THEME.text;
const VW = 1280;
const VH = 720;

const defaultSpec: OutputDriverSpec = {
  phases: [
    { label: "DATA = 1 → PMOS 导通", dataValue: 1, activeMos: "pmos", currentDirection: "source" },
    { label: "DATA = 0 → NMOS 导通", dataValue: 0, activeMos: "nmos", currentDirection: "sink" },
    { label: "多负载 → 边沿变慢", dataValue: 1, activeMos: "pmos", currentDirection: "source" },
  ],
  phaseFrames: 280,
  loadCount: 3,
};

export const IOOutputDriver: React.FC<{ spec?: OutputDriverSpec }> = ({ spec: customSpec }) => {
  const spec = customSpec ?? defaultSpec;
  const frame = useCurrentFrame();
  const pf = spec.phaseFrames;

  const phaseIndex = Math.min(Math.floor(frame / pf), spec.phases.length - 1);
  const phase = spec.phases[phaseIndex];
  const phaseFrame = frame - phaseIndex * pf;
  const phaseProgress = easeOutCubic(clamp01(phaseFrame / 60));

  const pmosOn = phase.activeMos === "pmos";
  const nmosOn = phase.activeMos === "nmos";

  // ── Circuit coordinates ──
  // PMOS: center (350, 220), source=207.5, drain=232.5
  // NMOS: center (350, 420), source=407.5, drain=432.5
  // Output node: y = 325 (midpoint of PMOS drain and NMOS drain)
  const mosCX = 350;
  const pmosCY = 220;
  const nmosCY = 420;
  const pmosSourceY = pmosCY - 12.5;  // 207.5
  const pmosDrainY = pmosCY + 12.5;   // 232.5
  const nmosDrainY = nmosCY - 12.5;   // 407.5
  const nmosSourceY = nmosCY + 12.5;  // 432.5
  const outputY = (pmosDrainY + nmosDrainY) / 2;  // 320
  const sdX = mosCX + 20;  // source/drain terminal x = cx + w/2

  const padCX = 680;
  const vddY = 80;
  const vssY = 620;

  // Current arrow progress
  const currentProgress = easeOutCubic(clamp01((phaseFrame - 30) / 40));

  // Wire color based on active state
  const wireColor = pmosOn ? "#f472b6" : nmosOn ? "#60a5fa" : T.muted;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        {/* Title */}
        <text x={VW / 2} y={40} textAnchor="middle" fill={T.primary} fontSize={20} fontWeight={700} fontFamily="Inter, sans-serif">
          输出驱动器 — 推挽输出
        </text>

        {/* ── VDD rail → PMOS source ── */}
        <line x1={sdX} y1={vddY} x2={sdX} y2={pmosSourceY} stroke="#ef4444" strokeWidth={2} />
        <text x={sdX + 12} y={vddY + 18} fill="#ef4444" fontSize={14} fontWeight={700} fontFamily="Inter, sans-serif">VDD</text>

        {/* ── PMOS ── */}
        <MosSwitch cx={mosCX} cy={pmosCY} type="pmos" conducting={pmosOn} />
        {/* Inverter bubble on gate (PMOS is active-low) */}
        <circle cx={mosCX - 33} cy={pmosCY} r={5} fill="none" stroke={wireColor} strokeWidth={1.5} />

        {/* ── PMOS drain → output node ── */}
        <line x1={sdX} y1={pmosDrainY} x2={sdX} y2={outputY} stroke={wireColor} strokeWidth={2} />

        {/* ── NMOS drain → output node ── */}
        <line x1={sdX} y1={nmosDrainY} x2={sdX} y2={outputY} stroke={wireColor} strokeWidth={2} />

        {/* ── NMOS ── */}
        <MosSwitch cx={mosCX} cy={nmosCY} type="nmos" conducting={nmosOn} />

        {/* ── NMOS source → VSS ── */}
        <line x1={sdX} y1={nmosSourceY} x2={sdX} y2={vssY} stroke="#3b82f6" strokeWidth={2} />
        <text x={sdX + 12} y={vssY - 10} fill="#3b82f6" fontSize={14} fontWeight={700} fontFamily="Inter, sans-serif">VSS</text>

        {/* ── Output node → Pad ── */}
        <line x1={sdX} y1={outputY} x2={padCX - 40} y2={outputY} stroke={wireColor} strokeWidth={2.5} />

        {/* Output node dot */}
        <circle cx={sdX} cy={outputY} r={4} fill={wireColor} />

        {/* Pad */}
        <PadBlock cx={padCX} cy={outputY} width={80} height={40} label="Pad" />

        {/* Pad → PCB load */}
        <line x1={padCX + 40} y1={outputY} x2={padCX + 120} y2={outputY} stroke={T.muted} strokeWidth={2} />

        {/* PCB Load (capacitor symbol) */}
        <line x1={padCX + 120} y1={outputY - 20} x2={padCX + 120} y2={outputY + 20} stroke="#fbbf24" strokeWidth={3} />
        <line x1={padCX + 128} y1={outputY - 20} x2={padCX + 128} y2={outputY + 20} stroke="#fbbf24" strokeWidth={3} />
        <text x={padCX + 124} y={outputY + 38} textAnchor="middle" fill="#fbbf24" fontSize={12} fontFamily="Inter, sans-serif">Cload</text>

        {/* Additional loads for phase 2 */}
        {phaseIndex === 2 && spec.loadCount > 1 && Array.from({ length: spec.loadCount - 1 }, (_, i) => {
          const ly = outputY + 80 + i * 60;
          return (
            <g key={i} opacity={easeOutCubic(clamp01((phaseFrame - 60 - i * 30) / 40))}>
              <line x1={padCX} y1={outputY} x2={padCX} y2={ly} stroke={T.muted} strokeWidth={1.5} strokeDasharray="4 3" />
              <line x1={padCX} y1={ly} x2={padCX + 120} y2={ly} stroke={T.muted} strokeWidth={1.5} />
              <line x1={padCX + 120} y1={ly - 15} x2={padCX + 120} y2={ly + 15} stroke="#fbbf24" strokeWidth={2.5} />
              <line x1={padCX + 128} y1={ly - 15} x2={padCX + 128} y2={ly + 15} stroke="#fbbf24" strokeWidth={2.5} />
              <text x={padCX + 124} y={ly + 30} textAnchor="middle" fill="#fbbf24" fontSize={10} fontFamily="Inter, sans-serif">Cload</text>
            </g>
          );
        })}

        {/* ── Current arrows ── */}
        {pmosOn && (
          <>
            <CurrentArrow x1={sdX} y1={pmosSourceY} x2={sdX} y2={outputY}
              color="#f472b6" progress={currentProgress} />
            <CurrentArrow x1={sdX} y1={outputY} x2={padCX - 40} y2={outputY}
              color="#f472b6" progress={currentProgress} />
          </>
        )}
        {nmosOn && (
          <>
            <CurrentArrow x1={padCX - 40} y1={outputY} x2={sdX} y2={outputY}
              color="#60a5fa" progress={currentProgress} />
            <CurrentArrow x1={sdX} y1={outputY} x2={sdX} y2={nmosSourceY}
              color="#60a5fa" progress={currentProgress} />
          </>
        )}

        {/* ── DATA input with inverter indication ── */}
        <text x={mosCX - 80} y={pmosCY + 5} textAnchor="middle" fill={T.primary} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">
          DATA
        </text>
        <line x1={mosCX - 65} y1={pmosCY} x2={mosCX - 38} y2={pmosCY} stroke={T.muted} strokeWidth={1.5} />
        <line x1={mosCX - 65} y1={nmosCY} x2={mosCX - 38} y2={nmosCY} stroke={T.muted} strokeWidth={1.5} />
        <text x={mosCX - 80} y={(pmosCY + nmosCY) / 2} textAnchor="middle" fill={T.muted} fontSize={11} fontFamily="Inter, sans-serif">
          PMOS: !DATA
        </text>

        {/* DATA value display */}
        <text x={mosCX - 80} y={outputY} textAnchor="middle"
          fill={phase.dataValue ? "#34d399" : "#ef4444"} fontSize={22} fontWeight={700} fontFamily="Inter, sans-serif">
          {phase.dataValue}
        </text>

        {/* ── Phase label ── */}
        <text x={VW / 2} y={VH - 60} textAnchor="middle" fill={T.bright} fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
          {phase.label}
        </text>

        {/* ── Callouts ── */}
        <g opacity={phaseIndex === 0 ? currentProgress : 0.25}>
          <text x={900} y={200} fill="#f472b6" fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">Source Current</text>
          <text x={900} y={220} fill={T.muted} fontSize={12} fontFamily="Inter, sans-serif">VDD → Pad（上拉）</text>
        </g>
        <g opacity={phaseIndex === 1 ? currentProgress : 0.25}>
          <text x={900} y={440} fill="#60a5fa" fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">Sink Current</text>
          <text x={900} y={460} fill={T.muted} fontSize={12} fontFamily="Inter, sans-serif">Pad → VSS（下拉）</text>
        </g>
        {phaseIndex === 2 && (
          <g opacity={currentProgress}>
            <text x={900} y={320} fill="#fbbf24" fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">Drive Strength</text>
            <text x={900} y={340} fill={T.muted} fontSize={12} fontFamily="Inter, sans-serif">负载↑ → 边沿变慢</text>
          </g>
        )}

        {/* ── Circuit label ── */}
        <text x={mosCX} y={vddY - 15} textAnchor="middle" fill={T.muted} fontSize={11} fontFamily="Inter, sans-serif">
          CMOS Totem-Pole
        </text>
      </svg>
    </AbsoluteFill>
  );
};

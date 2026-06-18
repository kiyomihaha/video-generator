// Segment 5: IOOutputDriver — Push-pull output stage
// Shows PMOS/NMOS totem-pole driving a pad and PCB load

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
  const phaseProgress = clamp01(phaseFrame / 60);

  const pmosOn = phase.activeMos === "pmos";
  const nmosOn = phase.activeMos === "nmos";

  // Circuit layout
  const vddY = 80;
  const vssY = 620;
  const pmosCY = 240;
  const nmosCY = 420;
  const padCX = 700;
  const mosCX = 400;

  // Current arrow progress
  const currentProgress = easeOutCubic(clamp01((phaseFrame - 30) / 40));

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        {/* Title */}
        <text x={VW / 2} y={40} textAnchor="middle" fill={T.primary} fontSize={20} fontWeight={700} fontFamily="Inter, sans-serif">
          输出驱动器 — 推挽输出
        </text>

        {/* VDD rail */}
        <line x1={mosCX} y1={vddY} x2={mosCX} y2={pmosCY - 25} stroke="#ef4444" strokeWidth={2} />
        <text x={mosCX + 15} y={vddY + 15} fill="#ef4444" fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">VDD</text>

        {/* PMOS */}
        <MosSwitch cx={mosCX} cy={pmosCY} type="pmos" conducting={pmosOn} />

        {/* Connection: PMOS drain → Pad */}
        <line x1={mosCX + 55} y1={pmosCY + 12} x2={mosCX + 55} y2={nmosCY - 12} stroke={T.muted} strokeWidth={1.5} />
        <line x1={mosCX + 55} y1={(pmosCY + nmosCY) / 2} x2={padCX - 30} y2={(pmosCY + nmosCY) / 2}
          stroke={pmosOn ? "#f472b6" : nmosOn ? "#60a5fa" : T.muted} strokeWidth={2} />

        {/* NMOS */}
        <MosSwitch cx={mosCX} cy={nmosCY} type="nmos" conducting={nmosOn} />

        {/* VSS rail */}
        <line x1={mosCX} y1={nmosCY + 25} x2={mosCX} y2={vssY} stroke="#3b82f6" strokeWidth={2} />
        <text x={mosCX + 15} y={vssY - 8} fill="#3b82f6" fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">VSS</text>

        {/* Pad */}
        <PadBlock cx={padCX} cy={(pmosCY + nmosCY) / 2} width={80} height={40} label="Pad" />

        {/* Pad → PCB load */}
        <line x1={padCX + 40} y1={(pmosCY + nmosCY) / 2} x2={padCX + 120} y2={(pmosCY + nmosCY) / 2}
          stroke={T.muted} strokeWidth={2} />

        {/* PCB Load (capacitor symbol) */}
        <g>
          <line x1={padCX + 120} y1={(pmosCY + nmosCY) / 2 - 20} x2={padCX + 120} y2={(pmosCY + nmosCY) / 2 + 20}
            stroke="#fbbf24" strokeWidth={3} />
          <line x1={padCX + 128} y1={(pmosCY + nmosCY) / 2 - 20} x2={padCX + 128} y2={(pmosCY + nmosCY) / 2 + 20}
            stroke="#fbbf24" strokeWidth={3} />
          <text x={padCX + 124} y={(pmosCY + nmosCY) / 2 + 40} textAnchor="middle" fill="#fbbf24" fontSize={12} fontFamily="Inter, sans-serif">
            Cload
          </text>
        </g>

        {/* Additional loads for phase 2 */}
        {phaseIndex === 2 && spec.loadCount > 1 && Array.from({ length: spec.loadCount - 1 }, (_, i) => {
          const ly = (pmosCY + nmosCY) / 2 + 80 + i * 60;
          return (
            <g key={i} opacity={easeOutCubic(clamp01((phaseFrame - 60 - i * 30) / 40))}>
              <line x1={padCX + 80} y1={(pmosCY + nmosCY) / 2} x2={padCX + 80} y2={ly} stroke={T.muted} strokeWidth={1.5} strokeDasharray="4 3" />
              <line x1={padCX + 80} y1={ly} x2={padCX + 120} y2={ly} stroke={T.muted} strokeWidth={1.5} />
              <line x1={padCX + 120} y1={ly - 15} x2={padCX + 120} y2={ly + 15} stroke="#fbbf24" strokeWidth={2.5} />
              <line x1={padCX + 128} y1={ly - 15} x2={padCX + 128} y2={ly + 15} stroke="#fbbf24" strokeWidth={2.5} />
              <text x={padCX + 124} y={ly + 30} textAnchor="middle" fill="#fbbf24" fontSize={10} fontFamily="Inter, sans-serif">
                Cload
              </text>
            </g>
          );
        })}

        {/* Current arrows */}
        {pmosOn && (
          <CurrentArrow x1={mosCX + 55} y1={pmosCY} x2={padCX - 30} y2={(pmosCY + nmosCY) / 2}
            color="#f472b6" progress={currentProgress} />
        )}
        {nmosOn && (
          <CurrentArrow x1={padCX - 30} y1={(pmosCY + nmosCY) / 2} x2={mosCX + 55} y2={nmosCY}
            color="#60a5fa" progress={currentProgress} />
        )}

        {/* DATA input label */}
        <text x={mosCX - 80} y={(pmosCY + nmosCY) / 2} textAnchor="middle" fill={T.primary} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">
          DATA
        </text>
        <text x={mosCX - 80} y={(pmosCY + nmosCY) / 2 + 20} textAnchor="middle"
          fill={phase.dataValue ? "#34d399" : "#ef4444"} fontSize={18} fontWeight={700} fontFamily="Inter, sans-serif">
          {phase.dataValue}
        </text>

        {/* Phase label */}
        <text x={VW / 2} y={VH - 40} textAnchor="middle" fill={T.bright} fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
          {phase.label}
        </text>

        {/* Callouts */}
        <g opacity={phaseIndex === 0 ? currentProgress : 0.3}>
          <text x={950} y={200} fill="#f472b6" fontSize={13} fontFamily="Inter, sans-serif">Source Current</text>
          <text x={950} y={220} fill={T.muted} fontSize={11} fontFamily="Inter, sans-serif">VDD → Pad (上拉)</text>
        </g>
        <g opacity={phaseIndex === 1 ? currentProgress : 0.3}>
          <text x={950} y={440} fill="#60a5fa" fontSize={13} fontFamily="Inter, sans-serif">Sink Current</text>
          <text x={950} y={460} fill={T.muted} fontSize={11} fontFamily="Inter, sans-serif">Pad → VSS (下拉)</text>
        </g>
        {phaseIndex === 2 && (
          <g opacity={currentProgress}>
            <text x={950} y={320} fill="#fbbf24" fontSize={13} fontFamily="Inter, sans-serif">Drive Strength</text>
            <text x={950} y={340} fill={T.muted} fontSize={11} fontFamily="Inter, sans-serif">负载↑ → 边沿变慢</text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

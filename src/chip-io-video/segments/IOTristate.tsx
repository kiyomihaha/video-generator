// Segment 6: IOTristate — Tri-state output with OE control
// Shows PMOS/NMOS with output enable, high-Z state
// Circuit: VDD → PMOS → output node → Pad
//          VSS → NMOS → output node
// OE controls both gates (with inverter on PMOS)
// Status info bar at top, circuit in middle, 140px bottom reserved for subtitles

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
  phaseFrames: 380,
};

export const IOTristate: React.FC<{ spec?: TristateSpec }> = ({ spec: customSpec }) => {
  const spec = customSpec ?? defaultSpec;
  const frame = useCurrentFrame();
  const pf = spec.phaseFrames;

  // Intro hold: 1 second static display before animation begins
  const INTRO_HOLD_FRAMES = 60;
  const animationFrame = Math.max(0, frame - INTRO_HOLD_FRAMES);

  // Phase calculation uses animationFrame (starts after hold)
  const phaseIndex = Math.min(Math.floor(animationFrame / pf), spec.phases.length - 1);
  const phase = spec.phases[phaseIndex];
  const phaseFrame = animationFrame - phaseIndex * pf;
  const phaseProgress = easeOutCubic(clamp01(phaseFrame / 50));

  // During hold period, force initial state (OE=1, DATA=0, NMOS conducting)
  const isHolding = frame < INTRO_HOLD_FRAMES;
  const effectivePhase = isHolding ? spec.phases[0] : phase;
  const effectivePhaseProgress = isHolding ? 0 : phaseProgress;

  const isHighZ = effectivePhase.padOutput === "Z";
  const pmosOn = effectivePhase.oe === 1 && effectivePhase.data === 1;
  const nmosOn = effectivePhase.oe === 1 && effectivePhase.data === 0;

  // ── Circuit coordinates ──
  const mosCX = 350;
  const pmosCY = 250;
  const nmosCY = 400;
  const pmosSourceY = pmosCY - 12.5;
  const pmosDrainY = pmosCY + 12.5;
  const nmosDrainY = nmosCY - 12.5;
  const nmosSourceY = nmosCY + 12.5;
  const outputY = (pmosDrainY + nmosDrainY) / 2;
  const sdX = mosCX + 20;

  const padCX = 680;
  const vddY = 100;
  const vssY = 530;  // moved up to avoid bottom 140px

  const oeColor = effectivePhase.oe ? THEME.status.hit : THEME.text.muted;
  const wireColor = isHighZ ? "#475569" : (pmosOn ? "#f472b6" : "#60a5fa");

  // Status text
  const conductingText = isHighZ ? "无（高阻）" : (pmosOn ? "PMOS" : "NMOS");
  const padValueText = isHighZ ? "Z（高阻）" : String(effectivePhase.padOutput);

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        {/* Title */}
        <text x={VW / 2} y={36} textAnchor="middle" fill={T.primary} fontSize={20} fontWeight={700} fontFamily="Inter, sans-serif">
          三态输出与总线共享
        </text>

        {/* ── Status info bar (y=55-95) ── */}
        <g>
          {/* Background bar */}
          <rect x={140} y={55} width={1000} height={40} rx={6}
            fill={THEME.canvas.panel} stroke={THEME.canvas.grid} strokeWidth={1} />

          {/* OE */}
          <text x={200} y={80} textAnchor="middle" fill={T.muted} fontSize={14} fontFamily="Inter, sans-serif">OE</text>
          <text x={240} y={80} textAnchor="middle"
            fill={effectivePhase.oe ? THEME.status.hit : THEME.status.miss}
            fontSize={18} fontWeight={700} fontFamily="Inter, sans-serif">
            {effectivePhase.oe ? "1" : "0"}
          </text>

          {/* Separator */}
          <line x1={280} y1={62} x2={280} y2={88} stroke={THEME.canvas.grid} strokeWidth={1} />

          {/* DATA */}
          <text x={340} y={80} textAnchor="middle" fill={T.muted} fontSize={14} fontFamily="Inter, sans-serif">DATA</text>
          <text x={385} y={80} textAnchor="middle"
            fill={effectivePhase.data === "Z" ? THEME.text.muted : (effectivePhase.data ? THEME.status.hit : THEME.status.miss)}
            fontSize={18} fontWeight={700} fontFamily="Inter, sans-serif">
            {effectivePhase.data === "Z" ? "X" : String(effectivePhase.data)}
          </text>

          {/* Separator */}
          <line x1={425} y1={62} x2={425} y2={88} stroke={THEME.canvas.grid} strokeWidth={1} />

          {/* Conducting device */}
          <text x={520} y={80} textAnchor="middle" fill={T.muted} fontSize={14} fontFamily="Inter, sans-serif">导通</text>
          <text x={580} y={80} textAnchor="middle"
            fill={isHighZ ? THEME.text.muted : (pmosOn ? "#f472b6" : "#60a5fa")}
            fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
            {conductingText}
          </text>

          {/* Separator */}
          <line x1={650} y1={62} x2={650} y2={88} stroke={THEME.canvas.grid} strokeWidth={1} />

          {/* Pad output */}
          <text x={720} y={80} textAnchor="middle" fill={T.muted} fontSize={14} fontFamily="Inter, sans-serif">Pad</text>
          <text x={770} y={80} textAnchor="middle"
            fill={isHighZ ? "#94a3b8" : (effectivePhase.padOutput === 1 ? THEME.status.hit : THEME.status.miss)}
            fontSize={18} fontWeight={700} fontFamily="Inter, sans-serif">
            {padValueText}
          </text>

          {/* Phase label */}
          <text x={920} y={80} textAnchor="middle" fill={T.bright} fontSize={16} fontWeight={600} fontFamily="Inter, sans-serif">
            {effectivePhase.label}
          </text>
        </g>

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
          label={isHighZ ? "Z" : String(effectivePhase.padOutput)} />

        {/* ── OE signal indicator (left side) ── */}
        <g transform="translate(80, 200)">
          <text x={0} y={0} fill={T.primary} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">OE</text>
          <rect x={0} y={10} width={80} height={30} rx={4}
            fill={effectivePhase.oe ? THEME.status.hit : "#475569"} fillOpacity={0.3}
            stroke={effectivePhase.oe ? THEME.status.hit : "#475569"} strokeWidth={1.5} />
          <text x={40} y={30} textAnchor="middle" fill={effectivePhase.oe ? THEME.status.hit : THEME.text.muted}
            fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">
            {effectivePhase.oe ? "1" : "0"}
          </text>
        </g>

        {/* ── DATA signal indicator (left side) ── */}
        <g transform="translate(80, 280)">
          <text x={0} y={0} fill={T.primary} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">DATA</text>
          <rect x={0} y={10} width={80} height={30} rx={4}
            fill={effectivePhase.data === "Z" ? "#475569" : (effectivePhase.data ? THEME.status.hit : THEME.status.miss)} fillOpacity={0.3}
            stroke={effectivePhase.data === "Z" ? "#475569" : (effectivePhase.data ? THEME.status.hit : THEME.status.miss)} strokeWidth={1.5} />
          <text x={40} y={30} textAnchor="middle"
            fill={effectivePhase.data === "Z" ? THEME.text.muted : (effectivePhase.data ? THEME.status.hit : THEME.status.miss)}
            fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">
            {effectivePhase.data === "Z" ? "X" : String(effectivePhase.data)}
          </text>
        </g>

        {/* ── OE control lines to gates ── */}
        <line x1={80} y1={230} x2={mosCX - 38} y2={pmosCY} stroke={oeColor} strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={80} y1={310} x2={mosCX - 38} y2={nmosCY} stroke={oeColor} strokeWidth={1.5} strokeDasharray="4 3" />

        {/* ── Bidirectional note during high-Z (circuit area) ── */}
        {isHighZ && effectivePhaseProgress > 0.3 && (
          <g opacity={(effectivePhaseProgress - 0.3) / 0.7}>
            {/* Input path: Pad → Input Buffer → Core */}
            <line x1={padCX + 40} y1={outputY} x2={padCX + 120} y2={outputY - 60}
              stroke={THEME.status.hit} strokeWidth={2} strokeDasharray="6 4" />
            <rect x={padCX + 120} y={outputY - 80} width={100} height={40} rx={6}
              fill={THEME.status.hit} fillOpacity={0.15} stroke={THEME.status.hit} strokeWidth={1.5} />
            <text x={padCX + 170} y={outputY - 55} textAnchor="middle" fill={THEME.status.hit} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">
              Input Buffer
            </text>
            <text x={padCX + 170} y={outputY - 38} textAnchor="middle" fill={THEME.status.hit} fontSize={13} fontFamily="Inter, sans-serif">
              OE=0 时可作为输入
            </text>
          </g>
        )}

        {/* ── High-Z disconnected sparks ── */}
        {isHighZ && effectivePhaseProgress > 0 && (
          <g opacity={effectivePhaseProgress * 0.6}>
            {[0, 1, 2].map(i => {
              const sx = padCX - 40 + Math.sin(phaseFrame * 0.3 + i * 2) * 10;
              const sy = outputY + Math.cos(phaseFrame * 0.4 + i * 1.5) * 15;
              return (
                <circle key={i} cx={sx} cy={sy} r={3} fill={THEME.text.muted}
                  opacity={0.5 + Math.sin(phaseFrame * 0.5 + i) * 0.3} />
              );
            })}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

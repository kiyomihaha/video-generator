// Segment 6: IOTristate — Tri-state output (complete layout restructure)
// Three-zone layout: Title/Status (0-105), Circuit (105-530), Subtitles (530-720)
// All phases use identical geometry — only colors/states change

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { THEME } from "../../theme";
import { clamp01, easeOutCubic } from "../../motion/utils";
import type { TristateSpec } from "../types";

const T = THEME.text;
const S = THEME.canvas;
const VW = 1280;
const VH = 720;

// ── Layout zones ──
const ZONE = {
  titleY: 30,
  statusBarY: 48,
  statusBarH: 46,
  circuitTop: 105,
  circuitBottom: 525,
  subtitleTop: 530,
};

// ── Circuit geometry (centered) ──
const CIRCUIT = {
  // OE/DATA input indicators (left side)
  inputX: 180,
  inputW: 120,
  inputGap: 80,

  // MOSFET main circuit (center)
  mosX: 540,
  mosGap: 150,  // PMOS to NMOS vertical gap
  mosW: 50,
  mosH: 60,

  // Pad output (right of center)
  padX: 780,
  padW: 90,
  padH: 54,

  // Input Buffer (far right, always present)
  bufX: 960,
  bufW: 160,
  bufH: 64,

  // VDD/VSS rails
  vddY: 120,
  vssY: 500,
};

// ── Default spec ──
const defaultSpec: TristateSpec = {
  phases: [
    { label: "NMOS 导通，Pad 拉低", oe: 1, data: 0, padOutput: 0 },
    { label: "PMOS 导通，Pad 拉高", oe: 1, data: 1, padOutput: 1 },
    { label: "高阻态 Z，引脚断开", oe: 0, data: "Z", padOutput: "Z" },
  ],
  phaseFrames: 380,
};

export const IOTristate: React.FC<{ spec?: TristateSpec }> = ({ spec: customSpec }) => {
  const spec = customSpec ?? defaultSpec;
  const frame = useCurrentFrame();
  const pf = spec.phaseFrames;

  // Intro hold: 1 second
  const INTRO_HOLD = 60;
  const animFrame = Math.max(0, frame - INTRO_HOLD);

  // Phase calculation
  const phaseIdx = Math.min(Math.floor(animFrame / pf), spec.phases.length - 1);
  const phase = spec.phases[phaseIdx];
  const phaseFrame = animFrame - phaseIdx * pf;
  const phaseProgress = easeOutCubic(clamp01(phaseFrame / 50));

  const isHolding = frame < INTRO_HOLD;
  const effective = isHolding ? spec.phases[0] : phase;
  const effectiveProgress = isHolding ? 0 : phaseProgress;

  const isHighZ = effective.padOutput === "Z";
  const pmosOn = effective.oe === 1 && effective.data === 1;
  const nmosOn = effective.oe === 1 && effective.data === 0;

  // ── Derived positions ──
  const pmosCY = ZONE.circuitTop + 120;
  const nmosCY = pmosCY + CIRCUIT.mosGap;
  const outputY = (pmosCY + nmosCY) / 2;
  const sdX = CIRCUIT.mosX + CIRCUIT.mosW / 2;

  // Colors
  const oeColor = effective.oe ? THEME.status.hit : T.muted;
  const wireColor = isHighZ ? "#475569" : (pmosOn ? "#f472b6" : "#60a5fa");
  const activeColor = isHighZ ? "#94a3b8" : (pmosOn ? "#f472b6" : "#60a5fa");

  // Input Buffer opacity (always present, highlighted during high-Z)
  const bufOpacity = isHighZ
    ? easeOutCubic(clamp01(effectiveProgress / 0.3))
    : 0.25;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">

        {/* ═══════════════════════════════════════════════════ */}
        {/* ZONE 1: Title + Status Bar (0–105)                  */}
        {/* ═══════════════════════════════════════════════════ */}

        {/* Title */}
        <text x={VW / 2} y={ZONE.titleY} textAnchor="middle"
          fill={T.primary} fontSize={20} fontWeight={700} fontFamily="Inter, sans-serif">
          三态输出与总线共享
        </text>

        {/* Status bar background */}
        <rect x={80} y={ZONE.statusBarY} width={VW - 160} height={ZONE.statusBarH}
          rx={6} fill={S.panel} stroke={S.grid} strokeWidth={1} />

        {/* Four equal-width fields: OE | DATA | 导通路径 | Pad */}
        {(() => {
          const barX = 80;
          const barW = VW - 160;
          const fieldW = barW / 4;
          const fieldY = ZONE.statusBarY + ZONE.statusBarH / 2;

          const fields = [
            { label: "OE", value: effective.oe ? "1" : "0", color: effective.oe ? THEME.status.hit : THEME.status.miss },
            { label: "DATA", value: effective.data === "Z" ? "X" : String(effective.data), color: effective.data === "Z" ? T.muted : (effective.data ? THEME.status.hit : THEME.status.miss) },
            { label: "导通路径", value: isHighZ ? "无（高阻）" : (pmosOn ? "PMOS" : "NMOS"), color: isHighZ ? T.muted : activeColor },
            { label: "Pad", value: isHighZ ? "Z（高阻）" : String(effective.padOutput), color: isHighZ ? "#94a3b8" : (effective.padOutput === 1 ? THEME.status.hit : THEME.status.miss) },
          ];

          return fields.map((f, i) => {
            const fx = barX + i * fieldW;
            return (
              <g key={f.label}>
                {/* Separator (except first) */}
                {i > 0 && (
                  <line x1={fx} y1={ZONE.statusBarY + 6} x2={fx} y2={ZONE.statusBarY + ZONE.statusBarH - 6}
                    stroke={S.grid} strokeWidth={1} />
                )}
                {/* Label */}
                <text x={fx + fieldW / 2} y={fieldY - 6} textAnchor="middle"
                  fill={T.muted} fontSize={12} fontFamily="Inter, sans-serif">
                  {f.label}
                </text>
                {/* Value */}
                <text x={fx + fieldW / 2} y={fieldY + 14} textAnchor="middle"
                  fill={f.color} fontSize={18} fontWeight={700} fontFamily="Inter, sans-serif">
                  {f.value}
                </text>
              </g>
            );
          });
        })()}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ZONE 2: Circuit (105–525)                           */}
        {/* ═══════════════════════════════════════════════════ */}

        {/* ── VDD rail ── */}
        <line x1={sdX} y1={CIRCUIT.vddY} x2={sdX} y2={pmosCY - CIRCUIT.mosH / 2}
          stroke="#ef4444" strokeWidth={2} />
        <text x={sdX + 12} y={CIRCUIT.vddY + 16} fill="#ef4444"
          fontSize={14} fontWeight={700} fontFamily="Inter, sans-serif">VDD</text>

        {/* ── PMOS ── */}
        <rect x={CIRCUIT.mosX} y={pmosCY - CIRCUIT.mosH / 2}
          width={CIRCUIT.mosW} height={CIRCUIT.mosH} rx={6}
          fill={pmosOn ? "#f472b6" : "#475569"} fillOpacity={pmosOn ? 0.3 : 0.1}
          stroke={pmosOn ? "#f472b6" : "#475569"} strokeWidth={pmosOn ? 2.5 : 1.5}
          strokeDasharray={pmosOn ? "none" : "6 4"} />
        <text x={CIRCUIT.mosX + CIRCUIT.mosW / 2} y={pmosCY + 5} textAnchor="middle"
          fill={pmosOn ? "#f472b6" : "#475569"} fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">
          PMOS
        </text>
        {/* Inverter bubble */}
        <circle cx={CIRCUIT.mosX - 10} cy={pmosCY} r={5}
          fill="none" stroke={wireColor} strokeWidth={1.5} />

        {/* ── PMOS drain → output node ── */}
        <line x1={sdX} y1={pmosCY + CIRCUIT.mosH / 2} x2={sdX} y2={outputY}
          stroke={wireColor} strokeWidth={2} strokeDasharray={isHighZ ? "6 4" : "none"} />

        {/* ── NMOS drain → output node ── */}
        <line x1={sdX} y1={nmosCY - CIRCUIT.mosH / 2} x2={sdX} y2={outputY}
          stroke={wireColor} strokeWidth={2} strokeDasharray={isHighZ ? "6 4" : "none"} />

        {/* ── NMOS ── */}
        <rect x={CIRCUIT.mosX} y={nmosCY - CIRCUIT.mosH / 2}
          width={CIRCUIT.mosW} height={CIRCUIT.mosH} rx={6}
          fill={nmosOn ? "#60a5fa" : "#475569"} fillOpacity={nmosOn ? 0.3 : 0.1}
          stroke={nmosOn ? "#60a5fa" : "#475569"} strokeWidth={nmosOn ? 2.5 : 1.5}
          strokeDasharray={nmosOn ? "none" : "6 4"} />
        <text x={CIRCUIT.mosX + CIRCUIT.mosW / 2} y={nmosCY + 5} textAnchor="middle"
          fill={nmosOn ? "#60a5fa" : "#475569"} fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">
          NMOS
        </text>

        {/* ── NMOS source → VSS ── */}
        <line x1={sdX} y1={nmosCY + CIRCUIT.mosH / 2} x2={sdX} y2={CIRCUIT.vssY}
          stroke="#3b82f6" strokeWidth={2} />
        <text x={sdX + 12} y={CIRCUIT.vssY - 8} fill="#3b82f6"
          fontSize={14} fontWeight={700} fontFamily="Inter, sans-serif">VSS</text>

        {/* ── Output node dot ── */}
        <circle cx={sdX} cy={outputY} r={5} fill={wireColor} />

        {/* ── Output node → Pad ── */}
        <line x1={sdX} y1={outputY} x2={CIRCUIT.padX - CIRCUIT.padW / 2} y2={outputY}
          stroke={wireColor} strokeWidth={2.5} strokeDasharray={isHighZ ? "6 4" : "none"} />

        {/* ── Pad ── */}
        <rect x={CIRCUIT.padX - CIRCUIT.padW / 2} y={outputY - CIRCUIT.padH / 2}
          width={CIRCUIT.padW} height={CIRCUIT.padH} rx={6}
          fill={isHighZ ? "#475569" : "#fbbf24"} fillOpacity={isHighZ ? 0.15 : 0.25}
          stroke={isHighZ ? "#475569" : "#fbbf24"} strokeWidth={2} />
        <text x={CIRCUIT.padX} y={outputY - 8} textAnchor="middle"
          fill={isHighZ ? "#475569" : "#fbbf24"} fontSize={12} fontFamily="Inter, sans-serif">
          Pad
        </text>
        <text x={CIRCUIT.padX} y={outputY + 14} textAnchor="middle"
          fill={isHighZ ? "#94a3b8" : (effective.padOutput === 1 ? THEME.status.hit : THEME.status.miss)}
          fontSize={20} fontWeight={700} fontFamily="Inter, sans-serif">
          {isHighZ ? "Z" : String(effective.padOutput)}
        </text>

        {/* ── Input Buffer (always present, dim when not high-Z) ── */}
        <g opacity={bufOpacity}>
          <rect x={CIRCUIT.bufX} y={outputY - CIRCUIT.bufH / 2}
            width={CIRCUIT.bufW} height={CIRCUIT.bufH} rx={6}
            fill={THEME.status.hit} fillOpacity={0.12}
            stroke={THEME.status.hit} strokeWidth={isHighZ ? 2 : 1.5} />
          <text x={CIRCUIT.bufX + CIRCUIT.bufW / 2} y={outputY - 8} textAnchor="middle"
            fill={THEME.status.hit} fontSize={15} fontWeight={600} fontFamily="Inter, sans-serif">
            Input Buffer
          </text>
          <text x={CIRCUIT.bufX + CIRCUIT.bufW / 2} y={outputY + 12} textAnchor="middle"
            fill={THEME.status.hit} fontSize={12} fontFamily="Inter, sans-serif">
            OE=0 时作输入
          </text>
        </g>

        {/* Pad → Input Buffer connection (only during high-Z) */}
        {isHighZ && effectiveProgress > 0.2 && (
          <line
            x1={CIRCUIT.padX + CIRCUIT.padW / 2} y1={outputY}
            x2={CIRCUIT.bufX} y2={outputY}
            stroke={THEME.status.hit} strokeWidth={2} strokeDasharray="6 4"
            opacity={easeOutCubic(clamp01((effectiveProgress - 0.2) / 0.3))}
          />
        )}

        {/* ── OE input indicator (left) ── */}
        <g transform={`translate(${CIRCUIT.inputX}, ${pmosCY - 30})`}>
          <text x={0} y={0} fill={T.primary} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">
            OE
          </text>
          <rect x={0} y={10} width={CIRCUIT.inputW} height={36} rx={4}
            fill={effective.oe ? THEME.status.hit : "#475569"} fillOpacity={0.2}
            stroke={effective.oe ? THEME.status.hit : "#475569"} strokeWidth={1.5} />
          <text x={CIRCUIT.inputW / 2} y={33} textAnchor="middle"
            fill={effective.oe ? THEME.status.hit : T.muted}
            fontSize={18} fontWeight={700} fontFamily="Inter, sans-serif">
            {effective.oe ? "1" : "0"}
          </text>
        </g>

        {/* ── DATA input indicator (left) ── */}
        <g transform={`translate(${CIRCUIT.inputX}, ${nmosCY - 30})`}>
          <text x={0} y={0} fill={T.primary} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">
            DATA
          </text>
          <rect x={0} y={10} width={CIRCUIT.inputW} height={36} rx={4}
            fill={effective.data === "Z" ? "#475569" : (effective.data ? THEME.status.hit : THEME.status.miss)} fillOpacity={0.2}
            stroke={effective.data === "Z" ? "#475569" : (effective.data ? THEME.status.hit : THEME.status.miss)} strokeWidth={1.5} />
          <text x={CIRCUIT.inputW / 2} y={33} textAnchor="middle"
            fill={effective.data === "Z" ? T.muted : (effective.data ? THEME.status.hit : THEME.status.miss)}
            fontSize={18} fontWeight={700} fontFamily="Inter, sans-serif">
            {effective.data === "Z" ? "X" : String(effective.data)}
          </text>
        </g>

        {/* ── OE control lines to gates ── */}
        <line x1={CIRCUIT.inputX + CIRCUIT.inputW} y1={pmosCY}
          x2={CIRCUIT.mosX - 14} y2={pmosCY}
          stroke={oeColor} strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={CIRCUIT.inputX + CIRCUIT.inputW} y1={nmosCY}
          x2={CIRCUIT.mosX - 14} y2={nmosCY}
          stroke={oeColor} strokeWidth={1.5} strokeDasharray="4 3" />

        {/* ── High-Z sparks at output node ── */}
        {isHighZ && effectiveProgress > 0.1 && (
          <g opacity={effectiveProgress * 0.5}>
            {[0, 1, 2].map(i => {
              const sx = sdX + Math.sin(phaseFrame * 0.3 + i * 2) * 8;
              const sy = outputY + Math.cos(phaseFrame * 0.4 + i * 1.5) * 12;
              return (
                <circle key={i} cx={sx} cy={sy} r={2.5} fill={T.muted}
                  opacity={0.4 + Math.sin(phaseFrame * 0.5 + i) * 0.3} />
              );
            })}
          </g>
        )}

      </svg>
    </AbsoluteFill>
  );
};

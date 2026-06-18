// Segment 4: InputIO — CircuitWaveform reuse
// Shows signal path: External → Pad → ESD → Buffer → Schmitt → Sync → Core
// With waveform overlay showing signal transformation

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CircuitWaveformScene } from "../../scenes/CircuitWaveformScene";
import { THEME } from "../../theme";
import { clamp01 } from "../../motion/utils";
import type { CircuitWaveformLinkerAuthoring } from "../../motion/linker/types";

const inputIOSpec: CircuitWaveformLinkerAuthoring = {
  title: "输入 I/O — 信号进入芯片的旅程",
  width: 1280,
  height: 720,
  framesPerCycle: 100,
  zones: [
    { id: "ext",  label: "External\nSignal",   x: 40,  y: 300, width: 130, height: 70 },
    { id: "pad",  label: "Pad",                 x: 200, y: 300, width: 110, height: 70 },
    { id: "esd",  label: "ESD",                 x: 340, y: 300, width: 100, height: 70 },
    { id: "buf",  label: "Input\nBuffer",       x: 470, y: 300, width: 130, height: 70 },
    { id: "sch",  label: "Schmitt\nTrigger",    x: 630, y: 300, width: 140, height: 70 },
    { id: "sync", label: "Synchronizer",        x: 800, y: 300, width: 140, height: 70 },
    { id: "core", label: "Core",                x: 970, y: 300, width: 110, height: 70 },
  ],
  links: [
    { id: "l1", fromZoneId: "ext",  toZoneId: "pad",  path: "M170,335 L200,335" },
    { id: "l2", fromZoneId: "pad",  toZoneId: "esd",  path: "M310,335 L340,335" },
    { id: "l3", fromZoneId: "esd",  toZoneId: "buf",  path: "M440,335 L470,335" },
    { id: "l4", fromZoneId: "buf",  toZoneId: "sch",  path: "M600,335 L630,335" },
    { id: "l5", fromZoneId: "sch",  toZoneId: "sync", path: "M770,335 L800,335" },
    { id: "l6", fromZoneId: "sync", toZoneId: "core", path: "M940,335 L970,335" },
  ],
  cycles: [
    // Cycle 0: External signal activates (slow/noisy)
    {
      cycle: 0,
      zoneStates: [
        { zoneId: "ext", state: "ACTIVE" },
        { zoneId: "pad", state: "IDLE" },
        { zoneId: "esd", state: "IDLE" },
        { zoneId: "buf", state: "IDLE" },
        { zoneId: "sch", state: "IDLE" },
        { zoneId: "sync", state: "IDLE" },
        { zoneId: "core", state: "IDLE" },
      ],
      pulses: [{ linkId: "l1" }],
    },
    // Cycle 1: Signal reaches Pad, passes through ESD
    {
      cycle: 1,
      zoneStates: [
        { zoneId: "ext", state: "HOLD" },
        { zoneId: "pad", state: "ACTIVE" },
        { zoneId: "esd", state: "IDLE" },
        { zoneId: "buf", state: "IDLE" },
        { zoneId: "sch", state: "IDLE" },
        { zoneId: "sync", state: "IDLE" },
        { zoneId: "core", state: "IDLE" },
      ],
      pulses: [{ linkId: "l2" }],
    },
    // Cycle 2: ESD passes, buffer conditions signal
    {
      cycle: 2,
      zoneStates: [
        { zoneId: "ext", state: "IDLE" },
        { zoneId: "pad", state: "HOLD" },
        { zoneId: "esd", state: "ACTIVE" },
        { zoneId: "buf", state: "IDLE" },
        { zoneId: "sch", state: "IDLE" },
        { zoneId: "sync", state: "IDLE" },
        { zoneId: "core", state: "IDLE" },
      ],
      pulses: [{ linkId: "l3" }],
    },
    // Cycle 3: Buffer active, signal conditioning
    {
      cycle: 3,
      zoneStates: [
        { zoneId: "ext", state: "IDLE" },
        { zoneId: "pad", state: "IDLE" },
        { zoneId: "esd", state: "HOLD" },
        { zoneId: "buf", state: "ACTIVE" },
        { zoneId: "sch", state: "IDLE" },
        { zoneId: "sync", state: "IDLE" },
        { zoneId: "core", state: "IDLE" },
      ],
      pulses: [{ linkId: "l4" }],
    },
    // Cycle 4: Schmitt trigger cleans edges
    {
      cycle: 4,
      zoneStates: [
        { zoneId: "ext", state: "IDLE" },
        { zoneId: "pad", state: "IDLE" },
        { zoneId: "esd", state: "IDLE" },
        { zoneId: "buf", state: "HOLD" },
        { zoneId: "sch", state: "ACTIVE" },
        { zoneId: "sync", state: "IDLE" },
        { zoneId: "core", state: "IDLE" },
      ],
      pulses: [{ linkId: "l5" }],
    },
    // Cycle 5: Synchronizer aligns to clock
    {
      cycle: 5,
      zoneStates: [
        { zoneId: "ext", state: "IDLE" },
        { zoneId: "pad", state: "IDLE" },
        { zoneId: "esd", state: "IDLE" },
        { zoneId: "buf", state: "IDLE" },
        { zoneId: "sch", state: "HOLD" },
        { zoneId: "sync", state: "ACTIVE" },
        { zoneId: "core", state: "IDLE" },
      ],
      pulses: [{ linkId: "l6" }],
    },
    // Cycle 6: Clean signal reaches Core
    {
      cycle: 6,
      zoneStates: [
        { zoneId: "ext", state: "IDLE" },
        { zoneId: "pad", state: "IDLE" },
        { zoneId: "esd", state: "IDLE" },
        { zoneId: "buf", state: "IDLE" },
        { zoneId: "sch", state: "IDLE" },
        { zoneId: "sync", state: "HOLD" },
        { zoneId: "core", state: "ACTIVE" },
      ],
      pulses: [],
    },
    // Cycles 7-10: Hold state (signal stable at Core)
    ...Array.from({ length: 4 }, (_, i) => ({
      cycle: 7 + i,
      zoneStates: [
        { zoneId: "ext", state: "IDLE" as const },
        { zoneId: "pad", state: "IDLE" as const },
        { zoneId: "esd", state: "IDLE" as const },
        { zoneId: "buf", state: "IDLE" as const },
        { zoneId: "sch", state: "IDLE" as const },
        { zoneId: "sync", state: "IDLE" as const },
        { zoneId: "core", state: "HOLD" as const },
      ],
      pulses: [],
    })),
  ],
};

export const InputIO: React.FC<{ spec?: CircuitWaveformLinkerAuthoring }> = ({ spec: customSpec }) => {
  const frame = useCurrentFrame();
  const resolvedSpec = customSpec ?? inputIOSpec;
  const fpC = resolvedSpec.framesPerCycle;
  const totalCycles = resolvedSpec.cycles.length;
  const totalFrames = totalCycles * fpC;

  // Current cycle (0-based)
  const currentCycle = Math.min(Math.floor(frame / fpC), totalCycles - 1);
  const cycleProgress = (frame % fpC) / fpC;

  // Waveform Y positions
  const waveY = 500;  // below the zones
  const waveH = 80;   // waveform height
  const waveBase = waveY + waveH;

  // Generate waveform paths for different signal qualities
  // Slow/noisy: shown when cycle 0-2 (external signal)
  const slowNoisePath = generateSlowNoiseWaveform(100, waveBase, 300, waveH, frame);
  // Conditioned: shown when cycle 3-4 (after buffer)
  const conditionedPath = generateConditionedWaveform(500, waveBase, 250, waveH, frame - 3 * fpC);
  // Clean: shown when cycle 5+ (after Schmitt)
  const cleanPath = generateCleanWaveform(800, waveBase, 200, waveH, frame - 5 * fpC);

  // Visibility based on current cycle
  const slowAlpha = currentCycle <= 3 ? clamp01(currentCycle / 1) : Math.max(0, 1 - (currentCycle - 3) / 2);
  const condAlpha = currentCycle >= 2 && currentCycle <= 6 ? clamp01((currentCycle - 2) / 1) : currentCycle > 6 ? Math.max(0, 1 - (currentCycle - 6) / 2) : 0;
  const cleanAlpha = currentCycle >= 4 ? clamp01((currentCycle - 4) / 1) : 0;

  return (
    <AbsoluteFill>
      <CircuitWaveformScene authoring={resolvedSpec} />
      {/* Waveform overlay */}
      <svg viewBox="0 0 1280 720" width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Section label */}
        <text x={640} y={waveY - 15} textAnchor="middle" fill={THEME.text.muted} fontSize={13} fontFamily="Inter, sans-serif">
          信号波形对比
        </text>

        {/* Slow/noisy waveform */}
        {slowAlpha > 0 && (
          <g opacity={slowAlpha}>
            <text x={250} y={waveY - 5} textAnchor="middle" fill="#ef4444" fontSize={12} fontWeight={600} fontFamily="Inter, sans-serif">
              缓冲前：慢边沿 + 噪声
            </text>
            <path d={slowNoisePath} fill="none" stroke="#ef4444" strokeWidth={2} />
          </g>
        )}

        {/* Conditioned waveform */}
        {condAlpha > 0 && (
          <g opacity={condAlpha}>
            <text x={625} y={waveY - 5} textAnchor="middle" fill="#fbbf24" fontSize={12} fontWeight={600} fontFamily="Inter, sans-serif">
              缓冲后：边沿改善
            </text>
            <path d={conditionedPath} fill="none" stroke="#fbbf24" strokeWidth={2} />
          </g>
        )}

        {/* Clean digital waveform */}
        {cleanAlpha > 0 && (
          <g opacity={cleanAlpha}>
            <text x={900} y={waveY - 5} textAnchor="middle" fill="#34d399" fontSize={12} fontWeight={600} fontFamily="Inter, sans-serif">
              Schmitt 后：干净数字信号
            </text>
            <path d={cleanPath} fill="none" stroke="#34d399" strokeWidth={2.5} />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// ── Waveform generators ──

function generateSlowNoiseWaveform(x: number, baseY: number, width: number, height: number, frame: number): string {
  // Slow exponential rise with noise overlay
  const points: string[] = [];
  const progress = clamp01(frame / 200);
  const maxX = width * progress;

  for (let i = 0; i <= maxX; i += 3) {
    const t = i / width;
    // Slow exponential rise
    const rise = 1 - Math.exp(-t * 3);
    // Add noise
    const noise = Math.sin(i * 0.3 + frame * 0.1) * 0.15 + Math.sin(i * 0.7 + frame * 0.2) * 0.08;
    const y = baseY - (rise + noise) * height;
    points.push(`${i === 0 ? "M" : "L"}${x + i},${y}`);
  }
  return points.join(" ");
}

function generateConditionedWaveform(x: number, baseY: number, width: number, height: number, frame: number): string {
  // Faster rise, less noise
  const points: string[] = [];
  const progress = clamp01(frame / 150);
  const maxX = width * progress;

  for (let i = 0; i <= maxX; i += 3) {
    const t = i / width;
    // Faster rise
    const rise = 1 - Math.exp(-t * 6);
    // Minimal noise
    const noise = Math.sin(i * 0.5 + frame * 0.15) * 0.05;
    const y = baseY - (rise + noise) * height;
    points.push(`${i === 0 ? "M" : "L"}${x + i},${y}`);
  }
  return points.join(" ");
}

function generateCleanWaveform(x: number, baseY: number, width: number, height: number, frame: number): string {
  // Perfect digital step
  const points: string[] = [];
  const progress = clamp01(frame / 100);
  const maxX = width * progress;
  const risePoint = width * 0.1;  // sharp rise at 10%

  for (let i = 0; i <= maxX; i += 3) {
    const y = i < risePoint ? baseY : baseY - height;
    points.push(`${i === 0 ? "M" : "L"}${x + i},${y}`);
  }
  return points.join(" ");
}

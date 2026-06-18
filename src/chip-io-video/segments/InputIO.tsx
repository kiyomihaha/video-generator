// Segment 4: InputIO — CircuitWaveform reuse
// Shows signal path: External → Pad → ESD → Buffer → Schmitt → Sync → Core

import React from "react";
import { AbsoluteFill } from "remotion";
import { CircuitWaveformScene } from "../../scenes/CircuitWaveformScene";
import type { CircuitWaveformLinkerAuthoring } from "../../motion/linker/types";

const inputIOSpec: CircuitWaveformLinkerAuthoring = {
  title: "输入 I/O — 信号进入芯片的旅程",
  width: 1280,
  height: 720,
  framesPerCycle: 40,
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
  ],
};

export const InputIO: React.FC<{ spec?: CircuitWaveformLinkerAuthoring }> = ({ spec: customSpec }) => {
  return (
    <AbsoluteFill>
      <CircuitWaveformScene authoring={customSpec ?? inputIOSpec} />
    </AbsoluteFill>
  );
};

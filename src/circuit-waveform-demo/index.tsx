import React from "react";
import { CircuitWaveformScene } from "../scenes/CircuitWaveformScene";
import type { CircuitWaveformLinkerAuthoring } from "../motion/linker/types";

export const CircuitWaveformDemo: React.FC<{ spec: CircuitWaveformLinkerAuthoring }> = ({ spec }) => {
  return <CircuitWaveformScene authoring={spec} />;
};

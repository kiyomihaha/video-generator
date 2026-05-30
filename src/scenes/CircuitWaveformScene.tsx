import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useCircuitWaveformLinker } from "../motion/linker/useCircuitWaveformLinker";
import { CircuitOverlay } from "../components/circuit/CircuitOverlay";
import type { CircuitWaveformLinkerAuthoring } from "../motion/linker/types";

interface Props {
  authoring: CircuitWaveformLinkerAuthoring;
}

export const CircuitWaveformScene: React.FC<Props> = ({ authoring }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frameState = useCircuitWaveformLinker(frame, fps, authoring);

  return (
    <AbsoluteFill>
      <CircuitOverlay frameState={frameState} authoring={authoring} frame={frame} />
    </AbsoluteFill>
  );
};

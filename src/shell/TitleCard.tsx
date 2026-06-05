// VideoShell — TitleCard: thin wrapper around TextEmphasis engine
import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { TextEmphasisScene } from "../scenes/TextEmphasisScene";
import { computeTESchedule } from "../motion/text-emphasis/teSchedule";
import type { TextEmphasisSpec } from "../motion/text-emphasis/types";

interface Props {
  spec: TextEmphasisSpec;
  fps: number;
  width: number;
  height: number;
}

export const TitleCard: React.FC<Props> = ({ spec, fps, width, height }) => {
  const schedule = useMemo(() => {
    const s = computeTESchedule(spec, fps);
    return { ...s, width, height };
  }, [spec, fps, width, height]);

  return (
    <AbsoluteFill>
      <TextEmphasisScene schedule={schedule} />
    </AbsoluteFill>
  );
};

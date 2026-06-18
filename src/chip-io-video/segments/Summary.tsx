// Segment 9: Summary — TextEmphasisScene reuse

import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { TextEmphasisScene } from "../../scenes/TextEmphasisScene";
import { computeTESchedule } from "../../motion/text-emphasis/teSchedule";
import type { TextEmphasisSpec } from "../../motion/text-emphasis/types";

export const Summary: React.FC<{ spec: TextEmphasisSpec }> = ({ spec }) => {
  const schedule = useMemo(() => computeTESchedule(spec, 60), [spec]);
  return (
    <AbsoluteFill>
      <TextEmphasisScene schedule={schedule} />
    </AbsoluteFill>
  );
};

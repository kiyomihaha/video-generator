import React, { useMemo } from "react";
import { TimingDiagramScene } from "../scenes/TimingDiagramScene";
import { computeTDSchedule } from "../motion/timing-diagram/tdSchedule";
import type { TimingDiagramSpec } from "../motion/timing-diagram/types";

interface Props {
  spec: TimingDiagramSpec;
}

export const TimingDiagramDemo: React.FC<Props> = ({ spec }) => {
  const schedule = useMemo(() => computeTDSchedule(spec), [spec]);
  return <TimingDiagramScene schedule={schedule} title={spec.title} />;
};

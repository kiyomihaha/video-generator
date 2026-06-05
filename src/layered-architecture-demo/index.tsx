import React, { useMemo } from "react";
import { useVideoConfig } from "remotion";
import { LayeredArchitectureScene } from "../scenes/LayeredArchitectureScene";
import { computeLASchedule } from "../motion/layered-architecture/laSchedule";
import type { LayeredArchitectureSpec } from "../motion/layered-architecture/types";

export const LayeredArchitectureDemo: React.FC<{ spec: LayeredArchitectureSpec }> = ({ spec }) => {
  const fps = useVideoConfig().fps;
  const schedule = useMemo(() => computeLASchedule(spec, fps), [spec, fps]);
  return <LayeredArchitectureScene schedule={schedule} />;
};

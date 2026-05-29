import React from "react";
import { DigitalTimingScene } from "../scenes/DigitalTimingScene";
import type { DigitalTimingSpec } from "../motion/primitives/types";

export const FanoutDemo: React.FC<{ spec: DigitalTimingSpec }> = ({ spec }) => {
  return <DigitalTimingScene spec={spec} />;
};

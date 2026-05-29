import React from "react";
import { DigitalTimingScene } from "../scenes/DigitalTimingScene";
import type { DigitalTimingSpec } from "../motion/primitives/types";

export const MetastabilityDemo: React.FC<{ spec: DigitalTimingSpec }> = ({ spec }) => {
  return <DigitalTimingScene spec={spec} />;
};

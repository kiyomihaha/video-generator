// Legend Demo — wiring component

import React from "react";
import { LegendScene } from "../scenes/LegendScene";
import type { LegendSpec } from "../motion/legend/types";

export const LegendDemo: React.FC<{ spec: LegendSpec }> = ({ spec }) => {
  return <LegendScene spec={spec} />;
};

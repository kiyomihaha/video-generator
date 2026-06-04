import React from "react";
import { BranchPredictionScene } from "../scenes/BranchPredictionScene";
import type { BranchPredictionSpec } from "../motion/branch-prediction/types";

export const BranchPredictionDemo: React.FC<{ spec: BranchPredictionSpec }> = ({ spec }) => {
  return <BranchPredictionScene spec={spec} />;
};

import React from "react";
import { PipelineScene } from "../scenes/PipelineScene";
import type { PipelineSpec } from "../motion/pipeline/types";

export const PipelineDemo: React.FC<{ spec: PipelineSpec }> = ({ spec }) => {
  return <PipelineScene spec={spec} />;
};

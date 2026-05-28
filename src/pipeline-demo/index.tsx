import React, { useEffect, useState } from "react";
import { staticFile } from "remotion";
import { PipelineScene } from "../scenes/PipelineScene";
import type { PipelineSpec } from "../motion/pipeline/types";

const FALLBACK: PipelineSpec = {
  title: "Loading...",
  stages: ["IF", "ID", "EX", "MEM", "WB"],
  totalCycles: 1,
  instructions: [],
};

export const PipelineDemo: React.FC = () => {
  const [spec, setSpec] = useState<PipelineSpec>(FALLBACK);

  useEffect(() => {
    fetch(staticFile("specs/pipeline-demo.json"))
      .then((r) => r.json())
      .then(setSpec)
      .catch(() => setSpec(FALLBACK));
  }, []);

  if (spec.instructions.length === 0) return null;
  return <PipelineScene spec={spec} />;
};

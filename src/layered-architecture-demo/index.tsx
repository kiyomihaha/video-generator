import React, { useMemo } from "react";
import { LayeredArchitectureScene } from "../scenes/LayeredArchitectureScene";
import { computeLASchedule } from "../motion/layered-architecture/laSchedule";
import { layeredArchitectureSpecSchema } from "../motion/layered-architecture/schemas";
import spec from "../../public/specs/layered-architecture-demo.json";

const parsed = layeredArchitectureSpecSchema.parse(spec);

export const LayeredArchitectureDemo: React.FC = () => {
  const schedule = useMemo(() => computeLASchedule(parsed, 60), []);
  return <LayeredArchitectureScene schedule={schedule} />;
};

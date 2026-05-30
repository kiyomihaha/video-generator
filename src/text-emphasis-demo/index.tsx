import React, { useMemo } from "react";
import { TextEmphasisScene } from "../scenes/TextEmphasisScene";
import { computeTESchedule } from "../motion/text-emphasis/teSchedule";
import { textEmphasisSpecSchema } from "../motion/text-emphasis/schemas";
import spec from "../../public/specs/text-emphasis-demo.json";

const parsed = textEmphasisSpecSchema.parse(spec);

export const TextEmphasisDemo: React.FC = () => {
  const schedule = useMemo(() => computeTESchedule(parsed, 60), []);
  return <TextEmphasisScene schedule={schedule} />;
};

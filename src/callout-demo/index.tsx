import React from "react";
import { CalloutDemoScene } from "./CalloutDemoScene";
import { calloutDemoSpecSchema } from "./schemas";
import spec from "../../public/specs/callout-demo.json";

export { CalloutDemoScene } from "./CalloutDemoScene";
export type { CalloutDemoSpec } from "./types";

const parsed = calloutDemoSpecSchema.parse(spec);

export const CalloutDemo: React.FC = () => {
  return <CalloutDemoScene spec={parsed} />;
};

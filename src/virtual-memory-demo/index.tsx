import React from "react";
import { VirtualMemoryScene } from "../scenes/VirtualMemoryScene";
import type { VirtualMemorySpec } from "../motion/virtual-memory/types";

export const VirtualMemoryDemo: React.FC<{ spec: VirtualMemorySpec }> = ({ spec }) => {
  return <VirtualMemoryScene spec={spec} />;
};

import React from "react";
import { CacheScene } from "../scenes/CacheScene";
import type { CacheSpec } from "../motion/cache/types";

export const CacheDemo: React.FC<{ spec: CacheSpec }> = ({ spec }) => {
  return <CacheScene spec={spec} />;
};

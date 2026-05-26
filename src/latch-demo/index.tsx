import React, { useEffect, useState } from "react";
import { staticFile } from "remotion";
import { DigitalTimingScene } from "../scenes/DigitalTimingScene";
import type { DigitalTimingSpec } from "../motion/primitives/types";

const FALLBACK: DigitalTimingSpec = {
  title: "Loading...", fps: 30, totalDuration: 5, signals: [], propagations: [],
};

export const LatchDemo: React.FC = () => {
  const [spec, setSpec] = useState<DigitalTimingSpec>(FALLBACK);

  useEffect(() => {
    fetch(staticFile("specs/latch-demo.json"))
      .then(r => r.json())
      .then(setSpec)
      .catch(() => setSpec(FALLBACK));
  }, []);

  if (spec.signals.length === 0) return null;
  return <DigitalTimingScene spec={spec} />;
};

import React, { useEffect, useState } from "react";
import { staticFile } from "remotion";
import { DigitalTimingScene } from "../scenes/DigitalTimingScene";
import type { DigitalTimingSpec } from "../motion/primitives/types";

const FALLBACK_SPEC: DigitalTimingSpec = {
  title: "Loading...",
  fps: 30,
  totalDuration: 6,
  signals: [],
  propagations: [],
};

export const ClockToQDemo: React.FC<{ specUrl?: string }> = ({
  specUrl,
}) => {
  const [spec, setSpec] = useState<DigitalTimingSpec>(FALLBACK_SPEC);

  useEffect(() => {
    const url = specUrl || staticFile("specs/clock-to-q.json");
    fetch(url)
      .then((r) => r.json())
      .then(setSpec)
      .catch(() => setSpec(FALLBACK_SPEC));
  }, [specUrl]);

  if (spec.signals.length === 0) return null;
  return <DigitalTimingScene spec={spec} />;
};

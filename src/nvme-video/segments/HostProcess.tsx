// Segment 10: HostProcess — Phase Tag check + CQ Head advance + Doorbell

import React from "react";
import { AbsoluteFill } from "remotion";
import { NVMeTopology } from "../base/NVMeTopology";
import { THEME } from "../../theme";

export const HostProcess: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <NVMeTopology
        highlight={["host", "memory", "admin-cq", "doorbell"]}
        dim={["namespace"]}
      >
        {/* TODO: Phase Tag check animation */}
        {/* TODO: CID → request lookup */}
        {/* TODO: CQ Head advance + Doorbell write */}
      </NVMeTopology>
    </AbsoluteFill>
  );
};

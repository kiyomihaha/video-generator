// Segment 6: Doorbell — SQ Tail advance + Doorbell write

import React from "react";
import { AbsoluteFill } from "remotion";
import { NVMeTopology } from "../base/NVMeTopology";
import { THEME } from "../../theme";

export const Doorbell: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <NVMeTopology
        highlight={["host", "memory", "doorbell", "pcie"]}
        dim={["namespace"]}
      >
        {/* TODO: Tail pointer advance animation */}
        {/* TODO: MMIO write to SQ Tail Doorbell */}
        {/* TODO: "Doorbell只是通知，不携带命令" */}
      </NVMeTopology>
    </AbsoluteFill>
  );
};

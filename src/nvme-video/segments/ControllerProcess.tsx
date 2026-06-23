// Segment 7: ControllerProcess — Arbitration → DMA Fetch → Decode → Execute

import React from "react";
import { AbsoluteFill } from "remotion";
import { NVMeTopology } from "../base/NVMeTopology";
import { THEME } from "../../theme";

export const ControllerProcess: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <NVMeTopology
        highlight={["controller", "pcie", "memory"]}
        dim={["namespace"]}
      >
        {/* TODO: Arbitration → DMA Fetch SQE → Decode → Execute sequence */}
        {/* TODO: SQ Head advance animation */}
      </NVMeTopology>
    </AbsoluteFill>
  );
};

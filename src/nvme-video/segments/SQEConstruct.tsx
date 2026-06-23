// Segment 5: SQEConstruct — 64-byte SQE structure for Read

import React from "react";
import { AbsoluteFill } from "remotion";
import { NVMeTopology } from "../base/NVMeTopology";
import { THEME } from "../../theme";

export const SQEConstruct: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <NVMeTopology
        highlight={["host", "memory", "prp"]}
        dim={["controller", "namespace", "doorbell"]}
      >
        {/* TODO: SQE 64-byte structure breakdown */}
        {/* TODO: CID, Opcode, NSID, SLBA, NLB, PRP1 animation */}
      </NVMeTopology>
    </AbsoluteFill>
  );
};

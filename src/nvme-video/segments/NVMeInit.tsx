// Segment 2-3: NVMeInit — CAP, Admin queue allocation, AQA/ASQ/ACQ, CC.EN

import React from "react";
import { AbsoluteFill } from "remotion";
import { NVMeTopology } from "../base/NVMeTopology";
import { THEME } from "../../theme";

const T = THEME.text;

export const NVMeInit: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <NVMeTopology
        highlight={["host", "memory", "controller"]}
        dim={["namespace"]}
      >
        {/* TODO: RegisterPanel for CAP, AQA, ASQ, ACQ, CC, CSTS */}
        {/* TODO: State machine visualization */}
      </NVMeTopology>
    </AbsoluteFill>
  );
};

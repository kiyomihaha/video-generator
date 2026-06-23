// Segment 4: AdminCommand — Identify + Create I/O CQ/SQ

import React from "react";
import { AbsoluteFill } from "remotion";
import { NVMeTopology } from "../base/NVMeTopology";
import { THEME } from "../../theme";

export const AdminCommand: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <NVMeTopology
        highlight={["host", "memory", "admin-sq", "admin-cq", "controller"]}
        dim={["namespace"]}
      >
        {/* TODO: CommandEntry for Identify, Create CQ, Create SQ */}
        {/* TODO: Queue creation sequence */}
      </NVMeTopology>
    </AbsoluteFill>
  );
};

// Segment 8: DataTransfer — DMA Read from storage to host memory

import React from "react";
import { AbsoluteFill } from "remotion";
import { NVMeTopology } from "../base/NVMeTopology";
import { THEME } from "../../theme";

export const DataTransfer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      <NVMeTopology
        highlight={["controller", "namespace", "memory", "prp"]}
        dim={["doorbell"]}
      >
        {/* TODO: PRP address resolution */}
        {/* TODO: DMA data flow: Storage → Controller → Host Memory */}
        {/* TODO: Write direction as secondary note */}
      </NVMeTopology>
    </AbsoluteFill>
  );
};

// NVMeVideo — Sequence orchestrator for 11 NVMe segments

import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { THEME } from "../theme";
import type { NVMeVideoSpec } from "./types";
import { getSegmentOffsets } from "./types";

// Segment components
import { Overview } from "./segments/Overview";
import { NVMeInit } from "./segments/NVMeInit";
import { AdminCommand } from "./segments/AdminCommand";
import { SQEConstruct } from "./segments/SQEConstruct";
import { Doorbell } from "./segments/Doorbell";
import { ControllerProcess } from "./segments/ControllerProcess";
import { DataTransfer } from "./segments/DataTransfer";
import { Completion } from "./segments/Completion";
import { HostProcess } from "./segments/HostProcess";
import { Summary } from "./segments/Summary";

const S = THEME.canvas;
const FADE_FRAMES = 18; // 0.3s at 60fps

// Visual opacity — fade in/out at segment boundaries
const segmentOpacity = (frame: number, totalFrames: number) => {
  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(
    frame,
    [totalFrames - FADE_FRAMES, totalFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return Math.min(fadeIn, fadeOut);
};

// Wrapper with cross-fade transition
const SegmentFade: React.FC<{
  children: React.ReactNode;
  totalFrames: number;
}> = ({ children, totalFrames }) => {
  const frame = useCurrentFrame();
  const opacity = segmentOpacity(frame, totalFrames);
  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

export const NVMeVideo: React.FC<{ spec: NVMeVideoSpec }> = ({ spec }) => {
  const { offsets: off, total } = getSegmentOffsets(spec.segmentFrames);
  const sf = spec.segmentFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      {/* Segment 1: Overview */}
      <Sequence from={off.overview} durationInFrames={sf.overview} name="seg1-overview">
        <SegmentFade totalFrames={sf.overview}>
          <Overview />
        </SegmentFade>
      </Sequence>

      {/* Segment 2-3: Initialization */}
      <Sequence from={off.init} durationInFrames={sf.init} name="seg2-init">
        <SegmentFade totalFrames={sf.init}>
          <NVMeInit />
        </SegmentFade>
      </Sequence>

      {/* Segment 4: Admin Commands */}
      <Sequence from={off.adminCmd} durationInFrames={sf.adminCmd} name="seg4-admin">
        <SegmentFade totalFrames={sf.adminCmd}>
          <AdminCommand />
        </SegmentFade>
      </Sequence>

      {/* Segment 5: SQE Construction */}
      <Sequence from={off.sqeConstruct} durationInFrames={sf.sqeConstruct} name="seg5-sqe">
        <SegmentFade totalFrames={sf.sqeConstruct}>
          <SQEConstruct />
        </SegmentFade>
      </Sequence>

      {/* Segment 6: Doorbell */}
      <Sequence from={off.doorbell} durationInFrames={sf.doorbell} name="seg6-doorbell">
        <SegmentFade totalFrames={sf.doorbell}>
          <Doorbell />
        </SegmentFade>
      </Sequence>

      {/* Segment 7: Controller Process */}
      <Sequence from={off.controllerProcess} durationInFrames={sf.controllerProcess} name="seg7-ctrl">
        <SegmentFade totalFrames={sf.controllerProcess}>
          <ControllerProcess />
        </SegmentFade>
      </Sequence>

      {/* Segment 8: Data Transfer */}
      <Sequence from={off.dataTransfer} durationInFrames={sf.dataTransfer} name="seg8-data">
        <SegmentFade totalFrames={sf.dataTransfer}>
          <DataTransfer />
        </SegmentFade>
      </Sequence>

      {/* Segment 9: Completion */}
      <Sequence from={off.completion} durationInFrames={sf.completion} name="seg9-completion">
        <SegmentFade totalFrames={sf.completion}>
          <Completion />
        </SegmentFade>
      </Sequence>

      {/* Segment 10: Host Process */}
      <Sequence from={off.hostProcess} durationInFrames={sf.hostProcess} name="seg10-host">
        <SegmentFade totalFrames={sf.hostProcess}>
          <HostProcess />
        </SegmentFade>
      </Sequence>

      {/* Segment 11: Summary */}
      <Sequence from={off.summary} durationInFrames={sf.summary} name="seg11-summary">
        <SegmentFade totalFrames={sf.summary}>
          <Summary />
        </SegmentFade>
      </Sequence>
    </AbsoluteFill>
  );
};

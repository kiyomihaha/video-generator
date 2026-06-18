// ChipIOVideo — Sequence orchestrator for 9 I/O segments
// With audio, transitions, and proper timing

import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { THEME } from "../theme";
import type { ChipIOVideoSpec } from "./types";

// Segment components
import { ProblemStatement } from "./segments/ProblemStatement";
import { IOBoundary } from "./segments/IOBoundary";
import { IODirectConnection } from "./segments/IODirectConnection";
import { InputIO } from "./segments/InputIO";
import { IOOutputDriver } from "./segments/IOOutputDriver";
import { IOTristate } from "./segments/IOTristate";
import { IOESDProtection } from "./segments/IOESDProtection";
import { ProblemList } from "./segments/ProblemList";
import { Summary } from "./segments/Summary";

const S = THEME.canvas;
const TRANSITION_FRAMES = 18; // 0.3s at 60fps

// Wrapper with fade transition
const FadeSegment: React.FC<{
  children: React.ReactNode;
  totalFrames: number;
}> = ({ children, totalFrames }) => {
  const frame = useCurrentFrame();

  // Fade in first 0.3s
  const fadeIn = interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Fade out last 0.3s
  const fadeOut = interpolate(
    frame,
    [totalFrames - TRANSITION_FRAMES, totalFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

export const ChipIOVideo: React.FC<{ spec: ChipIOVideoSpec }> = ({ spec }) => {
  const sf = spec.segmentFrames;

  // Cumulative frame offsets
  const off1 = 0;
  const off2 = off1 + sf.problemStatement;
  const off3 = off2 + sf.ioBoundary;
  const off4 = off3 + sf.directConnection;
  const off5 = off4 + sf.inputIO;
  const off6 = off5 + sf.outputDriver;
  const off7 = off6 + sf.tristate;
  const off8 = off7 + sf.esdProtection;
  const off9 = off8 + sf.problemList;

  // Audio paths
  const audioDir = "audio/chip-io-video";

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      {/* Segment 1: Problem Statement */}
      <Sequence from={off1} durationInFrames={sf.problemStatement} name="seg1-problem">
        <FadeSegment totalFrames={sf.problemStatement}>
          <ProblemStatement spec={spec.problemStatement} />
          <Audio src={staticFile(`${audioDir}/segment-01.wav`)} />
        </FadeSegment>
      </Sequence>

      {/* Segment 2: I/O Boundary */}
      <Sequence from={off2} durationInFrames={sf.ioBoundary} name="seg2-boundary">
        <FadeSegment totalFrames={sf.ioBoundary}>
          <IOBoundary spec={spec.ioBoundary} />
          <Audio src={staticFile(`${audioDir}/segment-02.wav`)} />
        </FadeSegment>
      </Sequence>

      {/* Segment 3: Why No Direct Connection */}
      <Sequence from={off3} durationInFrames={sf.directConnection} name="seg3-direct">
        <FadeSegment totalFrames={sf.directConnection}>
          <IODirectConnection spec={spec.directConnection} />
          <Audio src={staticFile(`${audioDir}/segment-03.wav`)} />
        </FadeSegment>
      </Sequence>

      {/* Segment 4: Input I/O */}
      <Sequence from={off4} durationInFrames={sf.inputIO} name="seg4-input">
        <FadeSegment totalFrames={sf.inputIO}>
          <InputIO spec={spec.inputIO} />
          <Audio src={staticFile(`${audioDir}/segment-04.wav`)} />
        </FadeSegment>
      </Sequence>

      {/* Segment 5: Output Driver */}
      <Sequence from={off5} durationInFrames={sf.outputDriver} name="seg5-output">
        <FadeSegment totalFrames={sf.outputDriver}>
          <IOOutputDriver spec={spec.outputDriver} />
          <Audio src={staticFile(`${audioDir}/segment-05.wav`)} />
        </FadeSegment>
      </Sequence>

      {/* Segment 6: Tri-State */}
      <Sequence from={off6} durationInFrames={sf.tristate} name="seg6-tristate">
        <FadeSegment totalFrames={sf.tristate}>
          <IOTristate spec={spec.tristate} />
          <Audio src={staticFile(`${audioDir}/segment-06.wav`)} />
        </FadeSegment>
      </Sequence>

      {/* Segment 7: ESD Protection */}
      <Sequence from={off7} durationInFrames={sf.esdProtection} name="seg7-esd">
        <FadeSegment totalFrames={sf.esdProtection}>
          <IOESDProtection spec={spec.esdProtection} />
          <Audio src={staticFile(`${audioDir}/segment-07.wav`)} />
        </FadeSegment>
      </Sequence>

      {/* Segment 8: Common Problems */}
      <Sequence from={off8} durationInFrames={sf.problemList} name="seg8-problems">
        <FadeSegment totalFrames={sf.problemList}>
          <ProblemList spec={spec.problemList} />
          <Audio src={staticFile(`${audioDir}/segment-08.wav`)} />
        </FadeSegment>
      </Sequence>

      {/* Segment 9: Summary */}
      <Sequence from={off9} durationInFrames={sf.summary} name="seg9-summary">
        <FadeSegment totalFrames={sf.summary}>
          <Summary spec={spec.summary} />
          <Audio src={staticFile(`${audioDir}/segment-09.wav`)} />
        </FadeSegment>
      </Sequence>
    </AbsoluteFill>
  );
};

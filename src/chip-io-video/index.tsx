// ChipIOVideo — Sequence orchestrator for 9 I/O segments
// With audio volume fade, visual fade, and proper timing

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
const FADE_FRAMES = 18; // 0.3s at 60fps

// Audio volume curve — fade in first 0.2s, fade out last 0.3s, stay at 1 in between
const audioVolume = (frame: number, totalFrames: number) => {
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(
    frame,
    [totalFrames - FADE_FRAMES, totalFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return Math.min(fadeIn, fadeOut);
};

// Visual opacity curve — fade in first 0.3s, fade out last 0.3s
const visualOpacity = (frame: number, totalFrames: number) => {
  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(
    frame,
    [totalFrames - FADE_FRAMES, totalFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return Math.min(fadeIn, fadeOut);
};

// Wrapper with visual + audio fade
const FadeSegment: React.FC<{
  children: React.ReactNode;
  audioSrc: string;
  totalFrames: number;
}> = ({ children, audioSrc, totalFrames }) => {
  const frame = useCurrentFrame();
  const opacity = visualOpacity(frame, totalFrames);
  const volume = audioVolume(frame, totalFrames);

  return (
    <>
      <AbsoluteFill style={{ opacity }}>
        {children}
      </AbsoluteFill>
      <Audio src={audioSrc} volume={volume} />
    </>
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

  const audioDir = "audio/chip-io-video";

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <Sequence from={off1} durationInFrames={sf.problemStatement} name="seg1-problem">
        <FadeSegment audioSrc={staticFile(`${audioDir}/segment-01.wav`)} totalFrames={sf.problemStatement}>
          <ProblemStatement spec={spec.problemStatement} />
        </FadeSegment>
      </Sequence>

      <Sequence from={off2} durationInFrames={sf.ioBoundary} name="seg2-boundary">
        <FadeSegment audioSrc={staticFile(`${audioDir}/segment-02.wav`)} totalFrames={sf.ioBoundary}>
          <IOBoundary spec={spec.ioBoundary} />
        </FadeSegment>
      </Sequence>

      <Sequence from={off3} durationInFrames={sf.directConnection} name="seg3-direct">
        <FadeSegment audioSrc={staticFile(`${audioDir}/segment-03.wav`)} totalFrames={sf.directConnection}>
          <IODirectConnection spec={spec.directConnection} />
        </FadeSegment>
      </Sequence>

      <Sequence from={off4} durationInFrames={sf.inputIO} name="seg4-input">
        <FadeSegment audioSrc={staticFile(`${audioDir}/segment-04.wav`)} totalFrames={sf.inputIO}>
          <InputIO spec={spec.inputIO} />
        </FadeSegment>
      </Sequence>

      <Sequence from={off5} durationInFrames={sf.outputDriver} name="seg5-output">
        <FadeSegment audioSrc={staticFile(`${audioDir}/segment-05.wav`)} totalFrames={sf.outputDriver}>
          <IOOutputDriver spec={spec.outputDriver} />
        </FadeSegment>
      </Sequence>

      <Sequence from={off6} durationInFrames={sf.tristate} name="seg6-tristate">
        <FadeSegment audioSrc={staticFile(`${audioDir}/segment-06.wav`)} totalFrames={sf.tristate}>
          <IOTristate spec={spec.tristate} />
        </FadeSegment>
      </Sequence>

      <Sequence from={off7} durationInFrames={sf.esdProtection} name="seg7-esd">
        <FadeSegment audioSrc={staticFile(`${audioDir}/segment-07.wav`)} totalFrames={sf.esdProtection}>
          <IOESDProtection spec={spec.esdProtection} />
        </FadeSegment>
      </Sequence>

      <Sequence from={off8} durationInFrames={sf.problemList} name="seg8-problems">
        <FadeSegment audioSrc={staticFile(`${audioDir}/segment-08.wav`)} totalFrames={sf.problemList}>
          <ProblemList spec={spec.problemList} />
        </FadeSegment>
      </Sequence>

      <Sequence from={off9} durationInFrames={sf.summary} name="seg9-summary">
        <FadeSegment audioSrc={staticFile(`${audioDir}/segment-09.wav`)} totalFrames={sf.summary}>
          <Summary spec={spec.summary} />
        </FadeSegment>
      </Sequence>
    </AbsoluteFill>
  );
};

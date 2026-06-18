// ChipIOVideo — Sequence orchestrator for 9 I/O segments

import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { THEME } from "../theme";
import type { ChipIOVideoSpec } from "./types";

// Segment components (lazy — filled in as we build)
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

export const ChipIOVideo: React.FC<{ spec: ChipIOVideoSpec }> = ({ spec }) => {
  const { fps } = useVideoConfig();
  const sf = spec.segmentFrames;

  // Cumulative frame offsets for each segment
  const off1 = 0;
  const off2 = off1 + sf.problemStatement;
  const off3 = off2 + sf.ioBoundary;
  const off4 = off3 + sf.directConnection;
  const off5 = off4 + sf.inputIO;
  const off6 = off5 + sf.outputDriver;
  const off7 = off6 + sf.tristate;
  const off8 = off7 + sf.esdProtection;
  const off9 = off8 + sf.problemList;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      {/* Segment 1: Problem Statement */}
      <Sequence from={off1} durationInFrames={sf.problemStatement} name="seg1-problem">
        <ProblemStatement spec={spec.problemStatement} />
      </Sequence>

      {/* Segment 2: I/O Boundary */}
      <Sequence from={off2} durationInFrames={sf.ioBoundary} name="seg2-boundary">
        <IOBoundary spec={spec.ioBoundary} />
      </Sequence>

      {/* Segment 3: Why No Direct Connection */}
      <Sequence from={off3} durationInFrames={sf.directConnection} name="seg3-direct">
        <IODirectConnection spec={spec.directConnection} />
      </Sequence>

      {/* Segment 4: Input I/O */}
      <Sequence from={off4} durationInFrames={sf.inputIO} name="seg4-input">
        <InputIO spec={spec.inputIO} />
      </Sequence>

      {/* Segment 5: Output Driver */}
      <Sequence from={off5} durationInFrames={sf.outputDriver} name="seg5-output">
        <IOOutputDriver spec={spec.outputDriver} />
      </Sequence>

      {/* Segment 6: Tri-State */}
      <Sequence from={off6} durationInFrames={sf.tristate} name="seg6-tristate">
        <IOTristate spec={spec.tristate} />
      </Sequence>

      {/* Segment 7: ESD Protection */}
      <Sequence from={off7} durationInFrames={sf.esdProtection} name="seg7-esd">
        <IOESDProtection spec={spec.esdProtection} />
      </Sequence>

      {/* Segment 8: Common Problems */}
      <Sequence from={off8} durationInFrames={sf.problemList} name="seg8-problems">
        <ProblemList spec={spec.problemList} />
      </Sequence>

      {/* Segment 9: Summary */}
      <Sequence from={off9} durationInFrames={sf.summary} name="seg9-summary">
        <Summary spec={spec.summary} />
      </Sequence>
    </AbsoluteFill>
  );
};

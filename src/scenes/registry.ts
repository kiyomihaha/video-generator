// Scene Registry — Single source of truth for all compositions
// Maps composition ID → { component, spec, calculateMetadata, dimensions }

import type { ComponentType } from "react";
import type { CalculateMetadataFunction } from "remotion";

import clockToqSpec from "../../public/specs/clock-to-q.json";
import fanoutSpec from "../../public/specs/fanout-demo.json";
import latchSpec from "../../public/specs/latch-demo.json";
import glitchSpec from "../../public/specs/glitch-demo.json";
import metastabilitySpec from "../../public/specs/metastability-demo.json";
import pipelineSpec from "../../public/specs/pipeline-demo.json";
import cacheSpec from "../../public/specs/cache-demo.json";
import branchPredictionSpec from "../../public/specs/branch-prediction-demo.json";
import virtualMemorySpec from "../../public/specs/virtual-memory-demo.json";
import timingDiagramSpec from "../../public/specs/timing-diagram-demo.json";
import textEmphasisSpec from "../../public/specs/text-emphasis-demo.json";

import { digitalTimingSpecSchema } from "../motion/primitives/schemas";
import { pipelineSpecSchema } from "../motion/pipeline/schemas";
import { cacheSpecSchema } from "../motion/cache/schemas";
import { branchPredictionSpecSchema } from "../motion/branch-prediction/schemas";
import { virtualMemorySpecSchema } from "../motion/virtual-memory/schemas";
import { timingDiagramSpecSchema } from "../motion/timing-diagram/schemas";
import { textEmphasisSpecSchema } from "../motion/text-emphasis/schemas";

import { ClockToQDemo } from "../digital-demo/index";
import { FanoutDemo } from "../fanout-demo/index";
import { LatchDemo } from "../latch-demo/index";
import { GlitchDemo } from "../glitch-demo/index";
import { MetastabilityDemo } from "../metastability-demo/index";
import { PipelineDemo } from "../pipeline-demo/index";
import { CacheDemo } from "../cache-demo/index";
import { BranchPredictionDemo } from "../branch-prediction-demo/index";
import { VirtualMemoryDemo } from "../virtual-memory-demo/index";
import { TimingDiagramDemo } from "../timing-diagram-demo/index";
import { TextEmphasisDemo } from "../text-emphasis-demo/index";

import type { DigitalTimingSpec } from "../motion/primitives/types";
import type { PipelineSpec } from "../motion/pipeline/types";
import type { CacheSpec } from "../motion/cache/types";
import type { BranchPredictionSpec } from "../motion/branch-prediction/types";
import type { VirtualMemorySpec } from "../motion/virtual-memory/types";
import type { TimingDiagramSpec } from "../motion/timing-diagram/types";
import type { TextEmphasisSpec } from "../motion/text-emphasis/types";
import { computeTESchedule } from "../motion/text-emphasis/teSchedule";

interface SceneEntry<TSpec> {
  component: ComponentType<{ spec: TSpec }>;
  spec: TSpec;
  calculateMetadata: CalculateMetadataFunction<{ spec: TSpec }>;
  fps: number;
  width: number;
  height: number;
}

// DigitalTiming: duration from spec.totalDuration * spec.fps
const calcDigitalTiming: CalculateMetadataFunction<{ spec: DigitalTimingSpec }> = ({ props }) => {
  const { totalDuration, fps } = props.spec;
  return { durationInFrames: Math.ceil(totalDuration * fps) };
};

// Pipeline: duration from totalCycles * clockPeriod * fps
const calcPipeline: CalculateMetadataFunction<{ spec: PipelineSpec }> = ({ props }) => {
  return { durationInFrames: Math.ceil(props.spec.totalCycles * (props.spec.clockPeriod ?? 1) * 60) };
};

// Cache: duration from accesses.length * clockPeriod * fps
const calcCache: CalculateMetadataFunction<{ spec: CacheSpec }> = ({ props }) => {
  return { durationInFrames: Math.ceil(props.spec.accesses.length * props.spec.clockPeriod * 60) };
};

// Branch Prediction: duration from totalCycles * clockPeriod * fps
const calcBranchPrediction: CalculateMetadataFunction<{ spec: BranchPredictionSpec }> = ({ props }) => {
  return { durationInFrames: Math.ceil(props.spec.totalCycles * (props.spec.clockPeriod ?? 1) * 60) };
};

// Virtual Memory: duration from accesses.length * clockPeriod * fps
const calcVirtualMemory: CalculateMetadataFunction<{ spec: VirtualMemorySpec }> = ({ props }) => {
  return { durationInFrames: Math.ceil(props.spec.accesses.length * props.spec.clockPeriod * 60) };
};

// TimingDiagram: duration from totalCycles * clockPeriod * fps
const calcTimingDiagram: CalculateMetadataFunction<{ spec: TimingDiagramSpec }> = ({ props }) => {
  return { durationInFrames: Math.ceil(props.spec.totalCycles * props.spec.clockPeriod * 60) };
};

// TextEmphasis: duration from schedule totalFrames
const calcTextEmphasis: CalculateMetadataFunction<{ spec: TextEmphasisSpec }> = ({ props }) => {
  const schedule = computeTESchedule(props.spec, 60);
  return { durationInFrames: schedule.totalFrames };
};

// Validate all specs at module load — fail-fast on bad JSON
const validDigitalSpecs = {
  clockToq: digitalTimingSpecSchema.parse(clockToqSpec),
  fanout: digitalTimingSpecSchema.parse(fanoutSpec),
  latch: digitalTimingSpecSchema.parse(latchSpec),
  glitch: digitalTimingSpecSchema.parse(glitchSpec),
  metastability: digitalTimingSpecSchema.parse(metastabilitySpec),
};

export const sceneRegistry: Record<string, SceneEntry<any>> = {
  ClockToQ: {
    component: ClockToQDemo,
    spec: validDigitalSpecs.clockToq,
    calculateMetadata: calcDigitalTiming,
    fps: 30,
    width: 1080,
    height: 600,
  },
  FanoutDemo: {
    component: FanoutDemo,
    spec: validDigitalSpecs.fanout,
    calculateMetadata: calcDigitalTiming,
    fps: 30,
    width: 1080,
    height: 720,
  },
  LatchDemo: {
    component: LatchDemo,
    spec: validDigitalSpecs.latch,
    calculateMetadata: calcDigitalTiming,
    fps: 30,
    width: 1280,
    height: 720,
  },
  GlitchDemo: {
    component: GlitchDemo,
    spec: validDigitalSpecs.glitch,
    calculateMetadata: calcDigitalTiming,
    fps: 60,
    width: 1280,
    height: 720,
  },
  MetastabilityDemo: {
    component: MetastabilityDemo,
    spec: validDigitalSpecs.metastability,
    calculateMetadata: calcDigitalTiming,
    fps: 60,
    width: 1280,
    height: 720,
  },
  PipelineDemo: {
    component: PipelineDemo,
    spec: pipelineSpecSchema.parse(pipelineSpec),
    calculateMetadata: calcPipeline,
    fps: 60,
    width: 1280,
    height: 720,
  },
  CacheDemo: {
    component: CacheDemo,
    spec: cacheSpecSchema.parse(cacheSpec),
    calculateMetadata: calcCache,
    fps: 60,
    width: 1280,
    height: 720,
  },
  BranchPredictionDemo: {
    component: BranchPredictionDemo,
    spec: branchPredictionSpecSchema.parse(branchPredictionSpec),
    calculateMetadata: calcBranchPrediction,
    fps: 60,
    width: 1280,
    height: 720,
  },
  VirtualMemoryDemo: {
    component: VirtualMemoryDemo,
    spec: virtualMemorySpecSchema.parse(virtualMemorySpec),
    calculateMetadata: calcVirtualMemory,
    fps: 60,
    width: 1280,
    height: 720,
  },
  TimingDiagramDemo: {
    component: TimingDiagramDemo,
    spec: timingDiagramSpecSchema.parse(timingDiagramSpec),
    calculateMetadata: calcTimingDiagram,
    fps: 60,
    width: 1280,
    height: 720,
  },
  TextEmphasisDemo: {
    component: TextEmphasisDemo,
    spec: textEmphasisSpecSchema.parse(textEmphasisSpec),
    calculateMetadata: calcTextEmphasis,
    fps: 60,
    width: 1280,
    height: 720,
  },
};

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

import { digitalTimingSpecSchema } from "../motion/primitives/schemas";
import { pipelineSpecSchema } from "../motion/pipeline/schemas";
import { cacheSpecSchema } from "../motion/cache/schemas";

import { ClockToQDemo } from "../digital-demo/index";
import { FanoutDemo } from "../fanout-demo/index";
import { LatchDemo } from "../latch-demo/index";
import { GlitchDemo } from "../glitch-demo/index";
import { MetastabilityDemo } from "../metastability-demo/index";
import { PipelineDemo } from "../pipeline-demo/index";
import { CacheDemo } from "../cache-demo/index";

import type { DigitalTimingSpec } from "../motion/primitives/types";
import type { PipelineSpec } from "../motion/pipeline/types";
import type { CacheSpec } from "../motion/cache/types";

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
};

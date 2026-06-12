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
import virtualMemoryVideoSpec from "../../public/specs/virtual-memory-video.json";
import timingDiagramSpec from "../../public/specs/timing-diagram-demo.json";
import textEmphasisSpec from "../../public/specs/text-emphasis-demo.json";
import cwlSpec from "../../public/specs/cwl-demo.json";
import laSpec from "../../public/specs/layered-architecture-demo.json";
import calloutSpec from "../../public/specs/callout-demo.json";
import legendSpec from "../../public/specs/legend-demo.json";

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
import { CircuitWaveformDemo } from "../circuit-waveform-demo/index";
import { LayeredArchitectureDemo } from "../layered-architecture-demo/index";
import { CalloutDemo } from "../callout-demo/index";
import { LegendDemo } from "../legend-demo/index";

import type { DigitalTimingSpec } from "../motion/primitives/types";
import type { PipelineSpec } from "../motion/pipeline/types";
import type { CacheSpec } from "../motion/cache/types";
import type { BranchPredictionSpec } from "../motion/branch-prediction/types";
import type { VirtualMemorySpec } from "../motion/virtual-memory/types";
import type { TimingDiagramSpec } from "../motion/timing-diagram/types";
import type { TextEmphasisSpec } from "../motion/text-emphasis/types";
import { computeTESchedule } from "../motion/text-emphasis/teSchedule";
import { circuitWaveformLinkerAuthoringSchema } from "../motion/linker/schemas";
import type { CircuitWaveformLinkerAuthoring } from "../motion/linker/types";
import { layeredArchitectureSpecSchema } from "../motion/layered-architecture/schemas";
import type { LayeredArchitectureSpec } from "../motion/layered-architecture/types";
import { computeLASchedule } from "../motion/layered-architecture/laSchedule";
import { calloutDemoSpecSchema } from "../callout-demo/schemas";
import type { CalloutDemoSpec } from "../callout-demo/types";
import { legendSpecSchema } from "../motion/legend/schemas";
import type { LegendSpec } from "../motion/legend/types";
import type { VideoShellConfig } from "../shell/types";

interface SceneEntry<TSpec> {
  component: ComponentType<{ spec: TSpec }>;
  spec: TSpec;
  calculateMetadata: CalculateMetadataFunction<{ spec: TSpec }>;
  fps: number;
  width: number;
  height: number;
  shell?: VideoShellConfig;
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

// CircuitWaveformLinker: duration from maxCycle * framesPerCycle + 1 tail cycle
const calcCircuitWaveform: CalculateMetadataFunction<{ spec: CircuitWaveformLinkerAuthoring }> = ({ props }) => {
  const maxCycle = Math.max(...props.spec.cycles.map(c => c.cycle));
  return { durationInFrames: (maxCycle + 1) * props.spec.framesPerCycle };
};

// LayeredArchitecture: duration from schedule totalFrames
const calcLayeredArchitecture: CalculateMetadataFunction<{ spec: LayeredArchitectureSpec }> = ({ props }) => {
  const schedule = computeLASchedule(props.spec, 60);
  return { durationInFrames: schedule.totalFrames };
};

// CalloutDemo: duration from spec
const calcCalloutDemo: CalculateMetadataFunction<{ spec: CalloutDemoSpec }> = ({ props }) => {
  return { durationInFrames: props.spec.durationInFrames };
};

// LegendDemo: duration from spec.endFrame
const calcLegendDemo: CalculateMetadataFunction<{ spec: LegendSpec }> = ({ props }) => {
  return { durationInFrames: props.spec.endFrame };
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
  VirtualMemoryVideo: {
    component: VirtualMemoryDemo,
    spec: virtualMemorySpecSchema.parse(virtualMemoryVideoSpec),
    calculateMetadata: calcVirtualMemory,
    fps: 60,
    width: 1280,
    height: 720,
    shell: {
      targetAspect: "16:9" as const,
      titleDurationSec: 2,
      outroDurationSec: 1.5,
      outro: {
        phrases: [
          {
            id: "vm-outro",
            text: "TLB：用局部性，把地址翻译变快",
            startBeat: 0,
            endBeat: 1.5,
            entrance: "fade-in",
            exit: "fade-out",
            fontSize: 42,
            fontWeight: 600,
            anchor: "center",
            x: 0.5,
            y: 0.42,
          },
        ],
        beats: [0, 0.5, 1, 1.5],
      },
      title: {
        phrases: [
          {
            id: "vm-title",
            text: "Virtual Memory & TLB",
            startBeat: 0,
            endBeat: 2,
            entrance: "scale-up",
            exit: "fade-out",
            fontSize: 56,
            fontWeight: 700,
            anchor: "center",
            x: 0.5,
            y: 0.42,
          },
        ],
        beats: [0, 1, 2],
      },
      subtitles: [
        { startFrame: 0, endFrame: 90, text: "TLB 是页表的高速缓存" },
        { startFrame: 90, endFrame: 180, text: "首次访问：TLB miss，触发 page table walk" },
        { startFrame: 180, endFrame: 270, text: "同页命中：TLB 直接返回物理地址" },
        { startFrame: 270, endFrame: 360, text: "不同页 miss：旧条目被 LRU 淘汰" },
        { startFrame: 360, endFrame: 450, text: "页表未映射：触发 page fault" },
        { startFrame: 450, endFrame: 540, text: "TLB 加速地址翻译，是虚拟内存的关键" },
      ],
    },
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
  CircuitWaveformDemo: {
    component: CircuitWaveformDemo,
    spec: circuitWaveformLinkerAuthoringSchema.parse(cwlSpec),
    calculateMetadata: calcCircuitWaveform,
    fps: 60,
    width: 1280,
    height: 720,
  },
  LayeredArchitectureDemo: {
    component: LayeredArchitectureDemo,
    spec: layeredArchitectureSpecSchema.parse(laSpec),
    calculateMetadata: calcLayeredArchitecture,
    fps: 60,
    width: 1280,
    height: 720,
    shell: {
      targetAspect: "16:9" as const,
      titleDurationSec: 2,
      title: {
        phrases: [
          {
            id: "title-main",
            text: "Layered Architecture",
            startBeat: 0,
            endBeat: 2,
            entrance: "scale-up",
            exit: "fade-out",
            fontSize: 64,
            fontWeight: 700,
            anchor: "center",
            x: 0.5,
            y: 0.42,
          },
        ],
        beats: [0, 1, 2],
      },
      subtitles: [
        { startFrame: 0, endFrame: 180, text: "AI 系统的五层架构" },
        { startFrame: 180, endFrame: 360, text: "从基础设施到应用层的数据流" },
        { startFrame: 360, endFrame: 540, text: "Agent 编排与模型推理的协同" },
      ],
    },
  },
  CalloutDemo: {
    component: CalloutDemo,
    spec: calloutDemoSpecSchema.parse(calloutSpec),
    calculateMetadata: calcCalloutDemo,
    fps: 60,
    width: 1280,
    height: 720,
  },
  LegendDemo: {
    component: LegendDemo,
    spec: legendSpecSchema.parse(legendSpec),
    calculateMetadata: calcLegendDemo,
    fps: 60,
    width: 1280,
    height: 720,
  },
};

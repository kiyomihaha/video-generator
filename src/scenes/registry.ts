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
import chipIoVideoSpec from "../../public/specs/chip-io-video.json";

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
import { ChipIOVideo } from "../chip-io-video/index";

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
import type { ChipIOVideoSpec } from "../chip-io-video/types";
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

// ChipIOVideo: duration from sum of segmentFrames
const calcChipIOVideo: CalculateMetadataFunction<{ spec: ChipIOVideoSpec }> = ({ props }) => {
  const sf = props.spec.segmentFrames;
  const total = sf.problemStatement + sf.ioBoundary + sf.directConnection + sf.inputIO
    + sf.outputDriver + sf.tristate + sf.esdProtection + sf.problemList + sf.summary;
  return { durationInFrames: total };
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
  ChipIOVideo: {
    component: ChipIOVideo,
    spec: chipIoVideoSpec as ChipIOVideoSpec,
    calculateMetadata: calcChipIOVideo,
    fps: 60,
    width: 1280,
    height: 720,
    shell: {
      targetAspect: "16:9" as const,
      titleDurationSec: 2,
      outroDurationSec: 0.5,  // Short fade-out only, Summary handles the ending
      title: {
        phrases: [
          {
            id: "title-main",
            text: "一个 0/1 信号\n走出芯片前要经历什么？",
            startBeat: 0,
            endBeat: 2,
            entrance: "scale-up",
            exit: "fade-out",
            fontSize: 48,
            fontWeight: 700,
            anchor: "center",
            x: 0.5,
            y: 0.42,
          },
        ],
        beats: [0, 1, 2],
      },
      subtitles: [
        // Segment 1: 9.60s (0→594)
        { startFrame: 0, endFrame: 300, text: "芯片内部已经产生了 0 和 1，" },
        { startFrame: 300, endFrame: 594, text: "为什么不能直接连到引脚？" },
        // Segment 2: 12.16s (594→1342)
        { startFrame: 594, endFrame: 960, text: "芯片要连接按键、传感器、存储器、显示屏和其他芯片。" },
        { startFrame: 960, endFrame: 1342, text: "真正完成连接的，是一整套 I/O 接口电路。" },
        // Segment 3: 20.48s (1342→2589)
        { startFrame: 1342, endFrame: 1640, text: "芯片核心可能工作在 0.8 伏，" },
        { startFrame: 1640, endFrame: 1940, text: "但外部接口可能是 1.8 伏或 3.3 伏。" },
        { startFrame: 1940, endFrame: 2260, text: "核心晶体管驱动能力弱，也承受不了外部静电。", fadeOutEndFrame: 1960 },
        { startFrame: 2260, endFrame: 2589, text: "所以 I/O 必须完成电平适配、信号整形、功率驱动和保护。", fadeOutEndFrame: 2280 },
        // Segment 4: 16.64s (2589→3605)
        { startFrame: 2589, endFrame: 2950, text: "信号进入芯片时，首先经过 Pad 和 ESD 保护。" },
        { startFrame: 2950, endFrame: 3300, text: "输入缓冲器再把可能缓慢、带噪声的外部电压，" },
        { startFrame: 3300, endFrame: 3605, text: "转换成内部明确的 0 或 1。" },
        // Segment 5: 18.88s (3605→4756)
        { startFrame: 3605, endFrame: 3970, text: "信号离开芯片时，核心只负责给出数据。" },
        { startFrame: 3970, endFrame: 4370, text: "输出驱动器利用更大的晶体管提供电流，" },
        { startFrame: 4370, endFrame: 4756, text: "推动 PCB 走线、连接器或者其他芯片的输入电容。" },
        // Segment 6: 18.72s (4756→5897)
        { startFrame: 4756, endFrame: 5000, text: "但引脚不一定始终驱动总线。" },
        { startFrame: 5000, endFrame: 5280, text: "当 OE 关闭时，上拉和下拉都断开，" },
        { startFrame: 5280, endFrame: 5560, text: "引脚进入高阻态 Z。" },
        { startFrame: 5560, endFrame: 5897, text: "它既不输出 0，也不输出 1，相当于暂时退出总线。" },
        // Segment 7: 18.08s (5897→7000)
        { startFrame: 5897, endFrame: 6260, text: "外部引脚还可能接触人体、连接器和测试探针。" },
        { startFrame: 6260, endFrame: 6640, text: "瞬间静电电压可能远高于芯片正常工作电压。" },
        { startFrame: 6640, endFrame: 7000, text: "ESD 钳位电路会优先把这股能量导向电源或地，保护核心器件。" },
        // Segment 8: 15.20s (7000→7930)
        { startFrame: 7000, endFrame: 7310, text: "很多板级问题，不是算法算错了，" },
        { startFrame: 7310, endFrame: 7620, text: "而是 I/O 边界没有处理好：" },
        { startFrame: 7620, endFrame: 7930, text: "电平不兼容、驱动不足、过冲振铃、总线争用、ESD 保护缺失，以及串扰噪声。" },
        // Segment 9: 15.04s (7930→8850)
        { startFrame: 7930, endFrame: 8220, text: "所以，输入输出接口不是核心逻辑的一根延长线。" },
        { startFrame: 8220, endFrame: 8500, text: "它负责接收、驱动、切换、保护和电气适配。" },
        { startFrame: 8500, endFrame: 8850, text: "输入输出单元，才是数字逻辑真正连接物理世界的边界。" },
      ],
    },
  },
};

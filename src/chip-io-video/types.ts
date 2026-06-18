// ChipIOVideo types — spec definitions for each segment

import type { CalloutDemoSpec } from "../callout-demo/types";
import type { LayeredArchitectureSpec } from "../motion/layered-architecture/types";
import type { CircuitWaveformLinkerAuthoring } from "../motion/linker/types";
import type { TextEmphasisSpec } from "../motion/text-emphasis/types";

// ── Segment 3: IODirectConnection ──

export interface DirectConnectionSide {
  label: string;
  voltage: string;
  traits: string[];    // e.g. ["弱驱动", "敏感"]
  color: string;
}

export interface DirectConnectionSpec {
  core: DirectConnectionSide;
  external: DirectConnectionSide;
  durationFrames: number;
}

// ── Segment 5: IOOutputDriver ──

export interface OutputDriverSpec {
  /** Timeline phases: each phase activates a different MOSFET */
  phases: Array<{
    label: string;       // e.g. "DATA=1 → PMOS 导通"
    dataValue: 0 | 1;
    activeMos: "pmos" | "nmos";
    currentDirection: "source" | "sink";
  }>;
  phaseFrames: number;   // frames per phase
  loadCount: number;     // number of loads to show
}

// ── Segment 6: IOTristate ──

export interface TristatePhase {
  label: string;
  oe: 0 | 1;
  data: 0 | 1 | "Z";
  padOutput: 0 | 1 | "Z";
}

export interface TristateSpec {
  phases: TristatePhase[];
  phaseFrames: number;
}

// ── Segment 7: IOESDProtection ──

export interface ESDProtectionSpec {
  /** Frames for each phase: pulse hit, diode conduction, shield, recovery */
  phaseFrames: number;
}

// ── Segment 8: ProblemList ──

export interface ProblemItem {
  icon: string;         // emoji or symbol
  label: string;
  description: string;
  color: string;
}

export interface ProblemListSpec {
  items: ProblemItem[];
  itemFrames: number;   // frames per item
}

// ── Main spec ──

export interface ChipIOVideoSpec {
  segmentFrames: {
    problemStatement: number;   // 420
    ioBoundary: number;         // 660
    directConnection: number;   // 720
    inputIO: number;            // 780
    outputDriver: number;       // 840
    tristate: number;           // 780
    esdProtection: number;      // 540
    problemList: number;        // 540
    summary: number;            // 480
  };
  problemStatement: CalloutDemoSpec;
  ioBoundary: LayeredArchitectureSpec;
  directConnection: DirectConnectionSpec;
  inputIO: CircuitWaveformLinkerAuthoring;
  outputDriver: OutputDriverSpec;
  tristate: TristateSpec;
  esdProtection: ESDProtectionSpec;
  problemList: ProblemListSpec;
  summary: TextEmphasisSpec;
}

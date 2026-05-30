// TimingDiagram — Schedule Computation
// Pure function: TimingDiagramSpec → TimingDiagramSchedule
// Called once per composition mount, cached with useMemo.

import type {
  TimingDiagramSpec,
  TimingDiagramSchedule,
  TDTrackSchedule,
  TDSegment,
  ResolvedTDEvent,
  ResolvedTDSetupHoldWindow,
  ResolvedTDAnnotation,
  TDSignalState,
} from "./types";

const DEFAULT_COLORS = [
  "#60a5fa", "#facc15", "#4ade80", "#f472b6",
  "#38bdf8", "#c084fc", "#fb923c", "#a78bfa",
];

const EVENT_COLORS: Record<string, string> = {
  assert: "#10b981",
  deassert: "#f59e0b",
  handshake: "#38bdf8",
  violation: "#ef4444",
  note: "#94a3b8",
};

function resolveState(val: { state?: TDSignalState; value: number | string }): TDSignalState {
  if (val.state) return val.state;
  if (typeof val.value === "string") {
    const lower = val.value.toLowerCase();
    if (lower === "x") return "x";
    if (lower === "z") return "z";
  }
  return "normal";
}

export function computeTDSchedule(spec: TimingDiagramSpec): TimingDiagramSchedule {
  // ── Validate ──
  const signalIndex = new Map<string, number>();
  for (let i = 0; i < spec.signals.length; i++) {
    const sig = spec.signals[i];
    if (signalIndex.has(sig.id)) throw new Error(`Duplicate signal id: ${sig.id}`);
    signalIndex.set(sig.id, i);
  }

  for (const evt of spec.events ?? []) {
    if (!signalIndex.has(evt.signalId)) {
      throw new Error(`Event "${evt.id}" references unknown signal: ${evt.signalId}`);
    }
  }
  for (const win of spec.setupHoldWindows ?? []) {
    if (!signalIndex.has(win.signalId)) {
      throw new Error(`SetupHoldWindow references unknown signal: ${win.signalId}`);
    }
  }

  // ── Build tracks (segments from value keyframes) ──
  const tracks: TDTrackSchedule[] = spec.signals.map((sig, idx) => {
    const sorted = [...sig.values].sort((a, b) => a.cycle - b.cycle);

    // Dedup by cycle: last value wins
    const deduped = new Map<number, (typeof sorted)[0]>();
    for (const v of sorted) {
      if (deduped.has(v.cycle)) {
        console.warn(`Duplicate cycle ${v.cycle} for signal "${sig.id}" — keeping last value`);
      }
      deduped.set(v.cycle, v);
    }
    const unique = Array.from(deduped.values()).sort((a, b) => a.cycle - b.cycle);

    const segments: TDSegment[] = [];

    for (let i = 0; i < unique.length; i++) {
      const startCycle = unique[i].cycle;
      const endCycle = i + 1 < unique.length ? unique[i + 1].cycle : spec.totalCycles + 1;
      const state = resolveState(unique[i]);

      // Merge with previous if same value and state
      const prev = segments[segments.length - 1];
      const val = unique[i].value;
      if (
        prev &&
        prev.endCycle === startCycle &&
        prev.value === val &&
        prev.state === state &&
        prev.displayValue === unique[i].displayValue
      ) {
        prev.endCycle = endCycle;
      } else {
        segments.push({
          startCycle,
          endCycle,
          value: val,
          state,
          displayValue: unique[i].displayValue,
        });
      }
    }

    return {
      id: sig.id,
      name: sig.name,
      label: sig.label,
      encoding: sig.encoding,
      busWidth: sig.busWidth,
      color: sig.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      segments,
    };
  });

  // ── Resolve events ──
  const events: ResolvedTDEvent[] = (spec.events ?? []).map((evt) => {
    const trackIdx = signalIndex.get(evt.signalId)!;
    return {
      id: evt.id,
      cycle: evt.cycle,
      signalId: evt.signalId,
      type: evt.type,
      edge: evt.edge,
      label: evt.label,
      color: evt.color ?? EVENT_COLORS[evt.type] ?? "#94a3b8",
      trackIndex: trackIdx,
    };
  });

  // ── Resolve setup/hold windows ──
  const setupHoldWindows: ResolvedTDSetupHoldWindow[] = (spec.setupHoldWindows ?? []).map((win) => {
    const trackIdx = signalIndex.get(win.signalId)!;
    return {
      signalId: win.signalId,
      referenceCycle: win.referenceCycle,
      setupStartCycle: win.referenceCycle + win.setupStart,
      holdEndCycle: win.referenceCycle + win.holdEnd,
      color: win.color ?? "#ef444466",
      label: win.label ?? "",
      trackIndex: trackIdx,
    };
  });

  // ── Resolve annotations ──
  const annotations: ResolvedTDAnnotation[] = (spec.annotations ?? []).map((ann) => ({
    cycle: ann.cycle,
    text: ann.text,
    position: ann.position,
    color: ann.color ?? "#e2e8f0",
    offsetX: ann.offsetX ?? 0,
    offsetY: ann.offsetY ?? 0,
  }));

  // ── Visible cycles (clamp to [1, totalCycles], protect inverted range) ──
  const rawVisible = spec.visibleCycles ?? [1, spec.totalCycles];
  if (rawVisible[0] > rawVisible[1]) {
    rawVisible.reverse();
  }
  const visibleCycles: [number, number] = [
    Math.max(1, Math.min(rawVisible[0], spec.totalCycles)),
    Math.max(1, Math.min(rawVisible[1], spec.totalCycles)),
  ];

  return {
    tracks,
    totalCycles: spec.totalCycles,
    clockPeriod: spec.clockPeriod,
    visibleCycles,
    events,
    setupHoldWindows,
    annotations,
  };
}

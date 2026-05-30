// CircuitWaveformLinker — Per-frame State Computation
// Fully deterministic pure function: (currentCycle, cycleFrame, frame, authoring, fps) → LinkedFrameState

import type {
  VisualBaseState,
  VisualModifier,
  ZoneToken,
  PulseEvent,
  LinkedFrameState,
  CircuitWaveformLinkerAuthoring,
  CycleAction,
} from "./types";
import { clamp01, easeOutCubic } from "../utils";

function findCycleAction(cycles: CycleAction[], cycle: number): CycleAction | undefined {
  return cycles.find(c => c.cycle === cycle);
}

function getZoneStateAtCycle(
  zoneId: string,
  cycle: number,
  cycles: CycleAction[],
): VisualBaseState {
  const a = findCycleAction(cycles, cycle);
  if (!a) return "IDLE";
  const zs = a.zoneStates.find(z => z.zoneId === zoneId);
  return zs?.state ?? "IDLE";
}

function getZoneModsAtCycle(
  zoneId: string,
  cycle: number,
  cycles: CycleAction[],
): VisualModifier[] {
  const a = findCycleAction(cycles, cycle);
  if (!a) return [];
  const zs = a.zoneStates.find(z => z.zoneId === zoneId);
  return zs?.modifiers ?? [];
}

// Walk backwards through cycles to determine when a zone entered its current state.
// Returns null if the zone has been in the same state since firstCycle (no decay needed).
function findTransition(
  zoneId: string,
  currentCycle: number,
  cycles: CycleAction[],
  firstCycle: number,
  framesPerCycle: number,
  leadIn: number,
): { prevState: VisualBaseState; transitionFrame: number } | null {
  const targetState = getZoneStateAtCycle(zoneId, currentCycle, cycles);

  if (currentCycle <= firstCycle) return null;

  for (let c = currentCycle - 1; c >= firstCycle; c--) {
    const prevState = getZoneStateAtCycle(zoneId, c, cycles);
    if (prevState !== targetState) {
      const transitionFrame = leadIn + (c + 1 - firstCycle) * framesPerCycle;
      return { prevState, transitionFrame };
    }
  }

  return null; // same state all the way back
}

function computeDecayedIntensity(
  targetState: VisualBaseState,
  transition: { prevState: VisualBaseState; transitionFrame: number } | null,
  frame: number,
  fps: number,
): { intensity: number; residual: number; prevState: VisualBaseState } {
  const decayFrames = Math.max(1, Math.round(0.133 * fps)); // ~133ms decay
  const rawIntensity = targetState === "IDLE" ? 0.2 : 1;

  if (!transition || transition.prevState === targetState) {
    return { intensity: rawIntensity, residual: 0, prevState: targetState };
  }

  const elapsed = frame - transition.transitionFrame;
  const progress = clamp01(elapsed / decayFrames);

  if (transition.prevState !== "IDLE" && progress < 1) {
    const residual = 1 - easeOutCubic(progress);
    // Blend residual into intensity for smooth visual decay
    return { intensity: Math.max(rawIntensity, residual * 0.4), residual, prevState: transition.prevState };
  }

  return { intensity: rawIntensity, residual: 0, prevState: targetState };
}

// Count only cascade groups that have at least one active link in this cycle.
function activeCascadeGroups(
  cascadeOrder: string[][],
  dedupedLinks: string[],
): string[][] {
  return cascadeOrder.filter(group => group.some(id => dedupedLinks.includes(id)));
}

function computePulses(
  cycleAction: CycleAction | undefined,
  cycleFrame: number,
  cascadeOrder: string[][] | undefined,
  busGroups: string[][] | undefined,
  fps: number,
): PulseEvent[] {
  if (!cycleAction || cycleAction.pulses.length === 0) return [];
  const pulseFrames = Math.max(1, Math.round(0.2 * fps)); // ~200ms per link propagation

  // Deduplicate pulses by bus group — keep the actual active linkId for correct path rendering
  const dedupedLinks: string[] = [];
  if (busGroups) {
    for (const group of busGroups) {
      const activeInGroup = group.filter(gid => cycleAction.pulses.some(p => p.linkId === gid));
      if (activeInGroup.length > 0) dedupedLinks.push(activeInGroup[0]);
    }
    for (const pulse of cycleAction.pulses) {
      const inGroup = busGroups.some(g => g.includes(pulse.linkId));
      if (!inGroup) dedupedLinks.push(pulse.linkId);
    }
  } else {
    dedupedLinks.push(...cycleAction.pulses.map(p => p.linkId));
  }

  const pulses: PulseEvent[] = [];

  if (cascadeOrder && cascadeOrder.length > 0) {
    const groups = activeCascadeGroups(cascadeOrder, dedupedLinks);
    for (let gi = 0; gi < groups.length; gi++) {
      const delay = gi * pulseFrames;
      for (const linkId of dedupedLinks) {
        if (groups[gi].includes(linkId)) {
          const localFrame = cycleFrame - delay;
          if (localFrame >= 0 && localFrame < pulseFrames) {
            pulses.push({
              linkId,
              progress: easeOutCubic(clamp01((localFrame + 1) / pulseFrames)),
              durationFrames: pulseFrames,
              delayFrames: delay,
            });
          }
        }
      }
    }
  } else {
    for (const linkId of dedupedLinks) {
      if (cycleFrame < pulseFrames) {
        pulses.push({
          linkId,
          progress: easeOutCubic(clamp01((cycleFrame + 1) / pulseFrames)),
          durationFrames: pulseFrames,
          delayFrames: 0,
        });
      }
    }
  }

  return pulses;
}

export function computeLinkedFrame(
  currentCycle: number,
  cycleFrame: number,
  frame: number,
  authoring: CircuitWaveformLinkerAuthoring,
  fps = 60,
): LinkedFrameState {
  const { zones, cycles, cascadeOrder, busGroups, framesPerCycle } = authoring;
  const firstCycle = cycles[0]?.cycle ?? 1;
  const leadIn = Math.max(0, firstCycle - 1) * framesPerCycle;

  const cycleAction = findCycleAction(cycles, currentCycle);

  // 1. Compute zone tokens with deterministic decay
  const tokens: ZoneToken[] = [];
  let focalZoneId: string | null = null;

  for (const zone of zones) {
    const targetState = getZoneStateAtCycle(zone.id, currentCycle, cycles);
    const modifiers = getZoneModsAtCycle(zone.id, currentCycle, cycles);

    const transition = findTransition(zone.id, currentCycle, cycles, firstCycle, framesPerCycle, leadIn);
    const { intensity, residual, prevState } = computeDecayedIntensity(targetState, transition, frame, fps);

    tokens.push({
      zoneId: zone.id,
      baseState: targetState,
      activeModifiers: modifiers,
      intensity,
      residual,
      prevState,
    });

    if (targetState === "ERROR" || targetState === "METASTABLE") {
      focalZoneId = zone.id;
    }
  }

  // 2. Single focal point rule: ERROR/METASTABLE dims all ACTIVE/HOLD zones
  if (focalZoneId) {
    for (const token of tokens) {
      if (token.baseState === "ACTIVE" || token.baseState === "HOLD") {
        token.baseState = "IDLE";
        token.intensity = Math.min(token.intensity, 0.2);
      }
    }
  }

  // 3. Compute pulses with cascade sequencing + bus dedup
  const pulses = computePulses(cycleAction, cycleFrame, cascadeOrder, busGroups, fps);

  return {
    tokens,
    pulses,
    activePathIds: pulses.map(p => p.linkId),
    focalZoneId,
    currentCycle,
  };
}

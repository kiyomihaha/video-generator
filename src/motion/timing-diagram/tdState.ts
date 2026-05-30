// TimingDiagram — Per-frame State Computation
// Pure function: (schedule, frame, fps) → TimingDiagramState

import type {
  TimingDiagramSchedule,
  TimingDiagramState,
  TDTrackState,
  TDSegmentState,
  ActiveTDEvent,
  ActiveTDWindow,
} from "./types";
import { clamp01, easeOutCubic } from "../utils";

export function tdState(
  schedule: TimingDiagramSchedule,
  frame: number,
  fps: number,
): TimingDiagramState {
  const cyclePeriodFrames = schedule.clockPeriod * fps;
  const cursorCycle = frame / cyclePeriodFrames;
  const currentCycle = Math.floor(cursorCycle);
  const cursorProgress = cursorCycle - currentCycle;

  const [visStart, visEnd] = schedule.visibleCycles;

  // ── Tracks ──
  const tracks: TDTrackState[] = schedule.tracks.map((track) => {
    const segmentStates: TDSegmentState[] = track.segments.map((seg) => {
      // Skip segments outside visible range
      if (seg.endCycle < visStart || seg.startCycle > visEnd) {
        return { segment: seg, opacity: 0, highlight: 0 };
      }

      // Fade-in: segment appears when cursor reaches its startCycle
      const fadeInStart = (seg.startCycle - 1) * cyclePeriodFrames;
      const fadeInEnd = fadeInStart + cyclePeriodFrames * 0.3;
      const opacity = clamp01((frame - fadeInStart) / Math.max(fadeInEnd - fadeInStart, 1));

      // Highlight: cursor is within this segment
      const cursorAtCycle = currentCycle + 1; // 1-based
      const isCurrent = cursorAtCycle >= seg.startCycle && cursorAtCycle < seg.endCycle;
      const highlight = isCurrent ? easeOutCubic(cursorProgress * 2) : 0;

      return { segment: seg, opacity, highlight };
    });

    return {
      id: track.id,
      name: track.name,
      label: track.label,
      encoding: track.encoding,
      segments: segmentStates,
      opacity: 1,
    };
  });

  // ── Events ──
  const activeEvents: ActiveTDEvent[] = schedule.events
    .map((evt) => {
      // Event appears when cursor is within 0.5 cycles of it
      const dist = Math.abs(cursorCycle - evt.cycle + 0.5);
      if (dist > 1.5) return null;

      const opacity = clamp01(1 - dist / 1.5);
      // Pulse: spike when cursor passes the event cycle
      const pulse = dist < 0.5 ? easeOutCubic(1 - dist * 2) : 0;

      return { event: evt, opacity, pulse };
    })
    .filter((e): e is ActiveTDEvent => e !== null);

  // ── Setup/Hold Windows ──
  const activeWindows: ActiveTDWindow[] = schedule.setupHoldWindows
    .map((win) => {
      if (cursorCycle < win.setupStartCycle - 1 || cursorCycle > win.holdEndCycle + 1) {
        return null;
      }
      // Fade in when approaching, fade out when leaving
      const fadeIn = clamp01(cursorCycle - win.setupStartCycle + 1);
      const fadeOut = clamp01(win.holdEndCycle + 1 - cursorCycle);
      const opacity = Math.min(fadeIn, fadeOut) * 0.5;
      return { window: win, opacity };
    })
    .filter((w): w is ActiveTDWindow => w !== null);

  return {
    tracks,
    cursorCycle,
    cursorProgress,
    activeEvents,
    activeWindows,
    title: null,
  };
}

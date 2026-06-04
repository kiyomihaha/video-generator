// Virtual Memory — Per-frame state computation
// Pure function: (VMSchedule, frame, fps, clockPeriod) → VMState

import type {
  VMSchedule,
  VMState,
  TLBCellState,
  PageTableState,
  PTECellState,
  VMAccessState,
} from "./types";
import { clamp01, easeOutCubic } from "../utils";

export function vmState(
  schedule: VMSchedule,
  frame: number,
  fps: number,
  clockPeriod: number,
): VMState {
  const cyclePeriod = clockPeriod * fps;
  const currentCycle = Math.floor(frame / cyclePeriod);

  // Find current access
  const currentEntry = schedule.timeline.find(
    (e) => e.cycle === currentCycle + 1
  ) ?? null;

  // Compute phase within current clock cycle
  let currentAccess: VMAccessState | null = null;
  if (currentEntry) {
    const cycleFrame = frame - currentCycle * cyclePeriod;
    const phaseProgress = clamp01(cycleFrame / cyclePeriod);

    let phase: VMAccessState["phase"];
    if (phaseProgress < 0.12) phase = "address";
    else if (phaseProgress < 0.28) phase = "decompose";
    else if (phaseProgress < 0.45) phase = "tlb-lookup";
    else if (phaseProgress < 0.70) phase = "walk";
    else if (phaseProgress < 0.88) phase = "translate";
    else phase = "result";

    currentAccess = { entry: currentEntry, phase, phaseProgress };
  }

  // Build TLB grid state
  const tlbGrid: TLBCellState[][] = Array.from({ length: schedule.tlbSets }, () =>
    Array.from({ length: schedule.tlbAssociativity }, (): TLBCellState => ({
      vpn: null,
      physicalFrame: null,
      valid: false,
      opacity: 0.3,
      highlight: 0,
      evictionFlash: 0,
      walkHighlight: 0,
    }))
  );

  // Populate TLB from timeline history up to current cycle
  for (const entry of schedule.timeline) {
    if (entry.cycle > currentCycle + 1) break;

    const set = tlbGrid[entry.tlbSet];
    if (entry.tlbWay !== null) {
      const cell = set[entry.tlbWay];

      // For current-cycle entries: only show fill during translate/result phases
      // Past cycles: always show
      const isCurrentCycle = entry.cycle === currentCycle + 1;
      const isPastCycle = entry.cycle < currentCycle + 1;

      // For current-cycle misses, delay fill until walk is done
      const phaseAllowsFill = isPastCycle ||
        (currentAccess && (
          currentAccess.phase === "translate" ||
          currentAccess.phase === "result"
        ));

      // Eviction flash (always show for current cycle)
      if (entry.evictedTlbEntry &&
        entry.evictedTlbEntry.set === entry.tlbSet &&
        entry.evictedTlbEntry.way === entry.tlbWay &&
        isCurrentCycle) {
        cell.evictionFlash = 1;
      }

      if (entry.result === "tlb-hit") {
        // TLB hit: show immediately
        cell.vpn = entry.vpnKey;
        cell.physicalFrame = entry.physicalFrame;
        cell.valid = true;
        cell.opacity = 0.9;

        if (isCurrentCycle) {
          cell.highlight = 1;
        }
      } else if (isPastCycle || phaseAllowsFill) {
        // TLB miss/walk: only fill after walk completes
        cell.vpn = entry.physicalFrame !== null ? entry.vpnKey : null;
        cell.physicalFrame = entry.physicalFrame;
        cell.valid = entry.result !== "page-fault" || entry.physicalFrame !== null;
        cell.opacity = 0.9;

        if (isCurrentCycle) {
          cell.walkHighlight = 1;
        }
      }
    }
  }

  // Build page table state
  const pageTables: PageTableState[] = [];
  for (let l = 0; l < schedule.numLevels; l++) {
    const entriesCount = schedule.entriesPerLevel[l];
    const cells: PTECellState[][] = [];

    // Display as a grid — break into rows of 8
    const cols = Math.min(8, entriesCount);
    const rows = Math.ceil(entriesCount / cols);

    for (let r = 0; r < rows; r++) {
      const row: PTECellState[] = [];
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= entriesCount) break;

        const pte: PTECellState = {
          valid: false,
          physicalFrame: null,
          opacity: 0.4,
          walkHighlight: 0,
          faultFlash: 0,
        };

        // Check if current access walks through this entry
        if (currentEntry && currentEntry.cycle === currentCycle + 1) {
          const walkStep = currentEntry.walkPath.find(
            (s) => s.level === l && s.entryIndex === idx
          );
          if (walkStep) {
            pte.walkHighlight = 1;
            pte.valid = walkStep.result === "hit";
            pte.faultFlash = walkStep.result === "fault" ? 1 : 0;
            pte.opacity = 0.9;
          }
        }

        row.push(pte);
      }
      cells.push(row);
    }

    pageTables.push({ level: l, cells });
  }

  // Animate TLB cell transitions
  for (let si = 0; si < schedule.tlbSets; si++) {
    for (let wi = 0; wi < schedule.tlbAssociativity; wi++) {
      const cell = tlbGrid[si][wi];

      // Fade in new entries
      const appearFrame = currentCycle * cyclePeriod;
      const appearProgress = clamp01((frame - appearFrame) / 6);
      if (cell.valid) {
        cell.opacity = 0.3 + 0.6 * easeOutCubic(appearProgress);
      }

      // Pulse highlight
      if (cell.highlight > 0) {
        const pulseFrame = currentCycle * cyclePeriod;
        const t = clamp01((frame - pulseFrame) / 10);
        cell.highlight = t < 0.5 ? t * 2 : 2 - t * 2;
      }

      // Eviction flash decay
      if (cell.evictionFlash > 0) {
        const flashFrame = currentCycle * cyclePeriod;
        const t = clamp01((frame - flashFrame) / 8);
        cell.evictionFlash = 1 - easeOutCubic(t);
      }
    }
  }

  // Page table walk highlight animation
  for (const pt of pageTables) {
    for (const row of pt.cells) {
      for (const cell of row) {
        if (cell.walkHighlight > 0) {
          const pulseFrame = currentCycle * cyclePeriod;
          const t = clamp01((frame - pulseFrame) / 12);
          cell.walkHighlight = t < 0.5 ? t * 2 : 2 - t * 2;
        }
        if (cell.faultFlash > 0) {
          const flashFrame = currentCycle * cyclePeriod;
          const t = clamp01((frame - flashFrame) / 10);
          cell.faultFlash = t < 0.5 ? t * 2 : 2 - t * 2;
        }
      }
    }
  }

  return {
    tlbGrid,
    pageTables,
    currentAccess,
    title: null,
  };
}

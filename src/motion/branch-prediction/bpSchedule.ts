// Branch Prediction — Schedule computation
// Pure function: BranchPredictionSpec → BranchPredictionSchedule

import type {
  BranchPredictionSpec,
  BranchPredictionSchedule,
  BPScheduledCell,
  BTBSnapshot,
  BTBEntry,
  ResolvedBranch,
  CounterState,
} from "./types";

const COUNTER_ORDER: CounterState[] = [
  "strongly-not-taken",
  "weakly-not-taken",
  "weakly-taken",
  "strongly-taken",
];

function advanceCounter(current: CounterState, taken: boolean): CounterState {
  const idx = COUNTER_ORDER.indexOf(current);
  if (taken) return COUNTER_ORDER[Math.min(idx + 1, 3)];
  return COUNTER_ORDER[Math.max(idx - 1, 0)];
}

function counterPredictsTaken(counter: CounterState): boolean {
  return counter === "weakly-taken" || counter === "strongly-taken";
}

export function computeBPSchedule(spec: BranchPredictionSpec): BranchPredictionSchedule {
  const { stages, totalCycles, instructions, branches, predictor, btbSize } = spec;
  const numStages = stages.length;

  // 1. Initialize BTB
  const btb: BTBEntry[] = Array.from({ length: btbSize }, (_, i) => ({
    index: i,
    counter: predictor === "always-taken" ? "strongly-taken" as CounterState : "weakly-not-taken" as CounterState,
    branchId: null,
  }));

  // 2. Build instruction map
  const instrMap = new Map<string, (typeof instructions)[0]>();
  for (const instr of instructions) {
    if (instrMap.has(instr.id)) throw new Error(`Duplicate instruction ID: ${instr.id}`);
    instrMap.set(instr.id, instr);
  }

  // 3. Build branch map (instructionId → BranchEvent)
  const branchMap = new Map<string, (typeof branches)[0]>();
  for (const branch of branches) {
    if (!instrMap.has(branch.instructionId)) {
      throw new Error(`Branch references unknown instruction: ${branch.instructionId}`);
    }
    branchMap.set(branch.instructionId, branch);
  }

  // 4. Initialize grid
  const cells: BPScheduledCell[][] = Array.from({ length: numStages }, () =>
    Array.from({ length: totalCycles }, () => ({
      instructionId: null,
      mnemonic: null,
      state: "empty" as const,
      stage: 0,
      cycle: 0,
    }))
  );

  // 5. Place instructions
  const sortedInstrs = [...instructions].sort((a, b) => a.entryCycle - b.entryCycle);
  const flushedSet = new Set<string>();
  const btbTimeline: BTBSnapshot[] = [];
  const counterBeforeMap = new Map<string, CounterState>();

  // Pre-compute which instructions get flushed
  for (const branch of branches) {
    if (branch.predicted !== branch.actual) {
      // Misprediction: flush speculative instructions
      const branchInstr = instrMap.get(branch.instructionId)!;
      const branchEntryCycle = branchInstr.entryCycle;

      // Instructions that entered after the branch and are on the predicted path
      for (const instr of sortedInstrs) {
        if (instr.entryCycle > branchEntryCycle && instr.isSpeculative) {
          flushedSet.add(instr.id);
        }
      }
    }
  }

  // Place each instruction
  for (const instr of sortedInstrs) {
    const isFlushed = flushedSet.has(instr.id);
    const isBranch = branchMap.has(instr.id);
    const branch = branchMap.get(instr.id);

    for (let si = 0; si < numStages; si++) {
      const cycle = instr.entryCycle - 1 + si;
      if (cycle < 0 || cycle >= totalCycles) continue;

      let state: BPScheduledCell["state"];
      if (isFlushed) {
        state = "flushed";
      } else if (instr.isSpeculative) {
        state = "speculative";
      } else {
        state = "active";
      }

      cells[si][cycle] = {
        instructionId: instr.id,
        mnemonic: instr.mnemonic,
        state,
        stage: si,
        cycle,
        color: instr.color,
      };
    }

    // Record BTB snapshot at this instruction's cycle
    if (isBranch && branch && predictor !== "always-taken") {
      const btbEntry = btb[branch.btbIndex];
      btbEntry.branchId = instr.id;

      // Capture counter BEFORE update for resolvedBranches
      counterBeforeMap.set(instr.id, btbEntry.counter);

      btbTimeline.push({
        cycle: instr.entryCycle,
        entries: btb.map((e) => ({ ...e })),
      });

      // Update counter after branch resolves
      const newCounter = advanceCounter(btbEntry.counter, branch.actual === "taken");
      btb[branch.btbIndex] = { ...btbEntry, counter: newCounter };
      btbTimeline.push({
        cycle: branch.resolveCycle,
        entries: btb.map((e) => ({ ...e })),
      });
    }
  }

  // 6. Resolve branches
  const resolvedBranches: ResolvedBranch[] = branches.map((branch) => {
    // Use pre-update counter captured during instruction loop
    const counterBefore = counterBeforeMap.get(branch.instructionId) ?? "weakly-not-taken" as CounterState;
    const counterAfter = advanceCounter(counterBefore, branch.actual === "taken");
    const isCorrect = branch.predicted === branch.actual;

    const flushedCells: { stage: number; cycle: number }[] = [];
    if (!isCorrect) {
      const branchInstr = instrMap.get(branch.instructionId)!;
      for (const instr of sortedInstrs) {
        if (instr.entryCycle > branchInstr.entryCycle && instr.isSpeculative) {
          for (let si = 0; si < numStages; si++) {
            const cycle = instr.entryCycle - 1 + si;
            if (cycle >= 0 && cycle < totalCycles) {
              flushedCells.push({ stage: si, cycle });
            }
          }
        }
      }
    }

    return {
      branchId: branch.instructionId,
      instructionId: branch.instructionId,
      resolveCycle: branch.resolveCycle,
      resolveStage: branch.resolveStage,
      predicted: branch.predicted,
      actual: branch.actual,
      isCorrect,
      flushedCells,
      penaltyCycles: branch.penaltyCycles,
      btbIndex: branch.btbIndex,
      counterBefore,
      counterAfter,
    };
  });

  // 7. Ensure BTB timeline has at least one snapshot
  if (btbTimeline.length === 0) {
    btbTimeline.push({
      cycle: 1,
      entries: btb.map((e) => ({ ...e })),
    });
  }

  return {
    cells,
    btbTimeline,
    branches: resolvedBranches,
    totalCycles,
    numStages,
  };
}

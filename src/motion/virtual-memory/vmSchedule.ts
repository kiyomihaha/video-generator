// Virtual Memory — Schedule computation
// Pure function: VirtualMemorySpec → VMSchedule

import type {
  VirtualMemorySpec,
  VMSchedule,
  VMTimelineEntry,
  WalkStep,
  VMBitFieldInfo,
} from "./types";

interface TLBEntryState {
  vpn: number;
  physicalFrame: number;
  valid: boolean;
  lastUsed: number;
}

interface PageTableEntryState {
  valid: boolean;
  physicalFrame: number | null;
}

export function computeVMSchedule(spec: VirtualMemorySpec): VMSchedule {
  const {
    addressBits, pageSize, numLevels, entriesPerLevel,
    tlbSets, tlbAssociativity, replacement, accesses,
  } = spec;

  // 1. Compute bit fields
  const offsetBits = Math.log2(pageSize);
  const vpnBits = entriesPerLevel.map((e) => Math.log2(e));
  const vpnLabels = numLevels === 1
    ? ["VPN"]
    : vpnBits.map((_, i) => `VPN${i + 1}`);

  const bitFields: VMBitFieldInfo = {
    totalBits: addressBits,
    offsetBits,
    vpnBits,
    vpnLabels,
  };

  // 2. Initialize TLB (sets × ways)
  const tlb: TLBEntryState[][] = Array.from({ length: tlbSets }, () =>
    Array.from({ length: tlbAssociativity }, (): TLBEntryState => ({
      vpn: -1,
      physicalFrame: -1,
      valid: false,
      lastUsed: -1,
    }))
  );

  // 3. Initialize page tables (one per level)
  const pageTables: PageTableEntryState[][] = entriesPerLevel.map((count) =>
    Array.from({ length: count }, (): PageTableEntryState => ({
      valid: false,
      physicalFrame: null,
    }))
  );

  // 4. Pre-populate some page table entries to create realistic scenarios
  // Map VPNs to physical frames for entries that should be "resident"
  const vpnToPfn = new Map<number, number>();
  let nextPfn = 1;

  // Sort accesses by cycle
  const sorted = [...accesses].sort((a, b) => a.cycle - b.cycle);

  // 5. Process each access
  const timeline: VMTimelineEntry[] = [];

  for (const access of sorted) {
    const va = access.virtualAddress;

    // Decompose VA → vpn[level], offset
    // Offset is the LOW bits, VPN fields are above the offset
    const offsetMask = (1 << offsetBits) - 1;
    const offset = va & offsetMask;
    let vpnRemaining = va >> offsetBits;
    const vpn: number[] = [];
    for (let l = numLevels - 1; l >= 0; l--) {
      const bits = vpnBits[l];
      const mask = (1 << bits) - 1;
      vpn.unshift(vpnRemaining & mask);
      vpnRemaining >>= bits;
    }

    // Combined VPN key for TLB lookup (concatenate all levels)
    let vpnKey = 0;
    for (let l = 0; l < numLevels; l++) {
      vpnKey = (vpnKey << vpnBits[l]) | vpn[l];
    }

    // TLB lookup
    const tlbSetIdx = vpnKey % tlbSets;
    const tlbSet = tlb[tlbSetIdx];
    let tlbHit = false;
    let tlbWay: number | null = null;

    for (let w = 0; w < tlbAssociativity; w++) {
      if (tlbSet[w].valid && tlbSet[w].vpn === vpnKey) {
        tlbHit = true;
        tlbWay = w;
        tlbSet[w].lastUsed = access.cycle;
        break;
      }
    }

    if (tlbHit) {
      timeline.push({
        accessId: access.id,
        cycle: access.cycle,
        virtualAddress: va,
        vpn,
        vpnKey,
        offset,
        result: "tlb-hit",
        tlbSet: tlbSetIdx,
        tlbWay,
        walkPath: [],
        physicalFrame: tlbSet[tlbWay!].physicalFrame,
        evictedTlbEntry: null,
      });
      continue;
    }

    // TLB miss → page table walk
    const walkPath: WalkStep[] = [];
    let pageFault = false;
    let resolvedPfn: number | null = null;

    for (let l = 0; l < numLevels; l++) {
      const entryIdx = vpn[l];
      const pte = pageTables[l][entryIdx];

      if (!pte.valid) {
        // Page fault at this level
        // For demo: mark as valid with a new PFN to show recovery
        pte.valid = true;
        pte.physicalFrame = nextPfn++;
        vpnToPfn.set(vpnKey, pte.physicalFrame);

        walkPath.push({ level: l, entryIndex: entryIdx, result: "fault" });
        pageFault = true;
        // Continue walking to show the full path
        if (l === numLevels - 1) {
          resolvedPfn = pte.physicalFrame;
        }
        continue;
      }

      walkPath.push({ level: l, entryIndex: entryIdx, result: "hit" });

      if (l === numLevels - 1) {
        resolvedPfn = pte.physicalFrame;
      }
    }

    // If no fault, resolvedPfn should come from the last level
    if (!pageFault && resolvedPfn === null) {
      // Shouldn't happen, but fallback
      resolvedPfn = nextPfn++;
    }

    // Fill TLB
    let evictedTlbEntry: VMTimelineEntry["evictedTlbEntry"] = null;

    // Find victim slot
    let victimWay: number;
    const emptySlot = tlbSet.findIndex((e) => !e.valid);
    if (emptySlot >= 0) {
      victimWay = emptySlot;
    } else {
      // LRU: evict least recently used
      if (replacement === "LRU") {
        let minUsed = Infinity;
        victimWay = 0;
        for (let w = 0; w < tlbAssociativity; w++) {
          if (tlbSet[w].lastUsed < minUsed) {
            minUsed = tlbSet[w].lastUsed;
            victimWay = w;
          }
        }
      } else if (replacement === "FIFO") {
        victimWay = 0; // Simple FIFO: always evict slot 0, rotate
      } else {
        victimWay = Math.floor(Math.random() * tlbAssociativity);
      }

      if (tlbSet[victimWay].valid) {
        evictedTlbEntry = {
          set: tlbSetIdx,
          way: victimWay,
          vpn: tlbSet[victimWay].vpn,
        };
      }
    }

    // Install new TLB entry
    tlbSet[victimWay!] = {
      vpn: vpnKey,
      physicalFrame: resolvedPfn!,
      valid: true,
      lastUsed: access.cycle,
    };

    timeline.push({
      accessId: access.id,
      cycle: access.cycle,
      virtualAddress: va,
      vpn,
      vpnKey,
      offset,
      result: pageFault ? "page-fault" : "tlb-miss-walk",
      tlbSet: tlbSetIdx,
      tlbWay: victimWay!,
      walkPath,
      physicalFrame: resolvedPfn,
      evictedTlbEntry,
    });
  }

  const lastCycle = sorted[sorted.length - 1]?.cycle ?? 1;
  const totalCycles = lastCycle + 2; // Extra cycles for final animation

  return {
    timeline,
    bitFields,
    tlbSets,
    tlbAssociativity,
    numLevels,
    entriesPerLevel,
    totalCycles,
  };
}

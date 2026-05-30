import { z } from "zod";

const baseStateSchema = z.enum(["IDLE", "ACTIVE", "HOLD", "ERROR", "METASTABLE"]);
const modifierSchema = z.enum(["flash", "shake", "glitch"]);

const zoneDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  labelAnchor: z.enum(["left", "center", "right"]).optional(),
});

const linkDefSchema = z.object({
  id: z.string().min(1),
  fromZoneId: z.string().min(1),
  toZoneId: z.string().min(1),
  path: z.string().min(1),
  label: z.string().optional(),
});

const zoneStateSpecSchema = z.object({
  zoneId: z.string().min(1),
  state: baseStateSchema,
  modifiers: z.array(modifierSchema).optional(),
});

const pulseSpecSchema = z.object({
  linkId: z.string().min(1),
});

const cycleActionSchema = z.object({
  cycle: z.number().int().min(1),
  zoneStates: z.array(zoneStateSpecSchema),
  pulses: z.array(pulseSpecSchema),
});

export const circuitWaveformLinkerAuthoringSchema = z.object({
  zones: z.array(zoneDefSchema).min(1),
  links: z.array(linkDefSchema),
  cycles: z.array(cycleActionSchema).min(1),
  framesPerCycle: z.number().int().positive(),
  busGroups: z.array(z.array(z.string())).optional(),
  cascadeOrder: z.array(z.array(z.string())).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  title: z.string().optional(),
}).refine(
  (spec) => {
    const ids = spec.zones.map(z => z.id);
    return new Set(ids).size === ids.length;
  },
  { message: "All zone ids must be unique", path: ["zones"] }
).refine(
  (spec) => {
    for (const link of spec.links) {
      if (!spec.zones.find(z => z.id === link.fromZoneId)) return false;
      if (!spec.zones.find(z => z.id === link.toZoneId)) return false;
    }
    return true;
  },
  { message: "Link references non-existent zone", path: ["links"] }
).refine(
  (spec) => {
    const ids = spec.links.map(l => l.id);
    return new Set(ids).size === ids.length;
  },
  { message: "All link ids must be unique", path: ["links"] }
).refine(
  (spec) => {
    for (const c of spec.cycles) {
      for (const zs of c.zoneStates) {
        if (!spec.zones.find(z => z.id === zs.zoneId)) return false;
      }
      for (const p of c.pulses) {
        if (!spec.links.find(l => l.id === p.linkId)) return false;
      }
    }
    return true;
  },
  { message: "Cycle references non-existent zone or link", path: ["cycles"] }
).refine(
  (spec) => {
    for (let i = 1; i < spec.cycles.length; i++) {
      if (spec.cycles[i].cycle <= spec.cycles[i - 1].cycle) return false;
    }
    return true;
  },
  { message: "Cycles must be sorted ascending with unique numbers", path: ["cycles"] }
).refine(
  (spec) => {
    for (const c of spec.cycles) {
      const ids = c.zoneStates.map(zs => zs.zoneId);
      if (new Set(ids).size !== ids.length) return false;
      const pids = c.pulses.map(p => p.linkId);
      if (new Set(pids).size !== pids.length) return false;
    }
    return true;
  },
  { message: "Each cycle must have unique zoneIds and unique linkIds in pulses", path: ["cycles"] }
).refine(
  (spec) => {
    if (!spec.cascadeOrder) return true;
    const allIds = spec.links.map(l => l.id);
    for (const group of spec.cascadeOrder) {
      for (const id of group) {
        if (!allIds.includes(id)) return false;
      }
    }
    return true;
  },
  { message: "cascadeOrder references non-existent link", path: ["cascadeOrder"] }
).refine(
  (spec) => {
    if (!spec.busGroups) return true;
    const allIds = spec.links.map(l => l.id);
    for (const group of spec.busGroups) {
      for (const id of group) {
        if (!allIds.includes(id)) return false;
      }
    }
    return true;
  },
  { message: "busGroups references non-existent link", path: ["busGroups"] }
);

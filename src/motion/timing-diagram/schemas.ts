// TimingDiagram — Zod schemas for runtime spec validation

import { z } from "zod";

const signalEncodingSchema = z.enum(["binary", "bus"]);
const tdSignalStateSchema = z.enum(["normal", "x", "z", "invalid"]);
const tdEdgeTypeSchema = z.enum(["rising", "falling", "none"]);
const tdEventTypeSchema = z.enum(["assert", "deassert", "handshake", "violation", "note"]);
const tdPositionSchema = z.enum(["top", "bottom"]);

const tdSignalValueSchema = z.object({
  cycle: z.number().int().min(1),
  value: z.union([z.number(), z.string()]),
  edge: tdEdgeTypeSchema.optional(),
  state: tdSignalStateSchema.optional(),
  displayValue: z.string().optional(),
});

const tdSignalSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string().optional(),
  encoding: signalEncodingSchema,
  busWidth: z.number().int().positive().optional(),
  color: z.string().optional(),
  values: z.array(tdSignalValueSchema).min(1),
});

const tdSignalGroupSchema = z.object({
  name: z.string(),
  signalIds: z.array(z.string()),
});

const tdEventSchema = z.object({
  id: z.string(),
  cycle: z.number().int().min(1),
  signalId: z.string(),
  type: tdEventTypeSchema,
  edge: tdEdgeTypeSchema.optional(),
  label: z.string(),
  color: z.string().optional(),
});

const tdSetupHoldWindowSchema = z.object({
  signalId: z.string(),
  referenceCycle: z.number().int().min(1),
  setupStart: z.number().negative(),
  holdEnd: z.number().positive(),
  color: z.string().optional(),
  label: z.string().optional(),
});

const tdAnnotationSchema = z.object({
  cycle: z.number().int().min(1),
  text: z.string(),
  position: tdPositionSchema,
  color: z.string().optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
});

export const timingDiagramSpecSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  clockPeriod: z.number().positive(),
  totalCycles: z.number().int().positive(),
  visibleCycles: z.tuple([z.number().int().min(1), z.number().int().min(1)]).optional(),
  signals: z.array(tdSignalSchema).min(1),
  groups: z.array(tdSignalGroupSchema).optional(),
  events: z.array(tdEventSchema).optional(),
  setupHoldWindows: z.array(tdSetupHoldWindowSchema).optional(),
  annotations: z.array(tdAnnotationSchema).optional(),
}).refine(
  (spec) => {
    for (const sig of spec.signals) {
      if (sig.encoding === "bus" && !sig.busWidth) return false;
    }
    return true;
  },
  { message: "Bus signals must have busWidth", path: ["signals"] }
).refine(
  (spec) => {
    for (const sig of spec.signals) {
      if (sig.encoding === "binary") {
        for (const v of sig.values) {
          const ok = (typeof v.value === "number" && (v.value === 0 || v.value === 1)) ||
                     (typeof v.value === "string" && (v.value === "x" || v.value === "z"));
          if (!ok) return false;
        }
      }
    }
    return true;
  },
  { message: "Binary signal values must be 0, 1, 'x', or 'z'", path: ["signals"] }
).refine(
  (spec) => {
    if (spec.visibleCycles) {
      return spec.visibleCycles[0] <= spec.visibleCycles[1];
    }
    return true;
  },
  { message: "visibleCycles[0] must be ≤ visibleCycles[1]", path: ["visibleCycles"] }
);

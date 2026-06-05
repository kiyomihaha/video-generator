// LayeredArchitecture — Zod Schemas

import { z } from "zod";

export const TIMELINE_EVENT_TYPES = [
  "enter",
  "exit",
  "highlight",
  "dim-others",
  "focus",
  "data-flow",
  "callout",
  "restore",
] as const;

const labelAnchorSchema = z.enum(["left", "center"]).optional();

const layerDefSchema = z.object({
  id: z.string().min(1).max(32),
  label: z.string().min(1).max(50),
  description: z.string().max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  labelAnchor: labelAnchorSchema,
});

const timelineEventSchema = z.object({
  beat: z.number().int().min(0),
  type: z.enum(TIMELINE_EVENT_TYPES),
  layerId: z.string().min(1).max(32).optional(),
  layerIds: z.array(z.string().min(1).max(32)).optional(),
  targetLayerId: z.string().min(1).max(32).optional(),
  direction: z.enum(["up", "down"]).optional(),
  label: z.string().max(60).optional(),
  durationBeats: z.number().int().min(1).optional(),
});

export const layeredArchitectureSpecSchema = z
  .object({
    layers: z.array(layerDefSchema).min(1).max(8),
    timeline: z.array(timelineEventSchema).min(1),
    beats: z.array(z.number().min(0)).min(1),
    buildOrder: z.enum(["top-down", "bottom-up"]).optional(),
    staggerEnter: z.boolean().optional(),
    layerHeight: z.number().int().positive().optional(),
    layerWidth: z.number().int().positive().optional(),
    layerGap: z.number().int().min(0).optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .refine(
    (spec) => {
      const ids = spec.layers.map((l) => l.id);
      return new Set(ids).size === ids.length;
    },
    { message: "All layer ids must be unique", path: ["layers"] },
  )
  .refine(
    (spec) => {
      for (const ev of spec.timeline) {
        const targets = ev.layerIds ?? (ev.layerId ? [ev.layerId] : []);
        for (const id of targets) {
          if (!spec.layers.find((l) => l.id === id)) return false;
        }
        if (ev.targetLayerId && !spec.layers.find((l) => l.id === ev.targetLayerId)) return false;
      }
      return true;
    },
    { message: "Timeline references non-existent layer", path: ["timeline"] },
  )
  .refine(
    (spec) => {
      for (const ev of spec.timeline) {
        if (ev.beat >= spec.beats.length) return false;
      }
      return true;
    },
    { message: "Timeline beat index out of range", path: ["timeline"] },
  )
  .refine(
    (spec) => {
      if (!spec.timeline.some((ev) => ev.type === "enter")) return false;
      return true;
    },
    { message: "Timeline must have at least one enter event", path: ["timeline"] },
  )
  .refine(
    (spec) => {
      for (const ev of spec.timeline) {
        if (ev.durationBeats && ev.beat + ev.durationBeats >= spec.beats.length) return false;
      }
      return true;
    },
    { message: "durationBeats extends beyond the beat array", path: ["timeline"] },
  )
  .refine(
    (spec) => {
      for (let i = 1; i < spec.beats.length; i++) {
        if (spec.beats[i] <= spec.beats[i - 1]) return false;
      }
      return true;
    },
    { message: "beats must be monotonically increasing", path: ["beats"] },
  )
  .superRefine((spec, ctx) => {
    for (let i = 0; i < spec.timeline.length; i++) {
      const ev = spec.timeline[i];
      const p = ["timeline", String(i)];

      // data-flow requires layerId + targetLayerId
      if (ev.type === "data-flow") {
        if (!ev.layerId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `timeline[${i}] data-flow requires layerId`,
            path: [...p, "layerId"],
          });
        }
        if (!ev.targetLayerId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `timeline[${i}] data-flow requires targetLayerId`,
            path: [...p, "targetLayerId"],
          });
        }
      }

      // enter/exit/callout require layerId
      if (ev.type === "enter" || ev.type === "exit" || ev.type === "callout") {
        if (!ev.layerId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `timeline[${i}] ${ev.type} requires layerId`,
            path: [...p, "layerId"],
          });
        }
      }

      // highlight/dim-others/focus need at least one target
      if (ev.type === "highlight" || ev.type === "dim-others" || ev.type === "focus") {
        if (!ev.layerId && !ev.layerIds) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `timeline[${i}] ${ev.type} requires layerId or layerIds`,
            path: [...p, "layerId"],
          });
        }
      }

      // layerId and layerIds are mutually exclusive
      if (ev.layerId && ev.layerIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `timeline[${i}] layerId and layerIds are mutually exclusive`,
          path: [...p, "layerId"],
        });
      }
    }
  });

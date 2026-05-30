import { z } from "zod";

const entranceTypeSchema = z.enum(["none", "fade-in", "scale-up", "slide-up", "wipe-left", "typewriter"]);
const emphasisTypeSchema = z.enum(["color-shift", "glow", "scale-pulse"]);
const exitTypeSchema = z.enum(["none", "fade-out"]);
const textAnchorSchema = z.enum(["left", "center", "right"]);
const fontCategorySchema = z.enum(["text", "code"]);

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #ff8800");

const emphasisEventSchema = z.object({
  beat: z.number().int().min(0),
  type: emphasisTypeSchema,
  durationBeats: z.number().int().min(1).optional(),
  color: hexColor.optional(),
  intensity: z.number().min(0).max(2).optional(),
});

const textPhraseSpecSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  startBeat: z.number().int().min(0),
  endBeat: z.number().int().min(1).optional(),
  entrance: entranceTypeSchema.optional(),
  emphasis: z.array(emphasisEventSchema).optional(),
  exit: exitTypeSchema.optional(),
  color: z.string().optional(),
  fontSize: z.number().int().positive().optional(),
  fontWeight: z.number().int().min(100).max(900).optional(),
  fontFamily: fontCategorySchema.optional(),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  anchor: textAnchorSchema.optional(),
  lineHeight: z.number().positive().optional(),
});

export const textEmphasisSpecSchema = z.object({
  phrases: z.array(textPhraseSpecSchema).min(1),
  beats: z.array(z.number().positive()).min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
}).refine(
  (spec) => {
    const ids = spec.phrases.map(p => p.id);
    return new Set(ids).size === ids.length;
  },
  { message: "All phrase ids must be unique", path: ["phrases"] }
).refine(
  (spec) => {
    for (let i = 1; i < spec.beats.length; i++) {
      if (spec.beats[i] <= spec.beats[i - 1]) return false;
    }
    return true;
  },
  { message: "Beats must be strictly increasing", path: ["beats"] }
).refine(
  (spec) => {
    for (const p of spec.phrases) {
      if (p.startBeat >= spec.beats.length) return false;
      if (p.endBeat !== undefined && (p.endBeat >= spec.beats.length || p.endBeat <= p.startBeat)) return false;
      if (p.emphasis) {
        for (const e of p.emphasis) {
          if (e.beat < p.startBeat || (p.endBeat !== undefined && e.beat > p.endBeat)) return false;
        }
      }
    }
    return true;
  },
  { message: "Beat indices out of range", path: ["phrases"] }
);

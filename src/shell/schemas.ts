// VideoShell — Zod schemas
import { z } from "zod";

export const targetAspectSchema = z.enum(["16:9", "9:16"]);

export const subtitleEntrySchema = z.object({
  startFrame: z.number(),
  endFrame: z.number(),
  text: z.string(),
  y: z.number().optional(),
  fontSize: z.number().optional(),
});

export const videoShellConfigSchema = z.object({
  targetAspect: targetAspectSchema.optional(),
  subtitles: z.array(subtitleEntrySchema).optional(),
});

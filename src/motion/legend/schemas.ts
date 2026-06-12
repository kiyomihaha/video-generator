// Legend — Zod schema

import { z } from "zod";

export const legendSymbolSchema = z.enum(["square", "circle", "dash"]);

export const legendItemDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string(),
  symbol: legendSymbolSchema.optional().default("square"),
});

export const legendPositionSchema = z.enum(["top-right", "bottom-left", "bottom-right"]);

export const legendSpecSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  position: legendPositionSchema.default("top-right"),
  items: z.array(legendItemDefSchema).min(1),
  activeTokens: z.array(z.string()),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(0),
});

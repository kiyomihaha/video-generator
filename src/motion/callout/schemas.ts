// CalloutOverlay + ConnectorSystem — Zod schemas
import { z } from "zod";

export const quadrantSchema = z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]);
export const calloutRoutingSchema = z.enum(["hv", "vh"]);
export const connectorRoutingSchema = z.enum(["hvh", "vhv"]);

export const calloutDefSchema = z.object({
  id: z.string(),
  targetX: z.number(),
  targetY: z.number(),
  label: z.string(),
  sublabel: z.string().optional(),
  preferredQuadrant: quadrantSchema.optional(),
  dx: z.number().optional(),
  dy: z.number().optional(),
  color: z.string().optional(),
  fontSize: z.number().optional(),
  boxWidth: z.number().optional(),
  boxHeight: z.number().optional(),
  routing: calloutRoutingSchema.optional(),
  startFrame: z.number(),
  endFrame: z.number().optional(),
});

export const flowDirectionSchema = z.enum(["forward", "backward", "bidirectional", "none"]);

export const connectorDefSchema = z.object({
  id: z.string(),
  fromX: z.number(),
  fromY: z.number(),
  toX: z.number(),
  toY: z.number(),
  color: z.string().optional(),
  strokeWidth: z.number().optional(),
  animated: z.boolean().optional(),
  direction: flowDirectionSchema.optional(),
  dashed: z.boolean().optional(),
  routing: connectorRoutingSchema.optional(),
  startFrame: z.number(),
  endFrame: z.number().optional(),
});

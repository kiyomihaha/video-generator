import { z } from "zod";
import { calloutDefSchema, connectorDefSchema } from "../motion/callout/schemas";

export const diagramNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string(),
  color: z.string(),
});

export const calloutDemoSpecSchema = z.object({
  title: z.string(),
  durationInFrames: z.number(),
  fps: z.number(),
  diagram: z.object({
    nodes: z.array(diagramNodeSchema),
  }),
  callouts: z.array(calloutDefSchema),
  connectors: z.array(connectorDefSchema),
});

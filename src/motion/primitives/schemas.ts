// Digital Timing — Zod schemas for runtime spec validation

import { z } from "zod";

const signalPinSchema = z.object({
  componentId: z.string(),
  pinId: z.string(),
  portName: z.string().optional(),
});

const timelineTransitionSchema = z.object({
  at: z.number(),
  to: z.union([z.literal(0), z.literal(1)]),
  label: z.string().optional(),
});

const timelineSignalSchema = z.object({
  name: z.string(),
  componentId: z.string(),
  pinId: z.string(),
  initialValue: z.union([z.literal(0), z.literal(1)]),
  transitions: z.array(timelineTransitionSchema),
});

const propagateSignalSchema = z.object({
  signalName: z.string(),
  from: signalPinSchema,
  to: signalPinSchema,
  fanoutEdges: z.array(z.object({
    pinId: z.string(),
    delay: z.number(),
    duration: z.number(),
    label: z.string().optional(),
  })).optional(),
  timelineId: z.string(),
  groupId: z.string().optional(),
  triggerEdge: z.enum(["posedge", "negedge", "both"]),
  edgePolarity: z.enum(["active_high", "active_low"]).optional(),
  initialState: z.string(),
  finalState: z.string(),
  delay: z.number(),
  duration: z.number(),
  timeScale: z.number(),
  emphasis: z.enum(["glow-trace", "pulse", "ripple", "none"]),
  stylePreset: z.string().optional(),
  annotation: z.string().optional(),
});

const timingAnnotationSchema = z.object({
  at: z.number(),
  text: z.string(),
  position: z.enum(["top", "bottom"]),
});

const latchSpecSchema = z.object({
  type: z.literal("latch"),
  id: z.string().optional(),
  enablePin: signalPinSchema,
  dataPin: signalPinSchema,
  outputPin: signalPinSchema,
  latchMode: z.enum(["transparent_high", "transparent_low"]),
  propagationDelay: z.number().optional(),
  enableDelay: z.number().optional(),
  initialOutput: z.union([z.literal(0), z.literal(1)]).optional(),
  setupTime: z.number().optional(),
  holdTime: z.number().optional(),
  visual: z.object({
    holdHighlightDuration: z.number().optional(),
    glowColor: z.string().optional(),
    glowMaxOpacity: z.number().optional(),
  }).optional(),
});

const glitchSpecSchema = z.object({
  id: z.string().optional(),
  signalPin: signalPinSchema,
  glitchType: z.enum(["positive", "negative", "runt", "overshoot", "undershoot"]),
  startTime: z.number(),
  duration: z.number(),
  amplitude: z.number(),
  cause: z.string().optional(),
  jagged: z.boolean().optional(),
  color: z.string().optional(),
});

const metastabilitySpecSchema = z.object({
  id: z.string().optional(),
  signalPin: signalPinSchema,
  startTime: z.number(),
  duration: z.number(),
  resolvedValue: z.union([z.literal(0), z.literal(1)]),
  settleBehavior: z.enum(["ringing", "snap"]).optional(),
  violationWindow: z.number().optional(),
  settlingOvershoot: z.number().optional(),
  ringCount: z.number().optional(),
  color: z.string().optional(),
});

export const digitalTimingSpecSchema = z.object({
  title: z.string(),
  fps: z.number().positive(),
  totalDuration: z.number().positive(),
  signals: z.array(timelineSignalSchema),
  propagations: z.array(propagateSignalSchema),
  latches: z.array(latchSpecSchema).optional(),
  glitches: z.array(glitchSpecSchema).optional(),
  metastabilities: z.array(metastabilitySpecSchema).optional(),
  annotations: z.array(timingAnnotationSchema).optional(),
});

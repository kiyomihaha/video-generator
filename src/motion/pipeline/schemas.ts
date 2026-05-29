// Pipeline — Zod schemas for runtime spec validation

import { z } from "zod";

const pipelineInstructionSchema = z.object({
  id: z.string(),
  mnemonic: z.string(),
  color: z.string().optional(),
  entryCycle: z.number().int().positive(),
});

const stallHazardSchema = z.object({
  type: z.literal("stall"),
  affectedInstruction: z.string(),
  atCycle: z.number().int().positive(),
  holdStage: z.number().int().nonnegative(),
  bubbleStage: z.number().int().nonnegative(),
  duration: z.number().int().positive(),
  reason: z.string().optional(),
});

const forwardHazardSchema = z.object({
  type: z.literal("forward"),
  producerInstruction: z.string(),
  producerStage: z.number().int().nonnegative(),
  consumerInstruction: z.string(),
  consumerStage: z.number().int().nonnegative(),
  operand: z.enum(["rs1", "rs2", "rt"]).optional(),
  reason: z.string().optional(),
});

const flushHazardSchema = z.object({
  type: z.literal("flush"),
  branchInstruction: z.string(),
  resolveStage: z.number().int().nonnegative(),
  resolveCycle: z.number().int().positive(),
  flushedInstructions: z.array(z.string()),
  redirectCycle: z.number().int().positive().optional(),
  reason: z.string().optional(),
});

const pipelineHazardSchema = z.discriminatedUnion("type", [
  stallHazardSchema,
  forwardHazardSchema,
  flushHazardSchema,
]);

const pipelineAnnotationSchema = z.object({
  type: z.enum(["label", "bracket", "arrow"]),
  text: z.string().optional(),
  fromCycle: z.number().int().positive().optional(),
  fromStage: z.number().int().nonnegative().optional(),
  toCycle: z.number().int().positive().optional(),
  toStage: z.number().int().nonnegative().optional(),
  color: z.string().optional(),
});

export const pipelineSpecSchema = z.object({
  id: z.string().optional(),
  stages: z.array(z.string()).min(1),
  totalCycles: z.number().int().positive(),
  instructions: z.array(pipelineInstructionSchema),
  hazards: z.array(pipelineHazardSchema).optional(),
  annotations: z.array(pipelineAnnotationSchema).optional(),
  clockPeriod: z.number().positive().optional(),
  color: z.string().optional(),
  title: z.string().optional(),
});

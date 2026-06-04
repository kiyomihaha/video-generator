// Branch Prediction — Zod schemas for runtime spec validation

import { z } from "zod";

const predictorTypeSchema = z.enum(["always-taken", "1-bit", "2-bit-saturating"]);

const bpInstructionSchema = z.object({
  id: z.string(),
  mnemonic: z.string(),
  entryCycle: z.number().int().positive(),
  color: z.string().optional(),
  isSpeculative: z.boolean().optional(),
});

const branchEventSchema = z.object({
  instructionId: z.string(),
  resolveCycle: z.number().int().positive(),
  resolveStage: z.number().int().nonnegative(),
  predicted: z.enum(["taken", "not-taken"]),
  actual: z.enum(["taken", "not-taken"]),
  targetCycle: z.number().int().positive().optional(),
  penaltyCycles: z.number().int().nonnegative(),
  btbIndex: z.number().int().nonnegative(),
});

const bpAnnotationSchema = z.object({
  type: z.enum(["label", "bracket", "arrow"]),
  text: z.string().optional(),
  fromCycle: z.number().int().positive().optional(),
  fromStage: z.number().int().nonnegative().optional(),
  toCycle: z.number().int().positive().optional(),
  toStage: z.number().int().nonnegative().optional(),
  color: z.string().optional(),
});

export const branchPredictionSpecSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  stages: z.array(z.string()).min(1),
  totalCycles: z.number().int().positive(),
  clockPeriod: z.number().positive().optional(),
  predictor: predictorTypeSchema,
  btbSize: z.number().int().positive(),
  instructions: z.array(bpInstructionSchema).min(1),
  branches: z.array(branchEventSchema),
  annotations: z.array(bpAnnotationSchema).optional(),
}).refine(
  (spec) => spec.branches.every((b) => b.resolveStage < spec.stages.length),
  "resolveStage must be < stages.length"
).refine(
  (spec) => spec.branches.every((b) => b.btbIndex < spec.btbSize),
  "btbIndex must be < btbSize"
);

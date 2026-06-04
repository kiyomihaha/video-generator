// Virtual Memory — Zod schemas for runtime spec validation

import { z } from "zod";

const replacementPolicySchema = z.enum(["LRU", "FIFO", "random"]);

const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

const vmAccessSchema = z.object({
  id: z.string(),
  virtualAddress: z.number().int().nonnegative(),
  type: z.enum(["read", "write", "execute"]),
  cycle: z.number().int().positive(),
  label: z.string().optional(),
});

const vmAnnotationSchema = z.object({
  type: z.enum(["label", "bracket", "arrow"]),
  text: z.string().optional(),
  fromAccess: z.string().optional(),
  toAccess: z.string().optional(),
  color: z.string().optional(),
});

export const virtualMemorySpecSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  addressBits: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  numLevels: z.number().int().min(1).max(2),
  entriesPerLevel: z.array(z.number().int().positive()),
  tlbSets: z.number().int().positive(),
  tlbAssociativity: z.number().int().positive(),
  replacement: replacementPolicySchema,
  clockPeriod: z.number().positive(),
  color: z.string().optional(),
  tlbHitColor: z.string().optional(),
  tlbMissColor: z.string().optional(),
  pageFaultColor: z.string().optional(),
  accesses: z.array(vmAccessSchema).min(1),
  annotations: z.array(vmAnnotationSchema).optional(),
}).refine(
  (spec) => spec.entriesPerLevel.length === spec.numLevels,
  "entriesPerLevel.length must equal numLevels"
).refine(
  (spec) => isPowerOfTwo(spec.pageSize),
  "pageSize must be a power of 2"
).refine(
  (spec) => spec.entriesPerLevel.every(isPowerOfTwo),
  "entriesPerLevel values must be powers of 2"
).refine(
  (spec) => {
    const offsetBits = Math.log2(spec.pageSize);
    const vpnBitsSum = spec.entriesPerLevel.reduce((s, e) => s + Math.log2(e), 0);
    return spec.addressBits >= offsetBits + vpnBitsSum;
  },
  "addressBits must be >= offsetBits + sum(vpnBits)"
);

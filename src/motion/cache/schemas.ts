// Cache — Zod schemas for runtime spec validation

import { z } from "zod";

const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

const replacementPolicySchema = z.enum(["LRU", "FIFO", "random"]);
const writeHitPolicySchema = z.enum(["write-back", "write-through"]);
const writeMissPolicySchema = z.enum(["write-allocate", "no-write-allocate"]);
const accessTypeSchema = z.enum(["read", "write"]);

const cacheAccessSchema = z.object({
  id: z.string(),
  address: z.number().int().nonnegative(),
  type: accessTypeSchema,
  cycle: z.number().int().positive(),
  label: z.string().optional(),
});

const cacheAnnotationSchema = z.object({
  type: z.enum(["label", "bracket", "arrow"]),
  text: z.string().optional(),
  fromAccess: z.string().optional(),
  toAccess: z.string().optional(),
  color: z.string().optional(),
});

export const cacheSpecSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  numSets: z.number().int().min(1).refine(isPowerOf2, "numSets must be a power of 2"),
  associativity: z.number().int().min(1),
  blockSize: z.number().int().min(1).refine(isPowerOf2, "blockSize must be a power of 2"),
  addressBits: z.number().int().positive(),
  replacement: replacementPolicySchema,
  writeHitPolicy: writeHitPolicySchema,
  writeMissPolicy: writeMissPolicySchema,
  clockPeriod: z.number().positive(),
  color: z.string().optional(),
  hitColor: z.string().optional(),
  missColor: z.string().optional(),
  evictionColor: z.string().optional(),
  seed: z.number().optional(),
  accesses: z.array(cacheAccessSchema).min(1),
  annotations: z.array(cacheAnnotationSchema).optional(),
}).refine(
  (spec) => {
    const offsetBits = Math.log2(spec.blockSize);
    const indexBits = Math.log2(spec.numSets);
    return spec.addressBits >= offsetBits + indexBits;
  },
  "addressBits must be >= log2(blockSize) + log2(numSets)"
);

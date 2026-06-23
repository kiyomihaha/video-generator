// NVMeVideo types — spec definitions for each segment

import { z } from "zod";

// ── Zod schemas ──

const segmentFramesSchema = z.object({
  overview: z.number().int().positive(),
  init: z.number().int().positive(),
  adminCmd: z.number().int().positive(),
  sqeConstruct: z.number().int().positive(),
  doorbell: z.number().int().positive(),
  controllerProcess: z.number().int().positive(),
  dataTransfer: z.number().int().positive(),
  completion: z.number().int().positive(),
  hostProcess: z.number().int().positive(),
  summary: z.number().int().positive(),
});

export const nvmeVideoSpecSchema = z.object({
  segmentFrames: segmentFramesSchema,
});

// ── TypeScript types ──

export type SegmentFrames = z.infer<typeof segmentFramesSchema>;
export type NVMeVideoSpec = z.infer<typeof nvmeVideoSpecSchema>;

// ── Segment timing helper ──

export function getSegmentOffsets(sf: SegmentFrames) {
  const overview = 0;
  const init = overview + sf.overview;
  const adminCmd = init + sf.init;
  const sqeConstruct = adminCmd + sf.adminCmd;
  const doorbell = sqeConstruct + sf.sqeConstruct;
  const controllerProcess = doorbell + sf.doorbell;
  const dataTransfer = controllerProcess + sf.controllerProcess;
  const completion = dataTransfer + sf.dataTransfer;
  const hostProcess = completion + sf.completion;
  const summary = hostProcess + sf.hostProcess;
  const total = summary + sf.summary;

  return {
    offsets: { overview, init, adminCmd, sqeConstruct, doorbell, controllerProcess, dataTransfer, completion, hostProcess, summary },
    total,
  };
}

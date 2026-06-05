// LayeredArchitecture — Schedule Computation
// Pure function: spec + fps → schedule
// Converts beat-based timeline to frame-resolved events + layout

import type {
  LayeredArchitectureSpec,
  LASchedule,
  LAScheduledLayer,
  ResolvedTimelineEvent,
} from "./types";
import { THEME } from "../../theme";

const TOP_MARGIN = 80;
const BOTTOM_MARGIN = 80;

const LAYER_PALETTE: string[] = [
  THEME.layers.layer1,
  THEME.layers.layer2,
  THEME.layers.layer3,
  THEME.layers.layer4,
  THEME.layers.layer5,
  THEME.layers.layer6,
  THEME.layers.layer7,
  THEME.layers.layer8,
];

function resolveColor(specIndex: number, specColor?: string): string {
  if (specColor) return specColor;
  return LAYER_PALETTE[specIndex % LAYER_PALETTE.length];
}

function computeLayerHeight(n: number, specLayerHeight?: number, specGap?: number, totalHeight = 720): number {
  if (specLayerHeight) return specLayerHeight;
  const gap = specGap ?? 12;
  const available = totalHeight - TOP_MARGIN - BOTTOM_MARGIN;
  const maxHeight = Math.floor((available - gap * (n - 1)) / n);
  return Math.min(80, maxHeight);
}

function computeLayerGap(n: number, specGap?: number): number {
  return specGap ?? 12;
}

export function computeLASchedule(spec: LayeredArchitectureSpec, fps: number): LASchedule {
  const n = spec.layers.length;
  const width = spec.width ?? 1280;
  const height = spec.height ?? 720;
  const layerHeight = computeLayerHeight(n, spec.layerHeight, spec.layerGap, height);
  const layerGap = computeLayerGap(n, spec.layerGap);
  const layerWidth = spec.layerWidth ?? 600;

  // Fps-derived animation durations
  const enterFrames = Math.round(0.25 * fps);
  const exitFrames = Math.round(0.3 * fps);
  const flowFrames = Math.round(1.0 * fps);

  // Compute beat-to-frame conversion
  const beatFrames = spec.beats.map((b) => Math.round(b * fps));
  const lastBeatFrame = beatFrames[beatFrames.length - 1];

  // Total frames tracked through event resolution, padded at the end
  let maxEndFrame = lastBeatFrame;

  // Compute layer Y positions (top-to-bottom stacking)
  const buildOrder = spec.buildOrder ?? "bottom-up";
  const stackHeight = n * layerHeight + (n - 1) * layerGap;
  const startY = Math.floor((height - stackHeight) / 2);

  const layers: LAScheduledLayer[] = spec.layers.map((layer, i) => {
    // For bottom-up, layer[0] is visually at the bottom
    // For top-down, layer[0] is visually at the top
    let visualIndex: number;
    if (buildOrder === "bottom-up") {
      visualIndex = n - 1 - i;
    } else {
      visualIndex = i;
    }
    const y = startY + visualIndex * (layerHeight + layerGap);
    return {
      id: layer.id,
      label: layer.label,
      description: layer.description,
      color: resolveColor(i, layer.color),
      anchor: layer.labelAnchor ?? "center",
      y,
    };
  });

  // Resolve timeline events to frames, tracking max endFrame
  maxEndFrame = lastBeatFrame;
  const events: ResolvedTimelineEvent[] = spec.timeline
    .map((ev) => {
      const frame = beatFrames[ev.beat];
      let adjustedFrame = frame;
      let endFrame = 0;
      let durationFrames = 0;

      switch (ev.type) {
        case "enter":
          durationFrames = enterFrames;
          if (spec.staggerEnter) {
            const staggerFrames = Math.round(0.05 * fps);
            const layerIdx = spec.layers.findIndex((l) => l.id === ev.layerId);
            // Both build orders: layer[0] enters first
            // bottom-up: layer[0] is foundation (bottom visual), enters first
            // top-down: layer[0] is topmost visual, enters first
            adjustedFrame = frame + staggerFrames * layerIdx;
          }
          break;
        case "exit":
          durationFrames = exitFrames;
          break;
        case "data-flow":
          durationFrames = flowFrames;
          break;
        case "callout":
          if (ev.durationBeats) {
            durationFrames = beatFrames[ev.beat + ev.durationBeats] - frame;
          }
          break;
        case "highlight":
        case "dim-others":
        case "focus":
          if (ev.durationBeats) {
            durationFrames = beatFrames[ev.beat + ev.durationBeats] - frame;
          }
          break;
        case "restore":
          durationFrames = 12;
          break;
      }

      if (durationFrames > 0) {
        endFrame = adjustedFrame + durationFrames;
      }
      if (endFrame > maxEndFrame) maxEndFrame = endFrame;

      return {
        type: ev.type,
        layerId: ev.layerId,
        layerIds: ev.layerIds,
        targetLayerId: ev.targetLayerId,
        direction: ev.direction,
        label: ev.label,
        frame: adjustedFrame,
        endFrame,
      };
    })
    .sort((a, b) => a.frame - b.frame);

  return {
    layers,
    events,
    totalFrames: maxEndFrame + Math.round(1 * fps),
    fps,
    width,
    height,
    layerHeight,
    layerWidth,
    layerGap,
  };
}

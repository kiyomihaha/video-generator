// LayeredArchitecture — Per-frame State Computation
// Pure function: (schedule, frame, fps) → LAState

import type {
  LASchedule,
  LAState,
  LALayerState,
  LADataFlowRender,
  LACalloutRender,
  ResolvedTimelineEvent,
} from "./types";
import { clamp01, easeOutCubic, easeOutQuart } from "../utils";

function computeModifierState(events: ResolvedTimelineEvent[], frame: number) {
  // Track the latest completed restore frame (frame-based, not index-based)
  const lastCompletedRestoreFrame = Math.max(
    -1,
    ...events
      .filter((e) => e.type === "restore" && frame >= e.endFrame)
      .map((e) => e.frame),
  );

  // Detect active restore animation
  let inRestoreAnim = false;
  for (const ev of events) {
    if (ev.type === "restore" && frame >= ev.frame && frame < ev.endFrame) {
      inRestoreAnim = true;
      break;
    }
  }

  // Process events after the last completed restore
  const highlighted = new Set<string>();
  const dimExempt = new Set<string>();
  let dimActive = false;

  for (const ev of events) {
    if (ev.frame > frame) break;

    // Defer past overlapping restores (iterate for chained restores)
    let effStart = ev.frame;
    for (const rev of events) {
      if (rev.type === "restore" && rev.frame <= effStart && rev.endFrame > effStart) {
        effStart = rev.endFrame;
      }
    }
    // Skip events whose deferred start is before the last completed restore
    if (lastCompletedRestoreFrame >= 0 && effStart < lastCompletedRestoreFrame) continue;

    if (ev.type === "highlight" || ev.type === "focus") {
      const delay = effStart - ev.frame;
      const effEnd = ev.endFrame > 0 ? ev.endFrame + delay : 0;
      if (effEnd > 0 && frame >= effEnd) continue;

      const targets = ev.layerIds ?? (ev.layerId ? [ev.layerId] : []);
      for (const id of targets) highlighted.add(id);
      if (ev.type === "focus") {
        dimActive = true;
        for (const id of targets) dimExempt.add(id);
      }
    } else if (ev.type === "dim-others") {
      const delay = effStart - ev.frame;
      const effEnd = ev.endFrame > 0 ? ev.endFrame + delay : 0;
      if (effEnd > 0 && frame >= effEnd) continue;

      const targets = ev.layerIds ?? (ev.layerId ? [ev.layerId] : []);
      dimActive = true;
      for (const id of targets) dimExempt.add(id);
    }
  }

  return { highlighted, dimExempt, dimActive, inRestoreAnim, lastCompletedRestoreFrame };
}

export function computeLAState(schedule: LASchedule, frame: number): LAState {
  const events = schedule.events;

  // Compute modifier state (highlight, dim, restore)
  const { highlighted, dimExempt, dimActive, inRestoreAnim, lastCompletedRestoreFrame } = computeModifierState(events, frame);

  // Per-layer state
  const layers: LALayerState[] = schedule.layers.map((layer) => {
    let opacity = 0;
    let translateY = 0;
    let entered = false;
    let visible = false;

    // Find the most recent lifecycle event (enter/exit) for this layer
    const lifecycleEvents = events
      .filter((e) => (e.type === "enter" || e.type === "exit") && e.layerId === layer.id && e.frame <= frame)
      .sort((a, b) => b.frame - a.frame);
    const lastLifecycle = lifecycleEvents[0];

    // ── Lifecycle animation based on most recent event ──
    if (lastLifecycle) {
      const elapsed = frame - lastLifecycle.frame;
      const duration = lastLifecycle.endFrame - lastLifecycle.frame;

      if (lastLifecycle.type === "enter") {
        if (elapsed < duration) {
          const progress = clamp01(elapsed / duration);
          const eased = easeOutQuart(progress);
          opacity = eased;
          translateY = (1 - eased) * 40;
          visible = true;
        } else {
          opacity = 1;
          translateY = 0;
          entered = true;
          visible = true;
        }
      } else {
        // exit
        if (elapsed < duration) {
          const progress = clamp01(elapsed / duration);
          const eased = easeOutCubic(progress);
          opacity = 1 - eased;
          translateY = eased * 40;
        } else {
          opacity = 0;
          visible = false;
        }
      }
    }

    // ── Persistent modifiers ──
    const isHighlighted = highlighted.has(layer.id) && !inRestoreAnim;
    const borderGlow = isHighlighted ? 1 : 0;
    let brightness = 1;

    if (inRestoreAnim) {
      brightness = 1;
    } else if (dimActive && !dimExempt.has(layer.id) && visible) {
      brightness = 0.3;
    }

    return { id: layer.id, opacity, translateY, brightness, borderGlow, entered, visible };
  });

  // ── Data-flow events (active within their duration) ──
  const dataFlows: LADataFlowRender[] = [];
  for (const ev of events) {
    if (ev.type !== "data-flow") continue;
    if (frame < ev.frame || frame >= ev.endFrame) continue;

    const fromLayer = schedule.layers.find((l) => l.id === ev.layerId);
    const toLayer = ev.targetLayerId
      ? schedule.layers.find((l) => l.id === ev.targetLayerId)
      : undefined;
    if (!fromLayer || !toLayer) continue;

    const elapsed = frame - ev.frame;
    const duration = ev.endFrame - ev.frame;
    const animDuration = Math.round(duration * 0.6);
    const progress = elapsed < animDuration
      ? easeOutCubic(clamp01(elapsed / animDuration))
      : 1;

    const flowX = (schedule.width - schedule.layerWidth) / 2 + schedule.layerWidth + 20;

    dataFlows.push({
      fromX: flowX,
      fromY: fromLayer.y + schedule.layerHeight / 2,
      toX: flowX,
      toY: toLayer.y + schedule.layerHeight / 2,
      progress,
      direction: ev.direction ?? "up",
    });
  }

  // ── Callout events (hidden during restore animation, removed after restore completes) ──
  const callouts: LACalloutRender[] = [];
  if (!inRestoreAnim) {
    for (const ev of events) {
      if (ev.type !== "callout") continue;
      if (frame < ev.frame) continue;

      const layer = schedule.layers.find((l) => l.id === ev.layerId);
      if (!layer) continue;

      // Defer fade start to after any overlapping restore event ends (iterate for chained restores)
      let effectiveStart = ev.frame;
      for (const rev of events) {
        if (rev.type === "restore" && rev.frame <= effectiveStart && rev.endFrame > effectiveStart) {
          effectiveStart = rev.endFrame;
        }
      }

      // Skip callouts whose deferred start is before the last completed restore
      if (lastCompletedRestoreFrame >= 0 && effectiveStart < lastCompletedRestoreFrame) continue;

      // Shift endFrame by the same deferral so visible duration is preserved
      const delay = effectiveStart - ev.frame;
      const effectiveEndFrame = ev.endFrame > 0 ? ev.endFrame + delay : 0;
      if (effectiveEndFrame > 0 && frame >= effectiveEndFrame) continue;

      const elapsed = frame - effectiveStart;
      const fadeInDuration = Math.round(0.2 * schedule.fps);
      const opacity = easeOutCubic(clamp01(elapsed / fadeInDuration));

      callouts.push({
        layerId: ev.layerId!,
        label: ev.label ?? "",
        opacity,
        x: 40,
        y: layer.y + schedule.layerHeight / 2,
      });
    }
  }

  return { layers, dataFlows, callouts };
}

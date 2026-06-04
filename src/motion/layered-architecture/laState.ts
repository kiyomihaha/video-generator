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
  // Find the last completed restore boundary
  let restoreBoundary = -1;
  for (let i = 0; i < events.length; i++) {
    if (events[i].type === "restore" && frame >= events[i].endFrame) {
      restoreBoundary = i;
    }
  }

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

  for (let i = restoreBoundary + 1; i < events.length; i++) {
    const ev = events[i];
    if (ev.frame > frame) break;

    if (ev.type === "highlight" || ev.type === "focus") {
      if (ev.endFrame > 0 && frame >= ev.endFrame) continue;
      const targets = ev.layerIds ?? (ev.layerId ? [ev.layerId] : []);
      for (const id of targets) highlighted.add(id);
      if (ev.type === "focus") {
        dimActive = true;
        for (const id of targets) dimExempt.add(id);
      }
    } else if (ev.type === "dim-others") {
      if (ev.endFrame > 0 && frame >= ev.endFrame) continue;
      const targets = ev.layerIds ?? (ev.layerId ? [ev.layerId] : []);
      dimActive = true;
      for (const id of targets) dimExempt.add(id);
    }
  }

  return { highlighted, dimExempt, dimActive, inRestoreAnim, restoreBoundary };
}

export function computeLAState(schedule: LASchedule, frame: number): LAState {
  const events = schedule.events;

  // Compute modifier state (highlight, dim, restore)
  const { highlighted, dimExempt, dimActive, inRestoreAnim, restoreBoundary } = computeModifierState(events, frame);

  // Per-layer state
  const layers: LALayerState[] = schedule.layers.map((layer) => {
    let opacity = 0;
    let translateY = 0;
    let entered = false;
    let visible = false;

    // Find enter/exit events for this layer — use LAST matching event
    const enterEvs = events.filter(
      (e) => e.type === "enter" && e.layerId === layer.id && e.frame <= frame,
    );
    const enterEv = enterEvs.length > 0 ? enterEvs[enterEvs.length - 1] : undefined;
    const exitEvs = events.filter(
      (e) => e.type === "exit" && e.layerId === layer.id && e.frame <= frame,
    );
    const exitEv = exitEvs.length > 0 ? exitEvs[exitEvs.length - 1] : undefined;

    // ── Enter animation ──
    if (enterEv) {
      const elapsed = frame - enterEv.frame;
      const duration = enterEv.endFrame - enterEv.frame;

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
    }

    // ── Exit animation (overrides enter) ──
    if (exitEv) {
      const elapsed = frame - exitEv.frame;
      const duration = exitEv.endFrame - exitEv.frame;

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

    dataFlows.push({
      fromY: fromLayer.y + schedule.layerHeight / 2,
      toY: toLayer.y + schedule.layerHeight / 2,
      progress,
      direction: ev.direction ?? "up",
    });
  }

  // ── Callout events (persistent until restore) ──
  const callouts: LACalloutRender[] = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.type !== "callout") continue;
    if (restoreBoundary >= 0 && i <= restoreBoundary) continue;
    if (frame < ev.frame) continue;
    if (ev.endFrame > 0 && frame >= ev.endFrame) continue;

    const layer = schedule.layers.find((l) => l.id === ev.layerId);
    if (!layer) continue;

    const elapsed = frame - ev.frame;
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

  return { layers, dataFlows, callouts };
}

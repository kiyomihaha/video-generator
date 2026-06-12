// Legend — Schedule computation
// Resolves spec → card position, item y-offsets, entrance/exit frames

import type { LegendSpec, LegendSchedule } from "./types";

const CARD_W = 180;
const ITEM_H = 28;
const PAD_TOP = 12;
const PAD_BOT = 12;
const TITLE_H = 20;
const CANVAS_W = 1280;
const CANVAS_H = 720;
const ENTRANCE_DURATION = 0.8;
const EXIT_DURATION = 0.8;
const MIN_VISIBLE = 0.8;

export function computeLegendLayout(spec: LegendSpec, fps: number): LegendSchedule {
  const entranceFrames = Math.round(ENTRANCE_DURATION * fps);
  const exitFrames = Math.round(EXIT_DURATION * fps);

  // Ensure minimum visible duration
  const minVisibleFrames = Math.round(MIN_VISIBLE * fps);
  const startFrame = spec.startFrame;
  const endFrame = Math.max(spec.endFrame, startFrame + entranceFrames + minVisibleFrames + exitFrames);

  // Card height from content
  const titleH = spec.title ? TITLE_H : 0;
  const cardH = PAD_TOP + titleH + (titleH > 0 ? 4 : 0) + spec.items.length * ITEM_H + PAD_BOT;

  // Anchor position
  const MARGIN = 16;
  let boxX: number, boxY: number;
  switch (spec.position) {
    case "top-right":
      boxX = CANVAS_W - CARD_W - MARGIN;
      boxY = MARGIN;
      break;
    case "bottom-left":
      boxX = MARGIN;
      boxY = CANVAS_H - cardH - MARGIN;
      break;
    case "bottom-right":
      boxX = CANVAS_W - CARD_W - MARGIN;
      boxY = CANVAS_H - cardH - MARGIN;
      break;
  }

  // Resolve item vertical positions
  const items = spec.items.map((item, i) => ({
    id: item.id,
    label: item.label,
    color: item.color,
    symbol: item.symbol ?? "square",
    y: PAD_TOP + titleH + (titleH > 0 ? 4 : 0) + i * ITEM_H,
  }));

  return {
    boxX, boxY, boxW: CARD_W, boxH: cardH,
    items,
    startFrame, endFrame,
    entranceFrames, exitFrames,
    activeTokenSet: new Set(spec.activeTokens),
  };
}

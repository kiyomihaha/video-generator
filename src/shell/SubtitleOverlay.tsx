// VideoShell — SubtitleOverlay: HTML-based subtitle renderer
// HTML (not SVG) for CJK wrapping, text-shadow, performance
// Gemini's edge case: locked height prevents layout jitter between 1/2-line subs
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { SubtitleEntry } from "./types";
import { THEME } from "../theme";

interface Props {
  subtitles: SubtitleEntry[];
  fps: number;
  bottomOffset?: number;
}

const CONTAINER_STYLE: React.CSSProperties = {
  position: "absolute",
  bottom: 24,
  left: 0,
  right: 0,
  height: 120,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
};

const TEXT_STYLE: React.CSSProperties = {
  color: THEME.text.primary,
  fontSize: 28,
  fontWeight: 500,
  fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  textAlign: "center",
  maxWidth: "90%",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word",
  textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};

const FADE_FRAMES = 15; // 0.25s fade duration

export const SubtitleOverlay: React.FC<Props> = ({ subtitles, fps, bottomOffset = 24 }) => {
  const frame = useCurrentFrame();

  const active = subtitles.find(
    (s) => frame >= s.startFrame && frame < s.endFrame,
  );

  if (!active) return null;

  // Calculate opacity for smooth fade-out
  // fadeOutEndFrame = frame at which subtitle is fully transparent
  // Fade starts 15 frames before fadeOutEndFrame
  let opacity = 1;
  if (active.fadeOutEndFrame !== undefined) {
    const fadeStart = active.fadeOutEndFrame - FADE_FRAMES;
    if (frame >= fadeStart) {
      opacity = interpolate(
        frame,
        [fadeStart, active.fadeOutEndFrame],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          ...CONTAINER_STYLE,
          bottom: bottomOffset,
          opacity,
        }}
      >
        <span
          style={{
            ...TEXT_STYLE,
            fontSize: active.fontSize ?? 28,
          }}
        >
          {active.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// VideoShell — Main shell component
// Orchestrates: background → title → scene → outro → subtitles
// Enforces SVG layer order in code: z-index 0–3
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { TitleCard } from "./TitleCard";
import { SubtitleOverlay } from "./SubtitleOverlay";
import { compositionDimensions } from "./aspect";
import type { VideoShellConfig } from "./types";
import { MASTER_WIDTH, MASTER_HEIGHT } from "./types";
import { THEME } from "../theme";
import { clamp01 } from "../motion/utils";

// Fade in scene content during title→scene overlap
const SceneFadeIn: React.FC<{ overlapFrames: number; children: React.ReactNode }> = ({ overlapFrames, children }) => {
  const frame = useCurrentFrame();
  const opacity = clamp01(frame / overlapFrames);
  return <div style={{ opacity }}>{children}</div>;
};

interface VideoShellProps {
  config: VideoShellConfig;
  masterCanvasWidth?: number;
  masterCanvasHeight?: number;
  sceneDurationFrames: number;
  renderScene: () => React.ReactNode;
}

export const VideoShell: React.FC<VideoShellProps> = ({
  config,
  masterCanvasWidth = MASTER_WIDTH,
  masterCanvasHeight = MASTER_HEIGHT,
  sceneDurationFrames,
  renderScene,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const targetAspect = config.targetAspect ?? "16:9";
  const dims = compositionDimensions(targetAspect, masterCanvasWidth, masterCanvasHeight);
  const isPortrait = targetAspect === "9:16";

  // Title/outro duration (configurable, default 3s)
  const titleFrames = config.title ? Math.round((config.titleDurationSec ?? 3) * fps) : 0;
  const outroFrames = config.outro ? Math.round((config.outroDurationSec ?? 3) * fps) : 0;
  // Overlap: scene fades in during last N frames of title
  const overlapFrames = config.title ? Math.round(0.25 * fps) : 0;
  const totalFrames = titleFrames + sceneDurationFrames + outroFrames;
  const progress = totalFrames > 0 ? frame / totalFrames : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.canvas.bg }}>
      {/* z-0: Background layer */}
      <AbsoluteFill style={{ zIndex: 0 }} />
      {/* Title card (16:9: full canvas, 9:16: top rail) */}
      {config.title && (
        <Sequence from={0} durationInFrames={titleFrames} name="title">
          {isPortrait ? (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 437,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <TitleCard spec={config.title} fps={fps}
                width={dims.width} height={200} />
            </div>
          ) : (
            <TitleCard spec={config.title} fps={fps}
              width={masterCanvasWidth} height={masterCanvasHeight} />
          )}
        </Sequence>
      )}
      {/* z-1: Scene container — native size, scaled via CSS for 9:16 */}
      <div style={{
        position: "absolute",
        left: dims.sceneX,
        top: dims.sceneY,
        width: masterCanvasWidth,
        height: masterCanvasHeight,
        transform: dims.scale < 1 ? `scale(${dims.scale})` : undefined,
        transformOrigin: "0 0",
        overflow: isPortrait ? "hidden" as const : undefined,
        zIndex: 2,
      }}>
        {/* 9:16 Center Card: border + shadow overlay */}
        {isPortrait && (
          <div style={{
            position: "absolute", inset: 0,
            border: `2px solid ${THEME.canvas.grid}`,
            borderRadius: 8,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
            pointerEvents: "none", zIndex: 10,
          }} />
        )}
        <Sequence
          from={titleFrames - overlapFrames}
          durationInFrames={sceneDurationFrames + overlapFrames}
          name="scene">
          <SceneFadeIn overlapFrames={overlapFrames}>
            {renderScene()}
          </SceneFadeIn>
        </Sequence>
      </div>
      {/* 9:16 Progress bar */}
      {isPortrait && (
        <div style={{
          position: "absolute", top: 220, left: 40, right: 40,
          height: 4, backgroundColor: THEME.canvas.grid,
          borderRadius: 2, zIndex: 3, overflow: "hidden",
        }}>
          <div style={{
            width: `${progress * 100}%`, height: "100%",
            backgroundColor: THEME.text.bright, borderRadius: 2,
          }} />
        </div>
      )}
      {/* z-2: Outro */}
      {config.outro && (
        <Sequence from={titleFrames + sceneDurationFrames}
          durationInFrames={outroFrames} name="outro">
          {isPortrait ? (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 437,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <TitleCard spec={config.outro} fps={fps}
                width={dims.width} height={200} />
            </div>
          ) : (
            <TitleCard spec={config.outro} fps={fps}
              width={masterCanvasWidth} height={masterCanvasHeight} />
          )}
        </Sequence>
      )}
      {/* z-3: Subtitle overlay (HTML) — timed to match scene (offset by overlap) */}
      {config.subtitles && config.subtitles.length > 0 && (
        <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
          <Sequence
            from={titleFrames - overlapFrames}
            durationInFrames={sceneDurationFrames + overlapFrames}
            name="subtitles">
            <SubtitleOverlay
              subtitles={config.subtitles}
              fps={fps}
              bottomOffset={isPortrait ? 24 : 32}
            />
          </Sequence>
        </div>
      )}
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { teState } from "../motion/text-emphasis/teState";
import type { TextEmphasisSchedule, TextEmphasisState } from "../motion/text-emphasis/types";
import { THEME } from "../theme";

interface Props {
  schedule: TextEmphasisSchedule;
}

const S = THEME.canvas;

// Single shared glow filter — avoids per-phrase filter proliferation
const GLOW_FILTER = (
  <filter id="te-glow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation={4} result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

function textContent(text: string, lines: string[], charCount: number): { text: string; lines: string[] } {
  const truncated = charCount < text.length;
  const displayText = truncated ? text.slice(0, charCount) : text;
  return {
    text: displayText,
    lines: truncated ? displayText.split("\n").filter(l => l.length > 0) : lines,
  };
}

// SVG transform that scales around (cx, cy) then applies translateY
function textTransform(cx: number, cy: number, scale: number, translateY: number): string | undefined {
  if (scale === 1 && translateY === 0) return undefined;
  // Right-to-left: translate to origin → scale → translate to final position
  return `translate(${cx}, ${cy + translateY}) scale(${scale}) translate(${-cx}, ${-cy})`;
}

function renderLines(
  lines: string[],
  fontSize: number,
  lineHeight: number,
  x: number,
  y: number,
  anchor: "left" | "center" | "right",
): React.ReactNode[] {
  if (lines.length <= 1) {
    return [<tspan key="l0" x={x} dy={0}>{lines[0] ?? ""}</tspan>];
  }
  return lines.map((line, i) => (
    <tspan key={`l${i}`} x={x} dy={i === 0 ? 0 : fontSize * lineHeight}>
      {line}
    </tspan>
  ));
}

export const TextEmphasisScene: React.FC<Props> = ({ schedule }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const state = teState(schedule, frame, fps);

  const VW = schedule.width;
  const VH = schedule.height;

  function renderTextBlock(
    phrase: TextEmphasisSchedule["phrases"][number],
    p: TextEmphasisState["phrases"][number],
    cx: number,
    cy: number,
    textAnchor: "start" | "middle" | "end",
    extra?: { filter?: string; opacity?: number },
  ) {
    const content = textContent(phrase.text, phrase.lines, p.charCount);
    const transform = textTransform(cx, cy, p.scale, p.translateY);
    return (
      <text
        x={cx}
        y={cy}
        fill={p.color}
        fontSize={phrase.fontSize}
        fontWeight={phrase.fontWeight}
        fontFamily={phrase.fontFamily}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        transform={transform}
        {...extra}
      >
        {renderLines(content.lines, phrase.fontSize, phrase.lineHeight, cx, cy, phrase.anchor)}
      </text>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        <defs>{GLOW_FILTER}</defs>

        <rect width={VW} height={VH} fill={S.bg} />

        {state.phrases.map((p, i) => {
          const phrase = schedule.phrases[i];
          if (!p.visible && p.opacity < 0.01) return null;

          const cx = phrase.x * VW;
          const cy = phrase.y * VH;
          const textAnchor = phrase.anchor === "left" ? "start" : phrase.anchor === "right" ? "end" : "middle";
          const clipId = `te-clip-${i}`;

          // Clip-path for wipe-left
          const needsClip = phrase.entrance.type === "wipe-left" && p.clipProgress < 1;

          return (
            <g key={phrase.id} opacity={p.opacity}>
              {/* Glow layer */}
              {p.glowOpacity > 0.01 && renderTextBlock(phrase, p, cx, cy, textAnchor, {
                filter: "url(#te-glow)",
                opacity: p.glowOpacity * 0.6,
              })}

              {/* Main text */}
              {needsClip ? (
                <g>
                  <clipPath id={clipId}>
                    <rect x={0} y={cy - phrase.fontSize * 2} width={VW * p.clipProgress} height={phrase.fontSize * 5} />
                  </clipPath>
                  <g clipPath={`url(#${clipId})`}>
                    {renderTextBlock(phrase, p, cx, cy, textAnchor)}
                  </g>
                </g>
              ) : (
                renderTextBlock(phrase, p, cx, cy, textAnchor)
              )}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// CalloutOverlay — SVG renderer for annotation callouts
// Renders: elbow connector line → label box with text
import React from "react";
import type { CalloutRenderState } from "./types";
import { THEME } from "../../theme";
import { wrapText, MAX_CHARS_PER_LINE } from "./textUtils";

interface Props {
  callouts: CalloutRenderState[];
  shadowDefsId?: string;
}

const LABEL_BG = THEME.canvas.panel;
const LABEL_BORDER = THEME.canvas.grid;

export const CalloutOverlay: React.FC<Props> = ({ callouts, shadowDefsId = "cs" }) => {
  // Pre-compute wrapped lines for all callouts
  const wrappedLines = React.useMemo(
    () => {
      const map = new Map<string, { label: string[]; sublabel: string[] }>();
      for (const c of callouts) {
        map.set(c.id, {
          label: wrapText(c.label, MAX_CHARS_PER_LINE),
          sublabel: wrapText(c.sublabel, MAX_CHARS_PER_LINE),
        });
      }
      return map;
    },
    [callouts],
  );

  return (
    <g>
      <defs>
        <filter id={`${shadowDefsId}-premium-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity={0.4} />
        </filter>
      </defs>
      {callouts.map((c) => {
        if (c.opacity < 0.01) return null;

        const lines = wrappedLines.get(c.id);
        const labelLines = lines?.label ?? [c.label];
        const sublabelLines = lines?.sublabel ?? [];
        const subLineCount = sublabelLines.length;
        const labelLineCount = labelLines.length;

        // Unified text block layout: stack label lines + gap + sublabel lines
        const subFontSize = c.fontSize - 2;
        const labelLineHeight = c.fontSize + 4;
        const subLineHeight = subFontSize + 4;
        const gap = subLineCount > 0 ? 6 : 0;
        const totalTextHeight =
          labelLineCount * labelLineHeight + gap + subLineCount * subLineHeight;
        const pad = 12;
        const effectiveHeight = Math.max(c.boxHeight, totalTextHeight + pad * 2);
        const startY = (effectiveHeight - totalTextHeight) / 2;

        return (
          <g key={c.id} opacity={c.opacity}>
            {/* Elbow connector line with draw animation */}
            <path
              d={c.path}
              fill="none"
              stroke={c.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray={c.pathProgress < 1 ? 1000 : undefined}
              strokeDashoffset={c.pathProgress < 1 ? 1000 * (1 - c.pathProgress) : undefined}
              opacity={0.7}
            />

            {/* Dot at target point */}
            <circle cx={c.targetX} cy={c.targetY} r={3} fill={c.color} />

            {/* Label box with spring scale + DropShadow */}
            <g
              transform={`translate(${c.labelX + c.boxWidth / 2}, ${c.labelY + effectiveHeight / 2}) scale(${c.scale}) translate(${-c.boxWidth / 2}, ${-effectiveHeight / 2})`}
            >
              <rect
                x={0} y={0}
                width={c.boxWidth}
                height={effectiveHeight}
                rx={6} ry={6}
                fill={LABEL_BG}
                stroke={LABEL_BORDER}
                strokeWidth={1}
                filter={`url(#${shadowDefsId}-premium-shadow)`}
              />
              {labelLines.map((line, li) => (
                <text
                  key={li}
                  x={c.boxWidth / 2}
                  y={startY + li * labelLineHeight + c.fontSize}
                  textAnchor="middle"
                  fill={c.color}
                  fontSize={c.fontSize}
                  fontFamily="Inter, sans-serif"
                  fontWeight={500}
                >
                  {line}
                </text>
              ))}
              {sublabelLines.map((line, li) => (
                <text
                  key={li}
                  x={c.boxWidth / 2}
                  y={startY + labelLineCount * labelLineHeight + gap + li * subLineHeight + subFontSize}
                  textAnchor="middle"
                  fill={THEME.text.muted}
                  fontSize={subFontSize}
                  fontFamily="Inter, sans-serif"
                >
                  {line}
                </text>
              ))}
            </g>
          </g>
        );
      })}
    </g>
  );
};

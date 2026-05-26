import React from "react";

interface Branch {
  x: number; y: number;
  startMs: number; durationMs: number;
}

interface Props {
  x: number; y: number;
  branches: Branch[];
  frame: number; fps: number;
  color?: string;
}

const easeOutCubic = (t: number) => {
  const v = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - v, 3);
};

export const FanoutArrow: React.FC<Props> = ({
  x, y, branches, frame, fps, color = "#38bdf8",
}) => {
  if (branches.length === 0) return null;
  const forkR = 3;

  return (
    <g>
      <circle cx={x} cy={y} r={forkR} fill={color} opacity={0.8} />

      {branches.map((br, i) => {
        const startFrame = br.startMs * fps;
        const durFrame = Math.max(1, br.durationMs * fps);
        const raw = (frame - startFrame) / durFrame;
        if (raw < 0) return null;
        const bp = Math.max(0, Math.min(1, raw));
        const eased = easeOutCubic(bp);
        if (eased < 0.01) return null;

        const dx = br.x - x;
        const dy = br.y - y;
        const angle = Math.atan2(dy, dx);

        // Hardcoded initial tangent per branch — fireworks spread
        // Q: left-down, D: straight-down, EN: right-up
        const cpOffsets = [
          { cx: -30, cy: 20 },  // Q
          { cx: 10,  cy: 40 },  // D
          { cx: 60,  cy: -10 }, // EN
        ];
        const off = cpOffsets[Math.min(i, cpOffsets.length - 1)];
        const cp1x = x + off.cx + dx * 0.15;
        const cp1y = y + off.cy + dy * 0.1;
        const cp2x = x + dx * 0.55 + off.cx * 0.5;
        const cp2y = y + dy * 0.6 + off.cy * 0.3;

        const d = `M ${x} ${y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${br.x} ${br.y}`;
        const hs = 7;
        const ah = `${br.x},${br.y} ${br.x - hs * Math.cos(angle - 0.4)},${br.y - hs * Math.sin(angle - 0.4)} ${br.x - hs * Math.cos(angle + 0.4)},${br.y - hs * Math.sin(angle + 0.4)}`;

        return (
          <g key={`br-${i}`} opacity={0.5 + eased * 0.5}>
            <path d={d} fill="none" stroke={color} strokeWidth={2.5 * eased} strokeLinecap="round" />
            <polygon points={ah} fill={color} opacity={eased > 0.5 ? 1 : 0.3} />
          </g>
        );
      })}
    </g>
  );
};

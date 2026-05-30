// CircuitOverlay — SVG rendering for linked circuit zones
// Renders: zone rects → links → semantic colors → pulse propagation → modifiers → labels

import React from "react";
import type {
  LinkedFrameState,
  CircuitWaveformLinkerAuthoring,
  ZoneToken,
  PulseEvent,
  VisualBaseState,
} from "../../motion/linker/types";
import { BASE_STATE_COLORS } from "../../motion/linker/types";
import { THEME } from "../../theme";

// ─── Seeded deterministic noise (Park-Miller LCG) ───

function seededRandom(seed: number): number {
  let s = seed;
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ─── Color utilities ───

function stateFill(baseState: VisualBaseState): string {
  return BASE_STATE_COLORS[baseState];
}

function stateOpacity(token: ZoneToken): number {
  if (token.residual > 0 && token.prevState !== "IDLE") {
    return Math.max(token.intensity, token.residual * 0.4);
  }
  return token.intensity;
}

function stateStrokeColor(token: ZoneToken): string {
  if (token.residual > 0 && token.prevState !== "IDLE" && token.prevState !== token.baseState) {
    return BASE_STATE_COLORS[token.prevState];
  }
  return BASE_STATE_COLORS[token.baseState];
}

// ─── Anchor mapping ───

const anchorMap = { left: "start" as const, center: "middle" as const, right: "end" as const };

// ─── Modifier effects ───

function shakeTransform(token: ZoneToken, frame: number): string | undefined {
  if (!token.activeModifiers.includes("shake")) return undefined;
  const seed1 = hashString(token.zoneId) + frame * 7919;
  const seed2 = hashString(token.zoneId) + frame * 7919 + 1;
  const dx = (seededRandom(seed1) - 0.5) * token.intensity * 3;
  const dy = (seededRandom(seed2) - 0.5) * token.intensity * 3;
  return `translate(${dx}, ${dy})`;
}

function glitchFilterId(token: ZoneToken, filterPrefix: string): string | undefined {
  if (!token.activeModifiers.includes("glitch")) return undefined;
  return `${filterPrefix}-glitch`;
}

// ─── Pulse stroke dash for propagation ───

const PULSE_TRAIL_LENGTH = 0.3;
const NORMALIZED_LENGTH = 200;

interface PulsePathProps {
  d: string;
  pulse: PulseEvent;
}

const PulsePath: React.FC<PulsePathProps> = ({ d, pulse }) => {
  const headPos = pulse.progress * NORMALIZED_LENGTH;
  const trailLen = NORMALIZED_LENGTH * PULSE_TRAIL_LENGTH;
  const dashArray = `${trailLen} ${NORMALIZED_LENGTH - trailLen}`;
  const dashOffset = NORMALIZED_LENGTH - headPos + trailLen;

  return (
    <path
      d={d}
      pathLength={NORMALIZED_LENGTH}
      fill="none"
      stroke="#38bdf8"
      strokeWidth={3}
      strokeLinecap="round"
      strokeDasharray={dashArray}
      strokeDashoffset={dashOffset}
      filter="url(#pulse-glow)"
      style={{ opacity: 1 - pulse.progress * 0.3 }}
    />
  );
};

// ─── Zone rectangle ───

interface ZoneRectProps {
  zoneDef: { id: string; x: number; y: number; width: number; height: number; label: string; pipelineStage?: boolean };
  token: ZoneToken;
  isFocal: boolean;
  frame: number;
  filterPrefix: string;
}

const ZoneRect: React.FC<ZoneRectProps> = ({ zoneDef, token, isFocal, frame, filterPrefix }) => {
  const fill = stateFill(token.baseState);
  const opacity = stateOpacity(token);
  const stroke = stateStrokeColor(token);
  const isIdle = token.baseState === "IDLE";

  const shake = shakeTransform(token, frame);
  const glitchFilter = glitchFilterId(token, filterPrefix);
  const filterId = glitchFilter ? `url(#${filterPrefix}-glitch)` : undefined;

  // Flash modifier: frame-driven opacity pulse (not SVG animate)
  const flashActive = token.activeModifiers.includes("flash") && !isIdle;
  const flashPulse = flashActive
    ? Math.sin((frame % 15) / 15 * Math.PI) * 0.3
    : 0;

  return (
    <g transform={shake}>
      <rect
        x={zoneDef.x}
        y={zoneDef.y}
        width={zoneDef.width}
        height={zoneDef.height}
        rx={6}
        ry={6}
        fill={isIdle ? THEME.canvas.panel : fill}
        fillOpacity={Math.min(1, opacity + flashPulse)}
        stroke={isIdle ? THEME.canvas.grid : stroke}
        strokeWidth={isFocal ? 2.5 : isIdle ? 1 : 2}
        filter={filterId}
      />
    </g>
  );
};

// ─── Label ───

interface ZoneLabelProps {
  zoneDef: { id: string; x: number; y: number; width: number; height: number; label: string; labelAnchor?: string };
  token: ZoneToken;
}

const ZoneLabel: React.FC<ZoneLabelProps> = ({ zoneDef, token }) => {
  const isIdle = token.baseState === "IDLE";
  const color = isIdle
    ? THEME.text.faint
    : token.baseState === "ERROR"
      ? "#ef4444"
      : token.baseState === "METASTABLE"
        ? "#c084fc"
        : THEME.text.bright;

  const anchor = anchorMap[(zoneDef.labelAnchor ?? "center") as keyof typeof anchorMap];
  let cx: number;
  if (anchor === "start") cx = zoneDef.x + 12;
  else if (anchor === "end") cx = zoneDef.x + zoneDef.width - 12;
  else cx = zoneDef.x + zoneDef.width / 2;

  return (
    <text
      x={cx}
      y={zoneDef.y + zoneDef.height / 2 + 1}
      textAnchor={anchor}
      dominantBaseline="middle"
      fill={color}
      fontSize={14}
      fontWeight={isIdle ? 400 : 700}
    >
      {zoneDef.label}
    </text>
  );
};

// ─── Cycle badge ───

interface CycleBadgeProps {
  currentCycle: number;
  width: number;
}

const CycleBadge: React.FC<CycleBadgeProps> = ({ currentCycle, width }) => (
  <text
    x={width - 24}
    y={24}
    textAnchor="end"
    fill="#64748b"
    fontSize={13}
    fontFamily="JetBrains Mono, monospace"
    letterSpacing={1}
  >
    CYCLE:{currentCycle.toString().padStart(2, "0")}
  </text>
);

// ─── SVG defs (glitch filter) ───

interface GlitchDefsProps {
  filterPrefix: string;
}

const GlitchDefs: React.FC<GlitchDefsProps> = ({ filterPrefix }) => (
  <defs>
    <filter id={`${filterPrefix}-glitch`}>
      <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="1" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={4} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
);

// ─── Main overlay component ───

interface CircuitOverlayProps {
  frameState: LinkedFrameState;
  authoring: CircuitWaveformLinkerAuthoring;
  frame?: number;
}

export const CircuitOverlay: React.FC<CircuitOverlayProps> = ({ frameState, authoring, frame }) => {
  const { tokens, pulses, focalZoneId, currentCycle } = frameState;
  const hasGlitch = tokens.some(t => t.activeModifiers.includes("glitch"));
  const absFrame = frame ?? 0;
  const svgWidth = authoring.width ?? 1280;
  const svgHeight = authoring.height ?? 720;
  const filterPrefix = (authoring.title ?? "circuit").replace(/\s+/g, "-").toLowerCase();

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
      <rect width="100%" height="100%" fill={THEME.canvas.bg} />
      <defs>
        <filter id="pulse-glow">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {hasGlitch && <GlitchDefs filterPrefix={filterPrefix} />}

      {/* Title */}
      {authoring.title && (
        <text
          x={svgWidth / 2}
          y={36}
          textAnchor="middle"
          fill={THEME.text.bright}
          fontSize={18}
          fontWeight={700}
          fontFamily="JetBrains Mono, monospace"
        >
          {authoring.title}
        </text>
      )}

      {/* Links (idle) */}
      {authoring.links.map(link => {
        const pulse = pulses.find(p => p.linkId === link.id);
        const isActive = !!pulse;
        return (
          <path
            key={link.id}
            d={link.path}
            fill="none"
            stroke={isActive ? "#38bdf8" : THEME.canvas.grid}
            strokeWidth={isActive ? 2 : 1}
            strokeOpacity={isActive ? 0.8 : 0.4}
          />
        );
      })}

      {/* Pulse propagation overlays */}
      {pulses.map(pulse => {
        const link = authoring.links.find(l => l.id === pulse.linkId);
        if (!link) return null;
        return <PulsePath key={pulse.linkId} d={link.path} pulse={pulse} />;
      })}

      {/* Zone rects */}
      {authoring.zones.map(zone => {
        const token = tokens.find(t => t.zoneId === zone.id);
        if (!token) return null;
        return (
          <ZoneRect
            key={zone.id}
            zoneDef={zone}
            token={token}
            isFocal={focalZoneId === zone.id}
            frame={absFrame}
            filterPrefix={filterPrefix}
          />
        );
      })}

      {/* Zone labels */}
      {authoring.zones.map(zone => {
        const token = tokens.find(t => t.zoneId === zone.id);
        if (!token) return null;
        return <ZoneLabel key={`label-${zone.id}`} zoneDef={zone} token={token} />;
      })}

      <CycleBadge currentCycle={currentCycle} width={svgWidth} />
    </svg>
  );
};

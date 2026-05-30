import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { tdState } from "../motion/timing-diagram/tdState";
import type { TimingDiagramSchedule, TDSegment, TDTrackSchedule, TDSegmentState } from "../motion/timing-diagram/types";
import { THEME } from "../theme";

interface Props {
  schedule: TimingDiagramSchedule;
  title?: string;
}

const VW = 1280;
const VH = 720;
const CL = 120;
const CR = 40;
const CT = 90;
const CB = 20;
const TG = 10;
const S = THEME.canvas;
const T = THEME.text;

// ── Lane layout (precomputed once) ──

interface Lane {
  y: number; // offset from CT
  h: number;
}

const TRACK_H = { binary: 56, bus: 72 } as const;

function computeLanes(tracks: TDTrackSchedule[]): Lane[] {
  const lanes: Lane[] = [];
  let y = 0;
  for (const t of tracks) {
    const h = t.encoding === "bus" ? TRACK_H.bus : TRACK_H.binary;
    lanes.push({ y, h });
    y += h + TG;
  }
  return lanes;
}

function totalLanesHeight(lanes: Lane[]): number {
  if (lanes.length === 0) return 0;
  const last = lanes[lanes.length - 1];
  return last.y + last.h;
}

// ── Binary wave rendering (handles normal / x / z) ──

function binaryRendering(
  segmentStates: TDSegmentState[],
  trackW: number,
  trackH: number,
  visibleRange: [number, number],
  color: string,
): React.ReactNode[] {
  const [vs, ve] = visibleRange;
  const cyclesSpan = ve - vs + 1;
  const xOf = (cycle: number) => ((cycle - vs) / cyclesSpan) * trackW;
  const yHigh = trackH * 0.2;
  const yLow = trackH * 0.8;
  const yMid = trackH * 0.5;

  const elements: React.ReactNode[] = [];
  let d = "";
  let prevY: number | null = null;
  let currentOpacity = 1;

  function flushPath(key: string, opacity: number) {
    if (d) {
      elements.push(
        <path key={key} d={d} fill="none" stroke={color} strokeWidth={3}
          strokeLinejoin="round" strokeLinecap="round" opacity={opacity} />,
      );
      d = "";
    }
  }

  for (let i = 0; i < segmentStates.length; i++) {
    const { segment: seg, opacity } = segmentStates[i];
    if (seg.endCycle < vs || seg.startCycle > ve) continue;
    if (opacity < 0.01) continue;

    const start = Math.max(seg.startCycle, vs);
    const end = Math.min(seg.endCycle, ve + 1);
    const x1 = xOf(start);
    const x2 = xOf(end);

    if (seg.state === "z") {
      // High-impedance: mid-rail dashed
      flushPath(`p-${i}`, currentOpacity);
      prevY = null;
      elements.push(
        <line key={`z-${start}`} x1={x1} y1={yMid} x2={x2} y2={yMid}
          stroke={color} strokeWidth={2} strokeDasharray="4 4" opacity={opacity} />,
      );
    } else if (seg.state === "x") {
      // Unknown: hatched rect
      flushPath(`p-${i}`, currentOpacity);
      prevY = null;
      const rectH = yLow - yHigh;
      const hatchSpacing = 8;
      const hatches: string[] = [];
      for (let hx = x1; hx < x2; hx += hatchSpacing) {
        hatches.push(`M ${hx} ${yHigh} L ${Math.min(hx + hatchSpacing * 0.6, x2)} ${yLow}`);
      }
      elements.push(
        <rect key={`x-bg-${start}`} x={x1} y={yHigh} width={x2 - x1} height={rectH}
          fill={color} opacity={opacity * 0.1} rx={2} />,
        ...(hatches.length > 0 ? [
          <path key={`x-h-${start}`} d={hatches.join(" ")}
            fill="none" stroke={color} strokeWidth={1} strokeDasharray="2 2" opacity={opacity} />,
        ] : []),
        <text key={`x-t-${start}`} x={(x1 + x2) / 2} y={trackH / 2 + 4}
          fill={T.muted} fontSize={13} fontFamily="monospace" textAnchor="middle" opacity={opacity}>
          X
        </text>,
      );
    } else if (seg.state === "invalid") {
      // Invalid: orange dashed double line with "!"
      flushPath(`p-${i}`, currentOpacity);
      prevY = null;
      const rectH = yLow - yHigh;
      elements.push(
        <rect key={`inv-bg-${start}`} x={x1} y={yHigh} width={x2 - x1} height={rectH}
          fill="#f97316" opacity={opacity * 0.15} rx={2} />,
        <line key={`inv-l1-${start}`} x1={x1} y1={trackH * 0.35} x2={x2} y2={trackH * 0.35}
          stroke="#f97316" strokeWidth={2} strokeDasharray="3 3" opacity={opacity} />,
        <line key={`inv-l2-${start}`} x1={x1} y1={trackH * 0.65} x2={x2} y2={trackH * 0.65}
          stroke="#f97316" strokeWidth={2} strokeDasharray="3 3" opacity={opacity} />,
        <text key={`inv-t-${start}`} x={(x1 + x2) / 2} y={trackH / 2 + 4}
          fill="#f97316" fontSize={13} fontFamily="monospace" textAnchor="middle" opacity={opacity}>
          !
        </text>,
      );
    } else {
      // Normal binary: high or low
      const y = (typeof seg.value === "number" && seg.value === 1) ? yHigh : yLow;
      if (prevY === null) {
        d = `M ${x1} ${y}`;
        currentOpacity = opacity;
      } else if (opacity !== currentOpacity) {
        d += ` L ${x1} ${prevY}`;
        flushPath(`p-${i}`, currentOpacity);
        d = `M ${x1} ${y}`;
        currentOpacity = opacity;
      } else if (prevY !== y) {
        d += ` L ${x1} ${prevY} L ${x1} ${y}`;
      }
      d += ` L ${x2} ${y}`;
      prevY = y;
    }
  }

  // Flush remaining path
  flushPath("p-final", currentOpacity);

  return elements;
}

// ── Bus block rendering ──

function busRendering(
  segmentStates: TDSegmentState[],
  trackW: number,
  trackH: number,
  visibleRange: [number, number],
  color: string,
): React.ReactNode[] {
  const [vs, ve] = visibleRange;
  const cyclesSpan = ve - vs + 1;
  const xOf = (cycle: number) => ((cycle - vs) / cyclesSpan) * trackW;
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < segmentStates.length; i++) {
    const { segment: seg, opacity } = segmentStates[i];
    if (seg.endCycle < vs || seg.startCycle > ve) continue;
    if (opacity < 0.01) continue;

    const start = Math.max(seg.startCycle, vs);
    const end = Math.min(seg.endCycle, ve + 1);
    const x1 = xOf(start);
    const w = xOf(end) - x1;
    const y = trackH * 0.15;
    const h = trackH * 0.7;

    if (seg.state === "x" || seg.state === "z" || seg.state === "invalid") {
      const fillColor = seg.state === "x" ? "#ef444430"
        : seg.state === "z" ? "#f59e0b30"
        : "#f9731630";
      const label = seg.state === "invalid" ? "INV" : seg.state.toUpperCase();
      elements.push(
        <rect key={`${start}-bg`} x={x1} y={y} width={w} height={h}
          fill={fillColor} rx={3} opacity={opacity} />,
        <text key={`${start}-txt`} x={x1 + w / 2} y={trackH / 2 + 5}
          fill={T.muted} fontSize={14} fontFamily="monospace" textAnchor="middle" opacity={opacity}>
          {label}
        </text>,
      );
    } else {
      const displayVal = seg.displayValue ??
        (typeof seg.value === "number" ? `0x${seg.value.toString(16).toUpperCase()}` : String(seg.value));
      elements.push(
        <rect key={`${start}-bg`} x={x1} y={y} width={w} height={h}
          fill={color} opacity={0.25 * opacity} rx={3} />,
        <rect key={`${start}-border`} x={x1} y={y} width={w} height={h}
          fill="none" stroke={color} strokeWidth={1.5} rx={3} opacity={opacity} />,
        // Hide text when segment too narrow (mobile legibility)
        w >= 45 && (
          <text key={`${start}-txt`} x={x1 + w / 2} y={trackH / 2 + 5}
            fill={T.bright} fontSize={13} fontFamily="monospace" fontWeight={700} textAnchor="middle" opacity={opacity}>
            {displayVal}
          </text>
        ),
      );
    }
  }

  return elements;
}

// ── Main Scene ──

export const TimingDiagramScene: React.FC<Props> = ({ schedule, title }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const state = tdState(schedule, f, fps);
  const chartW = VW - CL - CR;

  const visibleRange: [number, number] = schedule.visibleCycles;
  const [vs, ve] = visibleRange;
  const cyclesSpan = ve - vs + 1;
  const xOf = (cycle: number) => CL + ((cycle - vs) / cyclesSpan) * chartW;

  // Precomputed lane layout — O(n) instead of O(n²)
  const lanes = useMemo(() => computeLanes(schedule.tracks), [schedule.tracks]);
  const tracksH = totalLanesHeight(lanes);

  // Cursor position
  const cursorX = xOf(state.cursorCycle + 0.5);

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        <defs>
          <filter id="td-cursor-glow" x="-20%" y="-10%" width="140%" height="120%">
            <feGaussianBlur stdDeviation={3} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="td-chart-clip">
            <rect x={CL} y={CT} width={chartW} height={tracksH + CB} />
          </clipPath>
        </defs>

        {/* ── Layer 1: Background ── */}
        <rect width={VW} height={VH} fill={S.bg} />

        {/* ── Layer 2: Title (fades in with cursor) ── */}
        {title && (
          <text x={60} y={30} fill={T.primary} fontSize={26} fontFamily="Inter, sans-serif" fontWeight={800}
            opacity={state.titleOpacity} style={{ transform: `translateY(${(1 - state.titleOpacity) * 10}px)` }}>
            {title}
          </text>
        )}
        <line x1={CL} y1={60} x2={CL + chartW} y2={60} stroke={S.grid} strokeWidth={1} />

        {/* ── Layer 3: Cycle grid ── */}
        {Array.from({ length: cyclesSpan + 1 }).map((_, i) => {
          const cycle = vs + i;
          const x = xOf(cycle);
          return (
            <g key={`cg${cycle}`}>
              <text x={x} y={57} fill={T.dim} fontSize={11} fontFamily="monospace" textAnchor="middle">
                {cycle}
              </text>
              <line x1={x} y1={CT} x2={x} y2={CT + tracksH + CB} stroke="#ffffff08" strokeWidth={1} />
            </g>
          );
        })}

        {/* ── Layer 4: Track backgrounds + labels (NOT clipped) ── */}
        {state.tracks.map((track, i) => {
          const scheduleTrack = schedule.tracks[i];
          const lane = lanes[i];
          const ty = CT + lane.y;

          return (
            <g key={`bg-${track.id}`} transform={`translate(${CL}, ${ty})`}>
              <rect x={-CL + 10} y={0} width={VW - 20} height={lane.h} rx={4}
                fill={i % 2 === 0 ? S.altRowA : S.altRowB} />
              <text x={-CL + 16} y={lane.h / 2 + 5} fill={T.bright} fontSize={14}
                fontFamily="monospace" fontWeight={700}>
                {track.label ?? track.name}
              </text>
            </g>
          );
        })}

        {/* ── Layer 5: Waveform rendering (clipped to chart area) ── */}
        <g clipPath="url(#td-chart-clip)">
          {state.tracks.map((track, i) => {
            const scheduleTrack = schedule.tracks[i];
            const lane = lanes[i];
            const ty = CT + lane.y;

            return (
              <g key={`wav-${track.id}`} transform={`translate(${CL}, ${ty})`}>
                {/* Segment highlight glow (behind waveform) */}
                {track.segments.filter(s => s.highlight > 0.05).map((segState, si) => {
                  const seg = segState.segment;
                  if (seg.endCycle < vs || seg.startCycle > ve) return null;
                  const start = Math.max(seg.startCycle, vs);
                  const end = Math.min(seg.endCycle, ve + 1);
                  const x1 = ((start - vs) / cyclesSpan) * chartW;
                  const w = ((end - vs) / cyclesSpan) * chartW - x1;
                  return (
                    <rect key={`hl${si}`} x={x1} y={0} width={w} height={lane.h}
                      fill={scheduleTrack.color} opacity={segState.highlight * 0.1} rx={3} />
                  );
                })}

                {scheduleTrack.encoding === "binary" ? (
                  binaryRendering(track.segments, chartW, lane.h, visibleRange, scheduleTrack.color)
                ) : (
                  busRendering(track.segments, chartW, lane.h, visibleRange, scheduleTrack.color)
                )}
              </g>
            );
          })}
        </g>

          {/* ── Layer 6: Setup/Hold windows (signal overlays) ── */}
          {state.activeWindows.map((w, i) => {
            const track = schedule.tracks[w.window.trackIndex];
            if (!track) return null;
            const lane = lanes[w.window.trackIndex];
            const ty = CT + lane.y;
            const x1 = Math.max(CL, xOf(w.window.setupStartCycle));
            const x2 = Math.min(CL + chartW, xOf(w.window.holdEndCycle));
            if (x2 <= x1) return null;
            return (
              <g key={`shw${i}`}>
                <rect x={x1} y={ty} width={x2 - x1} height={lane.h}
                  fill={w.window.color} opacity={w.opacity} rx={2}
                  style={{ mixBlendMode: "screen" }} />
                {w.window.label && (
                  <text x={(x1 + x2) / 2} y={ty - 4} fill={T.dim} fontSize={10}
                    fontFamily="monospace" textAnchor="middle" opacity={w.opacity * 2}>
                    {w.window.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Layer 7: Event markers (signal overlays) ── */}
          {state.activeEvents.map((evt, i) => {
            const x = xOf(evt.event.cycle);
            const track = schedule.tracks[evt.event.trackIndex];
            if (!track) return null;
            if (x < CL || x > CL + chartW) return null;
            const lane = lanes[evt.event.trackIndex];
            const ty = CT + lane.y;
            return (
              <g key={`evt${i}`} opacity={evt.opacity}>
                <line x1={x} y1={ty - 8} x2={x} y2={ty + lane.h + 8}
                  stroke={evt.event.color} strokeWidth={2} strokeDasharray="4 3" />
                {evt.pulse > 0.05 && (
                  <circle cx={x} cy={ty + lane.h / 2} r={8 + evt.pulse * 16}
                    fill="none" stroke={evt.event.color} strokeWidth={2} opacity={evt.pulse} />
                )}
                <text x={x} y={ty - 14} fill={evt.event.color} fontSize={11}
                  fontFamily="monospace" fontWeight={700} textAnchor="middle">
                  {evt.event.label}
                </text>
              </g>
            );
          })}

        {/* ── Layer 8: Annotations (causal fade-in) ── */}
        {schedule.annotations.map((ann, i) => {
          const anim = state.annotationAnimStates[i];
          const x = xOf(ann.cycle) + (ann.offsetX ?? 0);
          const baseY = ann.position === "top"
            ? CT - 20 + (ann.offsetY ?? 0)
            : CT + tracksH + 60 + (ann.offsetY ?? 0);
          return (
            <text key={`ann${i}`} x={x} y={baseY + anim.yOffset} fill={ann.color} fontSize={13}
              fontFamily="Inter, sans-serif" fontWeight={600} textAnchor="middle" opacity={anim.opacity}>
              {ann.text}
            </text>
          );
        })}

        {/* ── Layer 9: Animated cursor (topmost) ── */}
        {cursorX >= CL && cursorX <= CL + chartW && (
          <g filter="url(#td-cursor-glow)">
            <line x1={cursorX} y1={CT - 10} x2={cursorX} y2={CT + tracksH + CB}
              stroke="#38bdf8" strokeWidth={2} opacity={0.8} />
            <circle cx={cursorX} cy={CT - 14} r={4} fill="#38bdf8" opacity={0.9} />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

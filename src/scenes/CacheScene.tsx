// Cache Visualization — Remotion Scene Component
// Renders a cache access animation as SVG: grid, address decomposition, timeline bar.

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { computeCacheSchedule } from "../motion/cache/cacheSchedule";
import { cacheState, computeFirstFillMap } from "../motion/cache/cacheState";
import { clamp01, easeOutCubic, easeOutQuart } from "../motion/utils";
import { BitField } from "../components/cache/BitField";
import { CacheCell } from "../components/cache/CacheCell";
import { THEME } from "../theme";
import type { CacheSpec } from "../motion/cache/types";

interface Props {
  spec: CacheSpec;
}

const VW = 1280;
const VH = 720;

const S = THEME.canvas;
const T = THEME.text;
const A = THEME.architecture;
const ST = THEME.status;

export const CacheScene: React.FC<Props> = ({ spec }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { clockPeriod } = spec;

  const schedule = useMemo(() => computeCacheSchedule(spec), [spec]);
  const firstFillMap = useMemo(() => computeFirstFillMap(schedule.timeline), [schedule]);
  const state = useMemo(
    () => cacheState(schedule, f, fps, clockPeriod, firstFillMap),
    [schedule, f, fps, clockPeriod, firstFillMap],
  );

  const { numSets, associativity, timeline, bitFields } = schedule;
  const hitColor = spec.hitColor ?? ST.hit;
  const missColor = spec.missColor ?? ST.miss;
  const evictionColor = spec.evictionColor ?? ST.eviction;

  // ── Layout ──

  const setLabelW = 50;
  const rightLabelW = 80;  // space for miss-type labels (COLD/CONFLICT/CAPACITY)
  const panelL = 16;
  const panelR = setLabelW + 16;
  const panelTop = spec.title ? 48 : 16;
  const panelW = VW - panelR - panelL - setLabelW - rightLabelW;
  const gridX = panelR + setLabelW;

  const bfH = 56;
  const wayHeaderH = 28;
  const gridTop = panelTop + bfH + wayHeaderH + 16;
  const gridH = VH - gridTop - 90;
  const cellW = panelW / associativity;
  const cellH = gridH / numSets;

  const activeAccess = state.currentAccess;

  // Bezier curve: index segment bottom → target set row
  const bezierStartX = gridX + bitFields.tagBits / bitFields.totalBits * panelW
    + bitFields.indexBits / bitFields.totalBits * panelW / 2;
  const bezierStartY = panelTop + bfH;

  // Timeline pills (multi-row supported in rendering)
  const pillW = 28;
  const pillGap = 6;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        <defs>
          <filter id="cache-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values="0 0 0 0 0.22  0 0 0 0 0.74  0 0 0 0 0.63  0 0 0 0.6 0"
              result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="evict-arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={evictionColor} />
          </marker>
        </defs>

        <rect width={VW} height={VH} fill={S.bg} />

        {/* Title */}
        {spec.title && (
          <text x={VW / 2} y={30} fill={T.primary} fontSize={20}
            fontFamily="Inter, sans-serif" fontWeight={700} textAnchor="middle">
            {spec.title}
          </text>
        )}

        {/* ── Address Decomposition ── */}
        {activeAccess && (
          <BitField
            bitFields={bitFields}
            address={activeAccess.entry.address}
            x={gridX}
            y={panelTop}
            width={panelW}
            height={bfH}
            activePhase={activeAccess.phase}
            phaseProgress={activeAccess.phaseProgress}
          />
        )}

        {/* Way headers */}
        {Array.from({ length: associativity }).map((_, wi) => (
          <text key={`wh-${wi}`}
            x={gridX + wi * cellW + cellW / 2}
            y={panelTop + bfH + 18}
            fill={T.bright} fontSize={12}
            fontFamily="Inter, sans-serif" fontWeight={600} textAnchor="middle">
            Way {wi}
          </text>
        ))}

        {/* Set labels */}
        {Array.from({ length: numSets }).map((_, si) => (
          <text key={`sl-${si}`}
            x={panelR + setLabelW - 8}
            y={gridTop + si * cellH + cellH / 2 + 4}
            fill={T.bright} fontSize={13}
            fontFamily="Inter, monospace" fontWeight={700} textAnchor="end">
            S{si}
          </text>
        ))}

        {/* Grid background lines */}
        {Array.from({ length: numSets + 1 }).map((_, i) => (
          <line key={`gh-${i}`}
            x1={gridX} y1={gridTop + i * cellH}
            x2={gridX + panelW} y2={gridTop + i * cellH}
            stroke={S.grid} strokeWidth={0.5} opacity={0.3} />
        ))}
        {Array.from({ length: associativity + 1 }).map((_, i) => (
          <line key={`gv-${i}`}
            x1={gridX + i * cellW} y1={gridTop}
            x2={gridX + i * cellW} y2={gridTop + gridH}
            stroke={S.grid} strokeWidth={0.5} opacity={0.3} />
        ))}

        {/* Grid cells */}
        {state.grid.flatMap((row, si) =>
          row.map((cell, wi) => (
            <CacheCell key={`c-${si}-${wi}`}
              cell={cell}
              x={gridX + wi * cellW + 2}
              y={gridTop + si * cellH + 2}
              w={cellW - 4}
              h={cellH - 4}
              opacity={Math.max(0.05, cell.opacity)}
              wayIndex={wi}
              hitColor={hitColor}
              evictionColor={evictionColor} />
          )),
        )}

        {/* Active set row glow overlay — latches at full opacity during compare */}
        {activeAccess && (() => {
          const rowGlowOp = activeAccess.phase === "index"
            ? activeAccess.phaseProgress * 0.7
            : activeAccess.phase === "compare"
              ? 0.7
              : 0;
          return rowGlowOp > 0 && (
            <rect
              x={gridX}
              y={gridTop + activeAccess.entry.index * cellH}
              width={panelW}
              height={cellH}
              fill="none"
              stroke={A.index}
              strokeWidth={1.5}
              rx={3}
              filter="url(#cache-glow)"
              opacity={rowGlowOp} />
          );
        })()}

        {/* Bezier curve: index bits → target set (draws during index, stays during compare/result) */}
        {activeAccess && bitFields.indexBits > 0
          && ["index", "compare", "result"].includes(activeAccess.phase) && (() => {
          const targetY = gridTop + activeAccess.entry.index * cellH + cellH / 2;
          const bezierEndX = gridX - 8;
          const cp1y = bezierStartY + (targetY - bezierStartY) * 0.4;
          const cp2y = bezierStartY + (targetY - bezierStartY) * 0.6;
          const d = `M ${bezierStartX} ${bezierStartY} C ${bezierStartX} ${cp1y}, ${bezierEndX} ${cp2y}, ${bezierEndX} ${targetY}`;
          const pathLen = Math.hypot(bezierEndX - bezierStartX, targetY - bezierStartY) * 1.3;
          const routeProgress = activeAccess.phase === "index"
            ? activeAccess.phaseProgress
            : 1;
          const dashOffset = pathLen * (1 - easeOutQuart(routeProgress));
          return (
            <path d={d} fill="none" stroke={A.index} strokeWidth={2}
              strokeDasharray={pathLen} strokeDashoffset={dashOffset}
              opacity={0.8} />
          );
        })()}

        {/* Hit/Miss badge */}
        {activeAccess && activeAccess.phase === "result" && activeAccess.phaseProgress > 0.3 && (() => {
          const e = activeAccess.entry;
          const isHit = e.result === "hit";
          const displayWay = e.hitWay ?? e.fillWay ?? 0;
          const bx = gridX + displayWay * cellW + cellW / 2;
          const by = gridTop + e.index * cellH + cellH / 2;
          const badgeOp = Math.min(1, (activeAccess.phaseProgress - 0.3) / 0.3);

          // No-write-allocate: show "NO ALLOC" near set row
          if (!e.filled && !isHit) {
            return (
              <g opacity={badgeOp}>
                <rect x={gridX + panelW / 2 - 40} y={by - 10} width={80} height={20}
                  rx={4} fill={missColor} fillOpacity={0.85} />
                <text x={gridX + panelW / 2} y={by + 4} fill="#fff" fontSize={10}
                  fontFamily="JetBrains Mono, SF Mono, monospace"
                  fontWeight={700} textAnchor="middle">
                  NO ALLOC
                </text>
              </g>
            );
          }

          return (
            <g opacity={badgeOp}>
              <rect x={bx - 28} y={by - 10} width={56} height={20}
                rx={4} fill={isHit ? hitColor : missColor} fillOpacity={0.9} />
              <text x={bx} y={by + 4} fill="#fff" fontSize={11}
                fontFamily="JetBrains Mono, SF Mono, monospace"
                fontWeight={700} textAnchor="middle">
                {isHit ? "✓ HIT" : "✗ MISS"}
              </text>
            </g>
          );
        })()}

        {/* Eviction arrow */}
        {activeAccess && activeAccess.entry.victimWay !== null
          && activeAccess.phase === "result" && activeAccess.phaseProgress > 0.2 && (() => {
          const e = activeAccess.entry;
          const ax = gridX + e.victimWay! * cellW + cellW / 2;
          const ayStart = gridTop + e.index * cellH + cellH - 2;
          const ayEnd = ayStart + 24;
          const prog = Math.min(1, (activeAccess.phaseProgress - 0.2) / 0.4);
          const curY = ayStart + (ayEnd - ayStart) * easeOutCubic(prog);

          // Memory bus Y: below grid but above timeline
          const memY = VH - 60;

          // Write-back path: victim cell → memory bus (dirty evictions only)
          const wbProg = e.evictedDirty ? clamp01((prog - 0.4) / 0.5) : 0;
          const wbPathLen = memY - ayEnd;
          const wbDrawLen = wbPathLen * easeOutQuart(wbProg);

          return (
            <g key="evict">
              <line x1={ax} y1={ayStart} x2={ax} y2={curY}
                stroke={evictionColor} strokeWidth={2}
                markerEnd="url(#evict-arrow)"
                opacity={0.8} />
              {/* Dirty eviction: WRITE-BACK badge */}
              {e.evictedDirty && prog > 0.5 && (
                <g opacity={(prog - 0.5) * 2}>
                  <rect x={ax - 36} y={ayEnd + 2} width={72} height={16}
                    rx={3} fill={evictionColor} fillOpacity={0.85} />
                  <text x={ax} y={ayEnd + 13} fill="#fff" fontSize={9}
                    fontFamily="JetBrains Mono, SF Mono, monospace"
                    fontWeight={700} textAnchor="middle">
                    WRITE-BACK
                  </text>
                </g>
              )}
              {/* Write-back data path: dashed line from badge to memory bus */}
              {e.evictedDirty && wbProg > 0 && (
                <g opacity={Math.min(1, wbProg * 2)}>
                  <line x1={ax} y1={ayEnd + 20} x2={ax} y2={ayEnd + 20 + wbDrawLen}
                    stroke={evictionColor} strokeWidth={1.5} strokeDasharray="4 3"
                    opacity={0.7} />
                  {/* Data blob traveling down the path */}
                  {wbProg > 0.1 && (
                    <circle cx={ax}
                      cy={ayEnd + 20 + wbDrawLen * 0.5}
                      r={4} fill={evictionColor} opacity={0.9} />
                  )}
                </g>
              )}
            </g>
          );
        })()}

        {/* Main Memory label bar */}
        <line x1={gridX} y1={VH - 60} x2={gridX + panelW} y2={VH - 60}
          stroke={T.faint} strokeWidth={0.5} strokeDasharray="4 2" opacity={0.5} />
        <rect x={gridX + panelW / 2 - 44} y={VH - 68} width={88} height={16}
          rx={3} fill={S.panel} stroke={T.faint} strokeWidth={0.5} />
        <text x={gridX + panelW / 2} y={VH - 57} fill={T.dim} fontSize={9}
          fontFamily="Inter, sans-serif" fontWeight={600} textAnchor="middle">
          MAIN MEMORY
        </text>

        {/* Compact mode: focus overlay — shows active set/way when cell is too small for labels */}
        {cellH < 36 && activeAccess && (() => {
          const e = activeAccess.entry;
          const wayLabel = e.result === "hit" && e.hitWay !== null ? `W${e.hitWay}`
            : e.fillWay !== null ? `→W${e.fillWay}`
            : "";
          return (
            <g>
              <rect x={gridX + panelW + 8} y={panelTop + bfH + wayHeaderH + 8}
                width={rightLabelW - 12} height={20}
                rx={3} fill={S.panel} stroke={T.faint} strokeWidth={0.5}
                opacity={0.85} />
              <text x={gridX + panelW + rightLabelW / 2 - 6}
                y={panelTop + bfH + wayHeaderH + 21}
                fill={T.bright} fontSize={9}
                fontFamily="Inter, sans-serif" fontWeight={600} textAnchor="middle">
                S{e.index} {wayLabel}
              </text>
            </g>
          );
        })()}

        {/* Result type label — positioned distinctly per miss type */}
        {activeAccess && activeAccess.phase === "result" && activeAccess.phaseProgress > 0.6 && (() => {
          const e = activeAccess.entry;
          if (e.result === "hit") return null;
          if (!e.filled) return null;
          const label = e.result === "cold-miss" ? "COLD"
            : e.result === "conflict-miss" ? "CONFLICT"
            : "CAPACITY";
          const fadeOp = Math.min(1, (activeAccess.phaseProgress - 0.6) / 0.3);

          // COLD: overlay on the newly written block
          if (e.result === "cold-miss" && e.fillWay !== null) {
            const bx = gridX + e.fillWay * cellW + cellW / 2;
            const by = gridTop + e.index * cellH + cellH / 2;
            return (
              <g opacity={fadeOp}>
                <rect x={bx - 28} y={by - 28} width={56} height={18}
                  rx={3} fill={missColor} fillOpacity={0.85} />
                <text x={bx} y={by - 16} fill="#fff" fontSize={9}
                  fontFamily="JetBrains Mono, SF Mono, monospace"
                  fontWeight={700} textAnchor="middle">
                  {label}
                </text>
              </g>
            );
          }

          // CAPACITY: centered over the whole grid with wider presentation
          if (e.result === "capacity-miss") {
            const cx = gridX + panelW / 2;
            const cy = gridTop + e.index * cellH + cellH / 2;
            return (
              <g opacity={fadeOp}>
                <rect x={cx - 44} y={cy - 28} width={88} height={18}
                  rx={3} fill={missColor} fillOpacity={0.85}
                  stroke={missColor} strokeWidth={1} strokeOpacity={0.5} />
                <text x={cx} y={cy - 16} fill="#fff" fontSize={9}
                  fontFamily="JetBrains Mono, SF Mono, monospace"
                  fontWeight={700} textAnchor="middle">
                  {label}
                </text>
              </g>
            );
          }

          // CONFLICT: right side of the target set
          return (
            <text x={gridX + panelW + 8}
              y={gridTop + e.index * cellH + cellH / 2 + 4}
              fill={missColor} fontSize={10}
              fontFamily="Inter, sans-serif" fontWeight={600}
              opacity={fadeOp}>
              {label}
            </text>
          );
        })()}

        {/* ── Timeline bar (multi-row) ── */}
        {(() => {
          const timelinePad = 50;
          const pillsPerRow = Math.max(1,
            Math.floor((VW - timelinePad * 2 + pillGap) / (pillW + pillGap)));
          const numRows = Math.max(1, Math.ceil(timeline.length / pillsPerRow));
          const tlY0 = VH - 42 - (numRows - 1) * 12; // shift up for multi-row
          const rowH = 22; // pill height (16) + gap between rows
          const activeIdx = activeAccess ? timeline.indexOf(activeAccess.entry) : -1;
          const allDone = !activeAccess && f >= timeline.length * clockPeriod * fps;

          return (
            <g>
              {/* Access label — aligned to first row start */}
              {numRows > 0 && (
                <text x={timelinePad - 40} y={tlY0 + 5} fill={T.muted} fontSize={11}
                  fontFamily="Inter, sans-serif" textAnchor="end">
                  Access
                </text>
              )}

              {timeline.map((entry, i) => {
                const row = Math.floor(i / pillsPerRow);
                const col = i % pillsPerRow;
                const rowY = tlY0 + row * rowH;
                const rowX = timelinePad + col * (pillW + pillGap);
                const cx = rowX + pillW / 2;
                const isActive = i === activeIdx;
                const isCompleted = allDone || (activeIdx >= 0 && i < activeIdx);

                let pillFill: string;
                let pillOp: number;
                if (isActive) {
                  pillFill = entry.result === "hit" ? hitColor : missColor;
                  pillOp = 1;
                } else if (isCompleted) {
                  pillFill = entry.result === "hit" ? ST.pillHit : ST.pillMiss;
                  pillOp = 0.6;
                } else {
                  pillFill = S.grid;
                  pillOp = 0.3;
                }

                return (
                  <g key={`tl-${i}`}>
                    <rect x={rowX} y={rowY - 8}
                      width={pillW} height={16} rx={8}
                      fill={pillFill} opacity={pillOp} />
                    <text x={cx} y={rowY + 4} fill="#fff" fontSize={9}
                      fontFamily="Inter, sans-serif" fontWeight={600}
                      textAnchor="middle" opacity={pillOp}>
                      {entry.accessId}
                    </text>
                    {isActive && (() => {
                      const cycleFrames = clockPeriod * fps;
                      const rippleT = (f % cycleFrames) / cycleFrames;
                      const rippleR = 6 + rippleT * 14;
                      const rippleOp = (1 - rippleT) * 0.5;
                      return (
                        <circle cx={cx} cy={rowY} r={rippleR}
                          fill="none" stroke={pillFill}
                          strokeWidth={1.5} opacity={rippleOp} />
                      );
                    })()}
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>
    </AbsoluteFill>
  );
};

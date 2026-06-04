// Virtual Memory — SVG scene component
// Renders TLB grid, page tables, VA decomposition, translation path

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { THEME } from "../theme";
import { computeVMSchedule } from "../motion/virtual-memory/vmSchedule";
import { vmState } from "../motion/virtual-memory/vmState";
import type { VirtualMemorySpec } from "../motion/virtual-memory/types";
import { TLBCell } from "../components/vm/TLBCell";
import { PTECell } from "../components/vm/PTECell";
import { VABitField } from "../components/vm/VABitField";

const S = THEME.canvas;
const T = THEME.text;
const VM = THEME.vm;

const VW = 1280;
const VH = 720;

export const VirtualMemoryScene: React.FC<{ spec: VirtualMemorySpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clockPeriod = spec.clockPeriod ?? 1;

  const schedule = React.useMemo(() => computeVMSchedule(spec), [spec]);
  const state = React.useMemo(
    () => vmState(schedule, frame, fps, clockPeriod),
    [schedule, frame, fps, clockPeriod]
  );

  const { tlbSets, tlbAssociativity, numLevels, entriesPerLevel, bitFields, timeline } = schedule;

  // Layout constants
  const TLB_X = 20;
  const TLB_Y = 70;
  const TLB_W = 200;
  const TLB_CELL_H = 44;
  const TLB_GAP = 4;

  const VA_X = 240;
  const VA_Y = 70;
  const VA_W = 360;
  const VA_H = 50;

  const PT_START_X = 240;
  const PT_Y = 180;
  const PT_CELL_W = 52;
  const PT_CELL_H = 36;
  const PT_GAP = 3;
  const PT_LEVEL_GAP = 40;

  // Bezier curve for walk path
  const walkPaths = state.currentAccess?.entry.walkPath ?? [];

  // Result badge
  const result = state.currentAccess?.entry.result;
  const resultColor = result === "tlb-hit"
    ? THEME.status.hit
    : result === "page-fault"
      ? THEME.status.miss
      : THEME.status.eviction;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        <defs>
          <marker id="vm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={VM.walk} />
          </marker>
          <marker id="vm-arrow-fault" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={THEME.status.miss} />
          </marker>
        </defs>

        {/* Title */}
        <text x={VW / 2} y={24} textAnchor="middle" fill={T.primary} fontSize={16} fontFamily="Inter, sans-serif" fontWeight="bold">
          {spec.title ?? "Virtual Memory"}
        </text>

        {/* Access info */}
        {state.currentAccess && (
          <text x={VW / 2} y={46} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="JetBrains Mono, SF Mono, monospace">
            Access: {state.currentAccess.entry.accessId} ({state.currentAccess.entry.virtualAddress}) — Cycle {state.currentAccess.entry.cycle}
          </text>
        )}

        {/* VA Bit Field */}
        {state.currentAccess && (
          <VABitField
            bitFields={bitFields}
            vpn={state.currentAccess.entry.vpn}
            offset={state.currentAccess.entry.offset}
            x={VA_X}
            y={VA_Y}
            w={VA_W}
            h={VA_H}
            activePhase={state.currentAccess.phase}
          />
        )}

        {/* TLB Panel */}
        <text x={TLB_X + TLB_W / 2} y={TLB_Y - 8} textAnchor="middle" fill={T.bright} fontSize={12} fontFamily="Inter, sans-serif" fontWeight="bold">
          TLB ({tlbSets}×{tlbAssociativity})
        </text>

        {/* TLB header */}
        <text x={TLB_X + 8} y={TLB_Y + 4} fill={T.muted} fontSize={9} fontFamily="Inter, sans-serif">
          Set
        </text>
        {Array.from({ length: tlbAssociativity }, (_, wi) => (
          <text
            key={`tlb-h-${wi}`}
            x={TLB_X + 40 + wi * ((TLB_W - 40) / tlbAssociativity) + ((TLB_W - 40) / tlbAssociativity) / 2}
            y={TLB_Y + 4}
            textAnchor="middle"
            fill={T.muted}
            fontSize={9}
            fontFamily="Inter, sans-serif"
          >
            Way {wi}
          </text>
        ))}

        {/* TLB cells */}
        {state.tlbGrid.map((row, si) => (
          row.map((cell, wi) => {
            const cellW = (TLB_W - 40) / tlbAssociativity;
            return (
              <TLBCell
                key={`tlb-${si}-${wi}`}
                state={cell}
                x={TLB_X + 40 + wi * cellW + 2}
                y={TLB_Y + 14 + si * (TLB_CELL_H + TLB_GAP)}
                w={cellW - 4}
                h={TLB_CELL_H}
              />
            );
          })
        ))}

        {/* Set labels */}
        {Array.from({ length: tlbSets }, (_, si) => (
          <text
            key={`tlb-sl-${si}`}
            x={TLB_X + 20}
            y={TLB_Y + 14 + si * (TLB_CELL_H + TLB_GAP) + TLB_CELL_H / 2 + 4}
            textAnchor="middle"
            fill={T.dim}
            fontSize={10}
            fontFamily="JetBrains Mono, SF Mono, monospace"
          >
            {si}
          </text>
        ))}

        {/* Page Tables */}
        {state.pageTables.map((pt, li) => {
          const ptX = PT_START_X + li * (PT_CELL_W * 8 + PT_LEVEL_GAP + 60);
          const maxCols = Math.min(8, entriesPerLevel[li]);
          const ptW = maxCols * (PT_CELL_W + PT_GAP);

          return (
            <g key={`pt-${li}`}>
              <text x={ptX + ptW / 2} y={PT_Y - 8} textAnchor="middle" fill={T.bright} fontSize={12} fontFamily="Inter, sans-serif" fontWeight="bold">
                Page Table L{li + 1}
              </text>
              <text x={ptX + ptW / 2} y={PT_Y + 4} textAnchor="middle" fill={T.muted} fontSize={9} fontFamily="Inter, sans-serif">
                {entriesPerLevel[li]} entries
              </text>

              {pt.cells.map((row, ri) =>
                row.map((cell, ci) => (
                  <PTECell
                    key={`pte-${li}-${ri}-${ci}`}
                    state={cell}
                    x={ptX + ci * (PT_CELL_W + PT_GAP)}
                    y={PT_Y + 16 + ri * (PT_CELL_H + PT_GAP)}
                    w={PT_CELL_W}
                    h={PT_CELL_H}
                    index={ri * maxCols + ci}
                  />
                ))
              )}
            </g>
          );
        })}

        {/* Walk path Bezier curves */}
        {state.currentAccess && walkPaths.length > 0 && walkPaths.map((step, i) => {
          const isFault = step.result === "fault";
          const fromX = TLB_X + TLB_W + 10;
          const fromY = TLB_Y + 14 + (state.currentAccess!.entry.tlbSet) * (TLB_CELL_H + TLB_GAP) + TLB_CELL_H / 2;
          const ptBaseX = PT_START_X + step.level * (PT_CELL_W * 8 + PT_LEVEL_GAP + 60);
          const col = step.entryIndex % 8;
          const row = Math.floor(step.entryIndex / 8);
          const toX = ptBaseX + col * (PT_CELL_W + PT_GAP) + PT_CELL_W / 2;
          const toY = PT_Y + 16 + row * (PT_CELL_H + PT_GAP) + PT_CELL_H / 2;
          const midX = (fromX + toX) / 2;

          return (
            <path
              key={`walk-${i}`}
              d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
              fill="none"
              stroke={isFault ? THEME.status.miss : VM.walk}
              strokeWidth={1.5}
              strokeDasharray={isFault ? "4 2" : "none"}
              markerEnd={isFault ? "url(#vm-arrow-fault)" : "url(#vm-arrow)"}
              opacity={0.7}
            />
          );
        })}

        {/* Result badge */}
        {state.currentAccess && state.currentAccess.phase === "result" && (
          <g>
            <rect
              x={VW / 2 - 70} y={VH - 80}
              width={140} height={32}
              rx={16} ry={16}
              fill={resultColor}
              fillOpacity={0.8}
            />
            <text
              x={VW / 2} y={VH - 60}
              textAnchor="middle"
              fill={T.onColor}
              fontSize={13}
              fontFamily="Inter, sans-serif"
              fontWeight="bold"
            >
              {result === "tlb-hit" ? "TLB HIT" : result === "page-fault" ? "PAGE FAULT" : "TLB MISS → Walk"}
            </text>
          </g>
        )}

        {/* Timeline bar */}
        <TimelineBar
          timeline={timeline}
          currentCycle={state.currentAccess?.entry.cycle ?? 0}
          totalCycles={schedule.totalCycles}
          x={80}
          y={VH - 50}
          w={VW - 160}
          h={40}
        />
      </svg>
    </AbsoluteFill>
  );
};

// --- Sub-components ---

const TimelineBar: React.FC<{
  timeline: { accessId: string; cycle: number; result: string }[];
  currentCycle: number;
  totalCycles: number;
  x: number; y: number; w: number; h: number;
}> = ({ timeline, currentCycle, totalCycles, x, y, w, h }) => {
  const pillW = w / totalCycles;

  return (
    <g>
      {Array.from({ length: totalCycles }, (_, ci) => {
        const px = x + ci * pillW;
        const entry = timeline.find((e) => e.cycle === ci + 1);
        const isActive = ci + 1 === currentCycle;

        let pillFill: string = S.panel;
        let pillOpacity = 0.2;
        if (entry) {
          if (entry.result === "tlb-hit") {
            pillFill = THEME.status.hit;
            pillOpacity = 0.6;
          } else if (entry.result === "page-fault") {
            pillFill = THEME.status.miss;
            pillOpacity = 0.6;
          } else {
            pillFill = THEME.status.eviction;
            pillOpacity = 0.5;
          }
        }
        if (isActive) pillOpacity = 0.9;

        return (
          <g key={`tl-${ci}`}>
            <rect
              x={px + 1} y={y + 8}
              width={Math.max(pillW - 2, 2)} height={h - 16}
              rx={4} ry={4}
              fill={pillFill}
              opacity={pillOpacity}
            />
            {entry && (
              <text
                x={px + pillW / 2} y={y + h / 2 + 3}
                textAnchor="middle"
                fill={T.bright}
                fontSize={8}
                fontFamily="Inter, sans-serif"
              >
                {entry.accessId}
              </text>
            )}
            {isActive && (
              <circle
                cx={px + pillW / 2} cy={y + h / 2}
                r={6}
                fill="none"
                stroke={T.bright}
                strokeWidth={1}
                opacity={0.6}
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

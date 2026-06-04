// Branch Prediction — SVG scene component
// Renders pipeline grid with speculative execution, flush animation, BTB table

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { THEME } from "../theme";
import { computeBPSchedule } from "../motion/branch-prediction/bpSchedule";
import { bpState } from "../motion/branch-prediction/bpState";
import type { BranchPredictionSpec, BPCellState, BTBState } from "../motion/branch-prediction/types";

const S = THEME.canvas;
const T = THEME.text;
const P = THEME.pipeline;

const VW = 1280;
const VH = 720;
const STAGE_LABEL_W = 70;
const HEADER_H = 36;
const BTB_PANEL_W = 280;
const BTB_PANEL_GAP = 16;
const TIMELINE_H = 60;

export const BranchPredictionScene: React.FC<{ spec: BranchPredictionSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clockPeriod = spec.clockPeriod ?? 1;

  const schedule = React.useMemo(() => computeBPSchedule(spec), [spec]);
  const state = React.useMemo(
    () => bpState(schedule, frame, fps, clockPeriod),
    [schedule, frame, fps, clockPeriod]
  );

  const { numStages, totalCycles } = schedule;
  const gridX = STAGE_LABEL_W + 16;
  const gridTop = HEADER_H + 12;
  const gridW = VW - gridX - BTB_PANEL_W - BTB_PANEL_GAP - 20;
  const gridH = VH - gridTop - TIMELINE_H - 20;
  const cellW = gridW / totalCycles;
  const cellH = gridH / numStages;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        <defs>
          <pattern id="bp-bubble-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={P.bubble} strokeWidth={1} opacity={0.3} />
          </pattern>
          <marker id="bp-flush-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={P.flush} />
          </marker>
        </defs>

        {/* Title */}
        <text x={VW / 2} y={24} textAnchor="middle" fill={T.primary} fontSize={16} fontFamily="Inter, sans-serif" fontWeight="bold">
          {spec.title ?? "Branch Prediction"}
        </text>

        {/* Cycle headers */}
        {Array.from({ length: totalCycles }, (_, ci) => (
          <text
            key={`ch-${ci}`}
            x={gridX + ci * cellW + cellW / 2}
            y={HEADER_H}
            textAnchor="middle"
            fill={T.muted}
            fontSize={11}
            fontFamily="JetBrains Mono, SF Mono, monospace"
          >
            {ci + 1}
          </text>
        ))}

        {/* Stage labels */}
        {spec.stages.map((stage, si) => (
          <text
            key={`sl-${si}`}
            x={STAGE_LABEL_W}
            y={gridTop + si * cellH + cellH / 2 + 4}
            textAnchor="end"
            fill={T.bright}
            fontSize={12}
            fontFamily="Inter, sans-serif"
            fontWeight="bold"
          >
            {stage}
          </text>
        ))}

        {/* Grid lines */}
        {Array.from({ length: numStages + 1 }, (_, i) => (
          <line
            key={`gh-${i}`}
            x1={gridX} y1={gridTop + i * cellH}
            x2={gridX + gridW} y2={gridTop + i * cellH}
            stroke={S.grid} strokeWidth={0.5} opacity={0.3}
          />
        ))}
        {Array.from({ length: totalCycles + 1 }, (_, i) => (
          <line
            key={`gv-${i}`}
            x1={gridX + i * cellW} y1={gridTop}
            x2={gridX + i * cellW} y2={gridTop + gridH}
            stroke={S.grid} strokeWidth={0.5} opacity={0.3}
          />
        ))}

        {/* Cells */}
        {state.cells.flatMap((row, si) =>
          row.map((cellState, ci) => (
            <BPCell
              key={`c-${si}-${ci}`}
              cellState={cellState}
              x={gridX + ci * cellW + 2}
              y={gridTop + si * cellH + 2}
              w={cellW - 4}
              h={cellH - 4}
            />
          ))
        )}

        {/* Misprediction redirect arrow */}
        {state.activeBranch && !state.activeBranch.isCorrect && (
          <g opacity={state.flushProgress}>
            <line
              x1={gridX + (state.activeBranch.resolveCycle - 1) * cellW + cellW / 2}
              y1={gridTop + state.activeBranch.resolveStage * cellH}
              x2={gridX + cellW / 2}
              y2={gridTop}
              stroke={P.flush}
              strokeWidth={2}
              strokeDasharray="6 3"
              markerEnd="url(#bp-flush-arrow)"
            />
            <text
              x={gridX + (state.activeBranch.resolveCycle - 1) * cellW + cellW / 2 + 8}
              y={gridTop + state.activeBranch.resolveStage * cellH - 8}
              fill={P.flush}
              fontSize={11}
              fontFamily="Inter, sans-serif"
              fontWeight="bold"
            >
              MISPREDICT +{state.activeBranch.penaltyCycles}c
            </text>
          </g>
        )}

        {/* BTB Panel */}
        <BTBPanel
          btb={state.btb}
          x={VW - BTB_PANEL_W - 12}
          y={gridTop}
          w={BTB_PANEL_W}
          h={gridH}
          predictor={spec.predictor}
        />

        {/* Timeline bar */}
        <TimelineBar
          branches={schedule.branches}
          currentCycle={state.currentCycle}
          totalCycles={totalCycles}
          x={gridX}
          y={VH - TIMELINE_H}
          w={gridW}
          h={TIMELINE_H}
        />
      </svg>
    </AbsoluteFill>
  );
};

// --- Sub-components ---

const BPCell: React.FC<{
  cellState: BPCellState;
  x: number; y: number; w: number; h: number;
}> = ({ cellState, x, y, w, h }) => {
  const { cell, opacity, highlight, flushFlash } = cellState;
  if (cell.state === "empty") return null;

  const cellColor = cell.color ?? P.cell;
  let fill: string = cellColor;
  let fillOpacity = 0;
  let strokeColor: string = "transparent";
  let strokeWidth = 0;
  let strokeDasharray = "none";
  let textColor: string = T.onColor;
  let textOpacity = opacity;

  switch (cell.state) {
    case "active":
      fillOpacity = 0.8 * opacity;
      break;
    case "speculative":
      fillOpacity = 0.3 * opacity;
      strokeColor = cellColor;
      strokeWidth = 1;
      strokeDasharray = "4 2";
      textOpacity = opacity * 0.6;
      break;
    case "flushed":
      fill = P.flush;
      fillOpacity = 0.1 * opacity + flushFlash * 0.3;
      strokeColor = P.flush;
      strokeWidth = 1.5;
      strokeDasharray = `${4 + flushFlash * 8} ${2 + flushFlash * 4}`;
      textOpacity = opacity * 0.3 + flushFlash * 0.2;
      break;
    case "bubble":
      fill = "url(#bp-bubble-hatch)";
      fillOpacity = 0.5 * opacity;
      strokeColor = P.bubble;
      strokeWidth = 0.5;
      textColor = P.bubble;
      break;
  }

  // Green highlight pulse for correct prediction
  if (highlight > 0) {
    fill = THEME.status.hit;
    fillOpacity = Math.max(fillOpacity, highlight * 0.5);
  }

  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        rx={3} ry={3}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
      {cell.mnemonic && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 4}
          textAnchor="middle"
          fill={textColor}
          opacity={textOpacity}
          fontSize={Math.min(12, h * 0.4)}
          fontFamily="JetBrains Mono, SF Mono, monospace"
          fontWeight="bold"
        >
          {cell.mnemonic}
        </text>
      )}
    </g>
  );
};

const BTBPanel: React.FC<{
  btb: BTBState[];
  x: number; y: number; w: number; h: number;
  predictor: string;
}> = ({ btb, x, y, w, h, predictor }) => {
  if (btb.length === 0) return null;
  const rowH = Math.min(36, h / (btb.length + 2));

  return (
    <g>
      <text x={x + w / 2} y={y - 4} textAnchor="middle" fill={T.bright} fontSize={12} fontFamily="Inter, sans-serif" fontWeight="bold">
        BTB ({predictor})
      </text>
      {/* Header */}
      <text x={x + 8} y={y + rowH * 0.7} fill={T.muted} fontSize={10} fontFamily="Inter, sans-serif">Idx</text>
      <text x={x + 50} y={y + rowH * 0.7} fill={T.muted} fontSize={10} fontFamily="Inter, sans-serif">Counter</text>
      <text x={x + 160} y={y + rowH * 0.7} fill={T.muted} fontSize={10} fontFamily="Inter, sans-serif">Branch</text>
      <line x1={x} y1={y + rowH} x2={x + w} y2={y + rowH} stroke={S.grid} strokeWidth={0.5} opacity={0.3} />

      {btb.map((btbState, i) => {
        const ry = y + rowH * (i + 1);
        const { entry, updateFlash } = btbState;
        const counterColor = counterToColor(entry.counter);

        return (
          <g key={`btb-${i}`}>
            {/* Row background on update */}
            {updateFlash > 0 && (
              <rect x={x} y={ry} width={w} height={rowH} fill={counterColor} fillOpacity={updateFlash * 0.2} rx={2} />
            )}
            <text x={x + 16} y={ry + rowH * 0.65} fill={T.bright} fontSize={11} fontFamily="JetBrains Mono, SF Mono, monospace">
              {entry.index}
            </text>
            {/* Counter bar */}
            <rect x={x + 46} y={ry + 6} width={100} height={rowH - 12} rx={3} fill={S.panel} />
            <rect
              x={x + 46} y={ry + 6}
              width={counterBarWidth(entry.counter) * 100}
              height={rowH - 12}
              rx={3}
              fill={counterColor}
              opacity={0.7 + updateFlash * 0.3}
            />
            <text x={x + 96} y={ry + rowH * 0.65} textAnchor="middle" fill={T.onColor} fontSize={9} fontFamily="Inter, sans-serif" fontWeight="bold">
              {counterLabel(entry.counter)}
            </text>
            <text x={x + 160} y={ry + rowH * 0.65} fill={T.dim} fontSize={10} fontFamily="JetBrains Mono, SF Mono, monospace">
              {entry.branchId ?? "—"}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const TimelineBar: React.FC<{
  branches: { resolveCycle: number; isCorrect: boolean }[];
  currentCycle: number;
  totalCycles: number;
  x: number; y: number; w: number; h: number;
}> = ({ branches, currentCycle, totalCycles, x, y, w, h }) => {
  const pillW = w / totalCycles;

  return (
    <g>
      {Array.from({ length: totalCycles }, (_, ci) => {
        const px = x + ci * pillW;
        const branch = branches.find((b) => b.resolveCycle - 1 === ci);
        const isActive = ci === currentCycle;
        const isCompleted = ci < currentCycle;

        let pillFill: string = S.panel;
        let pillOpacity = 0.3;
        if (branch) {
          pillFill = branch.isCorrect ? THEME.status.hit : THEME.status.miss;
          pillOpacity = isCompleted ? 0.6 : 0.3;
        }
        if (isActive) {
          pillOpacity = 0.8;
        }

        return (
          <g key={`tl-${ci}`}>
            <rect
              x={px + 1} y={y + 8}
              width={Math.max(pillW - 2, 2)} height={h - 16}
              rx={4} ry={4}
              fill={pillFill}
              opacity={pillOpacity}
            />
            {isActive && (
              <circle
                cx={px + pillW / 2} cy={y + h / 2}
                r={8}
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

// --- Helpers ---

function counterToColor(counter: string): string {
  switch (counter) {
    case "strongly-not-taken": return THEME.counter.stronglyNotTaken;
    case "weakly-not-taken": return THEME.counter.weaklyNotTaken;
    case "weakly-taken": return THEME.counter.weaklyTaken;
    case "strongly-taken": return THEME.counter.stronglyTaken;
    default: return P.bubble;
  }
}

function counterBarWidth(counter: string): number {
  switch (counter) {
    case "strongly-not-taken": return 0.2;
    case "weakly-not-taken": return 0.4;
    case "weakly-taken": return 0.6;
    case "strongly-taken": return 0.9;
    default: return 0;
  }
}

function counterLabel(counter: string): string {
  switch (counter) {
    case "strongly-not-taken": return "SNT";
    case "weakly-not-taken": return "WNT";
    case "weakly-taken": return "WT";
    case "strongly-taken": return "ST";
    default: return "?";
  }
}

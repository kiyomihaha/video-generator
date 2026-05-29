// Pipeline Visualization — Remotion Scene Component
// Renders a CPU pipeline diagram as an SVG grid.

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { computePipelineSchedule } from "../motion/pipeline/pipelineSchedule";
import { pipelineState } from "../motion/pipeline/pipelineState";
import { THEME } from "../theme";
import type { PipelineSpec, ScheduledCell } from "../motion/pipeline/types";

interface Props {
  spec: PipelineSpec;
}

const VW = 1280;
const VH = 720;
const STAGE_LABEL_W = 70;
const HEADER_H = 36;
const CELL_PAD = 4;
const BORDER_R = 4;

const S = THEME.canvas;
const T = THEME.text;
const P = THEME.pipeline;

export const PipelineScene: React.FC<Props> = ({ spec }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clockPeriod = spec.clockPeriod ?? 1.0;

  // Phase 1: compute schedule once
  const schedule = useMemo(() => computePipelineSchedule(spec), [spec]);

  // Phase 2: per-frame state
  const state = useMemo(
    () => pipelineState(schedule, f, fps, clockPeriod),
    [schedule, f, fps, clockPeriod],
  );

  const numStages = spec.stages.length;
  const totalCycles = spec.totalCycles;

  // Grid dimensions
  const gridW = VW - STAGE_LABEL_W - 20;
  const gridH = VH - HEADER_H - 60;
  const cellW = gridW / totalCycles;
  const cellH = gridH / numStages;
  const gridX = STAGE_LABEL_W;
  const gridY = HEADER_H + 20;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        <defs>
          {/* Bubble hatch pattern */}
          <pattern
            id="bubble-hatch"
            width={8}
            height={8}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={8}
              stroke={P.bubble}
              strokeWidth={2}
            />
          </pattern>
          {/* Arrow marker */}
          <marker
            id="fwd-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={P.marker} />
          </marker>
        </defs>

        <rect width={VW} height={VH} fill={S.bg} />

        {/* Title */}
        {spec.title && (
          <text
            x={VW / 2}
            y={24}
            fill={T.primary}
            fontSize={20}
            fontFamily="Inter, sans-serif"
            fontWeight={700}
            textAnchor="middle"
          >
            {spec.title}
          </text>
        )}

        {/* Cycle number headers */}
        {Array.from({ length: totalCycles }).map((_, ci) => {
          const x = gridX + ci * cellW + cellW / 2;
          return (
            <text
              key={`ch-${ci}`}
              x={x}
              y={gridY - 8}
              fill={T.bright}
              fontSize={13}
              fontFamily="Inter, monospace"
              fontWeight={600}
              textAnchor="middle"
            >
              {ci + 1}
            </text>
          );
        })}

        {/* Stage labels */}
        {spec.stages.map((stage, si) => {
          const y = gridY + si * cellH + cellH / 2;
          return (
            <text
              key={`sl-${si}`}
              x={STAGE_LABEL_W - 10}
              y={y + 5}
              fill={T.bright}
              fontSize={15}
              fontFamily="Inter, monospace"
              fontWeight={700}
              textAnchor="end"
            >
              {stage}
            </text>
          );
        })}

        {/* Grid background lines */}
        {Array.from({ length: numStages + 1 }).map((_, i) => (
          <line
            key={`gh-${i}`}
            x1={gridX}
            y1={gridY + i * cellH}
            x2={gridX + gridW}
            y2={gridY + i * cellH}
            stroke={S.grid}
            strokeWidth={0.5}
            opacity={0.3}
          />
        ))}
        {Array.from({ length: totalCycles + 1 }).map((_, i) => (
          <line
            key={`gv-${i}`}
            x1={gridX + i * cellW}
            y1={gridY}
            x2={gridX + i * cellW}
            y2={gridY + gridH}
            stroke={S.grid}
            strokeWidth={0.5}
            opacity={0.3}
          />
        ))}

        {/* Cells */}
        {state.cells.flatMap((row, si) =>
          row.map((cellState, ci) => {
            const { cell, opacity } = cellState;
            if (opacity <= 0.01) return null;

            const x = gridX + ci * cellW + CELL_PAD;
            const y = gridY + si * cellH + CELL_PAD;
            const w = cellW - CELL_PAD * 2;
            const h = cellH - CELL_PAD * 2;

            return (
              <Cell
                key={`c-${si}-${ci}`}
                cell={cell}
                x={x}
                y={y}
                w={w}
                h={h}
                opacity={opacity}
              />
            );
          }),
        )}

        {/* Forwarding arrows */}
        {state.forwards.map((fwdState, i) => {
          if (fwdState.progress <= 0.01) return null;

          const { forward, progress } = fwdState;
          const px =
            gridX +
            forward.producerCell.cycleIndex * cellW +
            cellW -
            CELL_PAD;
          const py =
            gridY +
            forward.producerCell.stageIndex * cellH +
            cellH / 2;
          const cx =
            gridX + forward.consumerCell.cycleIndex * cellW + CELL_PAD;
          const cy =
            gridY +
            forward.consumerCell.stageIndex * cellH +
            cellH / 2;

          // Cubic bezier: horizontal exit from producer, horizontal entry to consumer
          const cpOffset = Math.abs(cx - px) * 0.3;
          const pathD = `M ${px} ${py} C ${px + cpOffset} ${py}, ${cx - cpOffset} ${cy}, ${cx} ${cy}`;

          // Multi-forward vertical offset for same consumer
          const operandOffset =
            forward.operand === "rs1"
              ? -4
              : forward.operand === "rs2"
                ? 4
                : 0;

          const pathLength = Math.hypot(cx - px, cy - py) * 1.2;
          const dashOffset = pathLength * (1 - progress);

          return (
            <g key={`fwd-${i}`} opacity={progress}>
              <path
                d={pathD}
                fill="none"
                stroke={forward.producerColor}
                strokeWidth={2}
                strokeDasharray={`${pathLength}`}
                strokeDashoffset={dashOffset}
                markerEnd="url(#fwd-arrow)"
                transform={`translate(0, ${operandOffset})`}
              />
              {forward.reason && progress > 0.8 && (
                <text
                  x={(px + cx) / 2}
                  y={(py + cy) / 2 - 8 + operandOffset}
                  fill={forward.producerColor}
                  fontSize={10}
                  fontFamily="Inter, sans-serif"
                  textAnchor="middle"
                  opacity={(progress - 0.8) / 0.2}
                >
                  {forward.reason}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ─── Cell sub-component ───

const Cell: React.FC<{
  cell: ScheduledCell;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
}> = ({ cell, x, y, w, h, opacity }) => {
  if (cell.state === "empty") return null;

  if (cell.state === "bubble") {
    return (
      <g opacity={opacity}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="url(#bubble-hatch)"
          rx={BORDER_R}
          opacity={0.5}
        />
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke={P.bubble}
          strokeWidth={1}
          rx={BORDER_R}
          opacity={0.4}
        />
        <text
          x={x + w / 2}
          y={y + h / 2 + 4}
          fill={P.bubble}
          fontSize={11}
          fontFamily="Inter, monospace"
          textAnchor="middle"
          opacity={0.7}
        >
          bubble
        </text>
      </g>
    );
  }

  if (cell.state === "held") {
    return (
      <g opacity={opacity}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={cell.color ?? P.cell}
          fillOpacity={0.4}
          rx={BORDER_R}
        />
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke={cell.color ?? P.cell}
          strokeWidth={1.5}
          strokeDasharray="3 2"
          rx={BORDER_R}
          opacity={0.7}
        />
        {cell.instruction && (
          <text
            x={x + w / 2}
            y={y + h / 2 + 4}
            fill={cell.color ?? P.cell}
            fontSize={11}
            fontFamily="Inter, monospace"
            fontWeight={600}
            textAnchor="middle"
            opacity={0.8}
          >
            {truncate(cell.instruction, w)}
          </text>
        )}
      </g>
    );
  }

  if (cell.state === "flushed") {
    return (
      <g opacity={opacity}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={cell.color ?? P.flush}
          fillOpacity={0.1}
          rx={BORDER_R}
        />
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke={P.flush}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          rx={BORDER_R}
          opacity={0.6}
        />
        {cell.instruction && (
          <text
            x={x + w / 2}
            y={y + h / 2 + 4}
            fill={cell.color ?? P.flush}
            fontSize={11}
            fontFamily="Inter, monospace"
            textAnchor="middle"
            opacity={0.4}
          >
            {truncate(cell.instruction, w)}
          </text>
        )}
      </g>
    );
  }

  // Active cell
  return (
    <g opacity={opacity}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={cell.color ?? P.cell}
        fillOpacity={0.8}
        rx={BORDER_R}
      />
      {cell.instruction && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 4}
          fill="#ffffff"
          fontSize={11}
          fontFamily="Inter, monospace"
          fontWeight={600}
          textAnchor="middle"
        >
          {truncate(cell.instruction, w)}
        </text>
      )}
    </g>
  );
};

function truncate(text: string, maxWidth: number): string {
  const charW = 7; // approximate monospace char width at fontSize 11
  const maxChars = Math.floor((maxWidth - 8) / charW);
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return text.slice(0, 1);
  return text.slice(0, maxChars - 1) + "…";
}

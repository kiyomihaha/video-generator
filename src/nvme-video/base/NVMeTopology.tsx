// NVMeTopology — Fixed spatial skeleton for all segments
// CPU/Driver → Host Memory → PCIe → NVMe Controller → Namespace
// All segments share this coordinate system; only states and emphasis change.

import React from "react";
import { THEME } from "../../theme";

const N = THEME.nvme;
const T = THEME.text;
const S = THEME.canvas;

// ── Fixed coordinates ──
export const TOPO = {
  // Canvas
  vw: 1280,
  vh: 720,

  // Host side (left)
  hostX: 60,
  hostY: 200,
  hostW: 160,
  hostH: 120,

  // Host Memory (center-left)
  memX: 300,
  memY: 160,
  memW: 200,
  memH: 200,

  // PCIe Link (center)
  pcieX: 560,
  pcieY: 240,
  pcieW: 80,
  pcieH: 80,

  // NVMe Controller (center-right)
  ctrlX: 720,
  ctrlY: 180,
  ctrlW: 200,
  ctrlH: 160,

  // Namespace / Storage (right)
  nsX: 1000,
  nsY: 200,
  nsW: 160,
  nsH: 120,

  // Doorbell registers (below controller)
  dbX: 720,
  dbY: 400,
  dbW: 200,
  dbH: 60,

  // SQ/CQ positions within Host Memory
  sqX: 320,
  sqY: 180,
  sqW: 160,
  sqH: 50,

  cqX: 320,
  cqY: 260,
  cqW: 160,
  cqH: 50,

  // PRP Buffer (below memory)
  prpX: 320,
  prpY: 340,
  prpW: 160,
  prpH: 40,

  // Title area
  titleY: 30,

  // Subtitle safe zone
  subtitleTop: 540,
} as const;

interface NVMeTopologyProps {
  /** Current segment ID for context-aware rendering */
  segmentId?: string;
  /** Which zones to highlight */
  highlight?: string[];
  /** Which zones to dim */
  dim?: string[];
  /** Data flow arrows to show */
  flows?: Array<{ from: string; to: string; label?: string; color?: string }>;
  /** Children rendered on top of the topology */
  children?: React.ReactNode;
}

export const NVMeTopology: React.FC<NVMeTopologyProps> = ({
  segmentId,
  highlight = [],
  dim = [],
  flows = [],
  children,
}) => {
  const isHighlighted = (id: string) => highlight.includes(id);
  const isDimmed = (id: string) => dim.includes(id) && !highlight.includes(id);
  const getOpacity = (id: string) => isDimmed(id) ? 0.25 : 1;

  return (
    <svg viewBox={`0 0 ${TOPO.vw} ${TOPO.vh}`} width="100%" height="100%">
      {/* ── Host (CPU/Driver) ── */}
      <g opacity={getOpacity("host")}>
        <rect
          x={TOPO.hostX} y={TOPO.hostY}
          width={TOPO.hostW} height={TOPO.hostH}
          rx={8} fill={N.host} fillOpacity={0.15}
          stroke={N.host} strokeWidth={isHighlighted("host") ? 2.5 : 1.5}
        />
        <text
          x={TOPO.hostX + TOPO.hostW / 2} y={TOPO.hostY + 30}
          textAnchor="middle" fill={N.host}
          fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif"
        >
          CPU / Driver
        </text>
        <text
          x={TOPO.hostX + TOPO.hostW / 2} y={TOPO.hostY + 55}
          textAnchor="middle" fill={T.muted}
          fontSize={12} fontFamily="Inter, sans-serif"
        >
          NVMe Host Driver
        </text>
      </g>

      {/* ── Host Memory ── */}
      <g opacity={getOpacity("memory")}>
        <rect
          x={TOPO.memX} y={TOPO.memY}
          width={TOPO.memW} height={TOPO.memH}
          rx={8} fill={N.memory} fillOpacity={0.1}
          stroke={N.memory} strokeWidth={isHighlighted("memory") ? 2.5 : 1.5}
          strokeDasharray={isDimmed("memory") ? "6 4" : "none"}
        />
        <text
          x={TOPO.memX + TOPO.memW / 2} y={TOPO.memY - 8}
          textAnchor="middle" fill={N.memory}
          fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif"
        >
          Host Memory
        </text>

        {/* Admin SQ */}
        <rect
          x={TOPO.sqX} y={TOPO.sqY}
          width={TOPO.sqW} height={TOPO.sqH}
          rx={4} fill={N.sqe} fillOpacity={isHighlighted("admin-sq") ? 0.3 : 0.1}
          stroke={N.sqe} strokeWidth={isHighlighted("admin-sq") ? 2 : 1}
        />
        <text
          x={TOPO.sqX + TOPO.sqW / 2} y={TOPO.sqY + TOPO.sqH / 2 + 4}
          textAnchor="middle" fill={N.sqe}
          fontSize={12} fontWeight={500} fontFamily="Inter, sans-serif"
        >
          Admin SQ
        </text>

        {/* Admin CQ */}
        <rect
          x={TOPO.cqX} y={TOPO.cqY}
          width={TOPO.cqW} height={TOPO.cqH}
          rx={4} fill={N.cqe} fillOpacity={isHighlighted("admin-cq") ? 0.3 : 0.1}
          stroke={N.cqe} strokeWidth={isHighlighted("admin-cq") ? 2 : 1}
        />
        <text
          x={TOPO.cqX + TOPO.cqW / 2} y={TOPO.cqY + TOPO.cqH / 2 + 4}
          textAnchor="middle" fill={N.cqe}
          fontSize={12} fontWeight={500} fontFamily="Inter, sans-serif"
        >
          Admin CQ
        </text>

        {/* PRP Buffer */}
        <rect
          x={TOPO.prpX} y={TOPO.prpY}
          width={TOPO.prpW} height={TOPO.prpH}
          rx={4} fill={N.memory} fillOpacity={isHighlighted("prp") ? 0.3 : 0.08}
          stroke={N.memory} strokeWidth={isHighlighted("prp") ? 2 : 1}
          strokeDasharray="4 3"
        />
        <text
          x={TOPO.prpX + TOPO.prpW / 2} y={TOPO.prpY + TOPO.prpH / 2 + 4}
          textAnchor="middle" fill={N.memory}
          fontSize={11} fontFamily="Inter, sans-serif"
        >
          PRP Buffer
        </text>
      </g>

      {/* ── PCIe Link ── */}
      <g opacity={getOpacity("pcie")}>
        <rect
          x={TOPO.pcieX} y={TOPO.pcieY}
          width={TOPO.pcieW} height={TOPO.pcieH}
          rx={12} fill={N.pcie} fillOpacity={0.15}
          stroke={N.pcie} strokeWidth={isHighlighted("pcie") ? 2.5 : 1.5}
        />
        <text
          x={TOPO.pcieX + TOPO.pcieW / 2} y={TOPO.pcieY + TOPO.pcieH / 2 - 6}
          textAnchor="middle" fill={N.pcie}
          fontSize={14} fontWeight={700} fontFamily="Inter, sans-serif"
        >
          PCIe
        </text>
        <text
          x={TOPO.pcieX + TOPO.pcieW / 2} y={TOPO.pcieY + TOPO.pcieH / 2 + 12}
          textAnchor="middle" fill={T.muted}
          fontSize={11} fontFamily="Inter, sans-serif"
        >
          Link
        </text>
      </g>

      {/* ── NVMe Controller ── */}
      <g opacity={getOpacity("controller")}>
        <rect
          x={TOPO.ctrlX} y={TOPO.ctrlY}
          width={TOPO.ctrlW} height={TOPO.ctrlH}
          rx={8} fill={N.controller} fillOpacity={0.15}
          stroke={N.controller} strokeWidth={isHighlighted("controller") ? 2.5 : 1.5}
        />
        <text
          x={TOPO.ctrlX + TOPO.ctrlW / 2} y={TOPO.ctrlY + 30}
          textAnchor="middle" fill={N.controller}
          fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif"
        >
          NVMe Controller
        </text>
        <text
          x={TOPO.ctrlX + TOPO.ctrlW / 2} y={TOPO.ctrlY + 55}
          textAnchor="middle" fill={T.muted}
          fontSize={12} fontFamily="Inter, sans-serif"
        >
          Command Processing
        </text>
      </g>

      {/* ── Doorbell Registers ── */}
      <g opacity={getOpacity("doorbell")}>
        <rect
          x={TOPO.dbX} y={TOPO.dbY}
          width={TOPO.dbW} height={TOPO.dbH}
          rx={4} fill={N.doorbell} fillOpacity={isHighlighted("doorbell") ? 0.25 : 0.08}
          stroke={N.doorbell} strokeWidth={isHighlighted("doorbell") ? 2 : 1}
        />
        <text
          x={TOPO.dbX + TOPO.dbW / 2} y={TOPO.dbY + TOPO.dbH / 2 + 4}
          textAnchor="middle" fill={N.doorbell}
          fontSize={12} fontWeight={600} fontFamily="Inter, sans-serif"
        >
          Doorbell Registers
        </text>
      </g>

      {/* ── Namespace / Storage ── */}
      <g opacity={getOpacity("namespace")}>
        <rect
          x={TOPO.nsX} y={TOPO.nsY}
          width={TOPO.nsW} height={TOPO.nsH}
          rx={8} fill={N.storage} fillOpacity={0.15}
          stroke={N.storage} strokeWidth={isHighlighted("namespace") ? 2.5 : 1.5}
        />
        <text
          x={TOPO.nsX + TOPO.nsW / 2} y={TOPO.nsY + 30}
          textAnchor="middle" fill={N.storage}
          fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif"
        >
          Namespace
        </text>
        <text
          x={TOPO.nsX + TOPO.nsW / 2} y={TOPO.nsY + 55}
          textAnchor="middle" fill={T.muted}
          fontSize={12} fontFamily="Inter, sans-serif"
        >
          Block Storage
        </text>
      </g>

      {/* ── Flow arrows ── */}
      {flows.map((flow, i) => {
        const from = getZoneCenter(flow.from);
        const to = getZoneCenter(flow.to);
        if (!from || !to) return null;

        const color = flow.color ?? N.pcie;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len;
        const uy = dy / len;

        // Shorten arrow to not overlap with boxes
        const startGap = 20;
        const endGap = 20;
        const x1 = from.x + ux * startGap;
        const y1 = from.y + uy * startGap;
        const x2 = to.x - ux * endGap;
        const y2 = to.y - uy * endGap;

        // Arrowhead
        const headLen = 10;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const ha1x = x2 - headLen * Math.cos(angle - 0.4);
        const ha1y = y2 - headLen * Math.sin(angle - 0.4);
        const ha2x = x2 - headLen * Math.cos(angle + 0.4);
        const ha2y = y2 - headLen * Math.sin(angle + 0.4);

        return (
          <g key={i} opacity={0.8}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color} strokeWidth={2} strokeLinecap="round" />
            <polygon points={`${x2},${y2} ${ha1x},${ha1y} ${ha2x},${ha2y}`} fill={color} />
            {flow.label && (
              <text
                x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8}
                textAnchor="middle" fill={color}
                fontSize={11} fontWeight={500} fontFamily="Inter, sans-serif"
              >
                {flow.label}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Segment-specific content ── */}
      {children}
    </svg>
  );
};

// Helper: get zone center coordinates
function getZoneCenter(zoneId: string): { x: number; y: number } | null {
  const map: Record<string, { x: number; y: number }> = {
    host: { x: TOPO.hostX + TOPO.hostW / 2, y: TOPO.hostY + TOPO.hostH / 2 },
    memory: { x: TOPO.memX + TOPO.memW / 2, y: TOPO.memY + TOPO.memH / 2 },
    pcie: { x: TOPO.pcieX + TOPO.pcieW / 2, y: TOPO.pcieY + TOPO.pcieH / 2 },
    controller: { x: TOPO.ctrlX + TOPO.ctrlW / 2, y: TOPO.ctrlY + TOPO.ctrlH / 2 },
    doorbell: { x: TOPO.dbX + TOPO.dbW / 2, y: TOPO.dbY + TOPO.dbH / 2 },
    namespace: { x: TOPO.nsX + TOPO.nsW / 2, y: TOPO.nsY + TOPO.nsH / 2 },
    "admin-sq": { x: TOPO.sqX + TOPO.sqW / 2, y: TOPO.sqY + TOPO.sqH / 2 },
    "admin-cq": { x: TOPO.cqX + TOPO.cqW / 2, y: TOPO.cqY + TOPO.cqH / 2 },
    prp: { x: TOPO.prpX + TOPO.prpW / 2, y: TOPO.prpY + TOPO.prpH / 2 },
  };
  return map[zoneId] ?? null;
}

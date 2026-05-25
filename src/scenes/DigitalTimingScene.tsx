import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SignalWave } from "../components/digital/SignalWave";
import { propagateSignal } from "../motion/primitives/propagateSignal";
import type { DigitalTimingSpec } from "../motion/primitives/types";

interface Props { spec: DigitalTimingSpec; }

const VW = 1280, VH = 720;
const CL = 150, CR = 80, CT = 116, TH = 112, TG = 42;
const CW = VW - CL - CR;
const AT = (n: number) => CT + n * TH + (n - 1) * TG + 34;

const S = {
  bg: "#08111f", panel: "#1e293b", grid: "#334155",
  text: "#f8fafc", bright: "#e2e8f0", muted: "#64748b",
  clock: "#60a5fa", data: "#facc15", output: "#4ade80", arrow: "#38bdf8", delay: "#f472b6",
};

const sigColor = (pid: string) =>
  pid === "clk" ? S.clock : pid === "d" ? S.data : pid === "q" ? S.output : S.muted;

/** Find the first transition time of a signal that occurs after startTime */
const firstTransitionAfter = (spec: DigitalTimingSpec, pinId: string, startTime: number) => {
  const sig = spec.signals.find(s => s.pinId === pinId);
  if (!sig) return startTime;
  const match = sig.transitions.find(t => t.at > startTime - 0.001);
  return match ? match.at : startTime;
};

export const DigitalTimingScene: React.FC<Props> = ({ spec }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const end = spec.totalDuration;
  const sx = (t: number) => CL + (t / end) * CW;
  const ty = (i: number) => CT + i * (TH + TG);
  const tcy = (i: number) => ty(i) + TH / 2;
  const n = spec.signals.length;
  const an = AT(n);
  const st = spec.propagations.map(p => propagateSignal(p, f, fps));

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        <defs>
        </defs>

        <rect width={VW} height={VH} fill={S.bg} />
        <text x={60} y={50} fill={S.text} fontSize={28} fontFamily="Inter, sans-serif" fontWeight={800}>{spec.title}</text>
        <rect x={60} y={62} width={160} height={2} rx={1} fill="#ffffff22" />
        <line x1={CL} y1={90} x2={CL + CW} y2={90} stroke={S.grid} strokeWidth={1} />

        {/* Time axis */}
        {Array.from({ length: Math.floor(end) + 1 }).map((_, i) => {
          const x = sx(i);
          return (
            <g key={`a${i}`}>
              <text x={x} y={80} fill={S.bright} fontSize={12} textAnchor="middle">{i}&thinsp;ms</text>
              <rect x={x - 0.5} y={CT} width={1} height={an + 130 - CT} fill="#ffffff08" />
            </g>
          );
        })}

        {/* Signal tracks */}
        {spec.signals.map((sig, i) => {
          const p = spec.propagations.find(x => x.from.pinId === sig.pinId || x.to.pinId === sig.pinId);
          const pi = p ? spec.propagations.indexOf(p) : -1;
          const a = pi >= 0 ? st[pi] : undefined;
          return (
            <g key={sig.pinId} transform={`translate(${CL}, ${ty(i)})`}>
              <rect x={-106} y={0} width={CW + 106} height={TH} rx={6} fill={i % 2 === 0 ? "#0a1428" : "#0c1830"} />
              <SignalWave signal={sig} timeScale={end} canvasWidth={CW} canvasHeight={TH}
                glowIntensity={p?.from.pinId === sig.pinId ? a?.sourceGlow ?? 0 : 0}
                pulseIntensity={p?.to.pinId === sig.pinId ? a?.targetPulse ?? 0 : 0}
                color={sigColor(sig.pinId)}
                triggerEdge={p?.from.pinId === sig.pinId ? p?.triggerEdge : undefined}
                eventAt={p ? firstTransitionAfter(spec, sig.pinId,
                  p.from.pinId === sig.pinId ? p.delay : p.delay + 0.001) : undefined} />
            </g>
          );
        })}

        {/* Causal arrow + tCO — fully aligned to Q's actual transition */}
        {spec.propagations.map((p, i) => {
          const aState = st[i];
          const fi = spec.signals.findIndex(x => x.pinId === p.from.pinId);
          const ti = spec.signals.findIndex(x => x.pinId === p.to.pinId);
          if (fi < 0 || ti < 0) return null;

          // Lock arrow endpoint to Q's actual first transition after CLK posedge
          const qTransitionMs = firstTransitionAfter(spec, p.to.pinId, p.delay);
          const clkX = sx(p.delay);
          const qX = sx(qTransitionMs);
          const clkY = tcy(fi);
          const qY = tcy(ti);
          const qTransitY = ty(ti) + TH * 0.5;  // midpoint of Q's vertical edge
          const laneY = an + 56;
          const mx = (clkX + qX) / 2;

          return (
            <g key={`d-${i}`}>
              {/* Causal arrow — no SVG marker, manual path */}
              <g opacity={Math.max(0.12, aState.progress)}>
                {/* Arrow shaft */}
                <line x1={clkX} y1={clkY} x2={qX} y2={qTransitY} stroke={S.arrow} strokeWidth={4}
                  strokeDasharray={aState.arrowLength} strokeDashoffset={aState.arrowOffset}
                  strokeLinecap="round" />
                {/* Manual arrowhead */}
                {(aState.progress > 0.3) && (() => {
                  const angle = Math.atan2(qTransitY - clkY, qX - clkX);
                  const hs = 13;
                  return (
                    <polygon
                      points={[
                        `${qX},${qTransitY}`,
                        `${qX - hs * Math.cos(angle - 0.35)},${qTransitY - hs * Math.sin(angle - 0.35)}`,
                        `${qX - hs * Math.cos(angle + 0.35)},${qTransitY - hs * Math.sin(angle + 0.35)}`,
                      ].join(" ")}
                      fill={S.arrow}
                    />
                  );
                })()}
              </g>

              {/* Vertical ref lines — aligned to same qX */}
              <line x1={clkX} y1={ty(fi) + 18} x2={clkX} y2={laneY + 16} stroke={S.muted} strokeWidth={1} strokeDasharray="4 6" opacity={0.5} />
              <line x1={qX} y1={ty(ti) + 18} x2={qX} y2={laneY + 16} stroke={S.muted} strokeWidth={1} strokeDasharray="4 6" opacity={0.5} />

              {/* tCO horizontal double arrow — manual path, no markers */}
              <line x1={clkX + 10} y1={laneY} x2={qX - 10} y2={laneY} stroke={S.delay} strokeWidth={1.5} strokeLinecap="round" />
              <polygon points={`${clkX + 13},${laneY} ${clkX + 8},${laneY - 4} ${clkX + 8},${laneY + 4}`} fill={S.delay} />
              <polygon points={`${qX - 13},${laneY} ${qX - 8},${laneY - 4} ${qX - 8},${laneY + 4}`} fill={S.delay} />
              <text x={mx} y={laneY - 8} fill={S.delay} fontSize={12} fontWeight={700} fontFamily="Inter, sans-serif" textAnchor="middle" letterSpacing="1.5">tCO</text>
              <circle cx={clkX} cy={laneY} r={2.5} fill={S.muted} opacity={0.5} />
              <circle cx={qX} cy={laneY} r={2.5} fill={S.muted} opacity={0.5} />
            </g>
          );
        })}

        {/* Annotations */}
        {spec.annotations?.map((a, i) => {
          const x = sx(a.at);
          const y = a.position === "top" ? 115 : an + 112;
          const ly = a.position === "top" ? y - 10 : y + 24;
          return (
            <g key={`n-${i}`}>
              <line x1={x} y1={y} x2={x - 40} y2={ly} stroke={S.muted} strokeWidth={1} opacity={0.4} />
              <line x1={x - 40} y1={ly} x2={x + 40} y2={ly} stroke={S.muted} strokeWidth={1} opacity={0.4} />
              <text x={x + 44} y={ly + 4} fill={S.bright} fontSize={13} fontFamily="Inter, sans-serif" textAnchor="end">{a.text}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

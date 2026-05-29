import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SignalWave } from "../components/digital/SignalWave";
import { FanoutArrow } from "../components/digital/FanoutArrow";
import { propagateSignal } from "../motion/primitives/propagateSignal";
import { latchSignal, deriveLatchOutputSignal } from "../motion/primitives/latchSignal";
import { glitchSignal } from "../motion/primitives/glitchSignal";
import { metastabilitySignal } from "../motion/primitives/metastabilitySignal";
import { THEME } from "../theme";
import type { DigitalTimingSpec, TimelineSignal } from "../motion/primitives/types";

interface Props { spec: DigitalTimingSpec; }

const VW = 1280, VH = 720;
const CL = 150, CR = 80, CT = 116, TH = 112, TG = 42;
const CW = VW - CL - CR;
const AT = (n: number) => CT + n * TH + (n - 1) * TG + 34;

const S = THEME.canvas;
const T = THEME.text;
const D = THEME.digital;

const sigColor = (pid: string) =>
  pid === "clk" ? D.clock : pid === "d" ? D.data : pid === "q" ? D.output : T.muted;

/** Find the first transition time of a signal that occurs after startTime */
const firstTransitionAfter = (signals: TimelineSignal[], pinId: string, startTime: number) => {
  const sig = signals.find(s => s.pinId === pinId);
  if (!sig) return startTime;
  const match = sig.transitions.find(t => t.at > startTime - 0.001);
  return match ? match.at : startTime;
};

/** Find the last enable close time BEFORE or AT the current frame time */
const findLastCloseTime = (enableSig: TimelineSignal, latchMode: string, frame: number, fps: number): number => {
  const t = frame / fps;
  const isHigh = latchMode === "transparent_high";
  const transparentVal = isHigh ? 1 : 0;
  let lastClose = 0;
  let inWin = enableSig.initialValue === transparentVal;
  for (const tr of enableSig.transitions) {
    if (tr.at > t + 0.0001) break;
    const wasIn = inWin;
    inWin = tr.to === transparentVal;
    if (wasIn && !inWin) lastClose = tr.at;
  }
  return lastClose;
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

  // Compute latch states
  const latchStates = (spec.latches ?? []).map(latch => {
    const enableSig = spec.signals.find(s => s.pinId === latch.enablePin.pinId);
    const dataSig = spec.signals.find(s => s.pinId === latch.dataPin.pinId);
    if (!enableSig || !dataSig) return null;
    return { latch, state: latchSignal(latch, enableSig, dataSig, f, fps), enableSig, dataSig };
  });

  // For latched output signals, derive Q transitions using shared function
  const effectiveSignals: TimelineSignal[] = spec.signals.map(sig => {
    const ls = latchStates.find(ls => ls?.latch.outputPin.pinId === sig.pinId);
    if (!ls) return sig;
    return deriveLatchOutputSignal(ls.latch, ls.enableSig, ls.dataSig);
  });

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%">
        <defs>
          <filter id="glitch-blur" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation={3} />
          </filter>
          {/* Metastability hatch pattern — 45° diagonal lines, 2px stroke, 8px spacing */}
          <pattern id="meta-hatch" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={8} stroke="#f97316" strokeWidth={2} />
          </pattern>
        </defs>

        <rect width={VW} height={VH} fill={S.bg} />
        <text x={60} y={50} fill={T.primary} fontSize={28} fontFamily="Inter, sans-serif" fontWeight={800}>{spec.title}</text>
        <line x1={CL} y1={90} x2={CL + CW} y2={90} stroke={S.grid} strokeWidth={1} />

        {/* Time axis */}
        {Array.from({ length: Math.floor(end) + 1 }).map((_, i) => {
          const x = sx(i);
          return (
            <g key={`a${i}`}>
              <text x={x} y={80} fill={T.bright} fontSize={12} textAnchor="middle">{i}&thinsp;s</text>
              <rect x={x - 0.5} y={CT} width={1} height={an + 130 - CT} fill="#ffffff08" />
            </g>
          );
        })}

        {/* Signal tracks */}
        {spec.signals.map((sig, i) => {
          const effSig = effectiveSignals[i];
          const p = spec.propagations.find(x => x.from.pinId === sig.pinId || x.to.pinId === sig.pinId);
          const pi = p ? spec.propagations.indexOf(p) : -1;
          const a = pi >= 0 ? st[pi] : undefined;
          const ls = latchStates.find(ls => ls?.latch.outputPin.pinId === sig.pinId);
          return (
            <g key={sig.pinId} transform={`translate(${CL}, ${ty(i)})`}>
              <rect x={-106} y={0} width={CW + 106} height={TH} rx={6} fill={i % 2 === 0 ? S.altRowA : S.altRowB} />
              <SignalWave signal={effSig} timeScale={end} canvasWidth={CW} canvasHeight={TH}
                glowIntensity={p?.from.pinId === sig.pinId ? a?.sourceGlow ?? 0 : (ls?.state.glowIntensity ?? 0)}
                pulseIntensity={p?.to.pinId === sig.pinId ? a?.targetPulse ?? 0 : (ls?.state.latchIntensity ?? 0)}
                color={sigColor(sig.pinId)}
                triggerEdge={p?.from.pinId === sig.pinId ? p?.triggerEdge : undefined}
                eventAt={p ? firstTransitionAfter(effectiveSignals, sig.pinId,
                  p.from.pinId === sig.pinId ? p.delay : p.delay + 0.001) : undefined} />
              {/* Latch overlay: lavender glow with shimmer during transparent window */}
              {ls && ls.state.glowIntensity > 0 && (() => {
                const glowColor = ls.latch.visual?.glowColor ?? "#c084fc";
                const maxOp = ls.latch.visual?.glowMaxOpacity ?? 0.1;
                const shimmerOffset = (f * 0.5) % CW; // slow left-to-right scroll (Gemini: gentler flow)
                return (
                  <>
                    <defs>
                      <linearGradient id={`shimmer-${sig.pinId}`} x1={shimmerOffset - CW} y1={0} x2={shimmerOffset} y2={0} gradientUnits="userSpaceOnUse" spreadMethod="repeat">
                        <stop offset="0%" stopColor={glowColor} stopOpacity={0} />
                        <stop offset="40%" stopColor={glowColor} stopOpacity={maxOp * ls.state.glowIntensity} />
                        <stop offset="60%" stopColor={glowColor} stopOpacity={maxOp * ls.state.glowIntensity * 0.6} />
                        <stop offset="100%" stopColor={glowColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <rect x={0} y={0} width={CW} height={TH} fill={`url(#shimmer-${sig.pinId})`} rx={4} />
                  </>
                );
              })()}
              {/* Latch status bars: 2px at top and bottom of track */}
              {ls && (() => {
                const barColor = ls.state.enableActive
                  ? (ls.latch.visual?.glowColor ?? "#c084fc")
                  : T.muted;
                const barOpacity = ls.state.enableActive ? 0.8 : 0.3;
                return (
                  <>
                    <rect x={0} y={0} width={CW} height={2} fill={barColor} opacity={barOpacity} />
                    <rect x={0} y={TH - 2} width={CW} height={2} fill={barColor} opacity={barOpacity} />
                  </>
                );
              })()}
              {/* Snap-lock flash at latch close — easeOutCubic fade over 15 frames */}
              {/* Suppressed when metastability is active (indeterminate or resolving) on same pin */}
              {ls && ls.state.snapLockIntensity > 0.01 && (() => {
                const metaActive = (spec.metastabilities ?? []).some(m =>
                  m.signalPin.pinId === ls.latch.outputPin.pinId &&
                  (() => { const s = metastabilitySignal(m, f, fps); return s.active && (s.phase === "indeterminate" || s.phase === "resolving"); })()
                );
                if (metaActive) return null;
                const closeTime = findLastCloseTime(ls.enableSig, ls.latch.latchMode, f, fps);
                const cx = (closeTime / end) * CW;
                const si = ls.state.snapLockIntensity;
                return (
                  <>
                    {/* Flash overlay — fades from white burst */}
                    <rect x={0} y={0} width={CW} height={TH} fill="#ffffff" opacity={si * 0.15} rx={4} />
                    {/* Anchor ruler — sharp at close, fades slowly through hold */}
                    <line x1={cx} y1={-4} x2={cx} y2={TH + 4}
                      stroke="#ffffff" strokeWidth={2}
                      opacity={Math.max(0.2, si * 0.7)} />
                  </>
                );
              })()}
              {/* Persistent anchor line when latched (even after flash fades) */}
              {ls && !ls.state.enableActive && ls.state.snapLockIntensity <= 0.01 && (() => {
                const closeTime = findLastCloseTime(ls.enableSig, ls.latch.latchMode, f, fps);
                if (closeTime <= 0) return null;
                const cx = (closeTime / end) * CW;
                return (
                  <line x1={cx} y1={-4} x2={cx} y2={TH + 4}
                    stroke="#ffffff" strokeWidth={1.5}
                    opacity={0.2 * (1 - ls.state.holdFadeProgress)} />
                );
              })()}
              {/* Glitch overlay — red jagged pulse on signal track */}
              {(spec.glitches ?? []).filter(g => g.signalPin.pinId === sig.pinId).map(glitch => {
                const gs = glitchSignal(glitch, f, fps);
                if (!gs.active || gs.amplitude < 0.01) return null;
                const gx = (glitch.startTime / end) * CW;
                const gw = (glitch.duration / end) * CW;
                const color = glitch.color ?? D.glitch;
                // Build jagged glitch path: rectangular pulse with jitter
                // Align to SignalWave rails: high = TH*0.25, low = TH*0.75
                const yHigh = TH * 0.25;
                const yLow = TH * 0.75;
                const swingUp = (yLow - yHigh) * gs.amplitude;
                const j = gs.jitter * (yLow - yHigh) * 0.3;
                const x1 = gx;
                const x2 = gx + gw;
                const fromY = glitch.glitchType === "positive" ? yLow : yHigh;
                const toY = glitch.glitchType === "positive" ? yLow - swingUp : yHigh + swingUp;
                const d = `M ${x1} ${fromY} L ${x1 + gw * 0.1} ${toY + j} L ${x2 - gw * 0.1} ${toY - j * 0.7} L ${x2} ${fromY}`;
                const gradId = `glitch-grad-${glitch.id}`;
                return (
                  <g key={`gl-${glitch.id}`}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1={toY} x2="0" y2={fromY} gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor={color} stopOpacity={0.3 * gs.amplitude} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    {/* Glow fill — vertical gradient from peak to baseline */}
                    <path d={`${d} L ${x2} ${fromY} Z`} fill={`url(#${gradId})`} opacity={0.5} />
                    {/* Crisp stroke */}
                    <path d={d} fill="none" stroke={color} strokeWidth={2.5}
                      opacity={0.9 * gs.amplitude} strokeLinejoin="round" strokeLinecap="round" />
                  </g>
                );
              })}
              {/* Metastability overlay */}
              {(spec.metastabilities ?? []).map((meta, origIdx) => {
                if (meta.signalPin.pinId !== sig.pinId) return null;
                const ms = metastabilitySignal(meta, f, fps);
                if (!ms.active) return null;
                const color = meta.color ?? "#f97316";
                const yHigh = TH * 0.25;
                const yLow = TH * 0.75;
                const yMid = TH * 0.5;
                const metaId = `meta-hatch-${meta.id ?? "m"}-${sig.pinId}-${origIdx}`;
                const isSnap = meta.settleBehavior === "snap";

                // Crossfade: fps-derived frames at 60% of indeterminate boundary (0.48)
                const crossfadeFrames = Math.max(1, Math.round(fps * 0.2));
                const crossfadeStartFrame = meta.startTime * fps + (meta.duration * fps) * 0.48;
                const fadeProg = Math.max(0, Math.min(1, (f - crossfadeStartFrame) / crossfadeFrames));
                const hatchOpacity = (1 - fadeProg) * 0.20;
                const ringFadeIn = fadeProg;

                const bandSwing = (yLow - yHigh) * ms.bandWidth;
                const bandTop = yMid - bandSwing / 2;
                const bandBottom = yMid + bandSwing / 2;

                // Ringing waveform path — ringing only during resolving (0.80-0.95), flat mid-rail during indeterminate
                const ringFreq = meta.ringCount ?? 3;
                const wavePoints: string[] = [];
                const waveSteps = Math.max(1, Math.round((meta.duration / end) * CW * 0.8));
                const indeterminateFrac = 0.80;
                const resolvingFrac = 0.95;
                for (let wi = 0; wi <= waveSteps; wi++) {
                  const wx = (meta.startTime / end) * CW + (wi / waveSteps) * ((meta.duration / end) * CW);
                  const wt = wi / waveSteps;
                  let wy: number;
                  if (wt < indeterminateFrac) {
                    // Indeterminate: flat at mid-rail
                    wy = yMid;
                  } else if (wt < resolvingFrac) {
                    // Resolving: damped sinusoid converging to resolved rail
                    const resolveProg = (wt - indeterminateFrac) / (resolvingFrac - indeterminateFrac);
                    const wPhase = wt * ringFreq * Math.PI * 2;
                    const wAmplitude = Math.exp(-3 * wt) * (yLow - yHigh) * 0.5;
                    const wSettle = (ms.resolvedValue - 0.5) * (yLow - yHigh) * resolveProg;
                    wy = yMid + Math.sin(wPhase) * wAmplitude * (1 - resolveProg) + wSettle;
                  } else {
                    // Settled/overshoot: at resolved rail
                    wy = ms.resolvedValue === 1 ? yHigh : yLow;
                  }
                  wavePoints.push(`${wi === 0 ? "M" : "L"} ${wx.toFixed(1)} ${wy.toFixed(1)}`);
                }

                // Overshoot
                const overshootAmt = (meta.settlingOvershoot ?? 0.15) * (yLow - yHigh);

                return (
                  <g key={`met-${sig.pinId}-${origIdx}`}>
                    <defs>
                      <pattern id={metaId} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <line x1={0} y1={0} x2={0} y2={8} stroke={color} strokeWidth={2} />
                      </pattern>
                      <clipPath id={`meta-clip-${metaId}`}>
                        <rect x={0} y={0} width={CW} height={TH} />
                      </clipPath>
                    </defs>

                    {/* Layer 1: Hatched indeterminate band */}
                    {hatchOpacity > 0.001 && (
                      <rect
                        x={(meta.startTime / end) * CW}
                        y={bandTop}
                        width={(meta.duration / end) * CW}
                        height={bandBottom - bandTop}
                        fill={`url(#${metaId})`}
                        opacity={hatchOpacity}
                        clipPath={`url(#meta-clip-${metaId})`}
                      />
                    )}

                    {/* Layer 2: Damped ringing waveform (skipped for snap behavior) */}
                    {!isSnap && ringFadeIn > 0.001 && ms.phase !== "settled" && (
                      <path
                        d={wavePoints.join(" ")}
                        fill="none"
                        stroke={color}
                        strokeWidth={2.5}
                        opacity={0.9 * ringFadeIn * Math.max(0.05, ms.ringAmplitude)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        clipPath={`url(#meta-clip-${metaId})`}
                      />
                    )}
                    {/* Layer 2b: Snap ramp line (only for snap behavior) */}
                    {isSnap && ms.phase === "resolving" && (() => {
                      const startX = ((meta.startTime + meta.duration * indeterminateFrac) / end) * CW;
                      const endX = ((meta.startTime + meta.duration * 0.95) / end) * CW;
                      const fromY = yMid;
                      const toY = ms.resolvedValue === 1 ? yHigh : yLow;
                      return <line x1={startX} y1={fromY} x2={endX} y2={toY} stroke={color} strokeWidth={2.5} opacity={0.9} />;
                    })()}

                    {/* Layer 3: Post-resolution overshoot */}
                    {ms.phase === "settled" && ms.overshootProgress > 0.01 && (() => {
                      const overshootPeak = ms.resolvedValue === 1
                        ? yHigh - overshootAmt * ms.overshootProgress
                        : yLow + overshootAmt * ms.overshootProgress;
                      const settleX = (meta.startTime / end) * CW + ((meta.duration / end) * CW) * 0.95;
                      const overshootLen = ((meta.duration / end) * CW) * 0.05;
                      const d = `M ${settleX} ${ms.resolvedValue === 1 ? yHigh : yLow} Q ${settleX + overshootLen * 0.5} ${overshootPeak} ${settleX + overshootLen} ${ms.resolvedValue === 1 ? yHigh : yLow}`;
                      return <path d={d} fill="none" stroke={color} strokeWidth={2} opacity={0.7 * ms.overshootProgress} />;
                    })()}

                    {/* Layer 4: Resolution annotation (after duration, mid-rail) */}
                    {f >= (meta.startTime + meta.duration) * fps && (() => {
                      const mx = ((meta.startTime + meta.duration) / end) * CW;
                      const bw = 72;
                      return (
                        <>
                          <rect x={mx - bw / 2} y={yMid - 12} width={bw} height={20} rx={4} fill={color} opacity={0.10} />
                          <text x={mx} y={yMid + 3} fill={color} fontSize={12} fontWeight={700} fontFamily="Inter, sans-serif" textAnchor="middle">
                            t_res {((meta.duration) * 1000).toFixed(0)}ms
                          </text>
                        </>
                      );
                    })()}

                    {/* Layer 5: Violation window marker (first few frames) */}
                    {meta.violationWindow !== undefined && ms.progress < 0.1 && (() => {
                      const vx = (meta.startTime / end) * CW;
                      const vw = (meta.violationWindow / end) * CW;
                      return (
                        <rect
                          x={vx - vw / 2}
                          y={yMid - 8}
                          width={vw}
                          height={16}
                          fill={color}
                          opacity={0.5 * (1 - ms.progress / 0.1)}
                          rx={2}
                        />
                      );
                    })()}
                  </g>
                );
              })}
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
          const qTransitionMs = firstTransitionAfter(effectiveSignals, p.to.pinId, p.delay);
          const clkX = sx(p.delay);
          const qX = sx(qTransitionMs);
          const clkY = tcy(fi);
          const qY = tcy(ti);
          const qTransitY = ty(ti) + TH * 0.5;  // midpoint of Q's vertical edge
          const laneY = an + 56;
          const mx = (clkX + qX) / 2;

          return (
            <g key={`d-${i}`}>
              {/* Causal arrow — skip if fanout handles it */}
              <g opacity={Math.max(0.12, aState.progress)}>
                {(p.fanoutEdges?.length ?? 0) === 0 && (<>
                  <line x1={clkX} y1={clkY} x2={qX} y2={qTransitY} stroke={D.arrow} strokeWidth={4}
                    strokeDasharray={aState.arrowLength} strokeDashoffset={aState.arrowOffset}
                    strokeLinecap="round" />
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
                        fill={D.arrow}
                      />
                    );
                  })()}
                </>)}
              </g>

              {/* Vertical ref lines */}
              <line x1={clkX} y1={ty(fi) + 18} x2={clkX} y2={an + 72} stroke={T.muted} strokeWidth={1} strokeDasharray="4 6" opacity={0.5} />
              {!p.fanoutEdges && <line x1={qX} y1={ty(ti) + 18} x2={qX} y2={an + 72} stroke={T.muted} strokeWidth={1} strokeDasharray="4 6" opacity={0.5} />}

              {/* tCO — only when no fanout */}
              {!p.fanoutEdges && (<>
                <line x1={clkX + 10} y1={laneY} x2={qX - 10} y2={laneY} stroke={D.delay} strokeWidth={1.5} strokeLinecap="round" />
                <polygon points={`${clkX + 13},${laneY} ${clkX + 8},${laneY - 4} ${clkX + 8},${laneY + 4}`} fill={D.delay} />
                <polygon points={`${qX - 13},${laneY} ${qX - 8},${laneY - 4} ${qX - 8},${laneY + 4}`} fill={D.delay} />
                <text x={mx} y={laneY - 8} fill={D.delay} fontSize={12} fontWeight={700} fontFamily="Inter, sans-serif" textAnchor="middle" letterSpacing="1.5">tCO</text>
                <circle cx={clkX} cy={laneY} r={2.5} fill={T.muted} opacity={0.5} />
                <circle cx={qX} cy={laneY} r={2.5} fill={T.muted} opacity={0.5} />
              </>)}

              {/* Fanout branches */}
              {p.fanoutEdges && p.fanoutEdges.length > 0 && (
                <>
                  <FanoutArrow
                    x={clkX}
                    y={clkY}
                    frame={f}
                    fps={fps}
                    branches={p.fanoutEdges.map(e => {
                      const idx = spec.signals.findIndex(s => s.pinId === e.pinId);
                      return {
                        x: sx(p.delay + e.delay),
                        y: idx >= 0 ? tcy(idx) : clkY,
                        startMs: p.delay + e.delay,
                        durationMs: e.duration,
                      };
                    })}
                  />
                  {/* Timing brackets — in-track per fanout target */}
                  {p.fanoutEdges.map(e => {
                    const idx = spec.signals.findIndex(s => s.pinId === e.pinId);
                    if (idx < 0) return null;
                    const xa = sx(p.delay);
                    const xb = sx(p.delay + e.delay);
                    const bY = ty(idx) + TH + 6;  // bottom of each track
                    const startF = p.delay * fps;
                    const endF = (p.delay + e.delay) * fps;
                    const localP = Math.max(0, Math.min(1, (f - startF) / (endF - startF)));
                    const ripple = localP > 0.8 ? Math.sin((localP - 0.8) * 25) * Math.exp(-(localP - 0.8) * 12) : 0;
                    const gapNarrow = xb - xa < 60;
                    const tX = gapNarrow ? (xa + xb) / 2 : (xa + xb) / 2;

                    return (
                      <g key={`fb-${e.pinId}`}>
                        {/* Pink delay bracket */}
                        <line x1={xa + 6} y1={bY} x2={xb - 6} y2={bY} stroke={D.delay} strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
                        <polygon points={`${xa + 9},${bY} ${xa + 4},${bY - 4} ${xa + 4},${bY + 4}`} fill={D.delay} opacity={0.8} />
                        <polygon points={`${xb - 9},${bY} ${xb - 4},${bY - 4} ${xb - 4},${bY + 4}`} fill={D.delay} opacity={0.8} />
                        <rect x={tX - 24} y={bY - 20} width={48} height={18} rx={4} fill={S.panel} />
                        <text x={tX} y={bY - 8} fill={D.delay} fontSize={10} fontFamily="monospace" fontWeight={700} textAnchor="middle">{e.label || `t${e.pinId.toUpperCase()}`}</text>

                        {/* Target ripple */}
                        {ripple > 0.03 && (
                          <circle cx={xb} cy={tcy(idx)} r={4 + ripple * 12} fill="none" stroke={D.arrow} strokeWidth={2} opacity={ripple} />
                        )}
                      </g>
                    );
                  })}
                </>
              )}
            </g>
          );
        })}

        {/* Annotations */}
        {spec.annotations?.map((a, i) => {
          const x = sx(a.at);
          const y = a.position === "top" ? 115 : an + 112;
          const ly = a.position === "top" ? y - 10 : y + 24;
          const isGlitch = a.text.toLowerCase().includes("glitch");
          const color = isGlitch ? D.glitch : T.bright;
          const lineColor = isGlitch ? D.glitch : T.muted;
          return (
            <g key={`n-${i}`}>
              <line x1={x} y1={y} x2={x - 40} y2={ly} stroke={lineColor} strokeWidth={1} opacity={0.5} />
              <line x1={x - 40} y1={ly} x2={x + 40} y2={ly} stroke={lineColor} strokeWidth={1} opacity={0.5} />
              <text x={x + 44} y={ly + 4} fill={color} fontSize={13} fontFamily="Inter, sans-serif" textAnchor="end" fontWeight={isGlitch ? 700 : 400}>{a.text}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

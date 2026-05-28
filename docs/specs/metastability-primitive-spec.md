# Metastability Motion Primitive — Design Spec (v4)

## 1. Problem Statement

When a flip-flop or latch samples D near the clock edge (setup/hold violation), the output Q enters an **indeterminate state** — hovering between logic 0 and 1 before eventually resolving. This is metastability: a fundamental reliability hazard in synchronous digital design.

We need a motion primitive that visualizes this behavior in the timing diagram engine.

## 2. Domain Model

### What happens electrically
1. Clock edge fires while D is in the metastable window (setup/hold violation)
2. Q enters indeterminate region — voltage between VOL and VOH
3. Q **diverges exponentially** away from the metastable equilibrium point: `V(t) = Vmeta ± ΔV0 * e^(t/τ)` — initially slow, then rapidly approaching a rail as the positive feedback loop amplifies the departure
4. After resolution time, Q saturates at 0 or 1

**Note**: The animation uses a simplified visual model (damped sinusoid for pedagogical emphasis). The exponential divergence in real circuits looks like a slow drift that accelerates near the threshold — not a gentle linear ramp. Textbooks (Wakerly sec 10.6, Kinniment ch.4) describe this behavior.

### Visual conventions
- **Hatched/shaded band** between logic 0 and 1 rails — diagonal lines at 45°
- **Damped sinusoid** waveform — pedagogical convention for visual emphasis (not literal voltage)
- **Resolution bracket** showing t_res
- Transition INTO metastability is abrupt (clock edge)
- Transition OUT resolves to a definite 0 or 1

## 3. Spec Design

### MetastabilitySpec (JSON)

```typescript
{
  id?: string;                         // optional, fallback to "m"
  signalPin: SignalPin;                // which signal is affected (typically Q output)
  startTime: number;                   // when the violation occurs (seconds)
  duration: number;                    // total visible event duration (seconds), minimum 2/fps
  resolvedValue: 0 | 1;                // what Q settles to
  settleBehavior: "ringing" | "snap";  // "ringing" = damped oscillation, "snap" = direct jump
  violationWindow?: number;            // width of setup/hold window for annotation (seconds, no default)
  settlingOvershoot?: number;          // post-resolution overshoot fraction (0-1, default: 0.15)
  ringCount?: number;                  // number of damped oscillation cycles (default: 3)
  color?: string;                      // visual color (default: #f97316 orange)
}
```

**Naming**: `startTime`/`duration` aligned with GlitchSpec conventions. `id` is optional (consistent with GlitchSpec).

**Defaults**: `settlingOvershoot: 0.15` — deliberately exaggerated vs real circuits (~5%) for visual clarity.

**`violationWindow`**: No default. If omitted, no violation marker is rendered. Caller must explicitly provide a value appropriate for their timescale.

**`duration` minimum**: Must be `>= 2/fps`. Function throws if violated (no silent clamping).

### Event lifecycle

The `duration` field defines the **total visible event window**, subdivided into three rendering intervals:

```
|-- indeterminate --|-- resolving --|-- overshoot --|
    (dur * 0.80)      (dur * 0.15)    (dur * 0.05)
                                       ↑ annotation starts here, persists until scene end
```

- **Indeterminate interval** (`startTime` to `startTime + duration * 0.80`): hatched band + ringing waveform
- **Resolving interval** (`startTime + duration * 0.80` to `startTime + duration * 0.95`): last rings fade, signal snaps toward rail
- **Overshoot interval** (`startTime + duration * 0.95` to `startTime + duration`): overshoot pulse decays
- **Annotation** (after `startTime + duration`, until scene end): static t_res bracket

All rendering intervals are contained within `duration`. Only the annotation extends beyond it.

`duration` is NOT the physical resolution time constant — it is the **demo-scale visible duration** chosen for animation clarity.

### MetastabilityState (per-frame)

```typescript
{
  active: boolean;           // true from startTime through end of scene; false before startTime
  phase: "indeterminate" | "resolving" | "settled";
  progress: number;          // 0-1 through the indeterminate+resolving intervals (clamped)
  voltage: number;           // current "voltage" level (0-1, where 0.5 = mid-rail)
  bandWidth: number;         // width of indeterminate band (0-1, shrinks over time)
  ringAmplitude: number;     // current ringing oscillation amplitude (decays)
  resolvedValue: 0 | 1;      // which rail to resolve toward (from spec)
  overshootProgress: number; // 0-1 through overshoot decay (0 = no overshoot, >0 = decaying)
}
```

**`active` semantics**:
- Before `startTime`: `active = false` — event hasn't started, renderer skips entirely
- From `startTime` through scene end: `active = true` — `phase` controls which layers draw

**`resolvedValue` in state**: Renderer needs to know which rail without re-reading the spec.

**`overshootProgress`**: Starts at 1.0 when resolving completes, decays to 0 over the overshoot interval. 0 means no overshoot rendering needed.

### Ringing computation

Ringing is computed over the full `duration` but **only rendered during the visible window** (last 40% of indeterminate + resolving = frames where hatching has faded). This avoids visual discontinuity from late-starting sinusoidal cycles. The renderer gates Layer 2 visibility on `phase` and hatching fade progress, not on the computation itself.

### Edge case guards

| Case | Behavior |
|------|----------|
| `duration = 0` | Throw: `duration must be >= 2/fps` |
| `duration < 2/fps` | Throw: `duration must be >= 2/fps` |
| `startTime + duration > totalDuration` | Clamp progress at `(frame/fps - startTime) / duration` — rendering degrades gracefully |
| Multiple metastabilities on same pin | Render independently (overlay). Deterministic order: array index. First event's snap-lock suppression takes precedence for latch interaction. Pattern IDs include array index for uniqueness. |

### SVG pattern ID uniqueness

Pattern IDs use: `meta-hatch-{spec.id ?? "m"}-{signalPin.pinId}-{index}` — deterministic, frame-independent, unique per track and per event. `index` is the position in the `metastabilities[]` array.

## 4. Visual Rendering

### Color discipline
All layers reference `spec.color ?? "#f97316"` with opacity variations. Consistent with glitch pattern (`glitch.color ?? "#ef4444"`).

### Layer 1: Indeterminate band (background)
- SVG `<pattern>` with diagonal lines at 45°
- Stroke: **2px** (1px flickers at 60fps), spacing: 8px
- MUST use SVG native `<pattern>` element — do NOT use JS loops to draw lines (performance)
- Bounded between yHigh (TH * 0.25) and yLow (TH * 0.75)
- Band width starts at full swing, narrows linearly to 0 at end of resolving
- Color: `spec.color` at **20% opacity** (background, not dominant)
- **Temporal phasing**: Hatching visible during first 60% of indeterminate phase, fades out during last 40%

### Layer 2: Damped ringing waveform (foreground)
- Sinusoidal path centered at mid-rail (TH * 0.5)
- Frequency: `ringCount` cycles over `duration`
- Amplitude: exponential decay `A(t) = e^(-3t/duration)`
- Starts at full swing, decays to near-zero at resolution
- Color: `spec.color` at 90% opacity, strokeWidth 2.5
- If `settleBehavior: "snap"` — skip ringing, direct linear ramp to resolved rail over resolving interval
- **Temporal phasing**: Appears after hatching fades (last 40% of indeterminate + resolving)

### Layer 1b: Crossfade transition (between hatching and ringing)
- **10-15 frame crossfade** at the 60% indeterminate boundary
- Hatching opacity fades from 20% → 0% over crossfade duration
- Ringing opacity rises from 0% → 90% over the same window
- Prevents hard visual cut between "uncertainty hatching" and "deterministic oscillation"

### Layer 3: Post-resolution overshoot
- After resolving completes, one brief overshoot pulse in the settled direction
- Amplitude: `settlingOvershoot * (yLow - yHigh)` (default 15% of swing)
- Controlled by `overshootProgress` from state (decays over overshoot interval)
- **Direction guard**: For `resolvedValue = 1`, overshoot goes ABOVE high rail (yHigh - amplitude). For `resolvedValue = 0`, overshoot goes BELOW low rail (yLow + amplitude). SVG bounds are intentionally exceeded for visual effect.
- Quadratic decay back to rail
- Color: `spec.color` at 70% opacity
- **Justification**: Pedagogical — shows the signal "snapping" past the rail before settling. Exaggerated for readability.

### Layer 4: Resolution annotation (static after settling)
- Bracket showing t_res duration, placed at the **mid-rail (TH * 0.5)** with a frosted semi-transparent background panel
- Text: "t_res" with duration value
- Background panel: `spec.color` at 10% opacity, rounded rect behind text
- Color: `spec.color`
- Only rendered when `time >= startTime + duration` (after the full visible event completes)
- Positioned at mid-rail to avoid collision with tCO brackets and glitch annotations in the inter-track gap

### Layer 5: Violation window marker (brief flash)
- Only rendered if `spec.violationWindow` is defined
- Small highlighted tick marks at the violation point
- Width: `violationWindow` seconds, scaled to canvas
- Appears only during first few frames of indeterminate phase, then fades
- Color: `spec.color` at 50% opacity

### Interaction with latch primitive
Metastability **supersedes** latch visual effects on the same pin:
- Latch shimmer/status bars continue as normal (enable pin state is independent)
- Snap-lock flash is **suppressed** when `active && (phase === "indeterminate" || phase === "resolving")`
- After resolution (settled), normal latch behavior resumes
- If multiple metastabilities on same pin, first event's suppression takes precedence

## 5. Integration Points

### types.ts
- Add `MetastabilitySpec` interface
- Add `metastabilities?: MetastabilitySpec[]` to `DigitalTimingSpec`

### metastabilitySignal.ts (new)
- `metastabilitySignal(spec, frame, fps): MetastabilityState`
- Pure function, deterministic, no Math.random
- Throws if `duration < 2/fps`
- Import `clamp01` from shared location (extract from glitchSignal.ts to `utils.ts`)

### DigitalTimingScene.tsx
- Import `metastabilitySignal`
- Render layers 1-5 in the signal track loop
- Suppress latch snap-lock flash when `active && (phase === "indeterminate" || phase === "resolving")` on same pin

### Demo spec
- `public/specs/metastability-demo.json`
- Scenario: D flip-flop, D changes shortly before CLK rising edge
- Use **demo-scale durations** (0.1-1.5s range), not nanosecond-scale
- 60fps, totalDuration: 3s

## 6. Example Scenario (demo-scale)

```
CLK:  ───┐     ┌─────┐     ┌─────
          └─────┘     └─────┘
D:    ────────┐
              └─────────────────
              ↑ changes just before CLK↑ (violation)

Q:    ────────╱\/\/\/\/─────── 1
              |← duration →|
              indeterminate band + damped ringing → resolves to 1
```

Demo values (visible at 60fps):
- `startTime: 0.50` (CLK rising edge)
- `duration: 0.80` (48 frames — clearly visible ringing animation)
- `resolvedValue: 1`
- `settleBehavior: "ringing"`
- `ringCount: 4`
- `violationWindow: 0.03` (explicit, no relying on default)

## 7. Resolved Questions

| Question | Answer |
|----------|--------|
| Ringing vs hatching | Temporal phasing — hatching early, ringing late. Not simultaneous. |
| Resolution direction | User-specified `resolvedValue`. Deterministic engine, no random. |
| Color | Orange (#f97316) — confirmed by all reviewers. |
| Resolution annotation | Inside signal track (bottom), not in inter-track gap. |
| Demo timescales | Use 0.1-1.5s range, not nanoseconds. |
| Active vs settled | `active` = false before start, true from start through scene end. `phase` controls rendering. |
| Overshoot in state | `overshootProgress` field added to MetastabilityState. |
| Duration semantics | Total visible window, not physical τ. Subdivided into 3 intervals. |
| Pattern IDs | `meta-hatch-{id}-{pinId}-{index}` — deterministic, unique. |
| Same-pin collisions | Array order, first event precedence for latch suppression. |
| Labeling | "t_res" not "τ" (avoids confusion with physical time constant). |
| Electrical model | Exponential divergence from metastable equilibrium, not gentle decay. |
| violationWindow | No default — caller must provide explicitly. |
| Duration minimum | Enforced: `>= 2/fps`, throws on violation. |
| Overshoot direction | Above high rail for resolvedValue=1, below low rail for 0. SVG bounds intentionally exceeded. |

# Gemini Visual Review: CircuitWaveformLinker 最终方案

## 项目背景

Remotion 4.x + React 19 + SVG 引擎，用于 IC 教育短视频（深色主题，小红书平台）。
已实现：
- **TimingDiagram** — 波形（clk/data/valid）自动滚动，cursor 扫过周期
- **TextEmphasis** — 文本出入场 + 节拍驱动的强调动效
- 现在要做 **CircuitWaveformLinker** — 波形和电路图动画联动

## 设计方案（Codex + Hermes 最终共识）

### 核心模型

cycle-driven：每帧输入 → 时钟 cycle + phase → 语义视觉状态 → 波形和电路各自渲染

无需手动配边沿到动画的映射，完全由 cycle 决定电路区域的状态。

### 视觉状态

| 状态 | 颜色 | 含义 | 视觉表现 |
|------|------|------|----------|
| IDLE | 原色 opacity 0.2 | 空闲，不参与当前 cycle | 半透明灰/暗 |
| ACTIVE | `#38bdf8` | 电路正在工作 | 正常亮度 + 信号色填充/描边 |
| HOLD | `#10b981` | 数据保持稳定 | 青色稳定光 |
| ERROR | `#ef4444` | 时序违规/亚稳态 | 红色 + shake + glitch |

### 修饰符 (叠加)

- **flash** — 瞬闪（200ms 内亮→灭），用于握手成功/WB 写回等事件
- **shake** — 小幅抖动，与 ERROR 组合
- **glitch** — 水平像素错位，与 ERROR 组合
- **propagate** — 脉冲沿路径传播（stroke-dashoffset 动画）

### 元规则（来自你之前的建议，已采纳）

1. **Single focal point**: 当出现 ERROR 时，所有 ACTIVE 区域自动降为 IDLE，仅 ERROR 区域高亮。观众视线不会分散。
2. **脉冲传播**: 时钟上升沿触发 stroke-dashoffset 沿连线传播，表示信号正在路径上传递。传播速度约每 200ms 一条路径。
3. **颜色共生**: 同一帧中，波形信号的颜色 = 电路路径的颜色。观众看到波形变蓝时，电路对应路径也是蓝的。
4. **标注始终可见**: 节点中文标签（如"取指""译码""写回"）始终显示，IDLE 时 opacity 0.25，激活时平滑过渡到 1.0 + 状态色。
5. **METASTABLE = ERROR + glitch + feTurbulence**: 亚稳态用紫红闪烁（`#c084fc` + 抖动 + 毛刺滤镜），区别于普通 ERROR。

### 渲染层序（从底到顶）

1. 背景 → 2. 空闲路径（IDLE）→ 3. 语义色路径（ACTIVE/HOLD）→ 4. 脉冲传播 → 5. 修饰叠加（shake/glitch/flash）→ 6. 标注

### 集成方式

```typescript
// 纯函数，每帧调用
function computeLinkedFrame(input: {
  cycle: number;
  phase: "rise" | "hold" | "fall" | "setup";
  authoring: CircuitWaveformLinkerAuthoring;
}): LinkedFrameState;
```

React hook:
```typescript
const { tokens, pulses } = useCircuitWaveformLinker(timingFrame, spec);
```

不修改已有 TimingDiagram 核心代码，通过 spec 数据联动。

## 请你评审

1. **状态数量**: 4 种 base state + 2 种主要 modifier（shake/glitch）→ METASTABLE 特殊处理。这个分类在一个 30-60 秒的视频里，观众能清晰区分 IDLE/ACTIVE/HOLD/ERROR 吗？

2. **METASTABLE 表现**: 用 ERROR + glitch + feTurbulence + shake 来表现亚稳态，会不会和普通 ERROR 混淆？还是说观众应该一眼看出"这是亚稳态不是普通错误"？是否需要增加一个专门的 METASTABLE base state？

3. **动画密度**: 如果同一 cycle 有 3 条路径同时 propagate + 一个 zone ACTIVE + 一个 zone HOLD，观众会不会觉得太乱？需要限制同时活跃的元素数量吗？

4. **传播动画**: stroke-dashoffset 脉冲信号传播，在深色背景上速度多快合适？你建议脉冲光点（dot）还是扫光（dash 渐变）？

5. **与波形联动**: cursor 竖线对应 cycle 位置，电路图同步高亮。你觉得在电路图上应该加一个和波形 cursor 同步的指示器吗（比如底部时间轴高亮条）？还是仅靠区域的 ACTIVE/HOLD 状态就足够？

6. **参考你对暗色教育动画的经验**，这个方案有没有什么根本性问题或遗漏？

回答格式：按问题编号。最终给出 GO / MINOR / MAJOR 评级。

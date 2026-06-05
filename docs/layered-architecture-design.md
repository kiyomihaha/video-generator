# LayeredArchitecture — 层级堆叠图动效原语

## 设计提案

LayeredArchitecture 是 Month 2 的动画原语，服务 Type 3 内容（AI/科技概念科普），也可用于 Type 2（职业/方法论）中的层次对比。

### 使用场景

1. **协议栈**：OSI 7 层、TCP/IP 协议栈、网络分层
2. **AI 分层架构**：应用层 → Agent 层 → 模型层 → 框架层 → 基础设施
3. **系统分层**：用户态 → 内核 → 硬件
4. **组织架构**：管理层 → 执行层 → 运维层（Type 2 内容）

### 核心机制

多层堆叠结构，每层依次进入、可高亮/调暗、支持层间数据流动画和标注。

## 类型系统

遵循 Spec → Schedule → State 三层管线：

### Spec（作者 JSON 输入）

```typescript
interface LayeredArchitectureSpec {
  layers: LayerDef[];
  timeline: TimelineEvent[];
  beats: number[];
  buildDirection?: "up" | "down";
  layerHeight?: number;
  layerWidth?: number;
  layerGap?: number;
  width?: number;
  height?: number;
}

interface LayerDef {
  id: string;
  label: string;
  description?: string;
  color?: string;              // hex，不指定时从调色板循环取
  labelAnchor?: "left" | "center";
}

interface TimelineEvent {
  beat: number;                 // beats[] 的 index
  type: "enter" | "highlight" | "dim-others" | "data-flow" | "callout" | "restore";
  layerId: string;
  targetLayerId?: string;      // data-flow 用
  direction?: "up" | "down";   // data-flow 方向
  label?: string;              // callout 标注文字
}
```

### Schedule（帧解析后）

```typescript
interface LASchedule {
  layers: LAScheduledLayer[];
  totalFrames: number;
  fps: number;
}

interface LAScheduledLayer {
  id: string;
  label: string;
  description?: string;
  color: string;
  anchor: "left" | "center";
  enterFrame: number;
  enterDuration: number;
  highlightFrames: number[];
  dataFlows: DataFlowEvent[];
  callouts: CalloutEvent[];
}
```

### State（每帧值）

```typescript
interface LAState {
  layers: LALayerState[];
  dataFlows: LADataFlowRender[];
  callouts: LACalloutRender[];
}

interface LALayerState {
  id: string;
  opacity: number;
  y: number;
  brightness: number;     // 0-1, dim/restore
  borderGlow: number;     // 0-1, highlight
  entered: boolean;
}

interface LADataFlowRender {
  fromLayerId: string;
  toLayerId: string;
  progress: number;
  direction: "up" | "down";
}
```

## 动画参数

| 事件 | 行为 | 时长 | 缓动 |
|------|------|------|------|
| enter | slide-up(40px) + fade-in | 350ms | easeOutQuart |
| highlight | border glow + brightness 1.0 | 持续 | easeOutCubic |
| dim-others | 其余层 opacity→0.3 | 250ms | easeOutCubic |
| data-flow | 右侧箭头脉冲 | 300ms | easeOutCubic |
| callout | 左侧标注 fade-in | 200ms | easeOutCubic |
| restore | 全回到 1.0，取消高亮 | 200ms | easeOutCubic |

## 视觉布局（SVG, 1280×720）

```
                  600px
    ┌──────────────────────────────┐
    │      Application Layer       │   #38bdf8
    │   "用户应用与界面"             │
    └──────────────────────────────┘
    ┌──────────────────────────────┐
    │       Agent Layer            │   #10b981
    │   "智能代理调度"              │  ↑ data flow
    └──────────────────────────────┘
    ┌──────────────────────────────┐
    │       Model Layer            │   #8b5cf6
    │   "大语言模型推理"             │
    └──────────────────────────────┘
    ┌──────────────────────────────┐
    │    Framework Layer           │   #f59e0b
    │   "LangChain/工具链"          │
    └──────────────────────────────┘
    ┌──────────────────────────────┐
    │  Infrastructure Layer        │   #ef4444
    │   "GPU/CPU/网络"              │
    └──────────────────────────────┘
```

- 层居中，x=340, w=600
- 单层 h=80, gap=12
- 5 层总高 = 80×5 + 12×4 = 448px, 起始 y≈136
- 数据流箭头在右侧 x=960
- Callout 标注在左侧 x=40~300
- 最多 8 层

## 主题色

```typescript
layers: {
  layer1: "#38bdf8",  // sky
  layer2: "#10b981",  // emerald
  layer3: "#f59e0b",  // amber
  layer4: "#8b5cf6",  // violet
  layer5: "#ef4444",  // red
  layer6: "#ec4899",  // pink
  layer7: "#06b6d4",  // cyan
  layer8: "#84cc16",  // lime
}
```

## 文件结构

```
src/motion/layered-architecture/
  types.ts            — Spec/Schedule/State
  schemas.ts          — Zod
  laSchedule.ts       — pure function
  laState.ts          — pure function
src/scenes/LayeredArchitectureScene.tsx
src/layered-architecture-demo/index.tsx
public/specs/layered-architecture-demo.json
src/theme.ts          — +layers palette
src/scenes/registry.ts— register
```

## 未定问题

1. **beats vs 步骤索引** — 应和 TextEmphasis 保持一致用 beats[]，还是简化为步骤顺序自动均分？
2. **dim-others 的恢复机制** — dim 后如何恢复？自动在下一事件恢复？还是需要显式 "restore" 事件？
3. **data-flow 的方向** — 箭头从 fromLayerId → toLayerId，需要两层相邻吗？不相邻时该如何表现？
4. **多个 highlight** — 有没有需要同时高亮多层的场景？
5. **进入顺序** — buildDirection="up" 从下往上还是从上往下更直觉？

# Video Generator

基于 Remotion 的 CS 架构教学视频生成引擎。用 JSON 驱动 SVG 动画，生成计算机体系结构相关的可视化视频。

## 技术栈

- Remotion 4.x + React 19 + TypeScript
- Zod 运行时校验
- SVG 动画（无外部依赖）

## 快速开始

```bash
npm install
npm start          # 启动 Remotion Studio 预览
```

## 可用组合

| ID | 说明 | 尺寸 | 帧率 |
|----|------|------|------|
| `Hello` | 入门示例 | 1080×1920 | 30 |
| `TitleOpen` | 标题开场动画 | 1080×1920 | 30 |
| `NarrationVideo` | 旁白视频 | 1080×1920 | 30 |
| `ClockToQ` | 时钟到 Q 端延迟 | 1080×600 | 30 |
| `FanoutDemo` | 扇出延迟演示 | 1080×720 | 30 |
| `LatchDemo` | D 锁存器：透明与保持 | 1280×720 | 30 |
| `GlitchDemo` | 毛刺信号演示 | 1280×720 | 60 |
| `MetastabilityDemo` | 亚稳态：建立/保持违规 | 1280×720 | 60 |
| `PipelineDemo` | 流水线冒险与转发 | 1280×720 | 60 |
| `CacheDemo` | 4 路组相联缓存 | 1280×720 | 60 |

## 渲染命令

```bash
# 预览
npm start

# 渲染视频
npm run render --video=CacheDemo

# 渲染静态帧
npm run still --video=ClockToQ
```

## 项目结构

```
src/
  scenes/
    registry.ts           # 场景注册表（所有组合的单一数据源）
    CacheScene.tsx         # 缓存可视化场景
    DigitalTimingScene.tsx # 数字时序场景
    PipelineScene.tsx      # 流水线场景
  motion/
    primitives/            # 基础时序动画（传播、毛刺、锁存器、亚稳态）
    pipeline/              # 流水线动画
    cache/                 # 缓存动画（调度、状态、类型、Schema）
    utils.ts               # 共享工具函数
  components/
    cache/                 # 缓存子组件（CacheCell、BitField）
  theme.ts                 # 全局主题色板
  Root.tsx                 # Remotion 根组件
public/
  specs/                   # JSON 场景规格文件
```

## 架构设计

### 场景注册表

所有组合通过 `src/scenes/registry.ts` 统一注册，每个条目包含：

- `component` — React 组件
- `spec` — 经 Zod 校验的 JSON 规格
- `calculateMetadata` — 从 spec 计算帧数
- `fps` / `width` / `height` — 输出参数

`Root.tsx` 遍历注册表自动生成 `<Composition>`，新增场景只需：

1. 创建 `src/<scene>/index.tsx`
2. 在 `registry.ts` 中注册
3. 添加 `public/specs/<scene>.json`

### JSON 规格驱动

每个场景的行为由 JSON 文件定义，运行时通过 Zod schema 校验：

- `digitalTimingSpecSchema` — 时序信号、传播、锁存器、毛刺、亚稳态
- `pipelineSpecSchema` — 流水线阶段、指令、冒险（stall/forward/flush）
- `cacheSpecSchema` — 缓存参数、访问序列、替换策略

### 设计原则

- **动效必须有教学理由** — 展示结构/流程/结果/状态转换
- **色彩一致性** — 颜色从 `src/theme.ts` 取，不硬编码
- **Spring 用 Remotion 原生** — `import { spring } from "remotion"`
- **SVG 层序** — 背景 → 网格 → 数据单元 → 连线 → 信号叠加层 → 标注

## 添加新场景

1. 创建组件 `src/my-scene/index.tsx`，接收 `{ spec: MySpec }` props
2. 定义 Zod schema（如需要）
3. 创建 `public/specs/my-scene.json`
4. 在 `src/scenes/registry.ts` 中注册：

```typescript
import { MyScene } from "../my-scene/index";
import mySpec from "../../public/specs/my-scene.json";
import { mySpecSchema } from "../my-scene/schemas";

// 在 sceneRegistry 中添加：
MyScene: {
  component: MyScene,
  spec: mySpecSchema.parse(mySpec),
  calculateMetadata: calcMyScene,
  fps: 60,
  width: 1280,
  height: 720,
},
```

5. `npm start` 预览

# Phase 2 规划: Motion Primitives 扩展

## 目标
在 Phase 1 的 propagateSignal 基础上，扩展 4 个新的运动原语，覆盖更丰富的数字电路时序场景。

## 新增原语

| 原语 | 触发场景 | 动画效果 | 视觉颜色 |
|------|---------|---------|---------|
| latch | 电平敏感锁存 | 波形保持 + 轨道背景淡亮 | 紫罗兰 (#a78bfa) |
| fanout | 单信号→多输出 | Y型分叉箭头 + 分支延时 | 青绿 (#2dd4bf) |
| glitch | 输出不稳定过渡 | 高频抖动 + 斜线填充 + 红色警示 | 红 (#ef4444) |
| metastability | 亚稳态 | 双态闪烁 + Jitter + 最后稳定 | 橙 (#f97316) |

## Spec 扩展

```typescript
type PrimitiveType = "propagate" | "latch" | "fanout" | "glitch" | "metastability";

interface PrimitiveConfig {
  type: PrimitiveType;
  // propagate: 已有的 from/to/delay/duration
  // latch: { enableAt, dataSource, holdDuration }
  // fanout: { from, to: [{pinId, delay, duration}], branchPoints }
  // glitch: { signal, startAt, endAt, amplitude, freq }
  // metastability: { signal, onsetAt, resolveAt, settledState }
}
```

## 文件结构

```
src/motion/primitives/
├── types.ts              # 扩展原语类型
├── propagateSignal.ts    # 已有
├── latchSignal.ts        # 新建
├── fanoutSignal.ts       # 新建
├── glitchSignal.ts       # 新建
└── metastabilitySignal.ts# 新建
```

## 验证
1. 每个原语可独立渲染为 6 秒 demo
2. 全部原语可组合到一个 spec 中
3. 保持数据驱动（JSON → 渲染）

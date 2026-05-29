# Remotion 视频生成

基于 Remotion 的通用视频生成项目，每个组合（Composition）对应一个独立视频。

## 技术栈
- Remotion 4.x + React 19
- TypeScript

## 项目级 Skills

| Skill | 说明 |
|--------|------|
| `remotion` | Remotion 最佳实践，含 35 个专项规则（动画、音频、字幕、3D、ffmpeg 等） |

安装/更新: 直接从 remotion-dev/skills 仓库拉取到 `.claude/skills/remotion/`

## 常用命令
- `npm start` — 启动 Remotion Studio 预览
- `npm run render --video=组合ID` — 渲染指定组合为 mp4
- `npm run still --video=组合ID` — 渲染指定组合第30帧为静态图

## 添加新视频
1. 创建 `src/<video-name>/index.tsx`，export 视频组件
2. 在 `src/Root.tsx` 中 import 并注册 `<Composition>`
3. `npm start` 预览，`npm run render --video=<video-name>` 渲染

## 约定
- 每个视频对应 `src/` 下一个独立组件
- 组合在 `src/Root.tsx` 中注册
- 静态资源放在 `public/`

## 设计原则
- **动效必须有教学理由** — 每个动画必须服务于：层次（展示结构）、叙事（展示流程）、反馈（展示结果）、状态转换（展示变化）。无信息量的装饰动画不要加。
- **色彩一致性** — 所有颜色从 `src/theme.ts` 的 `THEME` 对象取，不在组件内硬编码色值。场景用 `const S = THEME.canvas` 等别名。
- **Spring 用 Remotion 原生** — 需要弹跳/过冲效果时用 `import { spring } from "remotion"`，不手写 spring 函数。
- **SVG 层序** — 渲染顺序从底到顶：背景 → 网格 → 数据单元 → 连线 → 信号叠加层 → 标注。

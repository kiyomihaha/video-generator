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

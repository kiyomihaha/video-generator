# Remotion 视频生成

基于 Remotion 的通用教学视频项目，每个 Composition 对应一个独立视频。

## 技术栈

- Remotion 4.x + React 19
- TypeScript

## 项目级 Skills

| Skill | 用途 |
|---|---|
| `remotion` | Remotion 动画、音频、字幕、FFmpeg 等最佳实践 |
| `video-release` | 1080p 导出、4:3 封面、BGM 混音和交付质检 |

## 常用命令

- `npm start`：启动 Remotion Studio
- `npm run render -- --video <CompositionID>`：基础渲染
- `npm run still -- --video <CompositionID> --frame 30`：静态帧
- `npm run release:render -- -Composition <CompositionID>`：原生 1080p 渲染
- `npm run release:qa -- -Video <file>`：交付质检

## 约定

- Composition 在 `src/scenes/registry.ts` 集中注册。
- 静态资源放在 `public/`。
- 生成视频、封面和审查截图不进入 Git。
- 发布流程必须遵循 `.agents/skills/video-release/SKILL.md`。

## 设计原则

- 动效必须服务于结构、叙事、反馈或状态转换。
- 所有颜色从 `src/theme.ts` 的 `THEME` 获取。
- Spring 使用 Remotion 原生 `spring()`。
- SVG 层序：背景 → 网格 → 数据单元 → 连线 → 信号叠加层 → 标注。
- 不通过删除旁白字幕解决布局问题。
- BGM 必须有明确授权，并通过侧链确保旁白优先。

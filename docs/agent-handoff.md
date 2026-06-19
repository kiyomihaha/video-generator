# Agent Handoff

这是所有编码 Agent 的统一交接入口。聊天记录不是项目状态的权威来源。

## 使用规则

任何 Agent 开始任务前必须：

1. 阅读根目录 `AGENTS.md`。
2. 阅读本文件。
3. 运行 `git status -sb` 和 `git log -5 --oneline`。
4. 区分已有用户改动与本次任务改动，不覆盖不相关内容。

任何 Agent 完成会改变仓库的任务后必须更新本文件：

- 更新“当前基线”。
- 在“变更记录”顶部追加一条记录。
- 写明改动文件、行为变化、验证命令、遗留问题。
- 不记录聊天过程，只记录下一位 Agent 执行任务所需的事实。

## 当前基线

- 默认分支：`master`
- 最近稳定提交：以 `git log -1 --oneline` 为准；本文件必须与当前分支同步更新
- 主要成片：`ChipIOVideo`
- 源码画布：1280×720，60 fps
- 发布渲染：1920×1080，60 fps，Remotion 原生 `--scale=1.5`
- 小红书横向封面：4:3，1600×1200
- Composition 注册入口：`src/scenes/registry.ts`
- ChipIOVideo 配置：`public/specs/chip-io-video.json`
- ChipIOVideo 旁白：`public/audio/chip-io-video/`
- 发布流程：`.agents/skills/video-release/SKILL.md`
- 生成文件目录：`out/`，不进入 Git

## 稳定约束

- 不通过删除字幕解决布局冲突。
- 字幕时间、视觉状态和旁白必须同步。
- 1080p 必须从 Remotion 源码重新渲染，不能放大 720p MP4。
- BGM 必须有明确授权，并通过侧链确保旁白优先。
- 发布前必须运行 TypeScript 检查和媒体 QA。
- 不提交本地安装包、模型、桌面应用、审查截图或 Agent 运行状态。

## 变更记录

### 2026-06-19 — 统一 Agent 交接标准

提交：本条记录所在提交

改动：

- 新增 `docs/agent-handoff.md` 作为跨 Agent 的统一项目状态入口。
- `AGENTS.md` 和 `.claude/CLAUDE.md` 强制要求任务前读取、任务后更新。
- `README.md` 增加 Agent 交接说明。

验证：

- `npm run typecheck`
- `git diff --check`

遗留：

- 后续每个改变仓库的任务都必须维护本文件。

### 2026-06-19 — 项目清理与发布流程标准化

提交：`2bb0915`

改动：

- 删除已跟踪的 `.omc` Agent 运行状态。
- 本地删除 MiMo 应用、安装包、审查缓存和大型工具目录。
- 新增 `.agents/skills/video-release/`。
- 新增 Windows 兼容的基础渲染和静态帧脚本。
- 新增 1080p 渲染、BGM 侧链混音和媒体 QA 脚本。
- 更新 `README.md`、`AGENTS.md`、`.claude/CLAUDE.md` 和 `.gitignore`。

验证：

- `npm run typecheck`
- Skill 官方 `quick_validate.py`
- `npm run still -- --video ChipIOVideo --frame 30`
- `npm run release:mix`
- `npm run release:qa`

遗留：

- `out/` 中最终媒体只保存在本地，不随 Git 同步。
- 若更换 BGM，需重新执行混音与 QA。

## 变更记录模板

复制到本节顶部：

```markdown
### YYYY-MM-DD — 简短任务名称

提交：`<commit 或 pending>`

改动：

- `<文件或模块>`：<行为变化>

验证：

- `<执行的命令或人工检查>`

遗留：

- `<未完成事项；无则写“无”>`
```

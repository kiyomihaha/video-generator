# Remotion 视频生成

项目约定以根目录 `AGENTS.md` 为准。

编码时使用 `.claude/skills/remotion/` 中的 Remotion 最佳实践。完成编码后，使用 `.agents/skills/video-release/` 执行：

1. TypeScript 检查
2. 原生 1080p 渲染
3. 4:3 封面导出
4. BGM 侧链混音
5. 媒体质检

不要提交 `out/`、本地安装包、模型、审查截图或代理运行状态。

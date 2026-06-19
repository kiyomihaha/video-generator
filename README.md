# Video Generator

基于 Remotion 4、React 19 和 TypeScript 的计算机体系结构教学视频项目。每个 Composition 对应一个独立视频，场景数据集中注册在 `src/scenes/registry.ts`。

## 当前成片：ChipIOVideo

主题：芯片内部的 0/1 信号为什么不能直接连接引脚。

- 9 段旁白与逐句字幕
- I/O 电平适配、输入缓冲、输出驱动、三态总线和 ESD 保护
- 60 fps，基础画布 1280×720
- 发布版使用 Remotion 原生重绘为 1920×1080
- 当前源码版本：`f1f8d5e`

音频位于 `public/audio/chip-io-video/`，配置位于 `public/specs/chip-io-video.json`。

## 环境与预览

需要 Node.js、npm、FFmpeg / FFprobe。

```powershell
npm install
npm start
```

## 常用命令

以下命令兼容 Windows PowerShell：

```powershell
# 基础渲染
npm run render -- --video ChipIOVideo

# 静态帧
npm run still -- --video ChipIOVideo --frame 30

# TypeScript 检查
npm run typecheck

# Remotion 原生 1080p 渲染
npm run release:render -- -Composition ChipIOVideo

# BGM 侧链混音
npm run release:mix -- `
  -Video out/ChipIOVideo-1080p.mp4 `
  -Bgm path/to/bgm.mp3 `
  -Output out/ChipIOVideo-1080p-bgm.mp4

# 最终媒体质检
npm run release:qa -- -Video out/ChipIOVideo-1080p-bgm.mp4
```

基础渲染默认输出到 `out/`。1080p 流程通过 Remotion `--scale=1.5` 原生重绘，不对 720p 成片进行插值放大。

## 发布规范

项目级 Skill：`.agents/skills/video-release/`

它定义了统一流程：

1. TypeScript 编译检查
2. Remotion 原生 1080p 渲染
3. 4:3 封面生成与 1600×1200 导出
4. BGM 频段处理、旁白侧链和首尾淡入淡出
5. 分辨率、帧数、响度、静音和黑帧质检
6. 仅保留最终交付物

## 项目结构

```text
src/
  chip-io-video/        ChipIOVideo 场景与基础组件
  scenes/registry.ts    Composition 注册与字幕时间轴
  shell/                标题、字幕和通用视频外壳
  motion/               动画状态与时间调度
  theme.ts              全局主题
public/
  audio/                旁白音频
  specs/                JSON 场景配置
.agents/skills/
  video-release/        导出、封面、混音和质检规则
```

## 添加新视频

1. 在 `src/<video-name>/index.tsx` 创建视频组件。
2. 在 `src/scenes/registry.ts` 注册 Composition。
3. 将静态资源放到 `public/`。
4. 在 Studio 中检查关键帧、字幕和场景边界。
5. 使用 `video-release` Skill 完成交付。

## 设计原则

- 动效必须服务于结构、叙事、反馈或状态转换。
- 颜色统一从 `src/theme.ts` 的 `THEME` 获取。
- 弹跳和过冲使用 Remotion 原生 `spring()`。
- SVG 层序：背景 → 网格 → 数据单元 → 连线 → 信号叠加层 → 标注。
- 字幕必须与旁白语义和画面状态一致，不通过删除字幕解决遮挡。
- BGM 必须有明确授权，并始终让旁白优先。

## Git 与生成文件

`out/`、审查截图、代理运行状态、本地模型、安装包和桌面应用均不进入 Git。GitHub 只保存源码、必要音频、配置和可复用发布流程。

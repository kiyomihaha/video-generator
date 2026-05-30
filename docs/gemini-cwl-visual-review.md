# CircuitWaveformLinker — 前端视觉审核

## 项目背景

Remotion 4.x + React 19 + TypeScript 架构教育动画引擎，生成 CPU 架构教学视频（缓存、流水线、亚稳态等）。

此次审核的是 **CircuitWaveformLinker**（电路波形联动器）—— 一个 cycle 驱动的 SVG 动画引擎，将时钟周期映射为 zone 的语义视觉状态。

## 技术架构

- **5 种基础状态**：IDLE（#1e293b, 残影强度 0.2）、ACTIVE（#38bdf8）、HOLD（#10b981）、ERROR（#ef4444）、METASTABLE（#c084fc, 紫色）
- **3 种修饰器**：flash（基于 frame 的正弦波 opacity 脉冲）、shake（Park-Miller LCG 确定性位移）、glitch（feTurbulence + feDisplacementMap 像素偏移）
- **脉冲传播**：12 帧（~200ms）彗星尾迹效果，SVG stroke-dasharray + stroke-dashoffset 实现，pathLength=200 归一化
- **衰减向量**：状态切换时 8 帧（~133ms）easeOutCubic 渐变过渡
- **单焦点规则**：ERROR 或 METASTABLE 出现时，所有 ACTIVE/HOLD zone 被自动调暗至 IDLE 视觉级别
- **级联顺序**：串行脉冲发射（组 N 等待组 N-1 完成后才发射）
- **总线组**：同一总线的多个 link 只发射一个脉冲（保留实际活跃 linkId 以保证路径正确）

## 场景说明：五级流水线（Cycle 1-7）

7 个 cycle，每个 30 帧，共 240 帧。5 个 zone 代表流水线阶段：取指 → 译码 → 执行 → 访存 → 写回。

## 关键帧说明

共 7 张截图，标号为 `cwl-frame-NNN.png`：

| 文件名 | 帧号 | Cycle | 展示内容 |
|--------|------|-------|---------|
| cwl-frame-005.png | 5 | 1 | 取指 ACTIVE + l0 脉冲传播中 |
| cwl-frame-035.png | 35 | 2 | 译码 ACTIVE + l1 脉冲，取指回到 IDLE（残影过渡可见） |
| cwl-frame-065.png | 65 | 3 | 执行 ACTIVE + l2 脉冲 |
| cwl-frame-095.png | 95 | 4 | 访存 ACTIVE + l3 脉冲（级联末端） |
| cwl-frame-125.png | 125 | 5 | 写回 ACTIVE + flash 修饰器闪烁 |
| cwl-frame-155.png | 155 | 6 | 执行 METASTABLE + glitch + shake，焦点锁定（其余 zone 全部调暗） |
| cwl-frame-185.png | 185 | 7 | 全部 IDLE，残影完全衰减后的静默状态 |

## 审核重点

### 1. 5 种状态的可辨识度
- IDLE 的半透明暗色（#1e293b, opacity 0.2）是否足够区分于纯背景？
- ACTIVE（亮蓝 #38bdf8）和 HOLD（亮绿 #10b981）在视觉上是否易于区分？
- METASTABLE（紫色 #c084fc）是否能在 ACTIVE zone 中突出？

### 2. 状态切换动画
- Cycle 1→2 时取指从 ACTIVE→IDLE 的 8 帧 easeOutCubic 衰减是否平滑？
- 残影（residual）的过渡效果是否自然？（不在 IDLE 和 ACTIVE 之间硬切）

### 3. 修饰器效果
- **flash**（cwl-frame-125, cycle 5 写回）：frame 驱动的正弦波 opacity 脉冲（0.3 振幅）是否可见且不刺眼？
- **shake**（cwl-frame-155, cycle 6 执行）：确定性位移（seed=hash(zoneId) + frame×7919）幅度是否合适？
- **glitch**（cwl-frame-155, cycle 6 执行）：feTurbulence 像素错位效果是否足够明显？

### 4. 脉冲传播
- 彗星尾迹（stroke-dasharray + offset）在 1280×720 下是否清晰可见？
- 级联延迟（每个组间隔 12 帧）是否产生从左到右的流水感？

### 5. 单焦点规则
- cwl-frame-155 中执行 zone 显示 METASTABLE 时，其余 zone（取指/译码/访存/写回）是否都被正确调暗？
- 焦点 zone 的 2.5px stroke 是否足够突出？

### 6. 文字与布局
- 标题"五级流水线"是否居中正确？
- CYCLE:01-07 徽章在右上角位置是否合适？
- zone 标签（取指/译码/执行/访存/写回）在矩形内居中效果如何？

### 7. 整体视觉风格
- 深色背景 + 网格线的科技感是否符合硬件教学视频调性？
- 是否有任何视觉噪声或信息量不足的装饰元素？

### 8. 已知约束
- glitch 效果使用静态 feTurbulence（非 frame 驱动），如需动态化需评估性能
- 所有动画完全由 frame 号确定性驱动，无 SVG `<animate>`、无 CSS 动画、无 Math.random()
- 1024×768 以上分辨率可正常观看

## 评分标准

请给出整体评分：
- **PASS** — 可直接用于生产视频
- **MINOR** — 有小问题需调整
- **MAJOR** — 有显著问题需修改后重新审核
- **BLOCKED** — 有严重问题需架构调整

同时标注每个审核重点的评分（OK / MINOR / MAJOR）。

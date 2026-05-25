# Autopilot Plan

## Step 1: 修复 Windows Python 崩溃
修改 `infer.py`: 
- 注释掉 `self.gpt.post_init_gpt2_config(...)` 
- 改为手动 `self.inference_model = ...eval()` 设置
- 或用 try/except 包裹

## Step 2: GPU 推理测试
- 运行 IndexTTS-1.5, device 不指定(自动 CUDA)
- use_fp16=True 减少显存
- 测试 inference

## Step 3: 失败则 Codex 诊断
- 若 crash 仍在, 复制错误给 Codex 分析

## Step 4: 成功则封装
- 创建 `tools/tts.py` 脚本模块
- 封装文本→WAV 的 CLI 接口

## Step 5: Remotion 集成
- 创建 NarrationVideo 组合播放 TTS 音频

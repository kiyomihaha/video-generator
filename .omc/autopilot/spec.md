# Autopilot Spec: IndexTTS-1.5 GPU 推理 + Remotion 集成

## 目标
用 Windows Anaconda DL 环境（CUDA PyTorch 2.5）跑 IndexTTS-1.5 GPU 推理，封装为 TTS 模块，接入 Remotion。

## 当前状态
- DL 环境: D:\Anaconda\envs\DL\, PyTorch 2.5.1+cu121, 8GB GPU
- 模型: tools/index-tts/checkpoints_v15/ (完整)
- 崩溃点: post_init_gpt2_config 在 Windows Python 上 exit code 5
- 绕过方案: 直接跳过 post_init_gpt2_config, 手动设置 eval 模式
- Edge-TTS: 已通, 作为备选

## 计划
1. 修补 infer.py 绕过 post_init_gpt2_config 崩溃
2. GPU 推理测试
3. 失败则问 Codex
4. 成功则封装 + 接 Remotion

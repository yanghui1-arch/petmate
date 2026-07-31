# 本地 AI 首版

聊天页现在可以按需启动完全本地的聊天与语音链路：

- LLM：Qwen3.5-2B Q4_K_M GGUF（Unsloth 量化），由 llama.cpp 的本地 OpenAI
  兼容服务托管。
- TTS：Qwen3-TTS-12Hz-0.6B-Base，由隔离的 Python `qwen-tts` 进程托管。
- 开关关闭时两个进程均不运行，模型不会驻留在显存或内存中。
- NVIDIA 显卡选择 CUDA；AMD/Intel 显卡选择 Vulkan；无法使用 GPU 时回退 CPU。

## 首次安装

Windows PowerShell 中在项目根目录执行：

```powershell
npm run setup:local-ai
```

脚本会自动下载 llama.cpp、两个模型、可随应用搬迁的独立 Python 运行时、Qwen3-TTS
依赖和官方演示参考音频。预计需要约 10 GB 可用空间。模型与运行时保存在
`resources/local-ai`，不会提交到 Git，但会由 Electron 打包配置一并放入应用资源目录；
目标电脑不需要另装 Python。首版便携运行时与 llama.cpp 构建面向 Windows x64。

也可以手动指定 LLM 后端：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-local-ai.ps1 -Backend Cuda
powershell -ExecutionPolicy Bypass -File scripts/setup-local-ai.ps1 -Backend Vulkan
powershell -ExecutionPolicy Bypass -File scripts/setup-local-ai.ps1 -Backend Cpu
```

## 首版限制

Qwen3-TTS Base 是声音克隆模型，必须提供参考音频和准确文本。首版使用 Qwen 官方
`clone.wav` 作为默认参考，以便离线跑通。替换
`resources/local-ai/voices/default.wav` 和 `default.txt` 即可更换角色音色，两者内容必须
严格对应。

Windows 上的 Qwen3-TTS 目前使用 PyTorch CUDA 或 CPU；AMD 显卡可通过 Vulkan 加速
llama.cpp，但 TTS 会走 CPU。Linux ROCm 环境中，PyTorch 可通过其 CUDA 兼容 API 使用
AMD GPU。

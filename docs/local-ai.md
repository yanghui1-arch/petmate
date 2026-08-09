# 本地 AI

聊天页可以下载并按需启动完全本地的聊天与语音链路：

- LLM：Qwen3.5-2B Q4_K_M GGUF（Unsloth 量化），由 llama.cpp 的本地 OpenAI
  兼容服务托管。
- TTS：Qwen3-TTS-12Hz-0.6B-Base，由独立的 Python `qwen-tts` 进程托管。
- 开关关闭时本地进程均不运行，模型不会驻留在显存或内存中。
- NVIDIA 显卡优先选择 CUDA；AMD/Intel 显卡选择 Vulkan；LLM 无 GPU 时回退 CPU。
- TTS 只在便携 PyTorch 实际检测到 CUDA 或 ROCm 时启动；没有可用加速设备时
  只加载 LLM，聊天界面显示“仅文字”，不会把 Qwen3-TTS 加载到 CPU。
- Windows 发布运行时固定携带 CUDA 版 PyTorch，因此即使发布包是在 AMD/CPU 机器上
  构建，NVIDIA 用户仍能通过运行时探测启用 TTS；无 CUDA 的机器只做探测，不加载模型。

## 运行时与模型分离

开发或制作安装包前，在 Windows PowerShell 中执行：

```powershell
npm run setup:local-ai
```

该脚本只准备 llama.cpp、便携 Python、Qwen3-TTS 依赖和默认参考音频。它们保存在
`resources/local-ai` 并随 Windows x64 应用打包，目标电脑不需要另装 Python。

LLM 与 TTS 权重不会进入安装包。用户第一次进入聊天页时点击“下载本地模型”，应用会从
ModelScope 下载约 3.8 GB 文件，并执行大小与 SHA-256 校验。下载目录为 Electron
`userData/local-ai/models`，通常位于：

```text
%APPDATA%\Petmate\local-ai\models
```

聊天页会显示总进度、已下载/总大小和当前文件。下载支持取消和 `.incomplete`
断点续传。最终打包规则明确排除了
`resources/local-ai/models`，即使开发机上留有测试模型，也不会被复制到安装目录。

可以手动指定当前开发机需要准备的 llama.cpp 后端：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-local-ai.ps1 -Backend All
powershell -ExecutionPolicy Bypass -File scripts/setup-local-ai.ps1 -Backend Cuda
powershell -ExecutionPolicy Bypass -File scripts/setup-local-ai.ps1 -Backend Vulkan
powershell -ExecutionPolicy Bypass -File scripts/setup-local-ai.ps1 -Backend Cpu
```

`npm run build:win` 会自动以 `All` 模式准备 CPU、Vulkan、CUDA 三套 llama.cpp
运行时和 CUDA 版 TTS 环境，发布包不依赖打包机器所用的显卡类型。

## 文本流与分段 TTS

llama.cpp 的聊天接口按 token 流式返回文本，渲染进程即时更新消息。官方
`qwen-tts` 0.1.1 的 `generate_voice_clone` 暂时仍在一次调用结束后返回完整波形；
`non_streaming_mode=false` 只模拟流式文本输入，并不返回真正的音频包。

因此当前实现不是模型原生的音频帧流式 TTS，而是应用层语义分段：主进程在 LLM 流中
遇到句号、问号、感叹号、分号或
长度阈值时，立即把完整片段加入 TTS 队列；每个 WAV 片段生成后立刻发给渲染进程并按
顺序播放。因此首段语音不需要等待整段回答完成，同时避免接入未经官方支持的模型内部
流式补丁。

## 音色与显卡限制

Qwen3-TTS Base 是声音克隆模型，必须提供参考音频和准确文本。默认使用 Qwen 官方
`clone.wav`。替换 `resources/local-ai/voices/default.wav` 和 `default.txt` 即可更换
角色音色，两者内容必须严格对应。

Windows 上的 AMD 显卡仍可通过 Vulkan 加速 llama.cpp，但当前便携 PyTorch 不提供
Windows AMD TTS 加速，因此 TTS 不会启动。NVIDIA CUDA 或 Linux ROCm 只有在 `torch`
的运行时探测确认为可用后才会加载 TTS。

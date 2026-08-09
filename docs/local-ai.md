# Petmate 本地 AI

聊天页使用 Qwen3.5-2B Q4_K_M GGUF，由 llama.cpp 的本地 OpenAI 兼容服务托管。
当前版本只提供文本聊天，不包含、下载或启动 TTS。

- 聊天页开关关闭时 llama.cpp 不运行，模型不会驻留在显存或内存中。
- NVIDIA 显卡优先选择 CUDA；AMD/Intel 显卡选择 Vulkan；没有可用 GPU 时回退 CPU。
- 大模型回答按 token 流式返回，渲染进程即时更新消息。

## 运行时与模型分离

首次打包前准备 llama.cpp：

```powershell
npm run setup:local-ai
```

Windows 发布使用 `All` 模式准备 CPU、Vulkan、CUDA 三套 llama.cpp 后端：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-local-ai.ps1 -Backend All
```

`npm run build:win` 会自动执行上述准备步骤。打包规则只包含各后端运行所需的
`llama-server.exe` 和 DLL，不包含 Python、PyTorch、Qwen3-TTS 或其他 llama.cpp 工具。

LLM 权重不会进入安装包。用户第一次进入聊天页时点击“下载本地模型”，应用会从
ModelScope 下载 `Qwen3.5-2B-Q4_K_M.gguf`，大小约 1.28 GB，并执行文件大小和
SHA-256 校验。下载目录为 Electron `userData/local-ai/models`，通常位于：

```text
%APPDATA%\Petmate\local-ai\models
```

聊天页显示总进度、已下载/总大小和当前文件。下载支持取消和 `.incomplete` 断点续传。
即使开发机保留了测试模型，它们也不会被复制到安装目录。

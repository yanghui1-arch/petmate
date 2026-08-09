import { BrowserWindow, app } from 'electron'
import { ChildProcess, execFile, execFileSync, spawn } from 'child_process'
import { randomBytes } from 'crypto'
import { existsSync } from 'fs'
import { createServer } from 'net'
import { cpus } from 'os'
import { dirname, join, resolve } from 'path'
import OpenAI from 'openai'
import { ChatCompletionStream } from 'openai/resources/chat/completions'
import logger from './log'
import {
    LocalAIModelDownloader,
    type LocalAIModelDownloadStatus
} from './local-ai-download'
import type { ChatMessage } from './llm'

export type LocalAIPhase = 'off' | 'starting' | 'ready' | 'stopping' | 'error'
export type LocalAIComponentPhase = 'off' | 'starting' | 'ready' | 'error'
export type LocalAIBackend = 'cuda' | 'vulkan' | 'cpu'

export interface LocalAIComponentStatus {
    phase: LocalAIComponentPhase
    detail: string
}

export interface LocalAIStatus {
    enabled: boolean
    phase: LocalAIPhase
    backend: LocalAIBackend | null
    ttsBackend: string | null
    download: LocalAIModelDownloadStatus
    llm: LocalAIComponentStatus
    tts: LocalAIComponentStatus
    error?: string
}

const LLM_MODEL_NAME = 'Qwen3.5-2B-Q4_K_M.gguf'
const LLM_API_MODEL_NAME = 'qwen3.5-2b-local'
const TTS_MODEL_NAME = 'Qwen3-TTS-12Hz-0.6B-Base'
const STARTUP_TIMEOUT_MS = 10 * 60 * 1000

function initialStatus(): LocalAIStatus {
    return {
        enabled: false,
        phase: 'off',
        backend: null,
        ttsBackend: null,
        download: {
            phase: 'missing',
            downloadedBytes: 0,
            totalBytes: 0,
            progress: 0,
            currentFile: '',
            detail: '尚未下载本地模型'
        },
        llm: { phase: 'off', detail: '未加载' },
        tts: { phase: 'off', detail: '未加载' }
    }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

class LocalAIManager {
    private status: LocalAIStatus = initialStatus()
    private llamaProcess: ChildProcess | null = null
    private ttsProcess: ChildProcess | null = null
    private chatClient: OpenAI | null = null
    private llmPort: number | null = null
    private ttsPort: number | null = null
    private stopping = false
    private readonly apiKey = randomBytes(24).toString('hex')
    private modelDownloader: LocalAIModelDownloader | null = null
    private synthesisQueue: Promise<void> = Promise.resolve()

    getStatus(): LocalAIStatus {
        if (app.isReady()) {
            this.status.download = this.getModelDownloader().getStatus()
        }
        return structuredClone(this.status)
    }

    isReady(): boolean {
        return this.status.phase === 'ready' && this.chatClient !== null
    }

    isTTSReady(): boolean {
        return this.status.tts.phase === 'ready' && this.ttsPort !== null
    }

    async setEnabled(enabled: boolean): Promise<LocalAIStatus> {
        if (enabled) {
            await this.start()
        } else {
            await this.stop()
        }
        return this.getStatus()
    }

    async downloadModels(): Promise<LocalAIStatus> {
        if (this.status.enabled) {
            throw new Error('请先关闭本地 AI，再下载或修复模型')
        }
        await this.getModelDownloader().download()
        this.status.download = this.getModelDownloader().getStatus()
        this.publishStatus()
        return this.getStatus()
    }

    cancelModelDownload(): LocalAIStatus {
        this.getModelDownloader().cancel()
        return this.getStatus()
    }

    async createChatStream(messages: ChatMessage[]): Promise<ChatCompletionStream> {
        if (!this.isReady() || !this.chatClient) {
            throw new Error('本地模型尚未就绪，请先打开聊天页顶部的本地 AI 开关')
        }

        return this.chatClient.chat.completions.stream({
            model: LLM_API_MODEL_NAME,
            messages,
            max_tokens: 200,
            temperature: 0.8,
            top_p: 0.9,
            chat_template_kwargs: {
                enable_thinking: false
            }
        })
    }

    async synthesize(text: string): Promise<Buffer> {
        const task = this.synthesisQueue.then(() => this.performSynthesis(text))
        this.synthesisQueue = task.then(() => undefined, () => undefined)
        return task
    }

    private async performSynthesis(text: string): Promise<Buffer> {
        if (!this.isTTSReady() || this.ttsPort === null) {
            throw new Error('本地 TTS 尚未就绪')
        }

        const response = await fetch(`http://127.0.0.1:${this.ttsPort}/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                language: 'Chinese'
            })
        })

        if (!response.ok) {
            const detail = await response.text()
            throw new Error(`本地 TTS 合成失败 (${response.status}): ${detail}`)
        }

        return Buffer.from(await response.arrayBuffer())
    }

    async start(): Promise<void> {
        if (this.status.phase === 'ready' || this.status.phase === 'starting') return

        this.stopping = false
        const download = this.getModelDownloader().getStatus()
        if (download.phase !== 'ready' || !this.getModelDownloader().isInstalled()) {
            throw new Error('本地模型尚未下载，请先点击聊天页的“下载模型”按钮')
        }
        this.status = {
            enabled: true,
            phase: 'starting',
            backend: null,
            ttsBackend: null,
            download,
            llm: { phase: 'starting', detail: '正在检查 llama.cpp 与模型文件' },
            tts: { phase: 'off', detail: '等待加载' }
        }
        this.publishStatus()

        try {
            const paths = this.resolvePaths()
            const backend = this.selectBackend(paths.llamaRuntimeRoot)
            const llamaExecutable = join(paths.llamaRuntimeRoot, backend, process.platform === 'win32' ? 'llama-server.exe' : 'llama-server')

            this.assertFile(llamaExecutable, `缺少 llama.cpp ${backend} 运行时`)
            this.assertFile(
                paths.llmModel,
                `缺少大语言模型 ${LLM_MODEL_NAME}`,
                '请在聊天页重新下载模型'
            )
            this.status.backend = backend
            this.llmPort = await this.findFreePort()
            this.startLlama(llamaExecutable, paths.llmModel, backend, this.llmPort)
            await this.waitForHealth(
                `http://127.0.0.1:${this.llmPort}/health`,
                STARTUP_TIMEOUT_MS,
                'llama.cpp',
                this.apiKey
            )

            this.chatClient = new OpenAI({
                baseURL: `http://127.0.0.1:${this.llmPort}/v1`,
                apiKey: this.apiKey
            })
            this.status.llm = { phase: 'ready', detail: `Qwen3.5-2B 已加载（${backend.toUpperCase()}）` }
            this.status.tts = { phase: 'starting', detail: '正在检测 TTS 加速设备' }
            this.publishStatus()
            const ttsAcceleration = await this.detectTTSAcceleration(paths.pythonExecutable)
            if (this.stopping || !this.status.enabled || this.status.phase !== 'starting') return

            if (!ttsAcceleration) {
                this.status.ttsBackend = null
                this.status.tts = {
                    phase: 'off',
                    detail: '未启用：没有可供 Qwen3-TTS 使用的 CUDA 或 ROCm 加速设备'
                }
                this.status.phase = 'ready'
                this.publishStatus()
                logger.info(`[local-ai] 本地大模型已就绪，LLM=${backend}；TTS 因无可用加速设备未启动`)
                return
            }

            this.assertFile(paths.pythonExecutable, '缺少 Qwen3-TTS Python 运行环境')
            this.assertFile(paths.ttsServer, '缺少 TTS 本地服务脚本')
            this.assertFile(
                join(paths.ttsModel, 'config.json'),
                `缺少 TTS 模型 ${TTS_MODEL_NAME}`,
                '请在聊天页重新下载模型'
            )
            this.assertFile(paths.referenceAudio, '缺少 TTS 参考音频')
            this.assertFile(paths.referenceText, '缺少 TTS 参考文本')

            this.status.tts = { phase: 'starting', detail: '正在加载 Qwen3-TTS 0.6B Base' }
            this.publishStatus()

            this.ttsPort = await this.findFreePort()
            this.startTTS(
                paths.pythonExecutable,
                paths.ttsServer,
                paths.ttsModel,
                paths.referenceAudio,
                paths.referenceText,
                this.ttsPort
            )
            const health = await this.waitForHealth(
                `http://127.0.0.1:${this.ttsPort}/health`,
                STARTUP_TIMEOUT_MS,
                'Qwen3-TTS'
            )
            this.status.ttsBackend = typeof health.backend === 'string' ? health.backend : 'unknown'
            this.status.tts = {
                phase: 'ready',
                detail: `Qwen3-TTS 已加载（${this.status.ttsBackend.toUpperCase()}）`
            }
            this.status.phase = 'ready'
            this.publishStatus()
            logger.info(`[local-ai] 本地模型已就绪，LLM=${backend}, TTS=${this.status.ttsBackend}`)
        } catch (error) {
            if (this.stopping || !this.status.enabled) {
                logger.info('[local-ai] 本地模型启动已取消')
                return
            }
            const message = errorMessage(error)
            logger.error(`[local-ai] 启动失败: ${message}`)
            await this.stopProcesses()
            this.status = {
                ...this.status,
                enabled: false,
                phase: 'error',
                llm: this.status.llm.phase === 'ready'
                    ? this.status.llm
                    : { phase: 'error', detail: '加载失败' },
                tts: this.status.tts.phase === 'ready'
                    ? this.status.tts
                    : { phase: 'error', detail: '加载失败' },
                error: message
            }
            this.publishStatus()
            throw error
        }
    }

    async stop(): Promise<void> {
        if (this.status.phase === 'off' || this.status.phase === 'stopping') return

        this.stopping = true
        this.status = {
            ...this.status,
            enabled: false,
            phase: 'stopping',
            llm: { ...this.status.llm, detail: '正在卸载' },
            tts: { ...this.status.tts, detail: '正在卸载' },
            error: undefined
        }
        this.publishStatus()
        await this.stopProcesses()
        this.status = initialStatus()
        this.stopping = false
        this.publishStatus()
        logger.info('[local-ai] 本地模型已卸载，相关进程已退出')
    }

    private resolvePaths() {
        const customRoot = process.env.PETMATE_LOCAL_AI_DIR
        const runtimeRoot = customRoot
            ? resolve(customRoot)
            : app.isPackaged
                ? join(process.resourcesPath, 'local-ai')
                : join(app.getAppPath(), 'resources', 'local-ai')
        const modelsRoot = process.env.PETMATE_LOCAL_AI_MODELS_DIR
            ? resolve(process.env.PETMATE_LOCAL_AI_MODELS_DIR)
            : join(app.getPath('userData'), 'local-ai', 'models')
        const pythonExecutable = process.platform === 'win32'
            ? join(runtimeRoot, 'runtime', 'tts-env', 'python.exe')
            : join(runtimeRoot, 'runtime', 'tts-env', 'bin', 'python')

        return {
            runtimeRoot,
            modelsRoot,
            llamaRuntimeRoot: join(runtimeRoot, 'runtime', 'llama'),
            pythonExecutable,
            ttsServer: join(runtimeRoot, 'tts_server.py'),
            llmModel: join(modelsRoot, 'llm', LLM_MODEL_NAME),
            ttsModel: join(modelsRoot, 'tts', TTS_MODEL_NAME),
            referenceAudio: join(runtimeRoot, 'voices', 'default.wav'),
            referenceText: join(runtimeRoot, 'voices', 'default.txt')
        }
    }

    private getModelDownloader(): LocalAIModelDownloader {
        if (!this.modelDownloader) {
            const { modelsRoot } = this.resolvePaths()
            this.modelDownloader = new LocalAIModelDownloader(modelsRoot, status => {
                this.status.download = status
                this.publishStatus()
            })
        }
        return this.modelDownloader
    }

    private selectBackend(runtimeRoot: string): LocalAIBackend {
        if (process.platform !== 'win32') {
            if (existsSync(join(runtimeRoot, 'vulkan', 'llama-server'))) return 'vulkan'
            return 'cpu'
        }

        const hasNvidia = this.commandSucceeds('nvidia-smi', ['-L'])
        if (hasNvidia && existsSync(join(runtimeRoot, 'cuda', 'llama-server.exe'))) return 'cuda'

        const gpuNames = this.readWindowsGPUNames()
        if (
            (hasNvidia || /(AMD|Radeon|Intel.*(?:Arc|Graphics|Iris|UHD|HD Graphics))/i.test(gpuNames))
            && existsSync(join(runtimeRoot, 'vulkan', 'llama-server.exe'))
        ) {
            return 'vulkan'
        }

        return 'cpu'
    }

    private detectTTSAcceleration(pythonExecutable: string): Promise<string | null> {
        if (!existsSync(pythonExecutable)) return Promise.resolve(null)

        const probe = [
            'import torch',
            "backend = 'none'",
            "backend = ('rocm' if torch.version.hip else 'cuda') if torch.cuda.is_available() else backend",
            'print(backend)'
        ].join('; ')

        return new Promise(resolvePromise => {
            execFile(
                pythonExecutable,
                ['-c', probe],
                {
                    encoding: 'utf8',
                    windowsHide: true,
                    timeout: 30_000
                },
                (error, stdout) => {
                    if (error) {
                        logger.warn(`[local-ai] TTS 加速设备探测失败，将跳过 TTS：${errorMessage(error)}`)
                        resolvePromise(null)
                        return
                    }
                    const backend = stdout.trim().toLowerCase()
                    resolvePromise(['cuda', 'rocm'].includes(backend) ? backend : null)
                }
            )
        })
    }

    private startLlama(
        executable: string,
        modelPath: string,
        backend: LocalAIBackend,
        port: number
    ): void {
        const args = [
            '--model', modelPath,
            '--alias', LLM_API_MODEL_NAME,
            '--host', '127.0.0.1',
            '--port', String(port),
            '--ctx-size', '4096',
            '--parallel', '1',
            '--threads', String(Math.max(2, cpus().length - 2)),
            '--n-predict', '256',
            '--api-key', this.apiKey,
            '--jinja'
        ]
        if (backend !== 'cpu') args.push('--n-gpu-layers', '999')

        const processHandle = spawn(executable, args, {
            cwd: dirname(executable),
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe']
        })
        this.llamaProcess = processHandle
        this.attachProcessLogs(processHandle, 'llama.cpp')
        processHandle.once('exit', (code, signal) => {
            this.llamaProcess = null
            if (!this.stopping && this.status.enabled) {
                this.markRuntimeFailure(`llama.cpp 意外退出（code=${code}, signal=${signal}）`)
            }
        })
        this.status.llm = { phase: 'starting', detail: `正在通过 ${backend.toUpperCase()} 加载 Qwen3.5-2B` }
        this.publishStatus()
    }

    private startTTS(
        pythonExecutable: string,
        serverScript: string,
        modelPath: string,
        referenceAudio: string,
        referenceText: string,
        port: number
    ): void {
        const processHandle = spawn(pythonExecutable, [
            serverScript,
            '--model', modelPath,
            '--ref-audio', referenceAudio,
            '--ref-text-file', referenceText,
            '--host', '127.0.0.1',
            '--port', String(port)
        ], {
            cwd: dirname(serverScript),
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                HF_HUB_OFFLINE: '1',
                TRANSFORMERS_OFFLINE: '1',
                PYTHONIOENCODING: 'utf-8',
                PYTHONUTF8: '1',
                PYTHONUNBUFFERED: '1'
            }
        })
        this.ttsProcess = processHandle
        this.attachProcessLogs(processHandle, 'qwen-tts')
        processHandle.once('exit', (code, signal) => {
            this.ttsProcess = null
            if (!this.stopping && this.status.enabled) {
                this.markRuntimeFailure(`Qwen3-TTS 意外退出（code=${code}, signal=${signal}）`)
            }
        })
    }

    private attachProcessLogs(processHandle: ChildProcess, name: string): void {
        processHandle.stdout?.on('data', (data: Buffer) => {
            const line = data.toString('utf8').trim()
            if (line) logger.info(`[local-ai/${name}] ${line}`)
        })
        processHandle.stderr?.on('data', (data: Buffer) => {
            const line = data.toString('utf8').trim()
            if (line) logger.info(`[local-ai/${name}] ${line}`)
        })
        processHandle.on('error', (error) => {
            logger.error(`[local-ai/${name}] 进程错误: ${errorMessage(error)}`)
        })
    }

    private async waitForHealth(
        url: string,
        timeout: number,
        name: string,
        apiKey?: string
    ): Promise<Record<string, unknown>> {
        const startedAt = Date.now()
        let lastError = ''

        while (Date.now() - startedAt < timeout) {
            if (this.stopping || !this.status.enabled || this.status.phase !== 'starting') {
                throw new Error(`${name} 启动已取消`)
            }
            try {
                const response = await fetch(url, {
                    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined
                })
                if (response.ok) {
                    return await response.json() as Record<string, unknown>
                }
                lastError = `${response.status} ${await response.text()}`
            } catch (error) {
                lastError = errorMessage(error)
            }
            await new Promise(resolvePromise => setTimeout(resolvePromise, 500))
        }

        throw new Error(`${name} 在 ${Math.round(timeout / 1000)} 秒内未就绪：${lastError}`)
    }

    private findFreePort(): Promise<number> {
        return new Promise((resolvePromise, reject) => {
            const server = createServer()
            server.unref()
            server.once('error', reject)
            server.listen(0, '127.0.0.1', () => {
                const address = server.address()
                if (!address || typeof address === 'string') {
                    server.close()
                    reject(new Error('无法分配本地模型端口'))
                    return
                }
                const port = address.port
                server.close(error => error ? reject(error) : resolvePromise(port))
            })
        })
    }

    private async stopProcesses(): Promise<void> {
        this.chatClient = null
        this.llmPort = null
        this.ttsPort = null

        const processes = [this.ttsProcess, this.llamaProcess]
        this.ttsProcess = null
        this.llamaProcess = null
        await Promise.all(processes.map(processHandle => this.terminateProcess(processHandle)))
    }

    private terminateProcess(processHandle: ChildProcess | null): Promise<void> {
        if (!processHandle || processHandle.exitCode !== null) return Promise.resolve()

        return new Promise(resolvePromise => {
            let settled = false
            const finish = () => {
                if (settled) return
                settled = true
                resolvePromise()
            }
            processHandle.once('exit', finish)
            processHandle.kill()
            setTimeout(() => {
                if (processHandle.exitCode === null) processHandle.kill('SIGKILL')
                finish()
            }, 5000).unref()
        })
    }

    private markRuntimeFailure(message: string): void {
        logger.error(`[local-ai] ${message}`)
        this.chatClient = null
        this.status = {
            ...this.status,
            enabled: false,
            phase: 'error',
            error: message
        }
        this.publishStatus()
        void this.stopProcesses()
    }

    private assertFile(
        path: string,
        label: string,
        recovery = '请先运行 npm run setup:local-ai'
    ): void {
        if (!existsSync(path)) {
            throw new Error(`${label}：${path}。${recovery}`)
        }
    }

    private commandSucceeds(command: string, args: string[]): boolean {
        try {
            execFileSync(command, args, { stdio: 'ignore', windowsHide: true })
            return true
        } catch {
            return false
        }
    }

    private readWindowsGPUNames(): string {
        try {
            return execFileSync(
                'powershell.exe',
                ['-NoProfile', '-Command', '(Get-CimInstance Win32_VideoController).Name -join ","'],
                { encoding: 'utf8', windowsHide: true, timeout: 5000 }
            ).trim()
        } catch {
            return ''
        }
    }

    private publishStatus(): void {
        const status = this.getStatus()
        for (const window of BrowserWindow.getAllWindows()) {
            if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
                window.webContents.send('local-ai-status', status)
            }
        }
    }
}

export const localAIManager = new LocalAIManager()

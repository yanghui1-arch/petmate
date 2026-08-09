import { createHash } from 'crypto'
import {
    createReadStream,
    createWriteStream,
    existsSync,
    mkdirSync,
    renameSync,
    statSync,
    unlinkSync,
    writeFileSync
} from 'fs'
import { dirname, join, resolve, sep } from 'path'
import { Readable, Transform } from 'stream'
import type { ReadableStream as NodeReadableStream } from 'stream/web'
import { pipeline } from 'stream/promises'

export type LocalAIModelDownloadPhase =
    | 'missing'
    | 'checking'
    | 'downloading'
    | 'ready'
    | 'error'

export interface LocalAIModelDownloadStatus {
    phase: LocalAIModelDownloadPhase
    downloadedBytes: number
    totalBytes: number
    progress: number
    currentFile: string
    detail: string
    error?: string
}

interface DownloadFile {
    repository: string
    repositoryPath: string
    targetPath: string
    size: number
    sha256?: string
}

const LLM_REPOSITORY = 'unsloth/Qwen3.5-2B-GGUF'
const LLM_FILENAME = 'Qwen3.5-2B-Q4_K_M.gguf'
const LLM_SIZE = 1_280_835_840
const LLM_SHA256 = 'aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223'

function initialDownloadStatus(): LocalAIModelDownloadStatus {
    return {
        phase: 'missing',
        downloadedBytes: 0,
        totalBytes: 0,
        progress: 0,
        currentFile: '',
        detail: '尚未下载本地模型'
    }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

export class LocalAIModelDownloader {
    private status = initialDownloadStatus()
    private controller: AbortController | null = null
    private activeDownload: Promise<void> | null = null
    private lastPublishAt = 0

    constructor(
        private readonly modelsRoot: string,
        private readonly onStatus: (status: LocalAIModelDownloadStatus) => void
    ) {
        this.refreshStatus()
    }

    getStatus(): LocalAIModelDownloadStatus {
        if (!this.activeDownload) this.refreshStatus()
        return structuredClone(this.status)
    }

    isInstalled(): boolean {
        return this.hasInstalledModels()
    }

    download(): Promise<void> {
        if (this.activeDownload) return this.activeDownload
        this.activeDownload = this.runDownload().finally(() => {
            this.activeDownload = null
            this.controller = null
        })
        return this.activeDownload
    }

    cancel(): void {
        this.controller?.abort()
    }

    private async runDownload(): Promise<void> {
        if (this.hasInstalledModels()) {
            this.refreshStatus()
            this.publish(true)
            return
        }

        this.controller = new AbortController()
        const signal = this.controller.signal
        this.status = {
            phase: 'checking',
            downloadedBytes: 0,
            totalBytes: 0,
            progress: 0,
            currentFile: '',
            detail: '正在检查本地模型文件'
        }
        this.publish(true)

        try {
            mkdirSync(this.modelsRoot, { recursive: true })
            if (existsSync(this.installationMarker)) unlinkSync(this.installationMarker)

            const files = this.getDownloadFiles()
            const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
            let downloadedBytes = files.reduce((sum, file) => {
                const completedSize = this.fileSize(file.targetPath) === file.size ? file.size : 0
                const partialSize = Math.min(this.fileSize(`${file.targetPath}.incomplete`), file.size)
                return sum + Math.max(completedSize, partialSize)
            }, 0)

            this.status = {
                phase: 'downloading',
                downloadedBytes,
                totalBytes,
                progress: this.progress(downloadedBytes, totalBytes),
                currentFile: '',
                detail: '正在下载本地模型'
            }
            this.publish(true)

            for (const file of files) {
                if (signal.aborted) throw new DOMException('下载已取消', 'AbortError')

                const existingSize = this.fileSize(file.targetPath)
                if (existingSize === file.size) {
                    try {
                        if (file.sha256) await this.assertSha256(file.targetPath, file.sha256)
                        continue
                    } catch {
                        unlinkSync(file.targetPath)
                        downloadedBytes = Math.max(0, downloadedBytes - file.size)
                        this.status.downloadedBytes = downloadedBytes
                    }
                }

                const partialPath = `${file.targetPath}.incomplete`
                let partialBefore = Math.min(this.fileSize(partialPath), file.size)
                if (partialBefore === file.size) {
                    try {
                        if (file.sha256) await this.assertSha256(partialPath, file.sha256)
                        if (existsSync(file.targetPath)) unlinkSync(file.targetPath)
                        renameSync(partialPath, file.targetPath)
                        continue
                    } catch {
                        unlinkSync(partialPath)
                        downloadedBytes = Math.max(0, downloadedBytes - file.size)
                        this.status.downloadedBytes = downloadedBytes
                        partialBefore = 0
                    }
                }
                this.status.currentFile = file.repositoryPath
                this.status.detail = `正在下载 ${file.repositoryPath}`
                this.publish(true)

                let fileDownloaded = partialBefore
                await this.downloadFile(file, partialPath, signal, bytes => {
                    const delta = bytes - fileDownloaded
                    fileDownloaded = bytes
                    downloadedBytes += delta
                    this.status.downloadedBytes = downloadedBytes
                    this.status.progress = this.progress(downloadedBytes, totalBytes)
                    this.publish()
                })

                const downloadedSize = this.fileSize(partialPath)
                if (downloadedSize !== file.size) {
                    throw new Error(
                        `${file.repositoryPath} 大小校验失败：应为 ${file.size}，实际为 ${downloadedSize}`
                    )
                }
                if (file.sha256) await this.assertSha256(partialPath, file.sha256)
                if (existsSync(file.targetPath)) unlinkSync(file.targetPath)
                renameSync(partialPath, file.targetPath)
            }

            writeFileSync(this.installationMarker, JSON.stringify({
                installedAt: new Date().toISOString(),
                source: 'ModelScope',
                llm: `${LLM_REPOSITORY}:${LLM_FILENAME}`,
                totalBytes
            }, null, 2))

            this.status = {
                phase: 'ready',
                downloadedBytes: totalBytes,
                totalBytes,
                progress: 100,
                currentFile: '',
                detail: '本地模型已下载'
            }
            this.publish(true)
        } catch (error) {
            if (
                (error instanceof DOMException && error.name === 'AbortError')
                || (
                    typeof error === 'object'
                    && error !== null
                    && 'name' in error
                    && error.name === 'AbortError'
                )
            ) {
                this.status = {
                    ...this.status,
                    phase: 'missing',
                    currentFile: '',
                    detail: '下载已暂停，再次点击可断点续传',
                    error: undefined
                }
                this.publish(true)
                return
            }

            const message = errorMessage(error)
            this.status = {
                ...this.status,
                phase: 'error',
                currentFile: '',
                detail: '模型下载失败',
                error: message
            }
            this.publish(true)
            throw error
        }
    }

    private getDownloadFiles(): DownloadFile[] {
        return [
            {
                repository: LLM_REPOSITORY,
                repositoryPath: LLM_FILENAME,
                targetPath: this.safeTarget(join('llm', LLM_FILENAME)),
                size: LLM_SIZE,
                sha256: LLM_SHA256
            }
        ]
    }

    private async downloadFile(
        file: DownloadFile,
        partialPath: string,
        signal: AbortSignal,
        onProgress: (downloadedBytes: number) => void
    ): Promise<void> {
        mkdirSync(dirname(partialPath), { recursive: true })
        let partialSize = Math.min(this.fileSize(partialPath), file.size)
        const encodedPath = file.repositoryPath
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/')
        const url = `https://modelscope.cn/models/${file.repository}/resolve/master/${encodedPath}`
        const headers: Record<string, string> = {
            'User-Agent': 'Petmate-local-ai-downloader'
        }
        if (partialSize > 0) headers.Range = `bytes=${partialSize}-`

        const response = await fetch(url, { signal, headers })
        if (!response.ok) {
            throw new Error(`${file.repositoryPath} 下载失败 (${response.status})`)
        }
        if (!response.body) {
            throw new Error(`${file.repositoryPath} 下载响应没有内容`)
        }

        const append = partialSize > 0 && response.status === 206
        if (!append) partialSize = 0
        let receivedBytes = partialSize
        onProgress(receivedBytes)

        const progressStream = new Transform({
            transform: (chunk: Buffer, _encoding, callback) => {
                receivedBytes += chunk.length
                onProgress(receivedBytes)
                callback(null, chunk)
            }
        })
        const source = Readable.fromWeb(
            response.body as unknown as NodeReadableStream<Uint8Array>
        )
        await pipeline(
            source,
            progressStream,
            createWriteStream(partialPath, { flags: append ? 'a' : 'w' }),
            { signal }
        )
    }

    private async assertSha256(path: string, expected: string): Promise<void> {
        const hash = createHash('sha256')
        for await (const chunk of createReadStream(path)) hash.update(chunk)
        const actual = hash.digest('hex')
        if (actual.toLowerCase() !== expected.toLowerCase()) {
            throw new Error(`${path} 的 SHA-256 校验失败`)
        }
    }

    private refreshStatus(): void {
        if (this.hasInstalledModels()) {
            this.status = {
                phase: 'ready',
                downloadedBytes: this.status.totalBytes,
                totalBytes: this.status.totalBytes,
                progress: 100,
                currentFile: '',
                detail: '本地模型已下载'
            }
        } else if (this.status.phase === 'ready') {
            this.status = initialDownloadStatus()
        }
    }

    private hasInstalledModels(): boolean {
        return (
            existsSync(this.installationMarker)
            && this.fileSize(this.llmModelPath) === LLM_SIZE
        )
    }

    private safeTarget(relativePath: string): string {
        const root = resolve(this.modelsRoot)
        const target = resolve(root, relativePath)
        if (!target.startsWith(`${root}${sep}`)) {
            throw new Error('ModelScope 返回了不安全的模型文件路径')
        }
        return target
    }

    private fileSize(path: string): number {
        try {
            return statSync(path).size
        } catch {
            return 0
        }
    }

    private progress(downloadedBytes: number, totalBytes: number): number {
        if (totalBytes <= 0) return 0
        return Math.min(100, Math.round(downloadedBytes / totalBytes * 1000) / 10)
    }

    private publish(force = false): void {
        const now = Date.now()
        if (!force && now - this.lastPublishAt < 150) return
        this.lastPublishAt = now
        this.onStatus(this.getStatus())
    }

    private get installationMarker(): string {
        return join(this.modelsRoot, 'installation.json')
    }

    private get llmModelPath(): string {
        return join(this.modelsRoot, 'llm', LLM_FILENAME)
    }

}

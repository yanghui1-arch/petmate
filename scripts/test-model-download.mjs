import { strict as assert } from 'node:assert'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temporaryRoot = mkdtempSync(join(tmpdir(), 'petmate-model-download-test-'))
const bundledModule = join(temporaryRoot, 'local-ai-download.mjs')
const modelsRoot = join(temporaryRoot, 'models')
const originalFetch = globalThis.fetch
const partialModel = join(
  modelsRoot,
  'llm',
  'Qwen3.5-2B-Q4_K_M.gguf.incomplete'
)

const mockLLMSize = 1_280_835_840
const mockTTSSize = 1_829_344_272

globalThis.fetch = async (input, init = {}) => {
  const url = String(input)
  if (url.includes('/api/v1/models/')) {
    return new Response(JSON.stringify({
      Success: true,
      Data: {
        Files: [{
          Path: 'model.safetensors',
          Type: 'blob',
          Size: mockTTSSize
        }]
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  assert.match(url, /Qwen3\.5-2B-Q4_K_M\.gguf$/)
  const range = new Headers(init.headers).get('Range')
  const start = range ? Number(range.match(/^bytes=(\d+)-$/)?.[1] ?? 0) : 0
  let offset = start
  const signal = init.signal
  const stream = new ReadableStream({
    async pull(controller) {
      await new Promise(resolvePromise => setTimeout(resolvePromise, 20))
      if (signal?.aborted) {
        controller.error(new DOMException('下载已取消', 'AbortError'))
        return
      }
      const chunkSize = Math.min(512 * 1024, mockLLMSize - offset)
      controller.enqueue(new Uint8Array(chunkSize))
      offset += chunkSize
      if (offset >= mockLLMSize) controller.close()
    }
  })
  return new Response(stream, {
    status: start > 0 ? 206 : 200,
    headers: {
      'Content-Length': String(mockLLMSize - start),
      ...(start > 0
        ? { 'Content-Range': `bytes ${start}-${mockLLMSize - 1}/${mockLLMSize}` }
        : {})
    }
  })
}

try {
  await build({
    entryPoints: [join(repoRoot, 'src', 'main', 'local-ai-download.ts')],
    outfile: bundledModule,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22'
  })
  const { LocalAIModelDownloader } = await import(pathToFileURL(bundledModule).href)

  async function downloadUntil(threshold) {
    let downloader
    let cancelled = false
    const progressUpdates = []
    downloader = new LocalAIModelDownloader(modelsRoot, status => {
      progressUpdates.push(status)
      if (
        !cancelled
        && status.phase === 'downloading'
        && status.downloadedBytes >= threshold
      ) {
        cancelled = true
        downloader.cancel()
      }
    })
    await downloader.download()
    assert.equal(downloader.getStatus().phase, 'missing')
    assert.equal(cancelled, true)
    assert.ok(progressUpdates.some(status => (
      status.currentFile === 'Qwen3.5-2B-Q4_K_M.gguf'
      && status.progress > 0
      && status.totalBytes === mockLLMSize + mockTTSSize
    )))
  }

  await downloadUntil(2 * 1024 * 1024)
  assert.equal(existsSync(partialModel), true)
  const firstSize = statSync(partialModel).size
  assert.ok(firstSize >= 2 * 1024 * 1024)

  await downloadUntil(firstSize + 2 * 1024 * 1024)
  const resumedSize = statSync(partialModel).size
  assert.ok(resumedSize > firstSize)

  console.log(JSON.stringify({
    source: 'mock ModelScope transport',
    firstPartialBytes: firstSize,
    resumedPartialBytes: resumedSize,
    resumeVerified: true,
    progressVerified: true
  }, null, 2))
} finally {
  globalThis.fetch = originalFetch
  const resolvedTemporaryRoot = resolve(temporaryRoot)
  if (
    resolvedTemporaryRoot.startsWith(resolve(tmpdir()))
    && resolvedTemporaryRoot.includes('petmate-model-download-test-')
  ) {
    rmSync(resolvedTemporaryRoot, { recursive: true, force: true })
  }
}

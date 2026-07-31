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
const partialModel = join(
  modelsRoot,
  'llm',
  'Qwen3.5-2B-Q4_K_M.gguf.incomplete'
)

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
    downloader = new LocalAIModelDownloader(modelsRoot, status => {
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
  }

  await downloadUntil(2 * 1024 * 1024)
  assert.equal(existsSync(partialModel), true)
  const firstSize = statSync(partialModel).size
  assert.ok(firstSize >= 2 * 1024 * 1024)

  await downloadUntil(firstSize + 2 * 1024 * 1024)
  const resumedSize = statSync(partialModel).size
  assert.ok(resumedSize > firstSize)

  console.log(JSON.stringify({
    source: 'ModelScope',
    firstPartialBytes: firstSize,
    resumedPartialBytes: resumedSize,
    resumeVerified: true
  }, null, 2))
} finally {
  const resolvedTemporaryRoot = resolve(temporaryRoot)
  if (
    resolvedTemporaryRoot.startsWith(resolve(tmpdir()))
    && resolvedTemporaryRoot.includes('petmate-model-download-test-')
  ) {
    rmSync(resolvedTemporaryRoot, { recursive: true, force: true })
  }
}

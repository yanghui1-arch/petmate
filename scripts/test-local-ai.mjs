import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const localRoot = process.env.PETMATE_LOCAL_AI_DIR
  ? resolve(process.env.PETMATE_LOCAL_AI_DIR)
  : join(repoRoot, 'resources', 'local-ai')
const llmOnly = process.argv.includes('--llm-only')
const testApiKey = 'petmate-local-ai-test'

function assertFile(path) {
  if (!existsSync(path)) throw new Error(`Missing required file: ${path}`)
}

function attachLogs(processHandle, name) {
  const lines = []
  for (const stream of [processHandle.stdout, processHandle.stderr]) {
    stream.on('data', data => {
      const text = data.toString('utf8').trim()
      if (!text) return
      lines.push(...text.split(/\r?\n/))
      if (lines.length > 100) lines.splice(0, lines.length - 100)
    })
  }
  processHandle.on('error', error => lines.push(`${name}: ${error.message}`))
  return lines
}

async function waitForHealth(url, processHandle, timeoutMs, name, apiKey) {
  const startedAt = Date.now()
  let lastError = ''
  while (Date.now() - startedAt < timeoutMs) {
    if (processHandle.exitCode !== null) {
      throw new Error(`${name} exited with code ${processHandle.exitCode}`)
    }
    try {
      const response = await fetch(url, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined
      })
      if (response.ok) return response.json()
      lastError = `${response.status} ${await response.text()}`
    } catch (error) {
      lastError = error.message
    }
    await new Promise(resolvePromise => setTimeout(resolvePromise, 500))
  }
  throw new Error(`${name} health check timed out: ${lastError}`)
}

async function stopProcess(processHandle) {
  if (!processHandle || processHandle.exitCode !== null) return
  await new Promise(resolvePromise => {
    const timer = setTimeout(resolvePromise, 5000)
    processHandle.once('exit', () => {
      clearTimeout(timer)
      resolvePromise()
    })
    processHandle.kill()
  })
}

const llamaExecutable = join(localRoot, 'runtime', 'llama', 'vulkan', 'llama-server.exe')
const llmModel = join(localRoot, 'models', 'llm', 'Qwen3.5-2B-Q4_K_M.gguf')
const pythonExecutable = join(localRoot, 'runtime', 'tts-env', 'python.exe')
const ttsServerScript = join(localRoot, 'tts_server.py')
const ttsModel = join(localRoot, 'models', 'tts', 'Qwen3-TTS-12Hz-0.6B-Base')
const referenceAudio = join(localRoot, 'voices', 'default.wav')
const referenceText = join(localRoot, 'voices', 'default.txt')

for (const file of [llamaExecutable, llmModel]) assertFile(file)
if (!llmOnly) {
  for (const file of [
    pythonExecutable,
    ttsServerScript,
    join(ttsModel, 'config.json'),
    referenceAudio,
    referenceText
  ]) assertFile(file)
}

let llamaProcess
let ttsProcess
let llamaLogs = []
let ttsLogs = []

try {
  llamaProcess = spawn(llamaExecutable, [
    '--model', llmModel,
    '--alias', 'qwen3.5-2b-local',
    '--host', '127.0.0.1',
    '--port', '39291',
    '--ctx-size', '4096',
    '--parallel', '1',
    '--threads', String(Math.max(2, cpus().length - 2)),
    '--n-gpu-layers', '999',
    '--api-key', testApiKey,
    '--jinja'
  ], {
    cwd: dirname(llamaExecutable),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  llamaLogs = attachLogs(llamaProcess, 'llama.cpp')
  const llmHealth = await waitForHealth(
    'http://127.0.0.1:39291/health',
    llamaProcess,
    180_000,
    'llama.cpp',
    testApiKey
  )

  const chatResponse = await fetch('http://127.0.0.1:39291/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testApiKey}`
    },
    body: JSON.stringify({
      model: 'qwen3.5-2b-local',
      messages: [{ role: 'user', content: '请只用一句中文回答：你现在运行在哪里？' }],
      max_tokens: 64,
      temperature: 0.2,
      chat_template_kwargs: { enable_thinking: false }
    })
  })
  if (!chatResponse.ok) {
    throw new Error(`LLM request failed: ${chatResponse.status} ${await chatResponse.text()}`)
  }
  const chat = await chatResponse.json()
  console.log(JSON.stringify({
    llmHealth,
    reply: chat.choices?.[0]?.message?.content,
    usage: chat.usage
  }, null, 2))

  if (!llmOnly) {
    ttsProcess = spawn(pythonExecutable, [
      ttsServerScript,
      '--model', ttsModel,
      '--ref-audio', referenceAudio,
      '--ref-text-file', referenceText,
      '--host', '127.0.0.1',
      '--port', '39292'
    ], {
      cwd: localRoot,
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
    ttsLogs = attachLogs(ttsProcess, 'qwen-tts')
    const ttsHealth = await waitForHealth(
      'http://127.0.0.1:39292/health',
      ttsProcess,
      15 * 60_000,
      'Qwen3-TTS'
    )
    const ttsResponse = await fetch('http://127.0.0.1:39292/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '你好，我是正在本地运行的尤美。', language: 'Chinese' })
    })
    if (!ttsResponse.ok) {
      throw new Error(`TTS request failed: ${ttsResponse.status} ${await ttsResponse.text()}`)
    }
    const wav = Buffer.from(await ttsResponse.arrayBuffer())
    const outputDirectory = join(repoRoot, 'logs')
    mkdirSync(outputDirectory, { recursive: true })
    const outputPath = join(outputDirectory, 'local-ai-tts-test.wav')
    writeFileSync(outputPath, wav)
    console.log(JSON.stringify({ ttsHealth, outputPath, wavBytes: wav.length }, null, 2))
  }
} catch (error) {
  console.error(error)
  if (llamaLogs.length) console.error(`llama.cpp tail:\n${llamaLogs.slice(-40).join('\n')}`)
  if (ttsLogs.length) console.error(`Qwen3-TTS tail:\n${ttsLogs.slice(-40).join('\n')}`)
  process.exitCode = 1
} finally {
  await Promise.all([stopProcess(ttsProcess), stopProcess(llamaProcess)])
}

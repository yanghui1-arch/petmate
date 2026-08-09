import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runtimeRoot = process.env.PETMATE_LOCAL_AI_DIR
  ? resolve(process.env.PETMATE_LOCAL_AI_DIR)
  : join(repoRoot, 'resources', 'local-ai')
const defaultModelsRoot = process.platform === 'win32' && process.env.APPDATA
  ? join(process.env.APPDATA, 'Petmate', 'local-ai', 'models')
  : join(runtimeRoot, 'models')
const modelsRoot = process.env.PETMATE_LOCAL_AI_MODELS_DIR
  ? resolve(process.env.PETMATE_LOCAL_AI_MODELS_DIR)
  : defaultModelsRoot
const forceLLMOnly = process.argv.includes('--llm-only')
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

function takeSpeechSegments(buffer, flush = false) {
  const segments = []
  let remainder = buffer
  while (remainder.length > 0) {
    const end = remainder.search(/[。！？!?；;\n]/)
    if (end < 0) break
    const segment = remainder.slice(0, end + 1).trim()
    remainder = remainder.slice(end + 1)
    if (segment) segments.push(segment)
  }
  if (flush && remainder.trim()) {
    segments.push(remainder.trim())
    remainder = ''
  }
  return { segments, remainder }
}

async function detectTTSAcceleration(pythonExecutable) {
  if (!existsSync(pythonExecutable)) return null
  const probe = [
    'import torch',
    "backend = 'none'",
    "backend = ('rocm' if torch.version.hip else 'cuda') if torch.cuda.is_available() else backend",
    'print(backend)'
  ].join('; ')

  return new Promise(resolvePromise => {
    const processHandle = spawn(pythonExecutable, ['-c', probe], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    processHandle.stdout.on('data', data => { stdout += data.toString('utf8') })
    processHandle.once('error', () => resolvePromise(null))
    processHandle.once('exit', code => {
      const backend = stdout.trim().toLowerCase()
      resolvePromise(code === 0 && ['cuda', 'rocm'].includes(backend) ? backend : null)
    })
  })
}

const llamaExecutable = join(runtimeRoot, 'runtime', 'llama', 'vulkan', 'llama-server.exe')
const llmModel = join(modelsRoot, 'llm', 'Qwen3.5-2B-Q4_K_M.gguf')
const pythonExecutable = join(runtimeRoot, 'runtime', 'tts-env', 'python.exe')
const ttsServerScript = join(runtimeRoot, 'tts_server.py')
const ttsModel = join(modelsRoot, 'tts', 'Qwen3-TTS-12Hz-0.6B-Base')
const referenceAudio = join(runtimeRoot, 'voices', 'default.wav')
const referenceText = join(runtimeRoot, 'voices', 'default.txt')
const ttsAcceleration = forceLLMOnly ? null : await detectTTSAcceleration(pythonExecutable)
const llmOnly = forceLLMOnly || !ttsAcceleration

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

  let ttsHealth
  if (!llmOnly) {
    ttsProcess = spawn(pythonExecutable, [
      ttsServerScript,
      '--model', ttsModel,
      '--ref-audio', referenceAudio,
      '--ref-text-file', referenceText,
      '--host', '127.0.0.1',
      '--port', '39292'
    ], {
      cwd: runtimeRoot,
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
    ttsHealth = await waitForHealth(
      'http://127.0.0.1:39292/health',
      ttsProcess,
      15 * 60_000,
      'Qwen3-TTS'
    )
  }

  const client = new OpenAI({
    baseURL: 'http://127.0.0.1:39291/v1',
    apiKey: testApiKey
  })
  const runner = client.chat.completions.stream({
      model: 'qwen3.5-2b-local',
      messages: [{
        role: 'user',
        content: '请严格用三句简短中文介绍本地聊天，每句都用句号结尾，不要使用列表。'
      }],
      max_tokens: 96,
      temperature: 0.2,
      chat_template_kwargs: { enable_thinking: false }
  })

  let reply = ''
  let speechBuffer = ''
  let firstSpeechQueuedAt = 0
  const synthesizedSegments = []
  let ttsQueue = Promise.resolve()
  const enqueueSpeech = segment => {
    if (!firstSpeechQueuedAt) firstSpeechQueuedAt = Date.now()
    if (llmOnly) return
    ttsQueue = ttsQueue.then(async () => {
      const response = await fetch('http://127.0.0.1:39292/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: segment, language: 'Chinese' })
      })
      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status} ${await response.text()}`)
      }
      const wav = Buffer.from(await response.arrayBuffer())
      synthesizedSegments.push({ text: segment, wav })
    })
  }

  for await (const chunk of runner) {
    const content = chunk.choices[0]?.delta?.content ?? ''
    if (!content) continue
    reply += content
    speechBuffer += content
    const speech = takeSpeechSegments(speechBuffer)
    speechBuffer = speech.remainder
    for (const segment of speech.segments) enqueueSpeech(segment)
  }
  const llmFinishedAt = Date.now()
  const finalSpeech = takeSpeechSegments(speechBuffer, true)
  for (const segment of finalSpeech.segments) enqueueSpeech(segment)
  await ttsQueue

  if (!llmOnly && synthesizedSegments.length > 0) {
    const outputDirectory = join(repoRoot, 'logs')
    mkdirSync(outputDirectory, { recursive: true })
    const outputPath = join(outputDirectory, 'local-ai-tts-test.wav')
    writeFileSync(outputPath, synthesizedSegments[0].wav)
    if (firstSpeechQueuedAt > llmFinishedAt) {
      throw new Error('The first TTS segment was not queued before the LLM stream finished')
    }
    console.log(JSON.stringify({
      llmHealth,
      ttsHealth,
      reply,
      speechSegments: synthesizedSegments.map(item => ({
        text: item.text,
        wavBytes: item.wav.length
      })),
      firstSegmentQueuedBeforeLLMFinished: true,
      outputPath
    }, null, 2))
  } else {
    console.log(JSON.stringify({
      llmHealth,
      reply,
      ttsSkipped: true,
      ttsSkipReason: forceLLMOnly
        ? 'forced by --llm-only'
        : 'no CUDA/ROCm acceleration detected'
    }, null, 2))
  }
} catch (error) {
  console.error(error)
  if (llamaLogs.length) console.error(`llama.cpp tail:\n${llamaLogs.slice(-40).join('\n')}`)
  if (ttsLogs.length) console.error(`Qwen3-TTS tail:\n${ttsLogs.slice(-40).join('\n')}`)
  process.exitCode = 1
} finally {
  await Promise.all([stopProcess(ttsProcess), stopProcess(llamaProcess)])
}

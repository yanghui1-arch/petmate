import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
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
const testApiKey = 'petmate-local-ai-test'

function assertFile(path) {
  if (!existsSync(path)) throw new Error(`Missing required file: ${path}`)
}

function attachLogs(processHandle, name) {
  const lines = []
  for (const stream of [processHandle.stdout, processHandle.stderr]) {
    stream.on('data', data => {
      const output = data.toString('utf8').trim()
      if (!output) return
      lines.push(...output.split(/\r?\n/))
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

const llamaExecutable = join(runtimeRoot, 'runtime', 'llama', 'vulkan', 'llama-server.exe')
const llmModel = join(modelsRoot, 'llm', 'Qwen3.5-2B-Q4_K_M.gguf')
for (const file of [llamaExecutable, llmModel]) assertFile(file)

let llamaProcess
let llamaLogs = []

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
  let chunkCount = 0
  for await (const chunk of runner) {
    const content = chunk.choices[0]?.delta?.content ?? ''
    if (!content) continue
    reply += content
    chunkCount += 1
  }
  if (!reply.trim() || chunkCount < 2) {
    throw new Error('LLM did not return a streamed text response')
  }

  console.log(JSON.stringify({
    llmHealth,
    reply,
    chunkCount,
    textStreamingVerified: true,
    ttsIncluded: false
  }, null, 2))
} catch (error) {
  console.error(error)
  if (llamaLogs.length) console.error(`llama.cpp tail:\n${llamaLogs.slice(-40).join('\n')}`)
  process.exitCode = 1
} finally {
  await stopProcess(llamaProcess)
}

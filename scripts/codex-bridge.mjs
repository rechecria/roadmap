#!/usr/bin/env node
/**
 * ai-bridge.mjs (historical name: codex-bridge.mjs)
 *
 * Local HTTP bridge that lets the roadMap webapp talk to CLI-based AI agents
 * installed on this machine. Supported providers:
 *
 *   - codex        → OpenAI Codex CLI (`codex exec <prompt>`)
 *   - claude-code  → Anthropic Claude Code CLI (`claude -p <prompt>`)
 *
 * Usage:
 *   node scripts/codex-bridge.mjs
 *
 * Endpoints:
 *   GET  /health      → { ok, providers: { codex: bool, claudeCode: bool } }
 *   POST /execute     → body: { provider, userMessage, taskContext, history, agentName }
 *                       returns: { message, provider }
 *
 * By default listens on http://localhost:4567. Override with PORT=5000.
 *
 * The webapp's TaskExecutionPanel calls this bridge directly via CORS.
 */

import http from 'node:http'
import { spawn, execSync } from 'node:child_process'

const PORT = Number(process.env.PORT || 4567)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://roadmap-found-ctx.vercel.app,http://localhost:3000,http://localhost:3001'
).split(',').map(s => s.trim())
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 180_000)

const PROVIDERS = {
  codex: {
    bin: process.env.CODEX_BIN || 'codex',
    args: (process.env.CODEX_ARGS || 'exec').split(' ').filter(Boolean),
    appendPrompt: 'arg', // prompt goes as last arg
  },
  'claude-code': {
    bin: process.env.CLAUDE_BIN || 'claude',
    args: (process.env.CLAUDE_ARGS || '-p').split(' ').filter(Boolean),
    appendPrompt: 'arg',
  },
}

function whichSync(bin) {
  try {
    execSync(process.platform === 'win32' ? `where ${bin}` : `command -v ${bin}`, {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

function getAvailableProviders() {
  const result = {}
  for (const [key, cfg] of Object.entries(PROVIDERS)) {
    result[key] = whichSync(cfg.bin)
  }
  return result
}

function setCors(res, origin) {
  const allowed = ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0])
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '600')
}

function buildPrompt(body) {
  const { userMessage, taskContext, history = [], agentName } = body
  let prompt = ''
  if (agentName) prompt += `Você está atuando como o agente "${agentName}" numa plataforma de gestão de tarefas chamada roadMap.\n\n`
  if (taskContext) {
    prompt += `## Contexto da tarefa\n`
    if (taskContext.title) prompt += `Título: ${taskContext.title}\n`
    if (taskContext.status) prompt += `Status: ${taskContext.status}\n`
    if (taskContext.priority) prompt += `Prioridade: ${taskContext.priority}\n`
    if (taskContext.description) prompt += `Descrição: ${taskContext.description}\n`
    prompt += `\n`
  }
  if (history.length > 0) {
    prompt += `## Histórico da conversa\n`
    for (const m of history) {
      prompt += `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}\n`
    }
    prompt += `\n`
  }
  prompt += `## Nova mensagem do usuário\n${userMessage}\n\n`
  prompt += `Responda em português brasileiro, de forma prática e objetiva.`
  return prompt
}

function runProvider(providerKey, prompt) {
  const cfg = PROVIDERS[providerKey]
  if (!cfg) return Promise.reject(new Error(`Unknown provider: ${providerKey}`))

  return new Promise((resolve, reject) => {
    const args = [...cfg.args, prompt]
    const child = spawn(cfg.bin, args, { env: process.env, shell: false })

    let stdout = ''
    let stderr = ''
    const killTimer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`${providerKey} timed out after ${TIMEOUT_MS}ms`))
    }, TIMEOUT_MS)

    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })

    child.on('error', (err) => {
      clearTimeout(killTimer)
      if (err.code === 'ENOENT') {
        reject(new Error(`CLI not found: '${cfg.bin}'. Install it or set the env var.`))
      } else {
        reject(err)
      }
    })

    child.on('close', (code) => {
      clearTimeout(killTimer)
      if (code !== 0) {
        reject(new Error(`${providerKey} exited with code ${code}: ${stderr || stdout || '(no output)'}`))
      } else {
        resolve(stdout.trim() || '(sem resposta)')
      }
    })
  })
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || ''

  if (req.method === 'OPTIONS') {
    setCors(res, origin)
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    setCors(res, origin)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      ok: true,
      bridge: 'roadmap-ai-bridge',
      providers: getAvailableProviders(),
    }))
    return
  }

  if (req.method !== 'POST' || req.url !== '/execute') {
    setCors(res, origin)
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  setCors(res, origin)

  let raw = ''
  req.on('data', (chunk) => { raw += chunk.toString() })
  req.on('end', async () => {
    try {
      const body = JSON.parse(raw || '{}')
      if (!body.userMessage) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'userMessage is required' }))
        return
      }
      const provider = body.provider || 'codex'
      if (!PROVIDERS[provider]) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `Unknown provider: ${provider}` }))
        return
      }
      const prompt = buildPrompt(body)
      console.log(`[bridge] → ${provider} (prompt length: ${prompt.length})`)
      const output = await runProvider(provider, prompt)
      console.log(`[bridge] ← ${provider} responded (${output.length} chars)`)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: output, provider: `${provider}-local` }))
    } catch (err) {
      console.error('[bridge] error:', err.message)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  })
})

server.listen(PORT, '127.0.0.1', () => {
  const available = getAvailableProviders()
  console.log(`\n╔════════════════════════════════════════════════════════╗`)
  console.log(`║  roadMap AI bridge is running                          ║`)
  console.log(`║                                                        ║`)
  console.log(`║  Listening:   http://localhost:${String(PORT).padEnd(24)}║`)
  console.log(`║                                                        ║`)
  console.log(`║  Providers detected:                                   ║`)
  for (const [key, cfg] of Object.entries(PROVIDERS)) {
    const mark = available[key] ? '✓' : '✗'
    const line = `    ${mark} ${key.padEnd(14)} (${cfg.bin})`
    console.log(`║  ${line.padEnd(54)}║`)
  }
  console.log(`║                                                        ║`)
  console.log(`║  Allowed origins:                                      ║`)
  for (const o of ALLOWED_ORIGINS) {
    const line = `    - ${o}`
    console.log(`║  ${line.padEnd(54)}║`)
  }
  console.log(`║                                                        ║`)
  console.log(`║  Webapp auto-detects providers via GET /health.        ║`)
  console.log(`║  Ctrl+C to stop.                                       ║`)
  console.log(`╚════════════════════════════════════════════════════════╝\n`)
})

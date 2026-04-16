'use client'

import { useState, useEffect, useRef } from 'react'
import { Bot, Send, Loader2, Sparkles, User, Terminal, Cloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
import type { Task, Agent, TaskAgent } from '@/types/database'

const BRIDGE_URL = 'http://localhost:4567'

type ProviderKey = 'codex' | 'claude-code' | 'claude-cloud'

interface BridgeHealth {
  ok: boolean
  providers: { codex: boolean; 'claude-code': boolean }
}

async function checkBridge(): Promise<BridgeHealth | null> {
  try {
    const res = await fetch(`${BRIDGE_URL}/health`, {
      method: 'GET',
      mode: 'cors',
      signal: AbortSignal.timeout(1000),
    })
    if (!res.ok) return null
    return (await res.json()) as BridgeHealth
  } catch {
    return null
  }
}

const PROVIDER_META: Record<ProviderKey, { label: string; shortLabel: string; color: string }> = {
  'codex':        { label: 'OpenAI Codex (local)',  shortLabel: 'Codex',  color: 'green' },
  'claude-code':  { label: 'Claude Code (local)',   shortLabel: 'Claude Code', color: 'orange' },
  'claude-cloud': { label: 'Claude (nuvem)',        shortLabel: 'Claude ☁',  color: 'blue' },
}

interface AIMessage {
  id: string
  task_id: string
  agent_id: string | null
  user_id: string | null
  role: 'user' | 'assistant' | 'system' | 'action'
  content: string
  metadata: any
  created_at: string
}

interface TaskExecutionPanelProps {
  task: Task
  agents: Agent[]
}

export default function TaskExecutionPanel({ task, agents }: TaskExecutionPanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bridgeHealth, setBridgeHealth] = useState<BridgeHealth | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>('claude-code')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Detect local bridge + available providers
  useEffect(() => {
    checkBridge().then(h => {
      setBridgeHealth(h)
      // Auto-select best provider: prefer claude-code (local Max plan)
      if (h?.providers) {
        if (h.providers['claude-code']) setSelectedProvider('claude-code')
        else if (h.providers['codex']) setSelectedProvider('codex')
      }
    })
    const interval = setInterval(() => {
      checkBridge().then(setBridgeHealth)
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const codexAvailable = !!bridgeHealth?.providers?.codex
  const claudeCodeAvailable = !!bridgeHealth?.providers?.['claude-code']
  const anyLocalAvailable = codexAvailable || claudeCodeAvailable

  // Use joined agent data from task_agents directly if the global agents list is empty
  const taskAgents: Agent[] = (task.task_agents || []).map(ta => {
    const fullAgent = agents.find(a => a.id === ta.agent_id)
    if (fullAgent) return fullAgent
    // Fallback: build minimal Agent from TaskAgent's joined fields
    return {
      id: ta.agent_id,
      name: ta.agent_name || 'Agente',
      type: ta.agent_type || 'custom',
      avatar_url: ta.agent_avatar,
    } as Agent
  }).filter(a => a.id)

  // Load existing messages
  useEffect(() => {
    async function loadMessages() {
      setLoading(true)
      const { data } = await supabase
        .from('task_ai_messages')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true })
      setMessages((data || []) as AIMessage[])
      setLoading(false)
    }
    if (task.id) loadMessages()
  }, [task.id])

  // Select first agent by default
  useEffect(() => {
    if (!selectedAgentId && taskAgents.length > 0) {
      setSelectedAgentId(taskAgents[0].id)
    }
  }, [taskAgents, selectedAgentId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || !selectedAgentId || sending) return

    const userMsg = input.trim()
    setInput('')
    setSending(true)

    // Optimistic add
    const tempMsg: AIMessage = {
      id: `tmp-${Date.now()}`,
      task_id: task.id,
      agent_id: selectedAgentId,
      user_id: null,
      role: 'user',
      content: userMsg,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const history = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const agent = agents.find(a => a.id === selectedAgentId)
      const taskContext = {
        title: task.title,
        description: task.description,
        status: (task as any).status?.name,
        priority: task.priority,
      }

      let assistantContent = ''
      let provider = ''

      const useLocal = selectedProvider === 'codex' || selectedProvider === 'claude-code'

      if (useLocal) {
        const bridgeRes = await fetch(`${BRIDGE_URL}/execute`, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: selectedProvider,
            agentName: agent?.name,
            userMessage: userMsg,
            taskContext,
            history,
          }),
          signal: AbortSignal.timeout(180_000),
        })
        if (!bridgeRes.ok) {
          const err = await bridgeRes.json().catch(() => ({ error: 'Bridge failed' }))
          throw new Error(err.error || 'Bridge request failed')
        }
        const r = await bridgeRes.json()
        assistantContent = r.message
        provider = r.provider || `${selectedProvider}-local`
      } else {
        // Cloud: server-side Anthropic API route (persists messages itself)
        const res = await fetch('/api/ai/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            agentId: selectedAgentId,
            userMessage: userMsg,
            taskContext,
            history,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(err.error || 'Request failed')
        }
        const result = await res.json()
        assistantContent = result.message
        provider = 'claude-cloud'
      }

      // Persist local-bridge messages client-side (cloud path already persists server-side)
      if (useLocal) {
        await supabase.from('task_ai_messages').insert([
          { task_id: task.id, agent_id: selectedAgentId, role: 'user', content: userMsg, metadata: { provider } },
          { task_id: task.id, agent_id: selectedAgentId, role: 'assistant', content: assistantContent, metadata: { provider } },
        ])
      }

      // Reload messages from DB
      const { data } = await supabase
        .from('task_ai_messages')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true })
      setMessages((data || []) as AIMessage[])
    } catch (err: any) {
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          task_id: task.id,
          agent_id: selectedAgentId,
          user_id: null,
          role: 'system',
          content: `Erro: ${err.message}. Verifique se a variável ANTHROPIC_API_KEY está configurada no Vercel.`,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  if (taskAgents.length === 0) {
    return (
      <div className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-white/80">Execução com IA</h3>
        </div>
        <p className="text-xs text-white/40">
          Nenhum agente IA atribuído a esta tarefa. Atribua um agente nas propriedades para executar em conjunto.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-white/[0.08] rounded-xl bg-gradient-to-b from-purple-500/[0.03] to-transparent overflow-hidden flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-white/80">Execução com IA</h3>
        </div>

        {/* Provider selector */}
        <div className="flex items-center gap-1 bg-white/[0.02] rounded-lg p-0.5 border border-white/[0.06]">
          <ProviderButton
            active={selectedProvider === 'codex'}
            disabled={!codexAvailable}
            onClick={() => setSelectedProvider('codex')}
            icon={<Terminal size={10} />}
            label="Codex"
            disabledReason="Bridge local não detectado ou Codex CLI não instalado"
            color="green"
          />
          <ProviderButton
            active={selectedProvider === 'claude-code'}
            disabled={!claudeCodeAvailable}
            onClick={() => setSelectedProvider('claude-code')}
            icon={<Terminal size={10} />}
            label="Claude Code"
            disabledReason="Bridge local não detectado ou Claude CLI não instalado"
            color="orange"
          />
          <ProviderButton
            active={selectedProvider === 'claude-cloud'}
            disabled={false}
            onClick={() => setSelectedProvider('claude-cloud')}
            icon={<Cloud size={10} />}
            label="Claude ☁"
            color="blue"
          />
        </div>
        {/* Agent selector */}
        <div className="flex items-center gap-1">
          {taskAgents.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md transition ${
                selectedAgentId === agent.id
                  ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40'
                  : 'bg-white/[0.04] text-white/50 hover:text-white/70'
              }`}
            >
              <Bot size={10} />
              {agent.name}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-white/20">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 mb-3">
              <Bot size={22} className="text-purple-400" />
            </div>
            <p className="text-xs text-white/60 font-medium mb-1">
              {selectedAgent?.name || 'Agente'} pronto para ajudar
            </p>
            <p className="text-[10px] text-white/30 max-w-xs mx-auto">
              Peça para planejar, executar ou gerar algo relacionado a esta tarefa.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} agents={agents} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={1}
            placeholder={`Perguntar ao ${selectedAgent?.name || 'agente'}...`}
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 resize-none max-h-32"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-purple-300 rounded-lg p-2 transition flex-shrink-0"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <div className="text-[9px] text-white/20 mt-1.5 px-1">
          Enter para enviar · Shift+Enter para nova linha
        </div>
      </div>
    </div>
  )
}

function ProviderButton({
  active, disabled, onClick, icon, label, disabledReason, color,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  disabledReason?: string
  color: 'green' | 'orange' | 'blue'
}) {
  const activeColors = {
    green: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/40',
    orange: 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/40',
    blue: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : `Usar ${label}`}
      className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition font-medium ${
        active ? activeColors[color] :
        disabled ? 'text-white/20 cursor-not-allowed opacity-60' :
        'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function MessageBubble({ message, agents }: { message: AIMessage; agents: Agent[] }) {
  const agent = agents.find(a => a.id === message.agent_id)
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="text-center">
        <span className="inline-block text-[10px] text-red-400/80 bg-red-500/10 px-2 py-1 rounded">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-blue-500/20' : 'bg-purple-500/20'
      }`}>
        {isUser ? <User size={10} className="text-blue-300" /> : <Bot size={10} className="text-purple-300" />}
      </div>
      <div className={`max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`text-[9px] mb-0.5 ${isUser ? 'text-blue-300/60' : 'text-purple-300/60'}`}>
          {isUser ? 'Você' : agent?.name || 'Agente'} · {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className={`inline-block text-xs leading-relaxed rounded-lg px-3 py-2 text-left ${
          isUser
            ? 'bg-blue-500/10 text-white/80 border border-blue-500/20'
            : 'bg-white/[0.04] text-white/70 border border-white/[0.06]'
        }`}>
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    </div>
  )
}

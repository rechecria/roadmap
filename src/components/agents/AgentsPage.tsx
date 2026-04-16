'use client'

import { useState, useEffect } from 'react'
import {
  Bot, Cpu, Play, Pause, Clock, CheckCircle2, XCircle, AlertCircle,
  Zap, Settings, MoreHorizontal, ChevronRight, Terminal, Code,
  FileSearch, PenTool, BarChart3, Layers
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { getAgentExecutions } from '@/lib/supabase/queries'
import type { Agent, AgentExecution } from '@/types/database'

const agentTypeIcons: Record<string, React.ReactNode> = {
  general: <Bot size={18} />,
  reviewer: <FileSearch size={18} />,
  tester: <Terminal size={18} />,
  documenter: <PenTool size={18} />,
  analyzer: <BarChart3 size={18} />,
  orchestrator: <Layers size={18} />,
}

const agentTypeLabels: Record<string, string> = {
  general: 'Assistente Geral',
  reviewer: 'Code Reviewer',
  tester: 'Tester Automatizado',
  documenter: 'Documentador',
  analyzer: 'Analisador de Dados',
  orchestrator: 'Orquestrador',
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-yellow-400" />,
  running: <Play size={14} className="text-blue-400" />,
  completed: <CheckCircle2 size={14} className="text-green-400" />,
  failed: <XCircle size={14} className="text-red-400" />,
  cancelled: <AlertCircle size={14} className="text-gray-400" />,
}

export default function AgentsPage() {
  const { agents, currentOrg } = useAppStore()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [executions, setExecutions] = useState<AgentExecution[]>([])
  const [loadingExecs, setLoadingExecs] = useState(false)

  useEffect(() => {
    if (selectedAgent) {
      setLoadingExecs(true)
      getAgentExecutions(selectedAgent.id, 30)
        .then(setExecutions)
        .catch(console.error)
        .finally(() => setLoadingExecs(false))
    }
  }, [selectedAgent?.id])

  // Auto-select first agent
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0])
    }
  }, [agents])

  return (
    <div className="flex-1 h-full overflow-hidden flex bg-[#0a0a0a]">
      {/* Agent List Panel */}
      <div className="w-72 border-r border-white/[0.06] flex flex-col">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white/80">Agentes IA</h2>
          <p className="text-[10px] text-white/25 mt-0.5">
            {agents.length} agente{agents.length !== 1 ? 's' : ''} ativo{agents.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg transition text-left ${
                selectedAgent?.id === agent.id
                  ? 'bg-white/[0.08] ring-1 ring-orange-500/30'
                  : 'hover:bg-white/[0.04]'
              }`}
            >
              <div className="relative mt-0.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedAgent?.id === agent.id ? 'bg-orange-500/20 text-orange-400' : 'bg-white/[0.06] text-white/40'
                }`}>
                  {agentTypeIcons[agent.type] || <Bot size={18} />}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0a] ${
                  agent.is_active ? 'bg-green-500' : 'bg-gray-500'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white/80 truncate">{agent.name}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{agentTypeLabels[agent.type] || agent.type}</div>
                {agent.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {agent.capabilities.slice(0, 3).map(cap => (
                      <span key={cap} className="text-[9px] bg-white/[0.06] text-white/30 px-1.5 py-0.5 rounded">
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <span className="text-[9px] text-white/20">+{agent.capabilities.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          ))}

          {agents.length === 0 && (
            <div className="text-center py-8">
              <Bot size={32} className="mx-auto text-white/10 mb-2" />
              <p className="text-xs text-white/30">Nenhum agente configurado</p>
            </div>
          )}
        </div>

        {/* Add Agent Button */}
        <div className="p-3 border-t border-white/[0.06]">
          <button className="w-full flex items-center justify-center gap-2 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition text-xs font-medium">
            <Zap size={14} />
            Novo Agente
          </button>
        </div>
      </div>

      {/* Agent Detail Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedAgent ? (
          <>
            {/* Agent Header */}
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                    {agentTypeIcons[selectedAgent.type] || <Bot size={24} />}
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">{selectedAgent.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/40">{agentTypeLabels[selectedAgent.type]}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        selectedAgent.is_active
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {selectedAgent.is_active ? '● Online' : '○ Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white/[0.06] rounded-lg transition text-white/30 hover:text-white/60">
                    <Settings size={16} />
                  </button>
                  <button className="p-2 hover:bg-white/[0.06] rounded-lg transition text-white/30 hover:text-white/60">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>

              {selectedAgent.description && (
                <p className="text-sm text-white/40 mt-3 max-w-2xl">{selectedAgent.description}</p>
              )}

              {/* Agent Stats */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-white/25 uppercase tracking-wider">Execuções</div>
                  <div className="text-xl font-bold text-white mt-1">{executions.length}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-white/25 uppercase tracking-wider">Sucesso</div>
                  <div className="text-xl font-bold text-green-400 mt-1">
                    {executions.filter(e => e.status === 'completed').length}
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-white/25 uppercase tracking-wider">Falhas</div>
                  <div className="text-xl font-bold text-red-400 mt-1">
                    {executions.filter(e => e.status === 'failed').length}
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-[10px] text-white/25 uppercase tracking-wider">Capabilities</div>
                  <div className="text-xl font-bold text-white mt-1">{selectedAgent.capabilities.length}</div>
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div className="px-6 py-3 border-b border-white/[0.06]">
              <h3 className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Capabilities</h3>
              <div className="flex flex-wrap gap-2">
                {selectedAgent.capabilities.map(cap => (
                  <span key={cap} className="text-xs bg-white/[0.06] text-white/50 px-3 py-1 rounded-lg">
                    {cap}
                  </span>
                ))}
                {selectedAgent.mcp_server_url && (
                  <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg flex items-center gap-1">
                    <Code size={12} />
                    MCP: {selectedAgent.mcp_server_url}
                  </span>
                )}
              </div>
            </div>

            {/* Execution Log */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <h3 className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">
                Histórico de Execuções
              </h3>

              {loadingExecs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                </div>
              ) : executions.length > 0 ? (
                <div className="space-y-2">
                  {executions.map(exec => (
                    <div
                      key={exec.id}
                      className="flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-lg transition cursor-pointer group"
                    >
                      <div className="mt-0.5">{statusIcons[exec.status]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white/70">{exec.action}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            exec.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                            exec.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                            exec.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-white/[0.06] text-white/30'
                          }`}>
                            {exec.status}
                          </span>
                        </div>
                        {exec.task_title && (
                          <div className="text-[10px] text-white/30 mt-0.5">Tarefa: {exec.task_title}</div>
                        )}
                        <div className="text-[10px] text-white/20 mt-0.5">
                          {new Date(exec.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-white/10 group-hover:text-white/30 transition mt-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Terminal size={32} className="mx-auto text-white/10 mb-3" />
                  <p className="text-sm text-white/30 mb-1">Sem execuções registradas</p>
                  <p className="text-xs text-white/15">As execuções deste agente aparecerão aqui</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Bot size={48} className="mx-auto text-white/10 mb-3" />
              <p className="text-sm text-white/30">Selecione um agente para ver detalhes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

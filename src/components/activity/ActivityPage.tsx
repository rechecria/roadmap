'use client'

import { useState, useEffect } from 'react'
import {
  Activity, User, Bot, Settings, CheckCircle2, Plus, Edit3,
  Trash2, MessageSquare, GitBranch, Zap, Clock, Filter
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { getActivityLog } from '@/lib/supabase/queries'
import type { ActivityEntry } from '@/types/database'

const actionIcons: Record<string, React.ReactNode> = {
  created: <Plus size={14} className="text-green-400" />,
  updated: <Edit3 size={14} className="text-blue-400" />,
  deleted: <Trash2 size={14} className="text-red-400" />,
  completed: <CheckCircle2 size={14} className="text-green-400" />,
  commented: <MessageSquare size={14} className="text-purple-400" />,
  deployed: <GitBranch size={14} className="text-cyan-400" />,
  executed: <Zap size={14} className="text-yellow-400" />,
}

const actorTypeIcons: Record<string, React.ReactNode> = {
  user: <User size={12} />,
  agent: <Bot size={12} />,
  system: <Settings size={12} />,
}

function getActionIcon(action: string) {
  for (const [key, icon] of Object.entries(actionIcons)) {
    if (action.toLowerCase().includes(key)) return icon
  }
  return <Activity size={14} className="text-white/30" />
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}m atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays < 7) return `${diffDays}d atrás`
  return date.toLocaleDateString('pt-BR')
}

function groupByDate(entries: ActivityEntry[]): Record<string, ActivityEntry[]> {
  const groups: Record<string, ActivityEntry[]> = {}
  for (const entry of entries) {
    const date = new Date(entry.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let key: string
    if (date.toDateString() === today.toDateString()) {
      key = 'Hoje'
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Ontem'
    } else {
      key = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    }

    if (!groups[key]) groups[key] = []
    groups[key].push(entry)
  }
  return groups
}

export default function ActivityPage() {
  const { currentProject, currentOrg } = useAppStore()
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'user' | 'agent' | 'system'>('all')

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true)
        if (currentProject) {
          const log = await getActivityLog(currentProject.id, 100)
          setActivities(log)
        }
      } catch (err) {
        console.error('Failed to load activity:', err)
      } finally {
        setLoading(false)
      }
    }
    loadActivity()
  }, [currentProject?.id])

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.actor_type === filter)

  const grouped = groupByDate(filteredActivities)

  return (
    <div className="flex-1 h-full overflow-auto bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Atividade</h1>
            <p className="text-xs text-white/30 mt-0.5">
              Histórico de ações no {currentProject?.name || 'projeto'}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white/[0.03] rounded-lg p-1 w-fit">
          {[
            { key: 'all', label: 'Todos', icon: <Activity size={12} /> },
            { key: 'user', label: 'Pessoas', icon: <User size={12} /> },
            { key: 'agent', label: 'Agentes', icon: <Bot size={12} /> },
            { key: 'system', label: 'Sistema', icon: <Settings size={12} /> },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                filter === f.key ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Activity Timeline */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : Object.keys(grouped).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, entries]) => (
              <div key={date}>
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3">
                  {date}
                </div>
                <div className="space-y-1">
                  {entries.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 hover:bg-white/[0.02] rounded-lg transition group"
                    >
                      {/* Timeline dot */}
                      <div className="mt-0.5 flex-shrink-0">
                        {getActionIcon(entry.action)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 text-xs">
                            <span className="text-white/20">{actorTypeIcons[entry.actor_type]}</span>
                            <span className="font-medium text-white/60">
                              {entry.actor_name || (entry.actor_type === 'system' ? 'Sistema' : 'Desconhecido')}
                            </span>
                          </span>
                          <span className="text-xs text-white/40">{entry.action}</span>
                          <span className="text-xs text-white/25">{entry.entity_type}</span>
                        </div>
                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <div className="text-[10px] text-white/20 mt-0.5 truncate">
                            {JSON.stringify(entry.metadata).slice(0, 100)}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-[10px] text-white/15 flex-shrink-0 flex items-center gap-1">
                        <Clock size={10} />
                        {formatRelativeTime(entry.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Activity size={40} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm text-white/30 mb-1">Sem atividade registrada</p>
            <p className="text-xs text-white/15">
              {filter !== 'all'
                ? 'Tente mudar o filtro para ver mais atividades'
                : 'As ações no projeto aparecerão aqui automaticamente'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
import { useTaskStore } from '@/stores/task-store'
import { ChevronLeft, User, CheckCircle2, Clock, Circle, AlertCircle, ArrowRight, Bot, Calendar } from 'lucide-react'
import type { Task } from '@/types/database'

export default function MePage() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params?.workspaceId as string

  const { currentUserId, currentProject, orgMembers } = useAppStore()
  const { tasks, statuses } = useTaskStore()

  const me = orgMembers.find(m => m.user_id === currentUserId)

  const myTasks = useMemo(() => {
    if (!currentUserId) return []
    return tasks
      .filter(t => t.executor_id === currentUserId || t.reviewer_id === currentUserId || t.follower_id === currentUserId)
      .sort((a, b) => {
        const aDate = a.start_date || a.due_date || ''
        const bDate = b.start_date || b.due_date || ''
        return aDate.localeCompare(bDate)
      })
  }, [tasks, currentUserId])

  const asExecutor = myTasks.filter(t => t.executor_id === currentUserId)
  const asReviewer = myTasks.filter(t => t.reviewer_id === currentUserId)
  const asFollower = myTasks.filter(t => t.follower_id === currentUserId)

  const statusCategoryMap = statuses.reduce<Record<string, string>>((acc, s) => {
    acc[s.id] = s.category
    return acc
  }, {})

  const stats = {
    done: asExecutor.filter(t => statusCategoryMap[t.status_id || ''] === 'done').length,
    inProgress: asExecutor.filter(t => statusCategoryMap[t.status_id || ''] === 'in_progress').length,
    pending: asExecutor.filter(t => ['backlog', 'todo'].includes(statusCategoryMap[t.status_id || ''] || '')).length,
    overdue: asExecutor.filter(t => {
      const cat = statusCategoryMap[t.status_id || '']
      if (cat === 'done' || cat === 'cancelled') return false
      const due = t.due_date || t.end_date
      if (!due) return false
      return new Date(due) < new Date()
    }).length,
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back */}
        <button
          onClick={() => router.push(`/${workspaceId}`)}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition mb-6"
        >
          <ChevronLeft size={14} /> Voltar
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-xl font-bold text-white">
            {me?.display_name ? me.display_name[0].toUpperCase() : <User size={24} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{me?.display_name || 'Você'}</h1>
            <p className="text-sm text-white/40 mt-1">
              Sua sequência de tarefas em <span className="text-orange-400">{currentProject?.name || 'projeto'}</span>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <StatCard icon={<Circle size={14} />} label="Pendentes" value={stats.pending} color="text-white/50" />
          <StatCard icon={<Clock size={14} />} label="Em progresso" value={stats.inProgress} color="text-blue-400" />
          <StatCard icon={<CheckCircle2 size={14} />} label="Concluídas" value={stats.done} color="text-emerald-400" />
          <StatCard icon={<AlertCircle size={14} />} label="Atrasadas" value={stats.overdue} color="text-red-400" />
        </div>

        {/* Sequência como executor */}
        {asExecutor.length > 0 && (
          <Section title="Minha sequência (executor)" count={asExecutor.length} icon="⚡">
            <TaskSequence tasks={asExecutor} statuses={statuses} workspaceId={workspaceId} />
          </Section>
        )}

        {asReviewer.length > 0 && (
          <Section title="Preciso revisar" count={asReviewer.length} icon="🔍">
            <TaskList tasks={asReviewer} statuses={statuses} workspaceId={workspaceId} />
          </Section>
        )}

        {asFollower.length > 0 && (
          <Section title="Acompanhando" count={asFollower.length} icon="👁️">
            <TaskList tasks={asFollower} statuses={statuses} workspaceId={workspaceId} />
          </Section>
        )}

        {myTasks.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/[0.04] mb-4">
              <User size={28} className="text-white/20" />
            </div>
            <p className="text-white/40 text-sm">Nenhuma tarefa atribuída a você ainda</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wide mb-2 ${color}`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span>{icon}</span>
        <h2 className="text-sm font-semibold text-white/80">{title}</h2>
        <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {children}
    </div>
  )
}

function TaskSequence({ tasks, statuses, workspaceId }: { tasks: Task[]; statuses: any[]; workspaceId: string }) {
  const router = useRouter()

  return (
    <div className="space-y-0">
      {tasks.map((task, idx) => {
        const status = statuses.find(s => s.id === task.status_id)
        const isLast = idx === tasks.length - 1
        return (
          <div key={task.id} className="relative">
            {!isLast && (
              <div className="absolute left-[18px] top-10 bottom-0 w-px bg-gradient-to-b from-orange-500/30 to-transparent" />
            )}
            <div
              onClick={() => router.push(`/${workspaceId}/task/${task.id}`)}
              className="flex items-start gap-3 pb-4 cursor-pointer group"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ring-2 ring-[#0a0a0a] relative z-10"
                style={{ background: status?.color ? `${status.color}66` : '#33333366' }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-3 transition group-hover:border-orange-500/30">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 font-medium">{task.title}</div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/40">
                      {status && (
                        <span className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
                          {status.name}
                        </span>
                      )}
                      {(task.start_date || task.due_date) && (
                        <span className="flex items-center gap-1">
                          <Calendar size={9} />
                          {new Date(task.start_date || task.due_date!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          {task.end_date && ` → ${new Date(task.end_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                        </span>
                      )}
                      {task.task_agents && task.task_agents.length > 0 && (
                        <span className="flex items-center gap-1 text-purple-300/70">
                          <Bot size={9} />
                          {task.task_agents.length} agente{task.task_agents.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-white/20 group-hover:text-orange-400 group-hover:translate-x-0.5 transition flex-shrink-0 mt-1" />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskList({ tasks, statuses, workspaceId }: { tasks: Task[]; statuses: any[]; workspaceId: string }) {
  const router = useRouter()
  return (
    <div className="space-y-2">
      {tasks.map(task => {
        const status = statuses.find(s => s.id === task.status_id)
        return (
          <div
            key={task.id}
            onClick={() => router.push(`/${workspaceId}/task/${task.id}`)}
            className="flex items-center gap-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 cursor-pointer transition group"
          >
            {status && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: status.color }} />}
            <div className="flex-1 text-sm text-white/70 truncate">{task.title}</div>
            <ArrowRight size={12} className="text-white/20 group-hover:text-white/50 transition" />
          </div>
        )
      })}
    </div>
  )
}

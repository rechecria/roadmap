'use client'

import { useAppStore } from '@/stores/app-store'
import { useTaskStore } from '@/stores/task-store'
import {
  FolderKanban, CheckCircle2, Clock, AlertTriangle, Bot,
  Users, TrendingUp, ArrowRight
} from 'lucide-react'

export default function ProjectDashboard() {
  const { currentProject, currentOrg, projects, agents } = useAppStore()
  const { tasks, statuses } = useTaskStore()

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed_at).length
  const inProgressTasks = tasks.filter(t => {
    const status = statuses.find(s => s.id === t.status_id)
    return status?.category === 'in_progress'
  }).length
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !t.completed_at).length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{currentProject?.icon || '📋'}</span>
          <div>
            <h1 className="text-xl font-bold text-white">{currentProject?.name || 'Dashboard'}</h1>
            <p className="text-sm text-white/40">{currentOrg?.name} • {currentProject?.description || 'Visão geral do projeto'}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<FolderKanban size={18} />}
          label="Total de Tarefas"
          value={totalTasks}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Concluídas"
          value={completedTasks}
          color="text-green-400"
          bgColor="bg-green-500/10"
          subtitle={`${progress}% completo`}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Em Progresso"
          value={inProgressTasks}
          color="text-orange-400"
          bgColor="bg-orange-500/10"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Atrasadas"
          value={overdueTasks}
          color="text-red-400"
          bgColor="bg-red-500/10"
        />
      </div>

      {/* Progress Bar */}
      <div className="mb-8 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/60">Progresso Geral</span>
          <span className="text-sm font-bold text-white">{progress}%</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-white/25">
          <span>{completedTasks} concluídas</span>
          <span>{inProgressTasks} em andamento</span>
          <span>{totalTasks - completedTasks - inProgressTasks} pendentes</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/70">Tarefas Recentes</h3>
            <button className="text-[10px] text-orange-400/60 hover:text-orange-400 transition flex items-center gap-1">
              Ver todas <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 5).map(task => {
              const status = statuses.find(s => s.id === task.status_id)
              return (
                <div key={task.id} className="flex items-center gap-2 py-1.5 group cursor-pointer hover:bg-white/[0.02] rounded px-2 -mx-2 transition">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: status?.color || '#666' }}
                  />
                  <span className="text-xs text-white/60 group-hover:text-white/80 truncate flex-1 transition">
                    {task.title}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    task.priority === 'urgent' ? 'bg-red-500/15 text-red-400' :
                    task.priority === 'high' ? 'bg-orange-500/15 text-orange-400' :
                    'bg-white/[0.04] text-white/30'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              )
            })}
            {tasks.length === 0 && (
              <p className="text-xs text-white/20 text-center py-4">Nenhuma tarefa ainda</p>
            )}
          </div>
        </div>

        {/* Active Agents */}
        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/70">Agentes IA</h3>
            <span className="text-[10px] text-green-400/60 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {agents.filter(a => a.is_active).length} ativos
            </span>
          </div>
          <div className="space-y-2">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center gap-3 py-2 px-2 -mx-2 hover:bg-white/[0.02] rounded transition cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                  <Bot size={16} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white/60">{agent.name}</div>
                  <div className="text-[10px] text-white/25">{agent.description?.substring(0, 50)}...</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
              </div>
            ))}
            {agents.length === 0 && (
              <p className="text-xs text-white/20 text-center py-4">Nenhum agente configurado</p>
            )}
          </div>
        </div>
      </div>

      {/* All Projects Overview */}
      {projects.length > 1 && (
        <div className="mt-6 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Todos os Projetos</h3>
          <div className="grid grid-cols-3 gap-3">
            {projects.map(project => {
              const prog = project.task_count > 0
                ? Math.round((project.completed_count / project.task_count) * 100) : 0
              return (
                <div key={project.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/[0.08] transition cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{project.icon || '📋'}</span>
                    <span className="text-xs font-medium text-white/60 truncate">{project.name}</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${prog}%`, backgroundColor: project.color }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/20">
                    <span>{project.completed_count}/{project.task_count} tarefas</span>
                    <span>{project.member_count} membros</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color, bgColor, subtitle }: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  bgColor: string
  subtitle?: string
}) {
  return (
    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition">
      <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-[11px] text-white/40">{label}</div>
      {subtitle && <div className="text-[10px] text-green-400/60 mt-1">{subtitle}</div>}
    </div>
  )
}

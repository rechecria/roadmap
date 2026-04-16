'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTaskStore } from '@/stores/task-store'
import { useAppStore } from '@/stores/app-store'
import { updateTask } from '@/lib/supabase/queries'
import {
  Plus, Clock, User, Bot,
  ChevronDown, LayoutGrid, List, Map
} from 'lucide-react'
import type { Task, TaskStatus } from '@/types/database'
import CanvasView from './CanvasView'

export default function KanbanBoard() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params?.workspaceId as string

  const { tasks: allTasks, statuses, filteredTasks, tasksByStatus, updateTask: updateLocalTask, viewMode, setViewMode, members, agents } = useTaskStore()
  const { currentProject, currentUserId, myTasksOnly, setMyTasksOnly } = useAppStore()

  // Apply "My Tasks" filter on top of existing task filtering
  const tasks = myTasksOnly && currentUserId
    ? allTasks.filter(t => t.executor_id === currentUserId || t.reviewer_id === currentUserId || t.follower_id === currentUserId)
    : allTasks
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  // Re-group tasks by status using the filtered (possibly "my tasks only") list
  const grouped = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.status_id || '_no_status'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  async function handleDrop(statusId: string) {
    if (!draggedTaskId) return
    const task = tasks.find(t => t.id === draggedTaskId)
    if (!task || task.status_id === statusId) {
      setDraggedTaskId(null)
      setDragOverColumn(null)
      return
    }

    updateLocalTask(draggedTaskId, {
      status_id: statusId,
      completed_at: statuses.find(s => s.id === statusId)?.category === 'done'
        ? new Date().toISOString()
        : undefined
    })

    try {
      await updateTask(draggedTaskId, {
        status_id: statusId,
        completed_at: statuses.find(s => s.id === statusId)?.category === 'done'
          ? new Date().toISOString()
          : null
      } as any)
    } catch (err) {
      console.error('Failed to update task status:', err)
    }

    setDraggedTaskId(null)
    setDragOverColumn(null)
  }

  const handleTaskClick = (task: Task) => {
    if (workspaceId && task.id) {
      router.push(`/${workspaceId}/task/${task.id}`)
    }
  }

  return (
    <div className="flex-1 overflow-hidden bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{currentProject?.icon || '📋'}</span>
          <h2 className="text-base font-semibold text-white">{currentProject?.name || 'Tarefas'}</h2>
          <span className="text-xs text-white/25 bg-white/[0.04] px-2 py-0.5 rounded-full">
            {tasks.length} tarefas
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMyTasksOnly(!myTasksOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition border ${
              myTasksOnly
                ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60'
            }`}
            title="Mostrar apenas tarefas onde sou executor, revisor ou acompanhador"
          >
            <User size={13} />
            {myTasksOnly ? 'Minhas tarefas' : 'Todas tarefas'}
          </button>

          <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5">
            {([
              { mode: 'kanban' as const, icon: LayoutGrid, label: 'Kanban' },
              { mode: 'list' as const, icon: List, label: 'Lista' },
              { mode: 'canvas' as const, icon: Map, label: 'Canvas' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition ${
                  viewMode === mode
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Columns */}
      {viewMode === 'kanban' && (
      <div className="flex gap-4 p-6 overflow-x-auto h-[calc(100vh-130px)]">
        {statuses.map(status => {
          const columnTasks = grouped[status.id] || []
          const isOver = dragOverColumn === status.id

          return (
            <div
              key={status.id}
              className={`flex-shrink-0 w-[300px] flex flex-col rounded-xl transition ${
                isOver ? 'ring-1 ring-orange-500/30' : ''
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumn(status.id) }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={() => handleDrop(status.id)}
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="text-xs font-semibold text-white/60">{status.name}</span>
                <span className="text-[10px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded-full ml-1">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex-1 space-y-2 overflow-y-auto px-1 pb-4">
                {columnTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDragging={draggedTaskId === task.id}
                    onDragStart={() => setDraggedTaskId(task.id)}
                    onClick={() => handleTaskClick(task)}
                    currentUserId={currentUserId}
                  />
                ))}

                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-white/10 text-xs">
                    Arraste tarefas aqui
                  </div>
                )}

                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/15 hover:text-white/30 hover:bg-white/[0.02] rounded-lg transition">
                  <Plus size={12} />
                  <span>Nova tarefa</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <ListView
          tasks={tasks}
          statuses={statuses}
          tasksByStatus={grouped}
          onTaskClick={handleTaskClick}
        />
      )}

      {/* Canvas/Timeline View */}
      {viewMode === 'canvas' && (
        <CanvasView
          tasks={tasks}
          statuses={statuses}
          onTaskClick={handleTaskClick}
        />
      )}
    </div>
  )
}

function ListView({
  tasks,
  statuses,
  tasksByStatus,
  onTaskClick
}: {
  tasks: Task[]
  statuses: TaskStatus[]
  tasksByStatus: Record<string, Task[]>
  onTaskClick: (task: Task) => void
}) {
  const [expandedStatuses, setExpandedStatuses] = useState<Set<string>>(
    new Set(statuses.map(s => s.id))
  )

  const toggleStatus = (statusId: string) => {
    const newExpanded = new Set(expandedStatuses)
    if (newExpanded.has(statusId)) {
      newExpanded.delete(statusId)
    } else {
      newExpanded.add(statusId)
    }
    setExpandedStatuses(newExpanded)
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {/* Table Header */}
      <div className="flex items-center gap-3 px-4 py-2 text-[10px] text-white/25 uppercase tracking-wider border-b border-white/[0.06] mb-2">
        <div className="w-7" />
        <div className="flex-1">Tarefa</div>
        <div className="w-24 text-center">Revisor</div>
        <div className="w-20 text-center">Prioridade</div>
        <div className="w-16 text-center">Agentes</div>
        <div className="w-24 text-center">Prazo</div>
      </div>

      <div className="space-y-2">
        {statuses.map(status => {
          const statusTasks = tasksByStatus[status.id] || []
          const isExpanded = expandedStatuses.has(status.id)

          return (
            <div key={status.id} className="border border-white/[0.06] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleStatus(status.id)}
                className="w-full px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition flex items-center gap-3"
              >
                <ChevronDown
                  size={16}
                  className={`text-white/30 transition ${isExpanded ? '' : '-rotate-90'}`}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm font-semibold text-white/70">{status.name}</span>
                <span className="text-xs text-white/20 bg-white/[0.04] px-2 py-0.5 rounded-full">
                  {statusTasks.length}
                </span>
              </button>

              {isExpanded && (
                <div className="divide-y divide-white/[0.06]">
                  {statusTasks.length === 0 ? (
                    <div className="px-4 py-4 text-center text-white/10 text-xs">
                      Nenhuma tarefa
                    </div>
                  ) : (
                    statusTasks.map(task => {
                      const executorName = task.executor_name || task.assignee_name
                      return (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="w-full px-4 py-3 hover:bg-white/[0.02] transition flex items-center gap-3 text-left group"
                      >
                        {/* Executor Avatar */}
                        {executorName ? (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${getAvatarColor(executorName)}`} title={executorName}>
                            {getInitials(executorName)}
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-white/[0.04] text-white/20">
                            <User size={12} />
                          </div>
                        )}

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/70 group-hover:text-white transition truncate">
                            {task.title}
                          </p>
                          {executorName && (
                            <p className="text-[10px] text-white/25 mt-0.5">{executorName}</p>
                          )}
                        </div>

                        {/* Reviewer */}
                        <div className="w-24 flex justify-center">
                          {task.reviewer_name ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                              <User size={10} className="text-emerald-400" />
                              <span className="text-[10px] text-emerald-300 truncate max-w-[60px]">{task.reviewer_name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/15">-</span>
                          )}
                        </div>

                        {/* Priority Badge */}
                        <div className="w-20 flex justify-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            task.priority === 'urgent' ? 'bg-red-500/15 text-red-400' :
                            task.priority === 'high' ? 'bg-orange-500/15 text-orange-400' :
                            task.priority === 'medium' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-white/[0.04] text-white/30'
                          }`}>
                            {task.priority}
                          </span>
                        </div>

                        {/* Agents */}
                        <div className="w-16 flex justify-center gap-0.5">
                          {task.task_agents && task.task_agents.length > 0 ? (
                            <div className="flex -space-x-1">
                              {task.task_agents.slice(0, 3).map((ta, i) => (
                                <div key={i} className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center" title={ta.agent_name}>
                                  <Bot size={9} className="text-purple-400" />
                                </div>
                              ))}
                              {task.task_agents.length > 3 && (
                                <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center">
                                  <span className="text-[8px] text-white/40">+{task.task_agents.length - 3}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/15">-</span>
                          )}
                        </div>

                        {/* Due Date */}
                        <div className="w-24 flex justify-center">
                          {task.due_date ? (
                            <span className={`text-[10px] flex items-center gap-1 ${
                              new Date(task.due_date) < new Date() && !task.completed_at
                                ? 'text-red-400'
                                : 'text-white/25'
                            }`}>
                              <Clock size={10} />
                              {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-white/15">-</span>
                          )}
                        </div>
                      </button>
                    )})
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const avatarColors = [
  'bg-blue-500/30 text-blue-300',
  'bg-emerald-500/30 text-emerald-300',
  'bg-orange-500/30 text-orange-300',
  'bg-pink-500/30 text-pink-300',
  'bg-violet-500/30 text-violet-300',
  'bg-cyan-500/30 text-cyan-300',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function TaskCard({ task, isDragging, onDragStart, onClick, currentUserId }: {
  task: Task
  isDragging: boolean
  onDragStart: () => void
  onClick?: () => void
  currentUserId?: string | null
}) {
  const priorityColors = {
    urgent: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-blue-500',
    low: 'border-l-gray-500'
  }

  const executorName = task.executor_name || task.assignee_name
  const isMine = currentUserId && (task.executor_id === currentUserId || task.reviewer_id === currentUserId || task.follower_id === currentUserId)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`bg-white/[0.03] border rounded-lg p-3 cursor-grab active:cursor-grabbing
        hover:border-white/[0.1] transition group border-l-2 ${priorityColors[task.priority]}
        ${isMine ? 'border-orange-500/30 ring-1 ring-orange-500/10' : 'border-white/[0.06]'}
        ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
      `}
    >
      {/* Top row: Avatar + Title */}
      <div className="flex items-start gap-2.5 mb-2">
        {executorName ? (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${getAvatarColor(executorName)}`} title={executorName}>
            {getInitials(executorName)}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-white/[0.04] text-white/20">
            <User size={12} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="text-xs font-medium text-white/70 leading-relaxed flex-1">
              {task.title}
            </div>
            {isMine && (
              <span className="text-[8px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded flex-shrink-0">
                Você
              </span>
            )}
          </div>
          {executorName && (
            <div className="text-[9px] text-white/30 mt-0.5">{executorName}</div>
          )}
        </div>
      </div>

      {/* Description preview */}
      {task.description && (
        <div className="text-[10px] text-white/25 mb-2 line-clamp-2 pl-[36px]">
          {task.description}
        </div>
      )}

      {/* Reviewer badge */}
      {task.reviewer_name && (
        <div className="flex flex-wrap gap-1 mb-2 pl-[36px]">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded text-[9px] text-emerald-300">
            <User size={8} /> Revisor: {task.reviewer_name}
          </div>
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Priority badge */}
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
          task.priority === 'urgent' ? 'bg-red-500/15 text-red-400' :
          task.priority === 'high' ? 'bg-orange-500/15 text-orange-400' :
          task.priority === 'medium' ? 'bg-blue-500/15 text-blue-400' :
          'bg-white/[0.04] text-white/30'
        }`}>
          {task.priority}
        </span>

        {/* Due date */}
        {task.due_date && (
          <span className={`text-[9px] flex items-center gap-0.5 ${
            new Date(task.due_date) < new Date() && !task.completed_at
              ? 'text-red-400'
              : 'text-white/25'
          }`}>
            <Clock size={9} />
            {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}

        <div className="flex-1" />

        {/* AI Agents */}
        {task.task_agents && task.task_agents.length > 0 && (
          <div className="flex -space-x-1">
            {task.task_agents.slice(0, 2).map((ta, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center" title={ta.agent_name}>
                <Bot size={9} className="text-purple-400" />
              </div>
            ))}
            {task.task_agents.length > 2 && (
              <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center">
                <span className="text-[8px] text-white/40">+{task.task_agents.length - 2}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

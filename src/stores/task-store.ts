import { create } from 'zustand'
import type { Task, TaskStatus, TaskLabel, OrgMember, Agent } from '@/types/database'

export type ViewMode = 'kanban' | 'list' | 'canvas'

interface TaskState {
  tasks: Task[]
  statuses: TaskStatus[]
  labels: TaskLabel[]
  members: OrgMember[]
  agents: Agent[]
  selectedTaskId: string | null
  filterStatus: string | null
  filterPriority: string | null
  filterAssignee: string | null
  searchQuery: string
  viewMode: ViewMode

  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  setStatuses: (statuses: TaskStatus[]) => void
  setLabels: (labels: TaskLabel[]) => void
  setMembers: (members: OrgMember[]) => void
  setAgents: (agents: Agent[]) => void
  setSelectedTask: (id: string | null) => void
  setFilterStatus: (status: string | null) => void
  setFilterPriority: (priority: string | null) => void
  setFilterAssignee: (assignee: string | null) => void
  setSearchQuery: (query: string) => void
  setViewMode: (mode: ViewMode) => void

  // Computed
  filteredTasks: () => Task[]
  tasksByStatus: () => Record<string, Task[]>
  getMemberName: (userId?: string) => string
  getAgentName: (agentId?: string) => string
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  statuses: [],
  labels: [],
  members: [],
  agents: [],
  selectedTaskId: null,
  filterStatus: null,
  filterPriority: null,
  filterAssignee: null,
  searchQuery: '',
  viewMode: 'kanban',

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, updates) => set((s) => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  removeTask: (id) => set((s) => ({
    tasks: s.tasks.filter(t => t.id !== id)
  })),
  setStatuses: (statuses) => set({ statuses }),
  setLabels: (labels) => set({ labels }),
  setMembers: (members) => set({ members }),
  setAgents: (agents) => set({ agents }),
  setSelectedTask: (id) => set({ selectedTaskId: id }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setFilterPriority: (filterPriority) => set({ filterPriority }),
  setFilterAssignee: (filterAssignee) => set({ filterAssignee }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setViewMode: (viewMode) => set({ viewMode }),

  filteredTasks: () => {
    const { tasks, filterStatus, filterPriority, filterAssignee, searchQuery } = get()
    return tasks.filter(t => {
      if (t.is_deleted) return false
      if (filterStatus && t.status_id !== filterStatus) return false
      if (filterPriority && t.priority !== filterPriority) return false
      if (filterAssignee && t.assignee_id !== filterAssignee && t.executor_id !== filterAssignee) return false
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  },

  tasksByStatus: () => {
    const tasks = get().filteredTasks()
    const statuses = get().statuses
    const grouped: Record<string, Task[]> = {}
    statuses.forEach(s => { grouped[s.id] = [] })
    tasks.forEach(t => {
      const key = t.status_id || 'unassigned'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    })
    return grouped
  },

  getMemberName: (userId?: string) => {
    if (!userId) return ''
    const member = get().members.find(m => m.user_id === userId)
    return member?.display_name || ''
  },

  getAgentName: (agentId?: string) => {
    if (!agentId) return ''
    const agent = get().agents.find(a => a.id === agentId)
    return agent?.name || ''
  },
}))

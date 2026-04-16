'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  FileText, Plus, Search, Settings, MoreHorizontal, ChevronDown, ChevronRight,
  FolderKanban, Bot, Users, Activity, LayoutDashboard, Zap, Building2,
  CheckCircle2, Circle, Clock, AlertCircle
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import type { ActiveView } from '@/stores/app-store'
import { useTaskStore } from '@/stores/task-store'
import { usePagesStore } from '@/stores/pages-store'
import { useUIStore } from '@/stores/ui-store'
import { getOrganizations, getProjects, getAgents, getTasksByWorkspace, getTaskStatuses, getOrgMembers, getAllTaskAgents } from '@/lib/supabase/queries'
import Link from 'next/link'

export default function Sidebar() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params?.workspaceId as string

  const { sidebarOpen } = useUIStore()
  const {
    currentOrg, currentProject, organizations, projects, agents, activeView,
    setCurrentOrg, setCurrentProject, setOrganizations, setProjects, setAgents, setLoading, setActiveView
  } = useAppStore()
  const { setTasks, setStatuses, setMembers, setAgents: setTaskAgents } = useTaskStore()
  const { sidebarPages } = usePagesStore()

  const [isResizing, setIsResizing] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  // activeView is now shared via app store
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false)
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [agentsExpanded, setAgentsExpanded] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const orgs = await getOrganizations()
        setOrganizations(orgs)
        if (orgs.length > 0 && !currentOrg) {
          setCurrentOrg(orgs[0])
          const projs = await getProjects(orgs[0].id)
          setProjects(projs)
          const ags = await getAgents(orgs[0].id)
          setAgents(ags)

          // Load org members for role display
          const members = await getOrgMembers(orgs[0].id)
          setMembers(members)
          setTaskAgents(ags)

          // Auto-select first project
          if (projs.length > 0) {
            setCurrentProject(projs[0])
            // Load tasks for the project's workspace
            if (projs[0].workspace_id) {
              const [tasks, statuses, taskAgentsMap] = await Promise.all([
                getTasksByWorkspace(projs[0].workspace_id),
                getTaskStatuses(projs[0].workspace_id),
                getAllTaskAgents(projs[0].id),
              ])
              // Enrich tasks with member names and agents
              const enrichedTasks = tasks.map(t => ({
                ...t,
                executor_name: members.find(m => m.user_id === t.executor_id)?.display_name,
                reviewer_name: members.find(m => m.user_id === t.reviewer_id)?.display_name,
                follower_name: members.find(m => m.user_id === t.follower_id)?.display_name,
                task_agents: taskAgentsMap[t.id] || [],
              }))
              setTasks(enrichedTasks)
              setStatuses(statuses)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load sidebar data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Switch org handler
  async function handleOrgSwitch(org: typeof organizations[0]) {
    setCurrentOrg(org)
    setShowOrgSwitcher(false)
    const [projs, ags, members] = await Promise.all([
      getProjects(org.id),
      getAgents(org.id),
      getOrgMembers(org.id),
    ])
    setProjects(projs)
    setAgents(ags)
    setMembers(members)
    setTaskAgents(ags)
    if (projs.length > 0) {
      setCurrentProject(projs[0])
    }
  }

  // Switch project handler
  async function handleProjectSwitch(project: typeof projects[0]) {
    setCurrentProject(project)
    if (project.workspace_id) {
      const { members } = useTaskStore.getState()
      const [tasks, statuses, taskAgentsMap] = await Promise.all([
        getTasksByWorkspace(project.workspace_id),
        getTaskStatuses(project.workspace_id),
        getAllTaskAgents(project.id),
      ])
      const enrichedTasks = tasks.map(t => ({
        ...t,
        executor_name: members.find(m => m.user_id === t.executor_id)?.display_name,
        reviewer_name: members.find(m => m.user_id === t.reviewer_id)?.display_name,
        follower_name: members.find(m => m.user_id === t.follower_id)?.display_name,
        task_agents: taskAgentsMap[t.id] || [],
      }))
      setTasks(enrichedTasks)
      setStatuses(statuses)
    }
  }

  // Resize logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      setSidebarWidth(Math.max(240, Math.min(400, e.clientX)))
    }
    const handleMouseUp = () => setIsResizing(false)
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing])

  if (!sidebarOpen) return null

  return (
    <>
      <div
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className="flex flex-col h-screen bg-[#111111] border-r border-white/[0.06] select-none"
      >
        {/* ===== ORG HEADER ===== */}
        <div className="px-3 py-3 border-b border-white/[0.06]">
          <button
            onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 hover:bg-white/[0.04] rounded-lg transition"
          >
            <span className="text-lg">{currentOrg?.icon || '🗺️'}</span>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {currentOrg?.name || 'roadMap'}
              </div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">
                {currentOrg?.slug || 'workspace'}
              </div>
            </div>
            <ChevronDown size={14} className="text-white/30" />
          </button>

          {/* Org Dropdown */}
          {showOrgSwitcher && (
            <div className="mt-1 py-1 bg-[#1a1a1a] rounded-lg border border-white/[0.08] shadow-xl">
              {organizations.map(org => (
                <button
                  key={org.id}
                  onClick={() => handleOrgSwitch(org)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/[0.04] transition ${
                    org.id === currentOrg?.id ? 'text-orange-400' : 'text-white/70'
                  }`}
                >
                  <span>{org.icon || '📁'}</span>
                  <span className="truncate">{org.name}</span>
                  {org.id === currentOrg?.id && <CheckCircle2 size={14} className="ml-auto text-orange-400" />}
                </button>
              ))}
              <div className="border-t border-white/[0.06] mt-1 pt-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition">
                  <Plus size={14} />
                  <span>Nova Organização</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===== SEARCH ===== */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.04] rounded-lg hover:bg-white/[0.06] transition cursor-pointer">
            <Search size={14} className="text-white/20" />
            <span className="text-xs text-white/30">Buscar tarefas, pages...</span>
            <span className="ml-auto text-[10px] text-white/15 bg-white/[0.06] px-1.5 py-0.5 rounded">⌘K</span>
          </div>
        </div>

        {/* ===== NAVIGATION ===== */}
        <div className="px-2 py-1">
          <NavItem
            icon={<LayoutDashboard size={16} />}
            label="Dashboard"
            active={activeView === 'dashboard'}
            onClick={() => setActiveView('dashboard')}
          />
          <NavItem
            icon={<FolderKanban size={16} />}
            label="Tarefas"
            active={activeView === 'tasks'}
            onClick={() => setActiveView('tasks')}
            badge={currentProject ? String((projects.find(p => p.id === currentProject.id) as any)?.task_count || 0) : undefined}
          />
          <NavItem
            icon={<FileText size={16} />}
            label="Páginas"
            active={activeView === 'pages'}
            onClick={() => setActiveView('pages')}
          />
          <NavItem
            icon={<Bot size={16} />}
            label="Agentes IA"
            active={activeView === 'agents'}
            onClick={() => setActiveView('agents')}
            badge={agents.length > 0 ? String(agents.length) : undefined}
          />
          <NavItem
            icon={<Users size={16} />}
            label="Equipe"
            active={activeView === 'team'}
            onClick={() => setActiveView('team')}
          />
          <NavItem
            icon={<Activity size={16} />}
            label="Atividade"
            active={activeView === 'activity'}
            onClick={() => setActiveView('activity')}
          />
          <NavItem
            icon={<Zap size={16} />}
            label="Integrações"
            active={activeView === 'integrations'}
            onClick={() => setActiveView('integrations')}
          />
          <NavItem
            icon={<Settings size={16} />}
            label="Tools"
            active={activeView === 'tools'}
            onClick={() => setActiveView('tools')}
          />
        </div>

        <div className="mx-3 my-1 border-t border-white/[0.04]" />

        {/* ===== PROJECTS LIST ===== */}
        <div className="flex-1 overflow-y-auto px-2">
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-white/25 uppercase tracking-widest hover:text-white/40 transition"
          >
            {projectsExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Projetos
          </button>

          {projectsExpanded && (
            <div className="space-y-0.5 mb-3">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSwitch(project)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition group ${
                    currentProject?.id === project.id
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'
                  }`}
                >
                  <span className="text-base">{project.icon || '📋'}</span>
                  <div className="flex-1 text-left min-w-0">
                    <div className="truncate text-xs font-medium">{project.name}</div>
                    {project.task_count > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="h-1 flex-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500/60 rounded-full transition-all"
                            style={{ width: `${(project.completed_count / project.task_count) * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-white/30">
                          {project.completed_count}/{project.task_count}
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                </button>
              ))}

              <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white/20 hover:text-white/40 hover:bg-white/[0.03] rounded-lg transition">
                <Plus size={12} />
                <span>Novo Projeto</span>
              </button>
            </div>
          )}

          {/* ===== AGENTS LIST ===== */}
          <button
            onClick={() => setAgentsExpanded(!agentsExpanded)}
            className="w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-white/25 uppercase tracking-widest hover:text-white/40 transition"
          >
            {agentsExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Agentes
          </button>

          {agentsExpanded && (
            <div className="space-y-0.5 mb-3">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-white/50 hover:bg-white/[0.04] hover:text-white/70 transition cursor-pointer"
                >
                  <div className="relative">
                    <Bot size={14} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#111111] ${
                      agent.is_active ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs">{agent.name}</div>
                    <div className="text-[9px] text-white/20">{agent.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => router.push(`/${workspaceId}/me`)}
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/[0.04] rounded-lg transition"
            title="Ver minhas tarefas e sequência"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-[10px] font-bold text-white">
              R
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-medium text-white/70 truncate">Rodrigo Tenuta</div>
              <div className="text-[10px] text-orange-400/70">Ver minhas tarefas →</div>
            </div>
            <Settings size={14} className="text-white/30" />
          </button>
        </div>
      </div>

      {/* Resizer */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className={`w-[2px] hover:bg-orange-500/50 cursor-col-resize transition-colors ${
          isResizing ? 'bg-orange-500' : 'bg-transparent'
        }`}
      />
    </>
  )
}

// === Nav Item Component ===
function NavItem({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition ${
        active
          ? 'bg-white/[0.08] text-white'
          : 'text-white/40 hover:bg-white/[0.04] hover:text-white/60'
      }`}
    >
      {icon}
      <span className="flex-1 text-left text-xs font-medium">{label}</span>
      {badge && (
        <span className="text-[10px] text-white/25 bg-white/[0.06] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </button>
  )
}

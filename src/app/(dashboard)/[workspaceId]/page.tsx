'use client'

import ProjectDashboard from '@/components/dashboard/ProjectDashboard'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import AgentsPage from '@/components/agents/AgentsPage'
import TeamPage from '@/components/team/TeamPage'
import ActivityPage from '@/components/activity/ActivityPage'
import IntegrationsPage from '@/components/integrations/IntegrationsPage'
import WorkspaceToolsPage from '@/components/tools/WorkspaceToolsPage'
import PagesPage from '@/components/pages/PagesPage'
import { useAppStore } from '@/stores/app-store'
import type { ActiveView } from '@/stores/app-store'

const viewTabs: { key: ActiveView; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'tasks', label: 'Tarefas' },
  { key: 'pages', label: 'Páginas' },
  { key: 'agents', label: 'Agentes IA' },
  { key: 'team', label: 'Equipe' },
  { key: 'activity', label: 'Atividade' },
  { key: 'integrations', label: 'Integrações' },
  { key: 'tools', label: 'Tools' },
]

export default function WorkspaceHome() {
  const { currentProject, activeView, setActiveView } = useAppStore()

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      {/* View Tabs */}
      <div className="flex items-center gap-0.5 px-6 pt-3 pb-0 bg-[#0a0a0a] border-b border-white/[0.06] overflow-x-auto scrollbar-none">
        {viewTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`px-3 py-2.5 text-xs font-medium transition relative whitespace-nowrap ${
              activeView === tab.key
                ? 'text-white'
                : 'text-white/25 hover:text-white/45'
            }`}
          >
            {tab.label}
            {activeView === tab.key && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-orange-500 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeView === 'dashboard' && <ProjectDashboard />}
        {activeView === 'tasks' && <KanbanBoard />}
        {activeView === 'agents' && <AgentsPage />}
        {activeView === 'team' && <TeamPage />}
        {activeView === 'activity' && <ActivityPage />}
        {activeView === 'integrations' && <IntegrationsPage />}
        {activeView === 'tools' && <WorkspaceToolsPage />}
        {activeView === 'pages' && <PagesPage />}
      </div>
    </div>
  )
}

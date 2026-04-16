import { create } from 'zustand'
import type { Organization, Project, ProjectWithStats, OrgMember, Agent } from '@/types/database'

export type ActiveView = 'dashboard' | 'tasks' | 'pages' | 'agents' | 'team' | 'activity' | 'integrations' | 'tools'

interface AppState {
  // Current context
  currentOrg: Organization | null
  currentProject: Project | null
  activeView: ActiveView
  currentUserId: string | null // user_id of logged-in user
  myTasksOnly: boolean // filter toggle

  // Lists
  organizations: Organization[]
  projects: ProjectWithStats[]
  orgMembers: OrgMember[]
  agents: Agent[]

  // Loading
  isLoading: boolean

  // Actions
  setCurrentOrg: (org: Organization | null) => void
  setCurrentProject: (project: Project | null) => void
  setActiveView: (view: ActiveView) => void
  setCurrentUserId: (id: string | null) => void
  setMyTasksOnly: (v: boolean) => void
  setOrganizations: (orgs: Organization[]) => void
  setProjects: (projects: ProjectWithStats[]) => void
  setOrgMembers: (members: OrgMember[]) => void
  setAgents: (agents: Agent[]) => void
  setLoading: (loading: boolean) => void

  // Computed
  activeProjects: () => ProjectWithStats[]
}

export const useAppStore = create<AppState>((set, get) => ({
  currentOrg: null,
  currentProject: null,
  activeView: 'dashboard',
  currentUserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Rodrigo Tenuta (demo owner)
  myTasksOnly: false,
  organizations: [],
  projects: [],
  orgMembers: [],
  agents: [],
  isLoading: true,

  setCurrentOrg: (org) => set({ currentOrg: org }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setActiveView: (activeView) => set({ activeView }),
  setCurrentUserId: (currentUserId) => set({ currentUserId }),
  setMyTasksOnly: (myTasksOnly) => set({ myTasksOnly }),
  setOrganizations: (organizations) => set({ organizations }),
  setProjects: (projects) => set({ projects }),
  setOrgMembers: (members) => set({ orgMembers: members }),
  setAgents: (agents) => set({ agents }),
  setLoading: (isLoading) => set({ isLoading }),

  activeProjects: () => get().projects.filter(p => p.status === 'active'),
}))

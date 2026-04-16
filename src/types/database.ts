// =============================================
// roadMap v2 — Multi-Tenant Type System
// =============================================

// === ENUMS ===
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer'
export type ProjectRole = 'coordinator' | 'developer' | 'organizer' | 'stakeholder' | 'agent'
export type ProjectStatus = 'active' | 'archived' | 'paused'
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'
export type AgentType = 'general' | 'reviewer' | 'tester' | 'documenter' | 'analyzer' | 'orchestrator'
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ActorType = 'user' | 'agent' | 'system'
export type IntegrationProvider = 'github' | 'vercel' | 'figma' | 'weavy' | 'obsidian' | 'slack' | 'google'

// === CORE ENTITIES ===

export interface Organization {
  id: string
  name: string
  slug: string
  icon?: string
  logo_url?: string
  settings: Record<string, any>
  created_by?: string
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  display_name?: string
  avatar_url?: string
  joined_at: string
}

export interface Project {
  id: string
  org_id: string
  workspace_id?: string
  name: string
  slug: string
  description?: string
  icon?: string
  color: string
  status: ProjectStatus
  settings: Record<string, any>
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ProjectWithStats extends Project {
  task_count: number
  completed_count: number
  member_count: number
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id?: string
  agent_id?: string
  role: ProjectRole
  permissions: {
    tasks: boolean
    pages: boolean
    settings: boolean
  }
  joined_at: string
  // Joined data
  display_name?: string
  avatar_url?: string
  agent_name?: string
}

// === WORKSPACE (legacy, linked to org) ===

export interface Workspace {
  id: string
  name: string
  icon?: string
  org_id?: string
  settings: Record<string, any>
  created_by?: string
  created_at: string
  updated_at: string
}

// === TASKS ===

export interface TaskStatus {
  id: string
  workspace_id: string
  name: string
  color: string
  order: number
  category: 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled'
  created_at: string
}

export interface TaskLabel {
  id: string
  workspace_id: string
  name: string
  color: string
  created_at: string
}

export interface Task {
  id: string
  workspace_id: string
  project_id?: string
  title: string
  description?: string
  status_id?: string
  priority: TaskPriority
  assignee_id?: string
  assigned_agent_id?: string
  creator_id?: string
  parent_task_id?: string
  page_id?: string
  due_date?: string
  start_date?: string
  end_date?: string
  completed_at?: string
  position: number
  is_deleted: boolean
  content: any[]
  // Role-based assignments
  executor_id?: string
  reviewer_id?: string
  follower_id?: string
  created_at: string
  updated_at: string
  // Joined data
  status?: TaskStatus
  labels?: TaskLabel[]
  assignee_name?: string
  agent_name?: string
  executor_name?: string
  reviewer_name?: string
  follower_name?: string
  task_agents?: TaskAgent[]
}

export interface TaskAgent {
  id: string
  task_id: string
  agent_id: string
  role: string
  // Joined
  agent_name?: string
  agent_type?: AgentType
  agent_avatar?: string
}

// === PAGES ===

export interface Page {
  id: string
  workspace_id: string
  project_id?: string
  parent_id?: string
  title: string
  icon?: string
  cover_image?: string
  content: any[]
  is_template: boolean
  is_deleted: boolean
  created_by?: string
  position: number
  created_at: string
  updated_at: string
}

// === AI AGENTS ===

export interface Agent {
  id: string
  org_id: string
  name: string
  type: AgentType
  description?: string
  avatar_url?: string
  config: Record<string, any>
  mcp_server_url?: string
  capabilities: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AgentExecution {
  id: string
  agent_id: string
  project_id?: string
  task_id?: string
  action: string
  input: Record<string, any>
  output: Record<string, any>
  status: ExecutionStatus
  started_at?: string
  completed_at?: string
  created_at: string
  // Joined
  agent_name?: string
  task_title?: string
}

// === ACTIVITY LOG ===

export interface ActivityEntry {
  id: string
  org_id?: string
  project_id?: string
  actor_type: ActorType
  actor_id?: string
  action: string
  entity_type: string
  entity_id?: string
  metadata: Record<string, any>
  created_at: string
  // Joined
  actor_name?: string
  actor_avatar?: string
}

// === INTEGRATIONS ===

export interface Integration {
  id: string
  org_id: string
  provider: IntegrationProvider
  name: string
  config: Record<string, any>
  is_active: boolean
  connected_by?: string
  connected_at: string
}

// === BLOCK TYPES (for Notion-style editor) ===

export type BlockType =
  | 'page' | 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3'
  | 'bulleted_list' | 'numbered_list' | 'toggle' | 'quote' | 'callout'
  | 'code' | 'image' | 'video' | 'file' | 'embed' | 'divider'
  | 'bookmark' | 'todo_list'

export interface Block {
  id: string
  created_at: string
  updated_at: string
  workspace_id: string
  parent_id?: string
  type: BlockType
  content: Record<string, any>
  properties?: Record<string, any>
  order: number
}

// === SUPABASE DATABASE TYPE ===
// Minimal type for Supabase client generic
export interface Database {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: Partial<Organization>; Update: Partial<Organization> }
      org_members: { Row: OrgMember; Insert: Partial<OrgMember>; Update: Partial<OrgMember> }
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> }
      project_members: { Row: ProjectMember; Insert: Partial<ProjectMember>; Update: Partial<ProjectMember> }
      workspaces: { Row: Workspace; Insert: Partial<Workspace>; Update: Partial<Workspace> }
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> }
      task_statuses: { Row: TaskStatus; Insert: Partial<TaskStatus>; Update: Partial<TaskStatus> }
      task_labels: { Row: TaskLabel; Insert: Partial<TaskLabel>; Update: Partial<TaskLabel> }
      pages: { Row: Page; Insert: Partial<Page>; Update: Partial<Page> }
      agents: { Row: Agent; Insert: Partial<Agent>; Update: Partial<Agent> }
      agent_executions: { Row: AgentExecution; Insert: Partial<AgentExecution>; Update: Partial<AgentExecution> }
      activity_log: { Row: ActivityEntry; Insert: Partial<ActivityEntry>; Update: Partial<ActivityEntry> }
      integrations: { Row: Integration; Insert: Partial<Integration>; Update: Partial<Integration> }
    }
    Views: Record<string, never>
    Functions: {
      get_projects_with_stats: {
        Args: { p_org_id: string }
        Returns: ProjectWithStats[]
      }
    }
    Enums: Record<string, never>
  }
}

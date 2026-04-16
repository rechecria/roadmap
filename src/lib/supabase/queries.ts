import { createClient } from './client'
import type {
  Organization, Project, ProjectWithStats, OrgMember,
  Task, TaskStatus, TaskLabel, Agent, AgentExecution,
  ActivityEntry, ProjectMember, Page, TaskAgent
} from '@/types/database'

const supabase = createClient()

// =============================================
// ORGANIZATIONS
// =============================================

export async function getOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', orgId)
    .order('joined_at')
  if (error) throw error
  return data || []
}

// =============================================
// PROJECTS
// =============================================

export async function getProjects(orgId: string): Promise<ProjectWithStats[]> {
  const { data, error } = await supabase
    .rpc('get_projects_with_stats', { p_org_id: orgId })
  if (error) throw error
  return (data || []) as ProjectWithStats[]
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  if (error) return null
  return data
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('joined_at')
  if (error) throw error
  if (!data || data.length === 0) return []

  // Collect user_ids and agent_ids to fetch names
  const userIds = data.filter(m => m.user_id).map(m => m.user_id)
  const agentIds = data.filter(m => m.agent_id).map(m => m.agent_id)

  const [orgMembersRes, agentsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from('org_members').select('user_id, display_name, avatar_url').in('user_id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    agentIds.length > 0
      ? supabase.from('agents').select('id, name, avatar_url').in('id', agentIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const userMap: Record<string, { display_name?: string; avatar_url?: string }> = {}
  ;(orgMembersRes.data || []).forEach((m: any) => { userMap[m.user_id] = { display_name: m.display_name, avatar_url: m.avatar_url } })

  const agentMap: Record<string, { name?: string; avatar_url?: string }> = {}
  ;(agentsRes.data || []).forEach((a: any) => { agentMap[a.id] = { name: a.name, avatar_url: a.avatar_url } })

  return data.map(m => ({
    ...m,
    display_name: m.user_id ? userMap[m.user_id]?.display_name : undefined,
    avatar_url: m.user_id ? userMap[m.user_id]?.avatar_url : (m.agent_id ? agentMap[m.agent_id]?.avatar_url : undefined),
    agent_name: m.agent_id ? agentMap[m.agent_id]?.name : undefined,
  }))
}

// =============================================
// TASKS
// =============================================

export async function getTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      status:task_statuses(*)
    `)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('position')
  if (error) throw error
  return data || []
}

export async function getTasksByWorkspace(workspaceId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      status:task_statuses(*)
    `)
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .order('position')
  if (error) throw error
  return data || []
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getTaskStatuses(workspaceId: string): Promise<TaskStatus[]> {
  const { data, error } = await supabase
    .from('task_statuses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('order')
  if (error) throw error
  return data || []
}

export async function getTask(taskId: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      status:task_statuses(*)
    `)
    .eq('id', taskId)
    .single()
  if (error) throw error
  return data
}

export async function getTaskAgents(taskId: string): Promise<TaskAgent[]> {
  const { data, error } = await supabase
    .from('task_agents')
    .select(`
      id,
      task_id,
      agent_id,
      role,
      agents:agent_id (name, type, avatar_url)
    `)
    .eq('task_id', taskId)
  if (error) {
    console.error('Failed to fetch task agents:', error)
    return []
  }
  return (data || []).map((ta: any) => ({
    id: ta.id,
    task_id: ta.task_id,
    agent_id: ta.agent_id,
    role: ta.role,
    agent_name: ta.agents?.name,
    agent_type: ta.agents?.type,
    agent_avatar: ta.agents?.avatar_url,
  }))
}

export async function getAllTaskAgents(projectId: string): Promise<Record<string, TaskAgent[]>> {
  // Get all task IDs for this project first
  const { data: taskIds, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_deleted', false)

  if (taskError || !taskIds?.length) return {}

  const ids = taskIds.map(t => t.id)
  const { data, error } = await supabase
    .from('task_agents')
    .select(`
      id,
      task_id,
      agent_id,
      role,
      agents:agent_id (name, type, avatar_url)
    `)
    .in('task_id', ids)

  if (error) {
    console.error('Failed to fetch all task agents:', error)
    return {}
  }

  const grouped: Record<string, TaskAgent[]> = {}
  for (const ta of (data || []) as any[]) {
    const taskId = ta.task_id
    if (!grouped[taskId]) grouped[taskId] = []
    grouped[taskId].push({
      id: ta.id,
      task_id: ta.task_id,
      agent_id: ta.agent_id,
      role: ta.role,
      agent_name: ta.agents?.name,
      agent_type: ta.agents?.type,
      agent_avatar: ta.agents?.avatar_url,
    })
  }
  return grouped
}

export async function getTaskLabels(workspaceId: string): Promise<TaskLabel[]> {
  const { data, error } = await supabase
    .from('task_labels')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name')
  if (error) throw error
  return data || []
}

// =============================================
// PAGES
// =============================================

export async function getPages(projectId: string): Promise<Page[]> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('position')
  if (error) throw error
  return data || []
}

// =============================================
// AI AGENTS
// =============================================

export async function getAgents(orgId: string): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data || []
}

export async function getAgentExecutions(agentId: string, limit = 20): Promise<AgentExecution[]> {
  const { data, error } = await supabase
    .from('agent_executions')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// =============================================
// ACTIVITY LOG
// =============================================

export async function getActivityLog(projectId: string, limit = 50): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  if (!data || data.length === 0) return []

  // Collect actor IDs to fetch names (separated by type)
  const userIds = data.filter(e => e.actor_type === 'user' && e.actor_id).map(e => e.actor_id)
  const agentIds = data.filter(e => e.actor_type === 'agent' && e.actor_id).map(e => e.actor_id)

  const [usersRes, agentsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from('org_members').select('user_id, display_name').in('user_id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    agentIds.length > 0
      ? supabase.from('agents').select('id, name').in('id', agentIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const userMap: Record<string, string> = {}
  ;(usersRes.data || []).forEach((u: any) => { userMap[u.user_id] = u.display_name })

  const agentMap: Record<string, string> = {}
  ;(agentsRes.data || []).forEach((a: any) => { agentMap[a.id] = a.name })

  return data.map(e => ({
    ...e,
    actor_name: e.actor_type === 'user' ? userMap[e.actor_id] :
                e.actor_type === 'agent' ? agentMap[e.actor_id] :
                (e.metadata as any)?.actor_name,
  }))
}

export async function logActivity(entry: Partial<ActivityEntry>): Promise<void> {
  await supabase.from('activity_log').insert(entry)
}

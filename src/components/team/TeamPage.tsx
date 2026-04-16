'use client'

import { useState, useEffect } from 'react'
import {
  Users, UserPlus, Shield, Crown, Code, Eye, Bot, Mail,
  MoreHorizontal, Clock, CheckCircle2, FolderKanban
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { getOrgMembers, getProjectMembers } from '@/lib/supabase/queries'
import type { OrgMember, ProjectMember } from '@/types/database'

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown size={14} className="text-yellow-400" />,
  admin: <Shield size={14} className="text-blue-400" />,
  member: <Users size={14} className="text-white/40" />,
  viewer: <Eye size={14} className="text-white/30" />,
  coordinator: <Crown size={14} className="text-orange-400" />,
  developer: <Code size={14} className="text-green-400" />,
  organizer: <FolderKanban size={14} className="text-purple-400" />,
  stakeholder: <Eye size={14} className="text-cyan-400" />,
  agent: <Bot size={14} className="text-blue-400" />,
}

const roleLabels: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Visualizador',
  coordinator: 'Coordenador',
  developer: 'Desenvolvedor',
  organizer: 'Organizador',
  stakeholder: 'Stakeholder',
  agent: 'Agente IA',
}

const roleColors: Record<string, string> = {
  owner: 'bg-yellow-500/10 text-yellow-400',
  admin: 'bg-blue-500/10 text-blue-400',
  member: 'bg-white/[0.06] text-white/40',
  viewer: 'bg-white/[0.04] text-white/25',
  coordinator: 'bg-orange-500/10 text-orange-400',
  developer: 'bg-green-500/10 text-green-400',
  organizer: 'bg-purple-500/10 text-purple-400',
  stakeholder: 'bg-cyan-500/10 text-cyan-400',
  agent: 'bg-blue-500/10 text-blue-400',
}

export default function TeamPage() {
  const { currentOrg, currentProject } = useAppStore()
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [tab, setTab] = useState<'org' | 'project'>('project')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMembers() {
      try {
        setLoading(true)
        if (currentOrg) {
          const members = await getOrgMembers(currentOrg.id)
          setOrgMembers(members)
        }
        if (currentProject) {
          const members = await getProjectMembers(currentProject.id)
          setProjectMembers(members)
        }
      } catch (err) {
        console.error('Failed to load team data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadMembers()
  }, [currentOrg?.id, currentProject?.id])

  const displayMembers = tab === 'org' ? orgMembers : projectMembers

  return (
    <div className="flex-1 h-full overflow-auto bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Equipe</h1>
            <p className="text-xs text-white/30 mt-0.5">
              Gerencie membros da {tab === 'org' ? 'organização' : 'equipe do projeto'}
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition text-xs font-medium">
            <UserPlus size={14} />
            Convidar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white/[0.03] rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('project')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${
              tab === 'project' ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50'
            }`}
          >
            Projeto ({projectMembers.length})
          </button>
          <button
            onClick={() => setTab('org')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${
              tab === 'org' ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50'
            }`}
          >
            Organização ({orgMembers.length})
          </button>
        </div>

        {/* Members Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : displayMembers.length > 0 ? (
          <div className="space-y-2">
            {tab === 'project' ? (
              // Project members
              (projectMembers as ProjectMember[]).map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl transition group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {member.agent_id ? (
                      <Bot size={18} />
                    ) : (
                      (member.display_name || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/80 truncate">
                        {member.display_name || member.agent_name || 'Membro'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        roleColors[member.role] || 'bg-white/[0.06] text-white/30'
                      }`}>
                        {roleIcons[member.role]}
                        {roleLabels[member.role] || member.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {member.permissions?.tasks && (
                        <span className="text-[9px] text-white/20 flex items-center gap-0.5">
                          <CheckCircle2 size={9} /> Tarefas
                        </span>
                      )}
                      {member.permissions?.pages && (
                        <span className="text-[9px] text-white/20 flex items-center gap-0.5">
                          <CheckCircle2 size={9} /> Páginas
                        </span>
                      )}
                      {member.permissions?.settings && (
                        <span className="text-[9px] text-white/20 flex items-center gap-0.5">
                          <CheckCircle2 size={9} /> Config
                        </span>
                      )}
                      <span className="text-[9px] text-white/15">
                        Desde {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] rounded-lg transition text-white/30">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              ))
            ) : (
              // Org members
              (orgMembers as OrgMember[]).map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl transition group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (member.display_name || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/80 truncate">
                        {member.display_name || 'Membro'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        roleColors[member.role] || 'bg-white/[0.06] text-white/30'
                      }`}>
                        {roleIcons[member.role]}
                        {roleLabels[member.role] || member.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/20 mt-0.5">
                      Membro desde {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] rounded-lg transition text-white/30">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm text-white/30 mb-1">Nenhum membro encontrado</p>
            <p className="text-xs text-white/15">Convide pessoas para colaborar no {tab === 'org' ? 'organização' : 'projeto'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

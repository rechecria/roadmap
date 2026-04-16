'use client'

import React from 'react'
import { Share2, MoreVertical, Bell, Zap, PanelLeftClose, PanelLeft } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { useUIStore } from '@/stores/ui-store'

export default function TopBar() {
  const { currentOrg, currentProject } = useAppStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()

  return (
    <div className="h-12 bg-[#0a0a0a] border-b border-white/[0.06] flex items-center justify-between px-4 sticky top-0 z-10">
      {/* Left: toggle + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-white/[0.06] rounded-lg transition text-white/30 hover:text-white/50"
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/20">{currentOrg?.name || 'roadMap'}</span>
          {currentProject && (
            <>
              <span className="text-white/10">/</span>
              <span className="text-white/50 font-medium">{currentProject.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <button
          title="Integrações"
          className="p-1.5 hover:bg-white/[0.06] rounded-lg transition text-white/25 hover:text-white/50"
        >
          <Zap size={16} />
        </button>
        <button
          title="Notificações"
          className="p-1.5 hover:bg-white/[0.06] rounded-lg transition text-white/25 hover:text-white/50 relative"
        >
          <Bell size={16} />
          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-500" />
        </button>
        <button
          title="Compartilhar"
          className="p-1.5 hover:bg-white/[0.06] rounded-lg transition text-white/25 hover:text-white/50"
        >
          <Share2 size={16} />
        </button>
      </div>
    </div>
  )
}

'use client'

import React, { ReactNode, useState } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useAppStore } from '@/stores/app-store'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ProjectDashboard from '@/components/dashboard/ProjectDashboard'
import KanbanBoard from '@/components/tasks/KanbanBoard'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarOpen } = useUIStore()
  const { isLoading } = useAppStore()
  // 'dashboard' | 'tasks' | 'pages' | ... managed via sidebar
  const [activeView, setActiveView] = useState<string>('dashboard')

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        {isLoading ? (
          <LoadingState />
        ) : (
          <main className="flex-1 overflow-hidden min-h-0">
            {children}
          </main>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden z-40"
          onClick={() => useUIStore.setState({ sidebarOpen: false })}
        />
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <span className="text-sm text-white/30">Carregando roadMap...</span>
      </div>
    </div>
  )
}

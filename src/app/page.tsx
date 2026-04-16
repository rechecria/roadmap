'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the demo workspace
    // Later: check auth → redirect to user's default org/workspace
    router.replace('/00000000-0000-0000-0000-000000000001')
  }, [router])

  return (
    <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-1">roadMap</h1>
          <p className="text-sm text-white/30">Carregando workspace...</p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTaskStore } from '@/stores/task-store'
import { User, Bot, ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut, Clock, Calendar, CalendarDays, X, ExternalLink } from 'lucide-react'
import type { Task, TaskStatus } from '@/types/database'

interface CanvasViewProps {
  tasks: Task[]
  statuses: TaskStatus[]
  onTaskClick: (task: Task) => void
}

type TimeScale = 'hour' | 'day' | 'week' | 'month' | 'quarter'

const TIME_SCALE_ORDER: TimeScale[] = ['hour', 'day', 'week', 'month', 'quarter']

const TIME_SCALE_CONFIG: Record<TimeScale, { dayWidth: number; weeksToShow: number; label: string }> = {
  hour:    { dayWidth: 200, weeksToShow: 2,  label: 'Horas' },
  day:     { dayWidth: 80,  weeksToShow: 4,  label: 'Dias' },
  week:    { dayWidth: 40,  weeksToShow: 8,  label: 'Semana' },
  month:   { dayWidth: 24,  weeksToShow: 16, label: 'Mês' },
  quarter: { dayWidth: 10,  weeksToShow: 26, label: 'Trimestre' },
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const rowColors = [
  { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
  { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30' },
  { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
]

const SUB_ROW_HEIGHT = 40
const ROW_PADDING_TOP = 12
const ROW_PADDING_BOTTOM = 8
const BAR_HEIGHT = 28
const HEADER_HEIGHT = 56
const LEFT_PANEL_WIDTH = 230

interface RowData {
  type: 'person' | 'agent'
  id: string
  name: string
  avatar?: string
  tasks: Task[]
  colorIdx: number
  height: number
  yOffset: number
}

interface HoverInfo {
  task: Task
  x: number
  y: number
  rowName: string
  rowType: 'person' | 'agent'
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getDaysBetween(start?: string, end?: string): number | null {
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
}

export default function CanvasView({ tasks, statuses, onTaskClick }: CanvasViewProps) {
  const { members, agents } = useTaskStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [timeScale, setTimeScale] = useState<TimeScale>('month')
  const [viewOffset, setViewOffset] = useState(0)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [mounted, setMounted] = useState(false)
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const zoomIn = useCallback(() => {
    const idx = TIME_SCALE_ORDER.indexOf(timeScale)
    if (idx > 0) setTimeScale(TIME_SCALE_ORDER[idx - 1])
  }, [timeScale])

  const zoomOut = useCallback(() => {
    const idx = TIME_SCALE_ORDER.indexOf(timeScale)
    if (idx < TIME_SCALE_ORDER.length - 1) setTimeScale(TIME_SCALE_ORDER[idx + 1])
  }, [timeScale])

  const { startDate, totalDays, dayWidth, columns } = useMemo(() => {
    const config = TIME_SCALE_CONFIG[timeScale]
    const dw = config.dayWidth
    const weeksToShow = config.weeksToShow

    const start = new Date(today)
    start.setDate(start.getDate() - 14 + viewOffset * 7)
    start.setDate(start.getDate() - start.getDay())

    const end = new Date(start)
    end.setDate(end.getDate() + weeksToShow * 7)

    const total = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    const cols: { label: string; subLabel?: string; startDay: number; span: number }[] = []

    if (timeScale === 'hour') {
      // Show days, each divided into visible hours
      for (let d = 0; d < total; d++) {
        const dt = new Date(start)
        dt.setDate(dt.getDate() + d)
        const isWeekend = dt.getDay() === 0 || dt.getDay() === 6
        cols.push({
          label: dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
          subLabel: dt.toLocaleDateString('pt-BR', { month: 'short' }),
          startDay: d,
          span: 1,
        })
      }
    } else if (timeScale === 'day') {
      // Show individual days
      for (let d = 0; d < total; d++) {
        const dt = new Date(start)
        dt.setDate(dt.getDate() + d)
        const isWeekend = dt.getDay() === 0 || dt.getDay() === 6
        cols.push({
          label: `${dt.getDate()}`,
          subLabel: d === 0 || dt.getDate() === 1 ? dt.toLocaleDateString('pt-BR', { month: 'short' }) : undefined,
          startDay: d,
          span: 1,
        })
      }
    } else if (timeScale === 'week') {
      for (let w = 0; w < weeksToShow; w++) {
        const d = new Date(start)
        d.setDate(d.getDate() + w * 7)
        cols.push({
          label: `${d.getDate()} ${d.toLocaleDateString('pt-BR', { month: 'short' })}`,
          startDay: w * 7,
          span: 7,
        })
      }
    } else if (timeScale === 'month') {
      let cursor = new Date(start)
      while (cursor < end) {
        const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
        const colStart = Math.max(0, Math.floor((monthStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
        const colEnd = Math.min(total, Math.ceil((monthEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        cols.push({
          label: cursor.toLocaleDateString('pt-BR', { month: 'long' }),
          subLabel: cursor.getFullYear().toString(),
          startDay: colStart,
          span: colEnd - colStart,
        })
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      }
    } else {
      let cursor = new Date(start)
      while (cursor < end) {
        const q = Math.floor(cursor.getMonth() / 3)
        const qStart = new Date(cursor.getFullYear(), q * 3, 1)
        const qEnd = new Date(cursor.getFullYear(), (q + 1) * 3, 0)
        const colStart = Math.max(0, Math.floor((qStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
        const colEnd = Math.min(total, Math.ceil((qEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        cols.push({
          label: `Q${q + 1} ${cursor.getFullYear()}`,
          startDay: colStart,
          span: colEnd - colStart,
        })
        cursor = new Date(cursor.getFullYear(), (q + 1) * 3, 1)
      }
    }

    return { startDate: start, endDate: end, totalDays: total, dayWidth: dw, columns: cols }
  }, [timeScale, viewOffset])

  // Build rows grouped by executor
  const rows: RowData[] = useMemo(() => {
    const result: RowData[] = []
    const byExecutor: Record<string, Task[]> = {}
    const unassigned: Task[] = []
    let colorCounter = 0

    for (const task of tasks) {
      if (!task.start_date && !task.due_date && !task.end_date) continue
      const execId = task.executor_id || task.assignee_id
      if (execId) {
        if (!byExecutor[execId]) byExecutor[execId] = []
        byExecutor[execId].push(task)
      } else {
        unassigned.push(task)
      }
    }

    for (const [userId, userTasks] of Object.entries(byExecutor)) {
      const member = members.find(m => m.user_id === userId)
      const sorted = userTasks.sort((a, b) => (a.start_date || a.due_date || '').localeCompare(b.start_date || b.due_date || ''))
      result.push({
        type: 'person',
        id: userId,
        name: member?.display_name || 'User',
        avatar: member?.avatar_url,
        tasks: sorted,
        colorIdx: colorCounter++,
        height: 0,
        yOffset: 0,
      })
    }

    const agentTaskMap: Record<string, Task[]> = {}
    for (const task of tasks) {
      if (!task.start_date && !task.due_date && !task.end_date) continue
      if (task.task_agents) {
        for (const ta of task.task_agents) {
          if (!agentTaskMap[ta.agent_id]) agentTaskMap[ta.agent_id] = []
          agentTaskMap[ta.agent_id].push(task)
        }
      }
    }

    for (const [agentId, agentTasks] of Object.entries(agentTaskMap)) {
      const agent = agents.find(a => a.id === agentId)
      const unique = [...new Map(agentTasks.map(t => [t.id, t])).values()]
      const sorted = unique.sort((a, b) => (a.start_date || a.due_date || '').localeCompare(b.start_date || b.due_date || ''))
      result.push({
        type: 'agent',
        id: agentId,
        name: agent?.name || 'Agent',
        avatar: agent?.avatar_url,
        tasks: sorted,
        colorIdx: colorCounter++,
        height: 0,
        yOffset: 0,
      })
    }

    if (unassigned.length > 0) {
      const sorted = unassigned.sort((a, b) => (a.start_date || a.due_date || '').localeCompare(b.start_date || b.due_date || ''))
      result.push({
        type: 'person',
        id: 'unassigned',
        name: 'Sem executor',
        tasks: sorted,
        colorIdx: colorCounter++,
        height: 0,
        yOffset: 0,
      })
    }

    let cumulativeY = 0
    for (const row of result) {
      const taskCount = Math.max(row.tasks.length, 1)
      row.height = ROW_PADDING_TOP + taskCount * SUB_ROW_HEIGHT + ROW_PADDING_BOTTOM
      row.yOffset = cumulativeY
      cumulativeY += row.height
    }

    return result
  }, [tasks, members, agents])

  const totalHeight = rows.reduce((sum, r) => sum + r.height, 0)

  function getTaskBar(task: Task) {
    const taskStart = task.start_date ? new Date(task.start_date) : task.due_date ? new Date(task.due_date) : null
    const taskEnd = task.end_date ? new Date(task.end_date) : task.due_date ? new Date(task.due_date) : taskStart
    if (!taskStart) return null

    const rawStartDay = Math.floor((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const rawEndDay = taskEnd
      ? Math.ceil((taskEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : rawStartDay + 1

    // Skip bars fully outside visible range
    if (rawEndDay < 0 || rawStartDay > totalDays) return null

    const startDay = Math.max(0, rawStartDay)
    const endDay = Math.min(totalDays, rawEndDay)

    return {
      left: startDay * dayWidth,
      width: Math.max((endDay - startDay) * dayWidth, dayWidth * 2),
    }
  }

  const todayOffset = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth

  const statusColorMap: Record<string, string> = {}
  statuses.forEach(s => { statusColorMap[s.id] = s.color })
  const statusCategoryMap: Record<string, string> = {}
  statuses.forEach(s => { statusCategoryMap[s.id] = s.category })
  const statusNameMap: Record<string, string> = {}
  statuses.forEach(s => { statusNameMap[s.id] = s.name })

  function getBarStyle(task: Task) {
    const cat = task.status_id ? statusCategoryMap[task.status_id] : ''
    const color = task.status_id ? statusColorMap[task.status_id] : '#666'
    const isDone = cat === 'done'
    const isCancelled = cat === 'cancelled'
    return {
      borderColor: color,
      opacity: isDone ? 0.6 : isCancelled ? 0.3 : 1,
      background: isDone
        ? `linear-gradient(135deg, ${color}33, ${color}22)`
        : `linear-gradient(135deg, ${color}44, ${color}22)`,
    }
  }

  // Dependency connections — only within visible range
  const connections = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; overlapping: boolean }[] = []
    const maxX = totalDays * dayWidth
    for (const row of rows) {
      for (let i = 0; i < row.tasks.length - 1; i++) {
        const barA = getTaskBar(row.tasks[i])
        const barB = getTaskBar(row.tasks[i + 1])
        if (!barA || !barB) continue

        // Skip if either bar is fully outside visible range
        if (barA.left > maxX || barB.left > maxX) continue
        if (barA.left + barA.width < 0 || barB.left + barB.width < 0) continue

        const subRowYA = row.yOffset + ROW_PADDING_TOP + i * SUB_ROW_HEIGHT + BAR_HEIGHT / 2
        const subRowYB = row.yOffset + ROW_PADDING_TOP + (i + 1) * SUB_ROW_HEIGHT + BAR_HEIGHT / 2

        const aRight = Math.min(barA.left + barA.width, maxX)
        const bLeft = Math.max(barB.left, 0)
        const overlapping = bLeft < aRight

        if (overlapping) {
          const aCenterX = Math.min(barA.left + barA.width * 0.7, maxX - 10)
          const bCenterX = Math.max(barB.left + barB.width * 0.3, 10)
          lines.push({ x1: aCenterX, y1: subRowYA + BAR_HEIGHT / 2, x2: bCenterX, y2: subRowYB - BAR_HEIGHT / 2, overlapping: true })
        } else {
          lines.push({ x1: aRight, y1: subRowYA, x2: bLeft, y2: subRowYB, overlapping: false })
        }
      }
    }
    return lines
  }, [rows, startDate, dayWidth, totalDays])

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && todayOffset > 200) {
      scrollRef.current.scrollLeft = todayOffset - 200
    }
  }, [todayOffset])

  // Handle hover — position in viewport (fixed coords for portal)
  const handleBarMouseEnter = useCallback((e: React.MouseEvent, task: Task, rowName: string, rowType: 'person' | 'agent') => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // viewport-relative position (portal renders to body with position: fixed)
    const x = rect.left + rect.width / 2
    const y = rect.top - 8
    setHoverInfo({ task, x, y, rowName, rowType })
  }, [])

  const handleBarMouseLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setHoverInfo(null), 200)
  }, [])

  const canZoomIn = TIME_SCALE_ORDER.indexOf(timeScale) > 0
  const canZoomOut = TIME_SCALE_ORDER.indexOf(timeScale) < TIME_SCALE_ORDER.length - 1

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06] bg-[#0a0a0a]">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => setViewOffset(v => v - 4)} className="p-1.5 hover:bg-white/[0.06] rounded-lg transition">
            <ChevronLeft size={16} className="text-white/40" />
          </button>
          <button
            onClick={() => setViewOffset(0)}
            className="px-3 py-1.5 text-xs text-orange-400/80 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition font-medium"
          >
            Hoje
          </button>
          <button onClick={() => setViewOffset(v => v + 4)} className="p-1.5 hover:bg-white/[0.06] rounded-lg transition">
            <ChevronRight size={16} className="text-white/40" />
          </button>
        </div>

        <div className="w-px h-5 bg-white/[0.06]" />

        {/* Time Scale Buttons */}
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5">
          {TIME_SCALE_ORDER.map(scale => (
            <button
              key={scale}
              onClick={() => setTimeScale(scale)}
              className={`px-3 py-1.5 text-xs rounded-md transition font-medium flex items-center gap-1.5 ${
                timeScale === scale ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/30 hover:text-white/50'
              }`}
            >
              {scale === 'hour' && <Clock size={11} />}
              {scale === 'day' && <Calendar size={11} />}
              {scale === 'week' && <CalendarDays size={11} />}
              {TIME_SCALE_CONFIG[scale].label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/[0.06]" />

        {/* Zoom In/Out */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomIn}
            disabled={!canZoomIn}
            className={`p-1.5 rounded-lg transition ${canZoomIn ? 'hover:bg-white/[0.06] text-white/40 hover:text-white/60' : 'text-white/10 cursor-not-allowed'}`}
            title="Zoom in (mais detalhe)"
          >
            <ZoomIn size={16} />
          </button>
          <div className="text-[9px] text-white/20 min-w-[52px] text-center font-mono">
            {dayWidth}px/dia
          </div>
          <button
            onClick={zoomOut}
            disabled={!canZoomOut}
            className={`p-1.5 rounded-lg transition ${canZoomOut ? 'hover:bg-white/[0.06] text-white/40 hover:text-white/60' : 'text-white/10 cursor-not-allowed'}`}
            title="Zoom out (mais amplo)"
          >
            <ZoomOut size={16} />
          </button>
        </div>

        <div className="flex-1" />

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-white/30">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500/30 flex items-center justify-center">
              <User size={7} className="text-blue-300" />
            </div>
            {rows.filter(r => r.type === 'person' && r.id !== 'unassigned').length} pessoas
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500/30 flex items-center justify-center">
              <Bot size={7} className="text-purple-300" />
            </div>
            {rows.filter(r => r.type === 'agent').length} agentes IA
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="3 2" /><polygon points="17,1.5 20,4 17,6.5" fill="rgba(255,255,255,0.2)" /></svg>
            sequência
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Names */}
        <div className="flex-shrink-0 border-r border-white/[0.06] bg-[#0a0a0a] z-10 overflow-y-auto" style={{ width: LEFT_PANEL_WIDTH }}>
          <div className="border-b border-white/[0.06] flex items-center px-4 sticky top-0 bg-[#0a0a0a] z-10" style={{ height: HEADER_HEIGHT }}>
            <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">Recurso</span>
          </div>
          <div>
            {rows.map((row, idx) => {
              const color = rowColors[row.colorIdx % rowColors.length]
              return (
                <div
                  key={row.id}
                  className={`flex items-start gap-3 px-4 border-b border-white/[0.06] ${idx % 2 === 1 ? 'bg-white/[0.015]' : ''}`}
                  style={{ height: row.height, paddingTop: ROW_PADDING_TOP + 4 }}
                >
                  {row.type === 'person' ? (
                    <div className={`w-8 h-8 rounded-full ${color.bg} flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${color.text} ring-1 ${color.border}`}>
                      {row.id === 'unassigned' ? <User size={13} /> : getInitials(row.name)}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-purple-500/30">
                      <Bot size={13} className="text-purple-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white/70 truncate font-medium">{row.name}</div>
                    <div className="text-[9px] text-white/25 mt-0.5">
                      {row.tasks.length} tarefa{row.tasks.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div className="flex-1 overflow-auto relative" ref={scrollRef}>
          <div style={{ width: totalDays * dayWidth, minWidth: '100%' }}>
            {/* Timeline Header */}
            <div className="flex border-b border-white/[0.06] sticky top-0 bg-[#0a0a0a] z-10" style={{ height: HEADER_HEIGHT }}>
              {columns.map((col, i) => (
                <div
                  key={i}
                  className="border-r border-white/[0.04] flex flex-col items-center justify-center"
                  style={{ width: col.span * dayWidth }}
                >
                  <span className={`text-white/50 capitalize font-medium ${timeScale === 'day' ? 'text-[10px]' : 'text-xs'}`}>{col.label}</span>
                  {col.subLabel && <span className="text-[9px] text-white/20">{col.subLabel}</span>}
                </div>
              ))}
            </div>

            {/* Rows with cascading task bars + dependency lines */}
            <div className="relative" style={{ height: totalHeight }}>
              {/* Column grid lines */}
              {columns.map((col, i) => (
                <div
                  key={`grid-${i}`}
                  className="absolute top-0 border-r border-white/[0.03]"
                  style={{ left: col.startDay * dayWidth + col.span * dayWidth, height: totalHeight }}
                />
              ))}

              {/* Day grid lines for hour/day views */}
              {(timeScale === 'hour') && Array.from({ length: totalDays }, (_, d) => (
                <div key={`daygrid-${d}`} className="absolute top-0 border-r border-white/[0.02]" style={{ left: d * dayWidth, height: totalHeight }} />
              ))}

              {/* Today marker */}
              {todayOffset >= 0 && todayOffset <= totalDays * dayWidth && (
                <div className="absolute top-0 w-px z-20" style={{ left: todayOffset, height: totalHeight }}>
                  <div className="w-px h-full bg-orange-500/50" />
                  <div className="absolute -top-0 -left-[14px] bg-orange-500 text-[8px] text-white px-1.5 py-0.5 rounded-b font-bold tracking-wider">
                    HOJE
                  </div>
                </div>
              )}

              {/* SVG layer for dependency arrows */}
              <svg
                className="absolute top-0 left-0 pointer-events-none z-10"
                style={{ width: totalDays * dayWidth, height: totalHeight }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.35)" />
                  </marker>
                </defs>
                {connections.map((conn, i) => {
                  const dx = conn.x2 - conn.x1
                  const dy = conn.y2 - conn.y1
                  let pathD: string

                  if (conn.overlapping) {
                    // Vertical S-curve for overlapping bars (high zoom)
                    const midY = conn.y1 + dy * 0.5
                    pathD = `M ${conn.x1} ${conn.y1} C ${conn.x1} ${midY}, ${conn.x2} ${midY}, ${conn.x2} ${conn.y2}`
                  } else {
                    // Normal horizontal bezier for non-overlapping bars
                    const cp1x = conn.x1 + Math.min(Math.abs(dx) * 0.3, 30)
                    const cp1y = conn.y1
                    const cp2x = conn.x2 - Math.min(Math.abs(dx) * 0.3, 30)
                    const cp2y = conn.y2
                    pathD = `M ${conn.x1} ${conn.y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${conn.x2 - 4} ${conn.y2}`
                  }

                  return (
                    <g key={i}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="5"
                      />
                      <path
                        d={pathD}
                        fill="none"
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth="1.5"
                        strokeDasharray="6 3"
                        markerEnd="url(#arrowhead)"
                      />
                      <circle cx={conn.x1} cy={conn.y1} r="3" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                      <circle cx={conn.x2} cy={conn.y2} r="3" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    </g>
                  )
                })}
              </svg>

              {/* Row backgrounds + task bars */}
              {rows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  className={`absolute left-0 right-0 border-b border-white/[0.06] ${rowIndex % 2 === 1 ? 'bg-white/[0.015]' : ''}`}
                  style={{ top: row.yOffset, height: row.height }}
                >
                  {row.tasks.map((task, taskIdx) => {
                    const bar = getTaskBar(task)
                    if (!bar) return null

                    const barStyle = getBarStyle(task)
                    const subRowY = ROW_PADDING_TOP + taskIdx * SUB_ROW_HEIGHT + (SUB_ROW_HEIGHT - BAR_HEIGHT) / 2

                    return (
                      <div
                        key={task.id}
                        className="absolute rounded-lg cursor-pointer transition-all hover:brightness-125 hover:scale-[1.02] hover:shadow-xl z-[5]"
                        style={{
                          left: bar.left,
                          width: bar.width,
                          top: subRowY,
                          height: BAR_HEIGHT,
                          borderLeft: `3px solid ${barStyle.borderColor}`,
                          background: barStyle.background,
                          opacity: barStyle.opacity,
                        }}
                        onClick={() => setDetailTask(task)}
                        onMouseEnter={(e) => handleBarMouseEnter(e, task, row.name, row.type)}
                        onMouseLeave={handleBarMouseLeave}
                      >
                        <div className="px-2.5 h-full flex items-center gap-2 overflow-hidden">
                          <span className="text-[8px] text-white/25 font-mono flex-shrink-0 w-3 text-center">
                            {taskIdx + 1}
                          </span>
                          <span className="text-[10px] text-white/80 truncate font-medium leading-tight">
                            {task.title}
                          </span>
                        </div>

                        {/* Progress indicator */}
                        <div
                          className="absolute bottom-0 left-0 h-[2px] rounded-b-lg"
                          style={{
                            width: statusCategoryMap[task.status_id || ''] === 'done' ? '100%' :
                                   statusCategoryMap[task.status_id || ''] === 'in_progress' ? '50%' : '0%',
                            background: barStyle.borderColor,
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Empty state */}
              {rows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-white/20">
                  <Maximize2 size={32} className="mb-3 text-white/10" />
                  <p className="text-sm font-medium">Nenhuma tarefa com datas definidas</p>
                  <p className="text-xs mt-1 text-white/10">Adicione start_date e end_date nas tarefas</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Rich Hover Tooltip — rendered via Portal to body, overlays everything */}
      {mounted && hoverInfo && !detailTask && createPortal(
        <div
          className="fixed pointer-events-none"
          style={{
            left: Math.min(Math.max(hoverInfo.x, 180), window.innerWidth - 180),
            top: Math.max(hoverInfo.y, 180),
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
        >
          <div className="bg-[#1a1a1a] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden min-w-[280px] max-w-[340px]">
            <div
              className="px-4 py-2.5 border-b border-white/[0.06]"
              style={{ background: `linear-gradient(135deg, ${statusColorMap[hoverInfo.task.status_id || ''] || '#666'}22, transparent)` }}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: statusColorMap[hoverInfo.task.status_id || ''] || '#666' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-white/90 leading-tight">{hoverInfo.task.title}</div>
                  <div className="text-[9px] text-white/30 mt-0.5">
                    {statusNameMap[hoverInfo.task.status_id || ''] || 'Sem status'}
                  </div>
                </div>
                {hoverInfo.task.priority && (
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${
                    hoverInfo.task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                    hoverInfo.task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    hoverInfo.task.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-white/[0.06] text-white/30'
                  }`}>{hoverInfo.task.priority}</span>
                )}
              </div>
            </div>
            <div className="px-4 py-2.5 space-y-1.5">
              {hoverInfo.task.executor_name && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/25 w-[60px] flex-shrink-0">Executor</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User size={8} className="text-blue-300" />
                    </div>
                    <span className="text-[10px] text-white/70">{hoverInfo.task.executor_name}</span>
                  </div>
                </div>
              )}
              {hoverInfo.task.reviewer_name && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/25 w-[60px] flex-shrink-0">Revisor</span>
                  <span className="text-[10px] text-emerald-400/70">{hoverInfo.task.reviewer_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/25 w-[60px] flex-shrink-0">Início</span>
                <span className="text-[10px] text-white/50">{formatDate(hoverInfo.task.start_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/25 w-[60px] flex-shrink-0">Fim</span>
                <span className="text-[10px] text-white/50">{formatDate(hoverInfo.task.end_date || hoverInfo.task.due_date)}</span>
              </div>
              {(() => {
                const days = getDaysBetween(hoverInfo.task.start_date, hoverInfo.task.end_date || hoverInfo.task.due_date)
                if (days === null) return null
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/25 w-[60px] flex-shrink-0">Duração</span>
                    <span className="text-[10px] text-white/50">{days} dia{days !== 1 ? 's' : ''}</span>
                  </div>
                )
              })()}
              {hoverInfo.task.task_agents && hoverInfo.task.task_agents.length > 0 && (
                <div className="flex items-start gap-2 pt-1 border-t border-white/[0.04]">
                  <span className="text-[9px] text-white/25 w-[60px] flex-shrink-0 mt-0.5">Agentes</span>
                  <div className="flex flex-wrap gap-1">
                    {hoverInfo.task.task_agents.map(agent => (
                      <span key={agent.id} className="text-[9px] bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Bot size={8} />{agent.agent_name || 'Agent'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hoverInfo.task.description && (
                <div className="pt-1.5 border-t border-white/[0.04]">
                  <p className="text-[9px] text-white/30 leading-relaxed line-clamp-2">{hoverInfo.task.description}</p>
                </div>
              )}
            </div>
            <div className="px-4 py-1.5 bg-white/[0.02] border-t border-white/[0.04] text-[8px] text-white/15 text-center">
              Clique para ver detalhes
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Detail Modal — opens on click, shows full info, has "Abrir editor" button */}
      {mounted && detailTask && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={() => setDetailTask(null)}
        >
          <div
            className="bg-[#161616] border border-white/[0.1] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-6 py-4 border-b border-white/[0.06] flex items-start gap-3"
              style={{ background: `linear-gradient(135deg, ${statusColorMap[detailTask.status_id || ''] || '#666'}22, transparent)` }}
            >
              <div
                className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: statusColorMap[detailTask.status_id || ''] || '#666' }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white leading-tight">{detailTask.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-white/50">
                    {statusNameMap[detailTask.status_id || ''] || 'Sem status'}
                  </span>
                  {detailTask.priority && (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      detailTask.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                      detailTask.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      detailTask.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-white/[0.06] text-white/30'
                    }`}>{detailTask.priority}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDetailTask(null)}
                className="p-1.5 hover:bg-white/[0.06] rounded-lg transition text-white/40 hover:text-white/80 flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {detailTask.executor_name && (
                  <div>
                    <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Executor</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <User size={10} className="text-blue-300" />
                      </div>
                      <span className="text-xs text-white/80">{detailTask.executor_name}</span>
                    </div>
                  </div>
                )}
                {detailTask.reviewer_name && (
                  <div>
                    <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Revisor</div>
                    <span className="text-xs text-emerald-400/80">{detailTask.reviewer_name}</span>
                  </div>
                )}
                <div>
                  <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Início</div>
                  <span className="text-xs text-white/60">{formatDate(detailTask.start_date)}</span>
                </div>
                <div>
                  <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Fim</div>
                  <span className="text-xs text-white/60">{formatDate(detailTask.end_date || detailTask.due_date)}</span>
                </div>
                {(() => {
                  const days = getDaysBetween(detailTask.start_date, detailTask.end_date || detailTask.due_date)
                  if (days === null) return null
                  return (
                    <div>
                      <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Duração</div>
                      <span className="text-xs text-white/60">{days} dia{days !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })()}
              </div>

              {detailTask.task_agents && detailTask.task_agents.length > 0 && (
                <div className="pt-3 border-t border-white/[0.04]">
                  <div className="text-[9px] text-white/25 uppercase tracking-wide mb-2">Agentes IA</div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailTask.task_agents.map(agent => (
                      <span key={agent.id} className="text-[10px] bg-purple-500/15 text-purple-300 px-2 py-1 rounded-md flex items-center gap-1">
                        <Bot size={10} />{agent.agent_name || 'Agent'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailTask.description && (
                <div className="pt-3 border-t border-white/[0.04]">
                  <div className="text-[9px] text-white/25 uppercase tracking-wide mb-2">Descrição</div>
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{detailTask.description}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between">
              <button
                onClick={() => setDetailTask(null)}
                className="text-xs text-white/40 hover:text-white/70 transition px-3 py-1.5"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const task = detailTask
                  setDetailTask(null)
                  onTaskClick(task)
                }}
                className="flex items-center gap-2 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 px-4 py-1.5 rounded-lg transition font-medium"
              >
                <ExternalLink size={12} />
                Abrir editor completo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

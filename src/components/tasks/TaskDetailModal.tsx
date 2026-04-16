'use client'

import { useState, useEffect } from 'react'
import { useTaskStore } from '@/stores/task-store'
import { updateTask } from '@/lib/supabase/queries'
import { X, Loader2 } from 'lucide-react'
import type { Task, TaskStatus } from '@/types/database'

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  statuses: TaskStatus[]
}

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  statuses
}: TaskDetailModalProps) {
  const { updateTask: updateLocalTask } = useTaskStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Task>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status_id: task.status_id,
        priority: task.priority,
        due_date: task.due_date
      })
      setError(null)
    }
  }, [task])

  if (!isOpen || !task) return null

  const currentStatus = statuses.find(s => s.id === formData.status_id || s.id === task.status_id)
  const taskStatus = statuses.find(s => s.id === task.status_id)

  const handleSave = async () => {
    if (!task) return

    setIsSaving(true)
    setError(null)

    try {
      // Validate title
      if (!formData.title?.trim()) {
        setError('O título não pode estar vazio')
        setIsSaving(false)
        return
      }

      const updates: Partial<Task> = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        status_id: formData.status_id,
        priority: formData.priority,
        due_date: formData.due_date || undefined
      }

      // Optimistic update
      updateLocalTask(task.id, updates)

      // Persist
      await updateTask(task.id, updates as any)

      setIsEditing(false)
      onClose()
    } catch (err) {
      console.error('Failed to update task:', err)
      setError(err instanceof Error ? err.message : 'Erro ao salvar tarefa')
      // Revert optimistic update
      setFormData({
        title: task.title,
        description: task.description,
        status_id: task.status_id,
        priority: task.priority,
        due_date: task.due_date
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: task.title,
      description: task.description,
      status_id: task.status_id,
      priority: task.priority,
      due_date: task.due_date
    })
    setIsEditing(false)
    setError(null)
  }

  const priorityColors = {
    urgent: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
    high: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
    medium: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    low: { bg: 'bg-white/[0.04]', text: 'text-white/30', border: 'border-white/[0.06]' }
  }

  const priorityColor = priorityColors[formData.priority || task.priority]

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-lg font-semibold text-white">
              {isEditing ? 'Editar Tarefa' : 'Detalhes da Tarefa'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/[0.06] rounded-lg transition"
            >
              <X size={20} className="text-white/50" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Título</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-white/[0.12] transition"
                  placeholder="Título da tarefa"
                  disabled={isSaving}
                />
              ) : (
                <p className="text-white text-sm">{task.title}</p>
              )}
            </div>

            {/* Status and Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Status</label>
                {isEditing ? (
                  <select
                    value={formData.status_id || ''}
                    onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/[0.12] transition"
                    disabled={isSaving}
                  >
                    <option value="">Selecionar status</option>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    {taskStatus && (
                      <>
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: taskStatus.color }}
                        />
                        <span className="text-sm text-white">{taskStatus.name}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Prioridade</label>
                {isEditing ? (
                  <select
                    value={formData.priority || task.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/[0.12] transition"
                    disabled={isSaving}
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                ) : (
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`}>
                    {formData.priority || task.priority}
                  </div>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Data de Vencimento</label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined
                  })}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/[0.12] transition"
                  disabled={isSaving}
                />
              ) : (
                <p className="text-white text-sm">
                  {formData.due_date || task.due_date
                    ? new Date(formData.due_date || task.due_date!).toLocaleDateString('pt-BR')
                    : 'Sem data de vencimento'}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Descrição</label>
              {isEditing ? (
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-white/[0.12] transition resize-none"
                  placeholder="Descrição da tarefa"
                  rows={4}
                  disabled={isSaving}
                />
              ) : (
                <p className="text-white/70 text-sm whitespace-pre-wrap">
                  {formData.description || task.description || 'Sem descrição'}
                </p>
              )}
            </div>

            {/* Metadata */}
            {!isEditing && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
                <div>
                  <p className="text-xs text-white/30 mb-1">Criado em</p>
                  <p className="text-xs text-white/70">
                    {new Date(task.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/30 mb-1">Atualizado em</p>
                  <p className="text-xs text-white/70">
                    {new Date(task.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-white/50 hover:text-white/70 transition"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.06] rounded-lg text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white/50 hover:text-white/70 transition"
                >
                  Fechar
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.06] rounded-lg text-sm font-medium text-white transition"
                >
                  Editar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

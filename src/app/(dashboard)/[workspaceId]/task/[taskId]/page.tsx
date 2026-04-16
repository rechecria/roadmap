'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTaskStore } from '@/stores/task-store';
import { useAppStore } from '@/stores/app-store';
import { updateTask, getTask, getTaskAgents } from '@/lib/supabase/queries';
import { Editor } from '@/components/editor/Editor';
import TaskExecutionPanel from '@/components/tasks/TaskExecutionPanel';
import { ChevronLeft, User, Bot, Calendar, Shield, Eye } from 'lucide-react';
import type { Task, TaskAgent } from '@/types/database';

export default function TaskEditorPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params?.taskId as string;
  const workspaceId = params?.workspaceId as string;

  const { tasks, statuses, members, agents, updateTask: updateLocalTask } = useTaskStore();
  const { currentProject } = useAppStore();

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [taskAgents, setTaskAgents] = useState<TaskAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const debounceTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Load task from store or Supabase
  useEffect(() => {
    const loadTask = async () => {
      try {
        const storedTask = tasks.find(t => t.id === taskId);
        if (storedTask) {
          setTask(storedTask);
          setTitle(storedTask.title);
          setTaskAgents(storedTask.task_agents || []);
          setIsLoading(false);

          // Also fetch fresh agents if not available
          if (!storedTask.task_agents || storedTask.task_agents.length === 0) {
            const agents = await getTaskAgents(taskId);
            setTaskAgents(agents);
          }
          return;
        }

        const fetchedTask = await getTask(taskId);
        setTask(fetchedTask);
        setTitle(fetchedTask.title);

        const agents = await getTaskAgents(taskId);
        setTaskAgents(agents);
      } catch (err) {
        console.error('Failed to load task:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (taskId) loadTask();
  }, [taskId, tasks]);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        if (!taskId) return;
        try {
          await updateTask(taskId, { title: newTitle });
          updateLocalTask(taskId, { title: newTitle });
        } catch (err) {
          console.error('Failed to update task title:', err);
        }
      }, 800);
    },
    [taskId, updateLocalTask]
  );

  const handleContentChange = useCallback(
    (blocks: any[]) => {
      if (!taskId) return;

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          await updateTask(taskId, { content: blocks });
          updateLocalTask(taskId, { content: blocks });
        } catch (err) {
          console.error('Failed to update task content:', err);
        }
      }, 800);
    },
    [taskId, updateLocalTask]
  );

  const handleFieldChange = useCallback(
    async (field: string, value: any) => {
      if (!taskId) return;
      try {
        const updates: any = { [field]: value };

        // Handle completed_at for status changes
        if (field === 'status_id') {
          updates.completed_at = statuses.find(s => s.id === value)?.category === 'done'
            ? new Date().toISOString()
            : null;
        }

        await updateTask(taskId, updates);
        updateLocalTask(taskId, {
          ...updates,
          completed_at: updates.completed_at ?? undefined,
        });
        setTask(prev => prev ? { ...prev, ...updates, completed_at: updates.completed_at ?? undefined } : null);
      } catch (err) {
        console.error(`Failed to update task ${field}:`, err);
      }
    },
    [taskId, statuses, updateLocalTask]
  );

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-white/40">Loading task...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-white/40">Task not found</div>
      </div>
    );
  }

  const priorityColors = {
    urgent: { bg: 'bg-red-500/15', text: 'text-red-400' },
    high: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
    medium: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
    low: { bg: 'bg-white/[0.04]', text: 'text-white/30' },
  };

  const currentStatus = task.status_id ? statuses.find(s => s.id === task.status_id) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Header with Breadcrumb */}
      <div className="border-b border-white/[0.06] bg-[#0a0a0a] z-10 flex-shrink-0">
        <div className="px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push(`/${workspaceId}`)}
            className="p-1 hover:bg-white/[0.06] rounded-lg transition"
            aria-label="Go back"
          >
            <ChevronLeft size={20} className="text-white/60" />
          </button>

          <nav className="flex items-center gap-2 text-sm text-white/40">
            <span>{currentProject?.name || 'Project'}</span>
            <span>/</span>
            <button
              onClick={() => router.push(`/${workspaceId}`)}
              className="hover:text-white/60 transition"
            >
              Tarefas
            </button>
            <span>/</span>
            <span className="text-white/60 truncate max-w-[300px]">{title}</span>
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            {/* Status */}
            <PropertyRow label="Status" icon={<div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentStatus?.color || '#666' }} />}>
              <select
                value={task.status_id || ''}
                onChange={(e) => handleFieldChange('status_id', e.target.value)}
                className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white hover:border-white/[0.1] transition appearance-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </PropertyRow>

            {/* Priority */}
            <PropertyRow label="Prioridade">
              <select
                value={task.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value)}
                className={`${priorityColors[task.priority as keyof typeof priorityColors].bg} ${priorityColors[task.priority as keyof typeof priorityColors].text} border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs font-medium hover:border-white/[0.1] transition appearance-none cursor-pointer`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </PropertyRow>

            {/* Executor */}
            <PropertyRow label="Executor" icon={<User size={12} className="text-blue-400" />}>
              <select
                value={task.executor_id || ''}
                onChange={(e) => handleFieldChange('executor_id', e.target.value || null)}
                className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white hover:border-white/[0.1] transition appearance-none cursor-pointer"
              >
                <option value="">Não atribuído</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                ))}
              </select>
            </PropertyRow>

            {/* Reviewer */}
            <PropertyRow label="Revisor" icon={<Shield size={12} className="text-emerald-400" />}>
              <select
                value={task.reviewer_id || ''}
                onChange={(e) => handleFieldChange('reviewer_id', e.target.value || null)}
                className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white hover:border-white/[0.1] transition appearance-none cursor-pointer"
              >
                <option value="">Não atribuído</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                ))}
              </select>
            </PropertyRow>

            {/* Follower */}
            <PropertyRow label="Acompanhador" icon={<Eye size={12} className="text-amber-400" />}>
              <select
                value={task.follower_id || ''}
                onChange={(e) => handleFieldChange('follower_id', e.target.value || null)}
                className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white hover:border-white/[0.1] transition appearance-none cursor-pointer"
              >
                <option value="">Não atribuído</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                ))}
              </select>
            </PropertyRow>

            {/* Due Date */}
            <PropertyRow label="Prazo" icon={<Calendar size={12} className="text-white/40" />}>
              <input
                type="date"
                value={task.due_date ? task.due_date.split('T')[0] : ''}
                onChange={(e) => handleFieldChange('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white hover:border-white/[0.1] transition cursor-pointer"
              />
            </PropertyRow>

            {/* Start Date */}
            <PropertyRow label="Início" icon={<Calendar size={12} className="text-green-400" />}>
              <input
                type="date"
                value={task.start_date ? task.start_date.split('T')[0] : ''}
                onChange={(e) => handleFieldChange('start_date', e.target.value || null)}
                className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white hover:border-white/[0.1] transition cursor-pointer"
              />
            </PropertyRow>

            {/* End Date */}
            <PropertyRow label="Fim" icon={<Calendar size={12} className="text-red-400" />}>
              <input
                type="date"
                value={task.end_date ? task.end_date.split('T')[0] : ''}
                onChange={(e) => handleFieldChange('end_date', e.target.value || null)}
                className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white hover:border-white/[0.1] transition cursor-pointer"
              />
            </PropertyRow>
          </div>

          {/* AI Agents Section */}
          {taskAgents.length > 0 && (
            <div className="mb-8 p-4 bg-purple-500/[0.03] rounded-xl border border-purple-500/10">
              <div className="text-xs text-purple-300/60 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Bot size={12} /> Agentes IA Atribuídos
              </div>
              <div className="flex flex-wrap gap-2">
                {taskAgents.map(ta => (
                  <div key={ta.id} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <Bot size={12} className="text-purple-400" />
                    <span className="text-xs text-purple-300">{ta.agent_name || 'Agent'}</span>
                    <span className="text-[9px] text-purple-400/40 px-1.5 py-0.5 bg-purple-500/10 rounded">{ta.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Title Section */}
          <div className="mb-6">
            <textarea
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Task title..."
              className="w-full text-3xl font-bold text-white bg-transparent border-none outline-none resize-none"
              rows={2}
            />
          </div>

          {/* Editor Section */}
          <div className="mb-8">
            <div className="text-xs text-white/30 uppercase tracking-wide mb-4">Descrição</div>
            <Editor
              initialContent={task.content || []}
              onChange={handleContentChange}
              theme="dark"
            />
          </div>

          {/* AI Execution Panel */}
          <div className="mb-8">
            <TaskExecutionPanel task={{ ...task, task_agents: taskAgents }} agents={agents} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-28 flex-shrink-0">
        {icon}
        <label className="text-xs text-white/30">{label}</label>
      </div>
      {children}
    </div>
  );
}

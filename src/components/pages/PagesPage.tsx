'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/stores/app-store'
import { usePagesStore } from '@/stores/pages-store'
import { getPages } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/client'
import type { Page } from '@/types/database'
import {
  FileText, Plus, ChevronRight, ChevronDown, Search,
  MoreHorizontal, Trash2, Copy, ArrowUpRight, Edit3,
  Hash, Clock, Smile, X, Check, GripVertical,
  BookOpen, File, FolderOpen
} from 'lucide-react'

// ========================================
// Types
// ========================================

interface TreeNode {
  page: Page
  children: TreeNode[]
  depth: number
  isExpanded: boolean
}

// ========================================
// Helpers
// ========================================

function buildTree(pages: Page[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  // Create nodes
  pages.forEach(p => {
    map.set(p.id, { page: p, children: [], depth: 0, isExpanded: true })
  })

  // Build hierarchy
  pages.forEach(p => {
    const node = map.get(p.id)!
    if (p.parent_id && map.has(p.parent_id)) {
      const parent = map.get(p.parent_id)!
      node.depth = parent.depth + 1
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function flattenTree(nodes: TreeNode[], expanded: Set<string>): TreeNode[] {
  const result: TreeNode[] = []
  function walk(list: TreeNode[]) {
    list.forEach(node => {
      result.push(node)
      if (expanded.has(node.page.id) && node.children.length > 0) {
        walk(node.children)
      }
    })
  }
  walk(nodes)
  return result
}

function extractText(content: any[]): string {
  if (!content || !Array.isArray(content)) return ''
  return content.map(block => {
    if (block.content && Array.isArray(block.content)) {
      return block.content.map((c: any) => c.text || '').join('')
    }
    return ''
  }).filter(Boolean).join(' ').slice(0, 200)
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  return `${days}d atrás`
}

// ========================================
// Content Renderer
// ========================================

function RenderBlock({ block }: { block: any }) {
  const renderInline = (content: any[]) => {
    if (!content || !Array.isArray(content)) return null
    return content.map((item: any, i: number) => {
      if (item.type === 'text') {
        let el: React.ReactNode = item.text
        if (item.styles?.bold) el = <strong key={i}>{el}</strong>
        if (item.styles?.italic) el = <em key={i}>{el}</em>
        if (item.styles?.code) el = <code key={i} className="px-1.5 py-0.5 bg-white/[0.06] rounded text-orange-300 text-sm font-mono">{el}</code>
        return <span key={i}>{el}</span>
      }
      if (item.type === 'link') {
        return <a key={i} href={item.href} className="text-orange-400 hover:underline" target="_blank" rel="noopener noreferrer">{item.content?.map((c: any) => c.text).join('')}</a>
      }
      return <span key={i}>{item.text || ''}</span>
    })
  }

  const type = block.type
  const content = block.content
  const props = block.props || {}

  switch (type) {
    case 'heading': {
      const level = props.level || 2
      const cls = level === 1
        ? 'text-2xl font-bold text-white mt-8 mb-3'
        : level === 2
        ? 'text-xl font-semibold text-white mt-6 mb-2'
        : 'text-base font-semibold text-white/90 mt-4 mb-1.5'
      return <div className={cls}>{renderInline(content)}</div>
    }
    case 'paragraph':
      return <p className="text-sm text-white/70 leading-relaxed mb-2">{renderInline(content)}</p>
    case 'bulletListItem':
      return (
        <div className="flex items-start gap-2 mb-1 ml-1">
          <span className="text-orange-400 mt-1.5 text-xs">●</span>
          <p className="text-sm text-white/70 leading-relaxed">{renderInline(content)}</p>
        </div>
      )
    case 'numberedListItem':
      return (
        <div className="flex items-start gap-2 mb-1 ml-1">
          <span className="text-orange-400 mt-0.5 text-xs font-mono min-w-[16px]">•</span>
          <p className="text-sm text-white/70 leading-relaxed">{renderInline(content)}</p>
        </div>
      )
    case 'checkListItem':
      return (
        <div className="flex items-start gap-2 mb-1 ml-1">
          <span className={`mt-0.5 text-sm ${props.checked ? 'text-green-400' : 'text-white/20'}`}>
            {props.checked ? '✅' : '⬜'}
          </span>
          <p className={`text-sm leading-relaxed ${props.checked ? 'text-white/40 line-through' : 'text-white/70'}`}>
            {renderInline(content)}
          </p>
        </div>
      )
    case 'codeBlock':
      return (
        <pre className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-4 mb-3 overflow-x-auto">
          <code className="text-sm font-mono text-green-300">{renderInline(content)}</code>
        </pre>
      )
    case 'image':
      return (
        <div className="my-4 rounded-lg overflow-hidden border border-white/[0.06]">
          <img src={props.url} alt={props.caption || ''} className="w-full" />
          {props.caption && <p className="text-xs text-white/30 p-2">{props.caption}</p>}
        </div>
      )
    default:
      if (content && Array.isArray(content)) {
        return <p className="text-sm text-white/70 leading-relaxed mb-2">{renderInline(content)}</p>
      }
      return null
  }
}

function ContentRenderer({ content }: { content: any[] }) {
  if (!content || !Array.isArray(content) || content.length === 0) {
    return (
      <div className="text-white/20 text-sm italic">
        Página vazia. Clique em editar para começar a escrever.
      </div>
    )
  }
  return (
    <div className="space-y-0.5">
      {content.map((block, i) => (
        <RenderBlock key={i} block={block} />
      ))}
    </div>
  )
}

// ========================================
// Editor Component (Simple markdown-style)
// ========================================

function PageEditor({
  content,
  onSave,
  onCancel
}: {
  content: any[]
  onSave: (newContent: any[]) => void
  onCancel: () => void
}) {
  // Convert blocks to editable text
  const toText = (blocks: any[]): string => {
    if (!blocks || !Array.isArray(blocks)) return ''
    return blocks.map(block => {
      const text = block.content?.map((c: any) => c.text || '').join('') || ''
      const type = block.type
      const props = block.props || {}

      if (type === 'heading') {
        const prefix = props.level === 1 ? '# ' : props.level === 2 ? '## ' : '### '
        return prefix + text
      }
      if (type === 'bulletListItem') return '- ' + text
      if (type === 'numberedListItem') return '1. ' + text
      if (type === 'checkListItem') return (props.checked ? '- [x] ' : '- [ ] ') + text
      if (type === 'codeBlock') return '```\n' + text + '\n```'
      return text
    }).join('\n')
  }

  // Convert text back to blocks
  const toBlocks = (text: string): any[] => {
    return text.split('\n').filter(line => line.trim() !== '').map(line => {
      if (line.startsWith('### ')) {
        return { type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: line.slice(4) }] }
      }
      if (line.startsWith('## ')) {
        return { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: line.slice(3) }] }
      }
      if (line.startsWith('# ')) {
        return { type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: line.slice(2) }] }
      }
      if (line.startsWith('- [x] ')) {
        return { type: 'checkListItem', props: { checked: true }, content: [{ type: 'text', text: line.slice(6) }] }
      }
      if (line.startsWith('- [ ] ')) {
        return { type: 'checkListItem', props: { checked: false }, content: [{ type: 'text', text: line.slice(6) }] }
      }
      if (line.startsWith('- ')) {
        return { type: 'bulletListItem', content: [{ type: 'text', text: line.slice(2) }] }
      }
      if (/^\d+\.\s/.test(line)) {
        return { type: 'numberedListItem', content: [{ type: 'text', text: line.replace(/^\d+\.\s/, '') }] }
      }
      return { type: 'paragraph', content: [{ type: 'text', text: line }] }
    })
  }

  const [text, setText] = useState(toText(content))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-xs text-white/30 font-mono">Markdown</span>
        <span className="text-xs text-white/15">|</span>
        <span className="text-xs text-white/20">
          # heading &nbsp; - list &nbsp; - [x] check &nbsp; 1. numbered
        </span>
        <div className="flex-1" />
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs text-white/40 hover:text-white/70 transition rounded"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(toBlocks(text))}
          className="px-3 py-1 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition rounded flex items-center gap-1"
        >
          <Check size={12} />
          Salvar
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        className="flex-1 bg-transparent text-white/80 text-sm font-mono leading-relaxed p-6 resize-none outline-none placeholder:text-white/15 min-h-[300px]"
        placeholder="Comece a escrever...&#10;&#10;Use # para títulos, - para listas, - [x] para checklists"
        spellCheck={false}
      />
    </div>
  )
}

// ========================================
// Sidebar Tree Item
// ========================================

function TreeItem({
  node,
  isSelected,
  isExpanded,
  onSelect,
  onToggle,
}: {
  node: TreeNode
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggle: () => void
}) {
  const hasChildren = node.children.length > 0
  const indent = node.depth * 20

  return (
    <div
      className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-all ${
        isSelected
          ? 'bg-orange-500/10 text-white'
          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
      }`}
      style={{ paddingLeft: `${indent + 8}px` }}
      onClick={onSelect}
    >
      {hasChildren ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className="p-0.5 rounded hover:bg-white/[0.08] transition shrink-0"
        >
          {isExpanded
            ? <ChevronDown size={13} className="text-white/30" />
            : <ChevronRight size={13} className="text-white/30" />
          }
        </button>
      ) : (
        <span className="w-[18px]" />
      )}
      <span className="text-sm shrink-0">{node.page.icon || '📄'}</span>
      <span className="text-[13px] truncate flex-1">{node.page.title || 'Sem título'}</span>
    </div>
  )
}

// ========================================
// Main Component
// ========================================

export default function PagesPage() {
  const { currentProject } = useAppStore()
  const { pages, setPages, addPage, updatePage, deletePage } = usePagesStore()

  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [creating, setCreating] = useState(false)

  const supabase = createClient()

  // Load pages
  useEffect(() => {
    async function load() {
      if (!currentProject) return
      try {
        setLoading(true)
        const data = await getPages(currentProject.id)
        const map: Record<string, Page> = {}
        data.forEach(p => { map[p.id] = p })
        setPages(map)
        // Expand all parents by default
        const parentIds = new Set(data.filter(p => p.parent_id).map(p => p.parent_id!))
        setExpanded(parentIds)
        // Auto-select first
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id)
        }
      } catch (err) {
        console.error('Failed to load pages:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentProject?.id])

  // Build tree
  const allPages = Object.values(pages).sort((a, b) => a.position - b.position)
  const tree = buildTree(allPages)
  const flatItems = flattenTree(tree, expanded)

  // Filter
  const filtered = searchQuery
    ? flatItems.filter(n =>
        n.page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        extractText(n.page.content).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : flatItems

  const selectedPage = selectedId ? pages[selectedId] : null

  // Toggle expand
  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Create new page
  const handleCreate = async (parentId: string | null = null) => {
    if (!currentProject || creating) return
    setCreating(true)
    try {
      const newPage: Partial<Page> = {
        workspace_id: '00000000-0000-0000-0000-000000000001',
        project_id: currentProject.id,
        parent_id: parentId,
        title: 'Nova Página',
        icon: '📝',
        content: [],
        is_template: false,
        is_deleted: false,
        position: allPages.filter(p => p.parent_id === parentId).length,
      }
      const { data, error } = await supabase
        .from('pages')
        .insert(newPage)
        .select()
        .single()
      if (error) throw error
      if (data) {
        addPage(data)
        setSelectedId(data.id)
        setIsEditing(true)
        if (parentId) {
          setExpanded(prev => new Set([...prev, parentId]))
        }
      }
    } catch (err) {
      console.error('Failed to create page:', err)
    } finally {
      setCreating(false)
    }
  }

  // Save content
  const handleSaveContent = async (newContent: any[]) => {
    if (!selectedId) return
    try {
      const { error } = await supabase
        .from('pages')
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq('id', selectedId)
      if (error) throw error
      updatePage(selectedId, { content: newContent, updated_at: new Date().toISOString() })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  // Save title
  const handleSaveTitle = async () => {
    if (!selectedId || !titleDraft.trim()) return
    try {
      const { error } = await supabase
        .from('pages')
        .update({ title: titleDraft.trim(), updated_at: new Date().toISOString() })
        .eq('id', selectedId)
      if (error) throw error
      updatePage(selectedId, { title: titleDraft.trim(), updated_at: new Date().toISOString() })
      setEditingTitle(false)
    } catch (err) {
      console.error('Failed to rename:', err)
    }
  }

  // Delete page
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pages')
        .update({ is_deleted: true })
        .eq('id', id)
      if (error) throw error
      deletePage(id)
      if (selectedId === id) {
        const remaining = Object.keys(pages).filter(k => k !== id)
        setSelectedId(remaining.length > 0 ? remaining[0] : null)
      }
      setContextMenu(null)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  // Duplicate page
  const handleDuplicate = async (id: string) => {
    const original = pages[id]
    if (!original || !currentProject) return
    try {
      const { data, error } = await supabase
        .from('pages')
        .insert({
          workspace_id: original.workspace_id,
          project_id: original.project_id,
          parent_id: original.parent_id,
          title: original.title + ' (cópia)',
          icon: original.icon,
          content: original.content,
          is_template: false,
          is_deleted: false,
          position: original.position + 1,
        })
        .select()
        .single()
      if (error) throw error
      if (data) {
        addPage(data)
        setSelectedId(data.id)
      }
      setContextMenu(null)
    } catch (err) {
      console.error('Failed to duplicate:', err)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] h-full">
        <div className="flex items-center gap-3 text-white/30">
          <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <span className="text-sm">Carregando páginas...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-[#0a0a0a] relative">
      {/* ===== SIDEBAR ===== */}
      <div className="w-64 border-r border-white/[0.06] flex flex-col shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-orange-400" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Páginas</span>
            </div>
            <button
              onClick={() => handleCreate(null)}
              disabled={creating}
              className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-orange-400 transition"
              title="Nova página"
            >
              <Plus size={14} />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-md text-xs text-white/70 pl-7 pr-2 py-1.5 outline-none focus:border-orange-500/30 placeholder:text-white/15 transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <File size={20} className="mx-auto text-white/10 mb-2" />
              <p className="text-xs text-white/20">
                {searchQuery ? 'Nenhuma página encontrada' : 'Nenhuma página ainda'}
              </p>
            </div>
          ) : (
            filtered.map(node => (
              <TreeItem
                key={node.page.id}
                node={node}
                isSelected={selectedId === node.page.id}
                isExpanded={expanded.has(node.page.id)}
                onSelect={() => { setSelectedId(node.page.id); setIsEditing(false) }}
                onToggle={() => toggleExpand(node.page.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedPage ? (
          <>
            {/* Page Header */}
            <div className="px-8 pt-6 pb-4 border-b border-white/[0.06]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Breadcrumb */}
                  {selectedPage.parent_id && pages[selectedPage.parent_id] && (
                    <div className="flex items-center gap-1 mb-2">
                      <button
                        onClick={() => setSelectedId(selectedPage.parent_id!)}
                        className="text-xs text-white/25 hover:text-orange-400 transition"
                      >
                        {pages[selectedPage.parent_id].icon} {pages[selectedPage.parent_id].title}
                      </button>
                      <ChevronRight size={10} className="text-white/15" />
                      <span className="text-xs text-white/40">{selectedPage.title}</span>
                    </div>
                  )}
                  {/* Title */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedPage.icon || '📄'}</span>
                    {editingTitle ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={titleDraft}
                          onChange={e => setTitleDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                          autoFocus
                          className="text-2xl font-bold text-white bg-transparent border-b border-orange-500/50 outline-none pb-0.5"
                        />
                        <button onClick={handleSaveTitle} className="p-1 text-green-400 hover:bg-green-400/10 rounded"><Check size={16} /></button>
                        <button onClick={() => setEditingTitle(false)} className="p-1 text-white/30 hover:bg-white/[0.06] rounded"><X size={16} /></button>
                      </div>
                    ) : (
                      <h1
                        className="text-2xl font-bold text-white cursor-pointer hover:text-orange-400 transition"
                        onClick={() => { setTitleDraft(selectedPage.title); setEditingTitle(true) }}
                        title="Clique para renomear"
                      >
                        {selectedPage.title}
                      </h1>
                    )}
                  </div>
                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/20">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {getTimeAgo(selectedPage.updated_at)}
                    </span>
                    {selectedPage.content && (
                      <span>{selectedPage.content.length} blocos</span>
                    )}
                    {/* Child pages count */}
                    {allPages.filter(p => p.parent_id === selectedPage.id).length > 0 && (
                      <span className="flex items-center gap-1">
                        <FolderOpen size={11} />
                        {allPages.filter(p => p.parent_id === selectedPage.id).length} sub-páginas
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-1">
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 hover:text-orange-400 hover:bg-orange-500/10 rounded-md transition"
                    >
                      <Edit3 size={13} />
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => handleCreate(selectedPage.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 hover:text-orange-400 hover:bg-orange-500/10 rounded-md transition"
                    title="Criar sub-página"
                  >
                    <Plus size={13} />
                    Sub-página
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setContextMenu({ id: selectedPage.id, x: rect.right - 160, y: rect.bottom + 4 })
                      }}
                      className="p-1.5 text-white/20 hover:text-white/50 hover:bg-white/[0.04] rounded transition"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Page Body */}
            <div className="flex-1 overflow-y-auto">
              {isEditing ? (
                <PageEditor
                  content={selectedPage.content || []}
                  onSave={handleSaveContent}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <div className="px-8 py-6 max-w-3xl">
                  <ContentRenderer content={selectedPage.content || []} />

                  {/* Child pages listing */}
                  {allPages.filter(p => p.parent_id === selectedPage.id).length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/[0.06]">
                      <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Sub-páginas</h3>
                      <div className="space-y-1">
                        {allPages.filter(p => p.parent_id === selectedPage.id).map(child => (
                          <button
                            key={child.id}
                            onClick={() => setSelectedId(child.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition text-left group"
                          >
                            <span className="text-base">{child.icon || '📄'}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white/70 group-hover:text-white transition">{child.title}</span>
                              <p className="text-xs text-white/20 truncate mt-0.5">{extractText(child.content)}</p>
                            </div>
                            <ArrowUpRight size={13} className="text-white/10 group-hover:text-orange-400 transition shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-white/10" />
              </div>
              <h3 className="text-base font-medium text-white/40 mb-1">Selecione uma página</h3>
              <p className="text-xs text-white/20 mb-4">ou crie uma nova para começar</p>
              <button
                onClick={() => handleCreate(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs bg-orange-500/10 text-orange-400 rounded-lg hover:bg-orange-500/20 transition"
              >
                <Plus size={13} />
                Nova Página
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== CONTEXT MENU ===== */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 w-40 bg-[#1a1a1a] border border-white/[0.1] rounded-lg shadow-xl overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleDuplicate(contextMenu.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition"
            >
              <Copy size={13} />
              Duplicar
            </button>
            <button
              onClick={() => handleDelete(contextMenu.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition"
            >
              <Trash2 size={13} />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  )
}

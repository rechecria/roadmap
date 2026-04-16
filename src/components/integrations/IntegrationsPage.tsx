'use client'

import { useState } from 'react'
import {
  Database, Globe, Palette, BookOpen, Mail, Calendar, HardDrive, LayoutList,
  AlertTriangle, Link2, CreditCard, Monitor, Cpu, PenTool, MessageSquare, Send,
  MessageCircle, FileText, Brain, Zap, CheckCircle2, Circle, ExternalLink,
  Settings, BarChart3, Filter
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

interface IntegrationCard {
  id: string
  provider: string
  name: string
  description?: string
  icon: React.ReactNode
  color: string
  status: 'connected' | 'coming_soon'
  capabilities: string[]
  url?: string
  configInfo?: string
}

const mcpConnections: IntegrationCard[] = [
  {
    id: 'supabase',
    provider: 'supabase',
    name: 'Supabase',
    description: 'SQL, migrations, edge functions, branches, TypeScript types',
    icon: <Database size={24} />,
    color: 'from-green-500 to-emerald-600',
    status: 'connected',
    capabilities: ['Database', 'Migrations', 'Edge Functions', 'Branches', 'TypeScript'],
    url: 'https://supabase.com/dashboard/project/yjngczxvwwttfhtejgnp',
    configInfo: 'Projeto: yjngczxvwwttfhtejgnp • Região: South America • RLS ativo em todas as tabelas',
  },
  {
    id: 'vercel',
    provider: 'vercel',
    name: 'Vercel',
    description: 'Deploy, logs, domains, projects, threads',
    icon: <Globe size={24} />,
    color: 'from-gray-700 to-black',
    status: 'connected',
    capabilities: ['Deploy', 'Logs', 'Domains', 'Projects', 'Threads'],
    url: 'https://vercel.com/dashboard',
    configInfo: 'Deploy: roadmap-found-ctx.vercel.app • Framework: Next.js 14 • Auto-deploy via GitHub',
  },
  {
    id: 'figma',
    provider: 'figma',
    name: 'Figma',
    description: 'Design context, screenshots, variables, code connect, search',
    icon: <Palette size={24} />,
    color: 'from-purple-500 to-pink-500',
    status: 'connected',
    capabilities: ['Design Context', 'Screenshots', 'Variables', 'Code Connect', 'Search'],
    url: 'https://www.figma.com',
    configInfo: 'Org: Hural Dynamics • MCP via Figma Dev Mode • Code Connect habilitado',
  },
  {
    id: 'chrome',
    provider: 'chrome',
    name: 'Chrome',
    description: 'Navigation, DOM, forms, screenshots, JS, console, network',
    icon: <Monitor size={24} />,
    color: 'from-blue-500 to-blue-700',
    status: 'connected',
    capabilities: ['Navigation', 'DOM', 'Forms', 'Screenshots', 'JS', 'Console', 'Network'],
    configInfo: 'Extensão Claude in Chrome ativa • DOM-aware automation • Console + Network tracking',
  },
  {
    id: 'obsidian',
    provider: 'obsidian',
    name: 'Obsidian',
    description: 'Read/write notes, search, tags, backlinks, commands',
    icon: <BookOpen size={24} />,
    color: 'from-violet-500 to-purple-700',
    status: 'connected',
    capabilities: ['Notes', 'Search', 'Tags', 'Backlinks', 'Commands'],
    url: 'obsidian://open',
    configInfo: 'Vault conectado via MCP local • REST API habilitada • Backlinks + Tags indexados',
  },
  {
    id: 'gmail',
    provider: 'gmail',
    name: 'Gmail',
    description: 'Search, read, draft, label emails',
    icon: <Mail size={24} />,
    color: 'from-red-400 to-red-600',
    status: 'connected',
    capabilities: ['Search', 'Read', 'Draft', 'Labels'],
    url: 'https://mail.google.com',
    configInfo: 'Conta: rechecria@gmail.com • OAuth2 • Permissões: read, draft, label',
  },
  {
    id: 'google-calendar',
    provider: 'google-calendar',
    name: 'Google Calendar',
    description: 'Events, free time, find meeting times',
    icon: <Calendar size={24} />,
    color: 'from-blue-400 to-blue-600',
    status: 'connected',
    capabilities: ['Events', 'Free Time', 'Meeting Times'],
    url: 'https://calendar.google.com',
    configInfo: 'Conta: rechecria@gmail.com • OAuth2 • Permissões: events, free time',
  },
  {
    id: 'google-drive',
    provider: 'google-drive',
    name: 'Google Drive',
    description: 'Search, fetch documents',
    icon: <HardDrive size={24} />,
    color: 'from-yellow-500 to-yellow-600',
    status: 'connected',
    capabilities: ['Search', 'Fetch', 'Documents'],
    url: 'https://drive.google.com',
    configInfo: 'Conta: rechecria@gmail.com • OAuth2 • Permissões: search, fetch',
  },
  {
    id: 'linear',
    provider: 'linear',
    name: 'Linear',
    description: 'Issues, projects, documents, milestones, comments',
    icon: <LayoutList size={24} />,
    color: 'from-indigo-500 to-indigo-700',
    status: 'connected',
    capabilities: ['Issues', 'Projects', 'Documents', 'Milestones', 'Comments'],
    url: 'https://linear.app',
    configInfo: 'Workspace conectado • Issues, projetos, docs, milestones sincronizados',
  },
  {
    id: 'sentry',
    provider: 'sentry',
    name: 'Sentry',
    description: 'Issues, events, replays, error tracking',
    icon: <AlertTriangle size={24} />,
    color: 'from-pink-500 to-pink-700',
    status: 'connected',
    capabilities: ['Issues', 'Events', 'Replays', 'Error Tracking'],
    url: 'https://sentry.io',
    configInfo: 'Org conectada • Issues, events, replays monitorados • Alertas configurados',
  },
  {
    id: 'blockchain',
    provider: 'blockchain',
    name: '1inch Blockchain',
    description: 'Address info, contracts, tokens, NFTs, transactions',
    icon: <Link2 size={24} />,
    color: 'from-cyan-500 to-cyan-700',
    status: 'connected',
    capabilities: ['Address Info', 'Contracts', 'Tokens', 'NFTs', 'Transactions'],
    url: 'https://app.1inch.io',
    configInfo: 'Multi-chain • Address info, contratos, tokens, NFTs, transações via API',
  },
  {
    id: 'stripe',
    provider: 'stripe',
    name: 'Stripe',
    description: 'Customers, invoices, subscriptions, products, payments',
    icon: <CreditCard size={24} />,
    color: 'from-purple-400 to-indigo-500',
    status: 'connected',
    capabilities: ['Customers', 'Invoices', 'Subscriptions', 'Products', 'Payments'],
    url: 'https://dashboard.stripe.com',
    configInfo: 'Dashboard conectado • Customers, invoices, subscriptions, products, payments',
  },
  {
    id: 'computer-use',
    provider: 'computer-use',
    name: 'Computer Use',
    description: 'Screenshots, clicks, keyboard, native automation',
    icon: <Monitor size={24} />,
    color: 'from-orange-500 to-orange-700',
    status: 'connected',
    capabilities: ['Screenshots', 'Clicks', 'Keyboard', 'Automation'],
    configInfo: 'Automação nativa macOS • Screenshots, clicks, keyboard, drag-and-drop',
  },
  {
    id: 'huggingface',
    provider: 'huggingface',
    name: 'HuggingFace',
    description: 'Models, spaces, papers, docs',
    icon: <Cpu size={24} />,
    color: 'from-yellow-400 to-amber-600',
    status: 'connected',
    capabilities: ['Models', 'Spaces', 'Papers', 'Docs'],
    url: 'https://huggingface.co',
    configInfo: 'Hub conectado • Models, Spaces, Papers, Docs acessíveis via MCP',
  },
  {
    id: 'canva',
    provider: 'canva',
    name: 'Canva',
    description: 'Create, edit, export designs',
    icon: <PenTool size={24} />,
    color: 'from-cyan-400 to-blue-500',
    status: 'connected',
    capabilities: ['Create', 'Edit', 'Export'],
    url: 'https://www.canva.com',
    configInfo: 'Conta conectada • Criar, editar, exportar designs via MCP',
  },
]

const availableIntegrations: IntegrationCard[] = [
  {
    id: 'slack',
    provider: 'slack',
    name: 'Slack',
    icon: <MessageSquare size={24} />,
    color: 'from-[#4A154B] to-[#611f69]',
    status: 'coming_soon',
    capabilities: ['Notifications', 'Commands', 'Bots', 'Channels'],
  },
  {
    id: 'telegram',
    provider: 'telegram',
    name: 'Telegram',
    icon: <Send size={24} />,
    color: 'from-blue-400 to-blue-600',
    status: 'coming_soon',
    capabilities: ['Messages', 'Bots', 'Channels'],
  },
  {
    id: 'discord',
    provider: 'discord',
    name: 'Discord',
    icon: <MessageCircle size={24} />,
    color: 'from-indigo-400 to-indigo-600',
    status: 'coming_soon',
    capabilities: ['Servers', 'Bots', 'Webhooks'],
  },
  {
    id: 'notion',
    provider: 'notion',
    name: 'Notion',
    icon: <FileText size={24} />,
    color: 'from-gray-600 to-gray-800',
    status: 'coming_soon',
    capabilities: ['Databases', 'Pages', 'Sync'],
  },
  {
    id: 'ollama',
    provider: 'ollama',
    name: 'Ollama',
    icon: <Brain size={24} />,
    color: 'from-gray-500 to-gray-700',
    status: 'coming_soon',
    capabilities: ['Local Models', 'Inference', 'API'],
  },
]

export default function IntegrationsPage() {
  const { currentOrg } = useAppStore()
  const [filterType, setFilterType] = useState<'all' | 'connected' | 'coming_soon'>('all')
  const [configModal, setConfigModal] = useState<IntegrationCard | null>(null)

  const connectedCount = mcpConnections.filter(i => i.status === 'connected').length
  const comingSoonCount = availableIntegrations.filter(i => i.status === 'coming_soon').length
  const totalIntegrations = mcpConnections.length + availableIntegrations.length

  const filteredMcps = filterType === 'all' || filterType === 'connected'
    ? mcpConnections
    : []

  const filteredAvailable = filterType === 'all' || filterType === 'coming_soon'
    ? availableIntegrations
    : []

  return (
    <div className="flex-1 h-full overflow-auto bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header with Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Zap size={28} className="text-orange-400" />
                Integrações
              </h1>
              <p className="text-sm text-white/40 mt-2">
                Conecte com 15 MCPs ativos e ferramentas em desenvolvimento
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Total Conectados</p>
                  <p className="text-3xl font-bold text-white mt-1">{connectedCount}</p>
                </div>
                <CheckCircle2 size={24} className="text-green-400/60" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Em Breve</p>
                  <p className="text-3xl font-bold text-white mt-1">{comingSoonCount}</p>
                </div>
                <BarChart3 size={24} className="text-orange-400/60" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Total</p>
                  <p className="text-3xl font-bold text-white mt-1">{totalIntegrations}</p>
                </div>
                <Zap size={24} className="text-orange-400/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-white/[0.04] rounded-lg p-1.5 w-fit border border-white/[0.06]">
          {[
            { key: 'all', label: `Todos (${totalIntegrations})` },
            { key: 'connected', label: `Conectados (${connectedCount})` },
            { key: 'coming_soon', label: `Em breve (${comingSoonCount})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                filterType === f.key
                  ? 'bg-white/[0.1] text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* MCP Connections Section */}
        {filteredMcps.length > 0 && (
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">MCP Connections</h2>
              <span className="px-2.5 py-0.5 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full">
                {connectedCount} Conectados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMcps.map(integration => (
                <div
                  key={integration.id}
                  className="group relative p-5 rounded-xl border border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-white/[0.02] hover:border-orange-500/40 hover:from-white/[0.08] hover:to-white/[0.04] transition"
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 text-[10px] font-semibold border border-green-500/30">
                      <CheckCircle2 size={12} />
                      Conectado
                    </span>
                  </div>

                  {/* Icon + Name */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${integration.color} flex items-center justify-center text-white flex-shrink-0`}>
                      {integration.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white">{integration.name}</h3>
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{integration.description}</p>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {integration.capabilities.map(cap => (
                      <span
                        key={cap}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-white/60 border border-white/[0.08]"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  {/* Action Footer */}
                  <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <button
                      onClick={() => setConfigModal(integration)}
                      className="text-xs text-white/30 hover:text-orange-400 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Settings size={13} />
                      Config
                    </button>
                    {integration.url ? (
                      <a
                        href={integration.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/30 hover:text-orange-400 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <ExternalLink size={13} />
                        Abrir
                      </a>
                    ) : (
                      <button
                        onClick={() => setConfigModal(integration)}
                        className="text-xs text-white/30 hover:text-orange-400 flex items-center gap-1.5 transition cursor-pointer"
                        title="Integração local — sem URL externa"
                      >
                        <Settings size={13} />
                        Detalhes
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Integrations Section */}
        {filteredAvailable.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Integrações em Desenvolvimento</h2>
              <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 text-xs font-semibold rounded-full">
                {comingSoonCount} Em breve
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAvailable.map(integration => (
                <div
                  key={integration.id}
                  className="relative p-5 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] transition opacity-70 hover:opacity-100"
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.08] text-white/50 text-[10px] font-semibold border border-white/[0.1]">
                      <Circle size={8} />
                      Em breve
                    </span>
                  </div>

                  {/* Icon + Name */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${integration.color} flex items-center justify-center text-white flex-shrink-0`}>
                      {integration.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white/80">{integration.name}</h3>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {integration.capabilities.map(cap => (
                      <span
                        key={cap}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-white/40"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  {/* Message */}
                  <div className="pt-4 border-t border-white/[0.04]">
                    <p className="text-[11px] text-white/25">Integração será disponibilizada em breve</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {filteredMcps.length === 0 && filteredAvailable.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Filter size={40} className="text-white/20 mb-4" />
            <p className="text-white/40 text-sm">Nenhuma integração encontrada para este filtro</p>
          </div>
        )}
      </div>

      {/* Config Modal */}
      {configModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setConfigModal(null)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-xl border border-white/[0.12] bg-[#141414] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${configModal.color} flex items-center justify-center text-white`}>
                  {configModal.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{configModal.name}</h3>
                  <p className="text-xs text-white/40">{configModal.description}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 text-[10px] font-semibold border border-green-500/30">
                  <CheckCircle2 size={12} />
                  Conectado
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Configuração</h4>
                <p className="text-sm text-white/70 bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                  {configModal.configInfo || 'Conectado via MCP (Model Context Protocol)'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Capabilities</h4>
                <div className="flex flex-wrap gap-2">
                  {configModal.capabilities.map(cap => (
                    <span key={cap} className="text-xs px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-300 border border-orange-500/20">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Protocolo</h4>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Zap size={14} className="text-orange-400" />
                  MCP (Model Context Protocol) via Claude
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.08] flex items-center justify-between">
              <button
                onClick={() => setConfigModal(null)}
                className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition"
              >
                Fechar
              </button>
              {configModal.url && (
                <a
                  href={configModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500/20 hover:bg-orange-500/30 rounded-lg border border-orange-500/30 flex items-center gap-2 transition"
                >
                  <ExternalLink size={14} />
                  Abrir {configModal.name}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

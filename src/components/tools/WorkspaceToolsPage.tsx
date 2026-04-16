'use client';

import { useState } from 'react';
import {
  Database,
  Globe,
  GitFork,
  Terminal,
  BookOpen,
  Bot,
  Cpu,
  MessageSquare,
  Palette,
  PenTool,
  Mail,
  Calendar,
  HardDrive,
  LayoutList,
  AlertTriangle,
  Link2,
  CreditCard,
  Monitor,
  Code2,
  Box,
  Package,
  Wrench,
  Zap,
  CheckCircle2,
  Circle,
  Wifi,
  WifiOff,
  Shield,
  BarChart3,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

interface Tool {
  name: string;
  description: string;
  status: 'connected' | 'active' | 'planned';
  hasMcp: boolean;
  icon: React.ReactNode;
  category: string;
}

interface Category {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
  tools: Tool[];
}

const TOOLS_DATA: Category[] = [
  {
    id: 'core-infra',
    name: 'Core Infrastructure',
    count: 6,
    icon: <Database className="w-5 h-5" />,
    tools: [
      {
        name: 'Supabase',
        description: 'Database, Auth, Storage, Edge Functions',
        status: 'connected',
        hasMcp: true,
        icon: <Database className="w-4 h-4" />,
        category: 'core-infra',
      },
      {
        name: 'Vercel',
        description: 'Deploy, Preview, Analytics, Logs',
        status: 'connected',
        hasMcp: true,
        icon: <Globe className="w-4 h-4" />,
        category: 'core-infra',
      },
      {
        name: 'GitHub (gh CLI)',
        description: 'Repos, PRs, Issues, Actions',
        status: 'connected',
        hasMcp: false,
        icon: <GitFork className="w-4 h-4" />,
        category: 'core-infra',
      },
      {
        name: 'Cursor',
        description: 'AI-first code editor',
        status: 'active',
        hasMcp: false,
        icon: <Code2 className="w-4 h-4" />,
        category: 'core-infra',
      },
      {
        name: 'Warp',
        description: 'AI terminal',
        status: 'active',
        hasMcp: false,
        icon: <Terminal className="w-4 h-4" />,
        category: 'core-infra',
      },
      {
        name: 'Obsidian',
        description: 'Knowledge base, Notes, Graph',
        status: 'connected',
        hasMcp: true,
        icon: <BookOpen className="w-4 h-4" />,
        category: 'core-infra',
      },
    ],
  },
  {
    id: 'ai-automation',
    name: 'AI & Automation',
    count: 5,
    icon: <Bot className="w-5 h-5" />,
    tools: [
      {
        name: 'Claude Desktop',
        description: '16 agentes configurados',
        status: 'active',
        hasMcp: false,
        icon: <Cpu className="w-4 h-4" />,
        category: 'ai-automation',
      },
      {
        name: 'Ollama',
        description: 'Local LLMs (llama3, mistral, phi-3)',
        status: 'active',
        hasMcp: false,
        icon: <Bot className="w-4 h-4" />,
        category: 'ai-automation',
      },
      {
        name: 'ChatGPT',
        description: 'Conversational AI',
        status: 'active',
        hasMcp: false,
        icon: <MessageSquare className="w-4 h-4" />,
        category: 'ai-automation',
      },
      {
        name: 'Hugging Face',
        description: 'Models, Spaces, Papers',
        status: 'connected',
        hasMcp: true,
        icon: <Package className="w-4 h-4" />,
        category: 'ai-automation',
      },
      {
        name: 'Computer Use',
        description: 'Desktop automation',
        status: 'connected',
        hasMcp: true,
        icon: <Monitor className="w-4 h-4" />,
        category: 'ai-automation',
      },
    ],
  },
  {
    id: 'design-creative',
    name: 'Design & Creative',
    count: 6,
    icon: <Palette className="w-5 h-5" />,
    tools: [
      {
        name: 'Figma',
        description: 'UI/UX Design',
        status: 'connected',
        hasMcp: true,
        icon: <PenTool className="w-4 h-4" />,
        category: 'design-creative',
      },
      {
        name: 'Canva',
        description: 'Quick design, templates',
        status: 'connected',
        hasMcp: true,
        icon: <Palette className="w-4 h-4" />,
        category: 'design-creative',
      },
      {
        name: 'Adobe Photoshop',
        description: 'Image editing',
        status: 'active',
        hasMcp: false,
        icon: <PenTool className="w-4 h-4" />,
        category: 'design-creative',
      },
      {
        name: 'Adobe Illustrator',
        description: 'Vector graphics',
        status: 'active',
        hasMcp: false,
        icon: <PenTool className="w-4 h-4" />,
        category: 'design-creative',
      },
      {
        name: 'Adobe Premiere Pro',
        description: 'Video editing',
        status: 'active',
        hasMcp: false,
        icon: <PenTool className="w-4 h-4" />,
        category: 'design-creative',
      },
      {
        name: 'DaVinci Resolve',
        description: 'Color grading, video',
        status: 'active',
        hasMcp: false,
        icon: <Palette className="w-4 h-4" />,
        category: 'design-creative',
      },
    ],
  },
  {
    id: 'communication',
    name: 'Communication',
    count: 5,
    icon: <MessageSquare className="w-5 h-5" />,
    tools: [
      {
        name: 'Gmail',
        description: 'Email',
        status: 'connected',
        hasMcp: true,
        icon: <Mail className="w-4 h-4" />,
        category: 'communication',
      },
      {
        name: 'Discord',
        description: 'Community chat',
        status: 'active',
        hasMcp: false,
        icon: <MessageSquare className="w-4 h-4" />,
        category: 'communication',
      },
      {
        name: 'Telegram',
        description: 'Notifications',
        status: 'active',
        hasMcp: false,
        icon: <MessageSquare className="w-4 h-4" />,
        category: 'communication',
      },
      {
        name: 'Slack (planned)',
        description: 'Team chat',
        status: 'planned',
        hasMcp: false,
        icon: <MessageSquare className="w-4 h-4" />,
        category: 'communication',
      },
      {
        name: 'WhatsApp',
        description: 'Messaging',
        status: 'active',
        hasMcp: false,
        icon: <MessageSquare className="w-4 h-4" />,
        category: 'communication',
      },
    ],
  },
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    count: 3,
    icon: <LayoutList className="w-5 h-5" />,
    tools: [
      {
        name: 'Google Calendar',
        description: 'Events, meetings',
        status: 'connected',
        hasMcp: true,
        icon: <Calendar className="w-4 h-4" />,
        category: 'google-workspace',
      },
      {
        name: 'Google Drive',
        description: 'Documents, storage',
        status: 'connected',
        hasMcp: true,
        icon: <HardDrive className="w-4 h-4" />,
        category: 'google-workspace',
      },
      {
        name: 'Google Docs',
        description: 'Collaborative writing',
        status: 'active',
        hasMcp: false,
        icon: <LayoutList className="w-4 h-4" />,
        category: 'google-workspace',
      },
    ],
  },
  {
    id: 'dev-tools',
    name: 'Development Tools',
    count: 4,
    icon: <Wrench className="w-5 h-5" />,
    tools: [
      {
        name: 'Linear',
        description: 'Issue tracking',
        status: 'connected',
        hasMcp: true,
        icon: <LayoutList className="w-4 h-4" />,
        category: 'dev-tools',
      },
      {
        name: 'Sentry',
        description: 'Error monitoring',
        status: 'connected',
        hasMcp: true,
        icon: <AlertTriangle className="w-4 h-4" />,
        category: 'dev-tools',
      },
      {
        name: 'Docker Desktop',
        description: 'Containers',
        status: 'active',
        hasMcp: false,
        icon: <Box className="w-4 h-4" />,
        category: 'dev-tools',
      },
      {
        name: 'Postman',
        description: 'API testing',
        status: 'active',
        hasMcp: false,
        icon: <Code2 className="w-4 h-4" />,
        category: 'dev-tools',
      },
    ],
  },
  {
    id: 'web3-blockchain',
    name: 'Web3 & Blockchain',
    count: 2,
    icon: <Zap className="w-5 h-5" />,
    tools: [
      {
        name: '1inch',
        description: 'Multi-chain analytics',
        status: 'connected',
        hasMcp: true,
        icon: <BarChart3 className="w-4 h-4" />,
        category: 'web3-blockchain',
      },
      {
        name: 'MetaMask',
        description: 'Wallet management',
        status: 'active',
        hasMcp: false,
        icon: <Shield className="w-4 h-4" />,
        category: 'web3-blockchain',
      },
    ],
  },
  {
    id: 'payments',
    name: 'Payments',
    count: 1,
    icon: <CreditCard className="w-5 h-5" />,
    tools: [
      {
        name: 'Stripe',
        description: 'Payments, subscriptions',
        status: 'connected',
        hasMcp: true,
        icon: <CreditCard className="w-4 h-4" />,
        category: 'payments',
      },
    ],
  },
  {
    id: 'productivity',
    name: 'Productivity',
    count: 4,
    icon: <CheckCircle2 className="w-5 h-5" />,
    tools: [
      {
        name: 'Notion',
        description: 'Docs (migrating to roadMap)',
        status: 'active',
        hasMcp: false,
        icon: <LayoutList className="w-4 h-4" />,
        category: 'productivity',
      },
      {
        name: 'Trello',
        description: 'Boards (migrating)',
        status: 'active',
        hasMcp: false,
        icon: <LayoutList className="w-4 h-4" />,
        category: 'productivity',
      },
      {
        name: 'Todoist',
        description: 'Tasks (migrating)',
        status: 'active',
        hasMcp: false,
        icon: <CheckCircle2 className="w-4 h-4" />,
        category: 'productivity',
      },
      {
        name: 'Bear',
        description: 'Quick notes',
        status: 'active',
        hasMcp: false,
        icon: <BookOpen className="w-4 h-4" />,
        category: 'productivity',
      },
    ],
  },
  {
    id: 'system-utilities',
    name: 'System & Utilities',
    count: 4,
    icon: <Wrench className="w-5 h-5" />,
    tools: [
      {
        name: 'OBS Studio',
        description: 'Streaming, recording',
        status: 'active',
        hasMcp: false,
        icon: <Monitor className="w-4 h-4" />,
        category: 'system-utilities',
      },
      {
        name: 'Hype 4',
        description: 'Web animations',
        status: 'active',
        hasMcp: false,
        icon: <Zap className="w-4 h-4" />,
        category: 'system-utilities',
      },
      {
        name: 'CleanMyMac',
        description: 'System maintenance',
        status: 'active',
        hasMcp: false,
        icon: <Wrench className="w-4 h-4" />,
        category: 'system-utilities',
      },
      {
        name: '1Password',
        description: 'Password management',
        status: 'active',
        hasMcp: false,
        icon: <Shield className="w-4 h-4" />,
        category: 'system-utilities',
      },
    ],
  },
];

const STATUS_COLORS = {
  connected: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  planned: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_LABELS = {
  connected: 'Connected',
  active: 'Active',
  planned: 'Planned',
};

interface ToolRowProps {
  tool: Tool;
  isExpanded?: boolean;
}

function ToolRow({ tool }: ToolRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/10 last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-orange-500">{tool.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate">{tool.name}</h4>
          <p className="text-xs text-white/60 truncate">{tool.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {tool.hasMcp && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">MCP</span>
          </div>
        )}
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium border ${
            STATUS_COLORS[tool.status]
          }`}
        >
          {STATUS_LABELS[tool.status]}
        </div>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: Category;
  isOpen: boolean;
  onToggle: () => void;
  isFiltered: boolean;
}

function CategorySection({
  category,
  isOpen,
  onToggle,
  isFiltered,
}: CategorySectionProps) {
  const connectedCount = category.tools.filter(
    (t) => t.status === 'connected' && t.hasMcp
  ).length;

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-orange-500">{category.icon}</div>
          <div className="text-left">
            <h3 className="font-semibold text-white">{category.name}</h3>
            <p className="text-xs text-white/50">
              {category.count} tools
              {connectedCount > 0 && ` · ${connectedCount} with MCP`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-white/60 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {(isOpen || isFiltered) && (
        <div className="bg-black/40">
          {category.tools.map((tool) => (
            <ToolRow key={tool.name} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkspaceToolsPage() {
  const appStore = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'connected' | 'active' | 'planned'
  >('all');
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(
    TOOLS_DATA.reduce(
      (acc, cat) => ({
        ...acc,
        [cat.id]: true,
      }),
      {}
    )
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const filteredData = TOOLS_DATA.map((category) => ({
    ...category,
    tools: category.tools.filter((tool) => {
      const matchesSearch =
        searchQuery === '' ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || tool.status === statusFilter;

      return matchesSearch && matchesStatus;
    }),
  })).filter((category) => category.tools.length > 0);

  const totalTools = TOOLS_DATA.reduce((sum, cat) => sum + cat.count, 0);
  const totalMcpTools = TOOLS_DATA.reduce(
    (sum, cat) =>
      sum + cat.tools.filter((t) => t.hasMcp && t.status === 'connected').length,
    0
  );
  const totalCategories = TOOLS_DATA.length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Workspace Tools</h1>
          <p className="text-white/60">
            {totalTools} Tools · {totalMcpTools} MCP Connected · {totalCategories}{' '}
            Categories
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total Tools</span>
              <Package className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-white">{totalTools}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">MCP Connected</span>
              <Link2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-white">{totalMcpTools}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Categories</span>
              <LayoutList className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-white">{totalCategories}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {(['all', 'connected', 'active', 'planned'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/[0.02] text-white/60 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {status === 'all'
                    ? 'All Status'
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {filteredData.length > 0 ? (
            filteredData.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                isOpen={expandedCategories[category.id] || false}
                onToggle={() => toggleCategory(category.id)}
                isFiltered={searchQuery !== '' || statusFilter !== 'all'}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No tools found matching your filters</p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-white/[0.02] border border-white/10 rounded-lg">
          <p className="text-xs text-white/50">
            Tools with{' '}
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              MCP
            </span>{' '}
            badges are connected via Model Context Protocol for enhanced AI
            integration.
          </p>
        </div>
      </div>
    </div>
  );
}

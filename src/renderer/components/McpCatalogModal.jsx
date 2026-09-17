import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Globe, FolderTree, Database, Brain, Terminal, Github, Check, Download, AlertCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export const getMcpCatalog = (t) => [
  {
    id: 'brave-search',
    name: 'Brave Search (Web Search)',
    description: t('mcpCatalog.catSearch') === 'Busca & Web'
      ? 'Permite ao modelo pesquisar informações atualizadas na web em tempo real'
      : 'Enables real-time web search and current information retrieval',
    icon: Globe,
    category: t('mcpCatalog.catSearch'),
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: { BRAVE_API_KEY: '<your-key-here>' },
    popular: true,
  },
  {
    id: 'filesystem',
    name: 'Local Filesystem',
    description: t('mcpCatalog.catFilesystem') === 'Sistema de Arquivos'
      ? 'Permite leitura, escrita e exploração segura de pastas e arquivos no disco local'
      : 'Allows secure reading, writing, and directory exploration on your local machine',
    icon: FolderTree,
    category: t('mcpCatalog.catFilesystem'),
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', 'c:/Projetos'],
    env: {},
    popular: true,
  },
  {
    id: 'fetch-scraper',
    name: 'Web Fetch & Scraper',
    description: t('mcpCatalog.catSearch') === 'Busca & Web'
      ? 'Extrai e converte conteúdo de páginas web e URLs em formato Markdown limpo'
      : 'Fetches and converts webpage content into clean Markdown format',
    icon: Terminal,
    category: t('mcpCatalog.catSearch'),
    command: 'uvx',
    args: ['mcp-server-fetch'],
    env: {},
    popular: true,
  },
  {
    id: 'sqlite',
    name: 'SQLite Database',
    description: t('mcpCatalog.catDatabase') === 'Bancos de Dados'
      ? 'Executa queries SQL e analisa bancos de dados SQLite locais diretamente'
      : 'Executes SQL queries and analyzes local SQLite databases directly',
    icon: Database,
    category: t('mcpCatalog.catDatabase'),
    command: 'uvx',
    args: ['mcp-server-sqlite', '--db-path', 'database.db'],
    env: {},
    popular: false,
  },
  {
    id: 'memory',
    name: 'Persistent Memory Graph',
    description: t('mcpCatalog.catMemory') === 'Memória & IA'
      ? 'Grafo de conhecimento persistente para o modelo memorizar fatos e preferências'
      : 'Persistent knowledge graph for the model to remember facts and preferences',
    icon: Brain,
    category: t('mcpCatalog.catMemory'),
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: {},
    popular: true,
  },
  {
    id: 'github',
    name: 'GitHub Integration',
    description: t('mcpCatalog.catDev') === 'Desenvolvimento'
      ? 'Gerencia repositórios, issues, pull requests e busca de código no GitHub'
      : 'Manages repositories, issues, pull requests, and code searches on GitHub',
    icon: Github,
    category: t('mcpCatalog.catDev'),
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '<your-token-here>' },
    popular: false,
  },
];

export const MCP_CATALOG = [
  {
    id: 'brave-search',
    name: 'Brave Search (Web Search)',
    description: 'Permite ao modelo pesquisar informações atualizadas na web em tempo real',
    icon: Globe,
    category: 'Busca & Web',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: { BRAVE_API_KEY: '<sua-chave-aqui>' },
    popular: true,
  },
  {
    id: 'filesystem',
    name: 'Local Filesystem',
    description: 'Permite leitura, escrita e exploração segura de pastas e arquivos no disco local',
    icon: FolderTree,
    category: 'Sistema de Arquivos',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', 'c:/Projetos'],
    env: {},
    popular: true,
  },
  {
    id: 'fetch-scraper',
    name: 'Web Fetch & Scraper',
    description: 'Extrai e converte conteúdo de páginas web e URLs em formato Markdown limpo',
    icon: Terminal,
    category: 'Busca & Web',
    command: 'uvx',
    args: ['mcp-server-fetch'],
    env: {},
    popular: true,
  },
  {
    id: 'sqlite',
    name: 'SQLite Database',
    description: 'Executa queries SQL e analisa bancos de dados SQLite locais diretamente',
    icon: Database,
    category: 'Bancos de Dados',
    command: 'uvx',
    args: ['mcp-server-sqlite', '--db-path', 'database.db'],
    env: {},
    popular: false,
  },
  {
    id: 'memory',
    name: 'Persistent Memory Graph',
    description: 'Grafo de conhecimento persistente para o modelo memorizar fatos e preferências',
    icon: Brain,
    category: 'Memória & IA',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: {},
    popular: true,
  },
  {
    id: 'github',
    name: 'GitHub Integration',
    description: 'Gerencia repositórios, issues, pull requests e busca de código no GitHub',
    icon: Github,
    category: 'Desenvolvimento',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '<seu-token-aqui>' },
    popular: false,
  },
];

export function McpCatalogModal({ isOpen, onClose, onServerInstalled, existingServers = {} }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [installingId, setInstallingId] = useState(null);
  const [installedIds, setInstalledIds] = useState(new Set());

  const catalog = useMemo(() => getMcpCatalog(t), [t]);

  // Load existing servers from settings when modal opens
  useEffect(() => {
    if (isOpen) {
      window.electron.getSettings().then(settings => {
        const servers = settings?.mcpServers || {};
        const ids = new Set([
          ...Object.keys(servers),
          ...Object.keys(existingServers || {})
        ]);
        setInstalledIds(ids);
      }).catch(err => {
        console.error('Failed to load settings in McpCatalogModal:', err);
        setInstalledIds(new Set(Object.keys(existingServers || {})));
      });
    }
  }, [isOpen, existingServers]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = catalog.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleInstall = async (server) => {
    setInstallingId(server.id);
    try {
      const settings = await window.electron.getSettings();
      const currentServers = settings?.mcpServers || {};

      const newServerConfig = {
        command: server.command,
        args: server.args,
        env: server.env,
        name: server.name,
      };

      const updatedServers = {
        ...currentServers,
        [server.id]: newServerConfig,
      };

      await window.electron.saveSettings({
        ...settings,
        mcpServers: updatedServers,
      });

      // Update local installed state immediately
      setInstalledIds(prev => new Set([...prev, server.id]));

      // Attempt to connect the new MCP server
      const connectResult = await window.electron.connectMcpServer({
        id: server.id,
        ...newServerConfig,
      });

      if (connectResult && connectResult.success === false) {
        console.warn(`[McpCatalog] Server ${server.id} saved but connection failed:`, connectResult.error);
      }

      if (onServerInstalled) {
        onServerInstalled(server.id);
      }
    } catch (err) {
      console.error('Failed to install MCP server:', err);
      alert(t('mcpCatalog.errorInstall', { error: err.message }));
    } finally {
      setInstallingId(null);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-foreground">{t('mcpCatalog.title')}</h2>
              <p className="text-xs text-muted-foreground">{t('mcpCatalog.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('mcpCatalog.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filtered.map(server => {
            const isInstalled = installedIds.has(server.id) || !!existingServers[server.id];
            const isInstalling = installingId === server.id;
            const Icon = server.icon;

            return (
              <div
                key={server.id}
                className="flex items-start justify-between p-4 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-muted text-primary flex-shrink-0 mt-0.5 border border-border/50">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-xs text-foreground">{server.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border/50">
                        {server.category}
                      </span>
                      {server.popular && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          {t('mcpCatalog.popular')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{server.description}</p>
                    <div className="text-[11px] text-muted-foreground/80 font-mono mt-1.5 truncate">
                      {server.command} {server.args.join(' ')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center flex-shrink-0">
                  {isInstalled ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-500/10 text-green-600 border border-green-500/20">
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('mcpCatalog.installed')}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInstall(server)}
                      disabled={isInstalling}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isInstalling ? (
                        <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{isInstalling ? t('mcpCatalog.installing') : t('mcpCatalog.install')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default McpCatalogModal;

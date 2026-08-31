import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Server,
  X,
  Search,
  Download,
  CheckCircle2,
  ExternalLink,
  Star,
  Zap,
  Globe,
  Database,
  Layers,
  Sparkles,
  GitBranch,
  Laptop,
  Folder,
  MessageSquare,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function McpHubModal({
  isOpen,
  onClose,
  onOpenSettingsMcp
}) {
  const [servers, setServers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [activeTab, setActiveTab] = useState('servers'); // 'servers' or 'recipes'
  const [searchQuery, setSearchQuery] = useState('');
  const [installingId, setInstallingId] = useState(null);
  const [installedMap, setInstalledMap] = useState({});

  useEffect(() => {
    const loadHubData = async () => {
      if (window.electron?.mcpHub) {
        try {
          const [serversList, recipesList] = await Promise.all([
            window.electron.mcpHub.listServers(),
            window.electron.mcpHub.listRecipes()
          ]);
          setServers(serversList || []);
          setRecipes(recipesList || []);
        } catch (err) {
          console.error('Failed to load MCP Hub data:', err);
        }
      }
    };

    if (isOpen) {
      loadHubData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstall = async (server) => {
    setInstallingId(server.id);
    try {
      if (window.electron?.mcpHub?.install) {
        const res = await window.electron.mcpHub.install({ serverId: server.id });
        if (res && res.success) {
          setInstalledMap(prev => ({ ...prev, [server.id]: true }));
        }
      }
    } catch (err) {
      console.error(`Failed to install server ${server.id}:`, err);
    } finally {
      setInstallingId(null);
    }
  };

  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'GitBranch': return GitBranch;
      case 'Database': return Database;
      case 'Globe': return Globe;
      case 'Laptop': return Laptop;
      case 'Folder': return Folder;
      case 'MessageSquare': return MessageSquare;
      default: return Server;
    }
  };

  const filteredServers = servers.filter(s =>
    !searchQuery ||
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Community MCP Hub & Store</h2>
                <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-400 border-teal-500/30">
                  1-Click Setup
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Instale servidores Model Context Protocol populares e receitas prontas de automação
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex text-xs">
              <button
                onClick={() => setActiveTab('servers')}
                className={cn('px-3 py-1.5 rounded-md transition-colors', activeTab === 'servers' ? 'bg-teal-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200')}
              >
                Servidores MCP
              </button>
              <button
                onClick={() => setActiveTab('recipes')}
                className={cn('px-3 py-1.5 rounded-md transition-colors', activeTab === 'recipes' ? 'bg-teal-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200')}
              >
                Receitas & Workflows
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar servidores MCP (GitHub, Postgres, Slack, etc.)..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          {onOpenSettingsMcp && (
            <button
              onClick={() => {
                onClose();
                onOpenSettingsMcp();
              }}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
            >
              Ver Meus Servidores MCP <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'servers' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServers.map(server => {
                const IconComponent = getIconComponent(server.icon);
                const isInstalled = Boolean(installedMap[server.id]);
                const isInstalling = installingId === server.id;

                return (
                  <div
                    key={server.id}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-zinc-100">{server.name}</h3>
                            <span className="text-[10px] text-zinc-500">por {server.author}</span>
                          </div>
                        </div>

                        <Badge variant="outline" className="text-[10px] border-zinc-800 text-teal-400 bg-teal-500/5">
                          {server.badge}
                        </Badge>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {server.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {server.command} {server.args?.[0]}
                      </span>

                      <Button
                        size="sm"
                        disabled={isInstalled || isInstalling}
                        onClick={() => handleInstall(server)}
                        className={cn(
                          'text-xs px-3 py-1 font-semibold flex items-center gap-1.5 transition-all',
                          isInstalled
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30'
                            : 'bg-teal-600 hover:bg-teal-500 text-white'
                        )}
                      >
                        {isInstalled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Instalado
                          </>
                        ) : isInstalling ? (
                          'Instalando...'
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            Instalar 1-Click
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Workflow Recipes Tab */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipes.map(recipe => (
                <div
                  key={recipe.id}
                  className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-zinc-100">{recipe.title}</h4>
                      <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800">
                        {recipe.steps} etapas
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {recipe.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <div className="flex gap-1.5">
                      {recipe.tags?.map(t => (
                        <span key={t} className="text-[10px] bg-zinc-800/60 text-zinc-400 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>

                    <Button size="sm" variant="outline" className="border-zinc-700 text-xs text-zinc-300">
                      Importar Receita
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

export default McpHubModal;

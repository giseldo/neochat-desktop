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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border text-card-foreground rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">Community MCP Hub & Store</h2>
                <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20">
                  1-Click Setup
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Instale servidores Model Context Protocol populares e receitas prontas de automação
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-xl border border-border flex text-xs gap-1">
              <button
                onClick={() => setActiveTab('servers')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all text-xs font-medium cursor-pointer',
                  activeTab === 'servers' 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                Servidores MCP
              </button>
              <button
                onClick={() => setActiveTab('recipes')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all text-xs font-medium cursor-pointer',
                  activeTab === 'recipes' 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                Receitas & Workflows
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar servidores MCP (GitHub, Postgres, Slack, etc.)..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {onOpenSettingsMcp && (
            <button
              onClick={() => {
                onClose();
                onOpenSettingsMcp();
              }}
              className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
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
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-foreground">{server.name}</h3>
                            <span className="text-[10px] text-muted-foreground">por {server.author}</span>
                          </div>
                        </div>

                        <Badge variant="outline" className="text-[10px] border-border text-primary bg-primary/10">
                          {server.badge}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {server.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[160px]">
                        {server.command} {server.args?.[0]}
                      </span>

                      <button
                        disabled={isInstalled || isInstalling}
                        onClick={() => handleInstall(server)}
                        className={cn(
                          'text-xs px-3.5 py-1.5 font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs',
                          isInstalled
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground ring-2 ring-primary/30'
                        )}
                      >
                        {isInstalled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
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
                      </button>
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
                  className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 space-y-3 flex flex-col justify-between shadow-2xs transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-foreground">{recipe.title}</h4>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border bg-muted">
                        {recipe.steps} etapas
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {recipe.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/70">
                    <div className="flex gap-1.5">
                      {recipe.tags?.map(t => (
                        <span key={t} className="text-[10px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded-md">
                          {t}
                        </span>
                      ))}
                    </div>

                    <button className="px-3 py-1.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs">
                      Importar Receita
                    </button>
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

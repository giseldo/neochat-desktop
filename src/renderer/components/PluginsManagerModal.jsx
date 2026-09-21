import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Blocks,
  X,
  Search,
  Zap,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Link,
  Settings,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import Switch from './ui/Switch';
import { Badge } from './ui/badge';

export function PluginsManagerModal({
  isOpen,
  onClose,
  onOpenPluginModal
}) {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [togglingId, setTogglingId] = useState(null);
  const [importUrl, setImportUrl] = useState('');
  const [actionError, setActionError] = useState('');
  const [installing, setInstalling] = useState(false);

  const fetchPlugins = async () => {
    if (window.electron?.plugins?.list) {
      try {
        setLoading(true);
        const list = await window.electron.plugins.list();
        setPlugins(list || []);
      } catch (err) {
        console.error('Failed to load plugins:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlugins();
    }
  }, [isOpen]);

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

  const handleToggle = async (pluginId, currentEnabled) => {
    if (!window.electron?.plugins?.toggle) return;
    setTogglingId(pluginId);
    try {
      const res = await window.electron.plugins.toggle(pluginId, !currentEnabled);
      if (res && res.success) {
        setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, enabled: !currentEnabled } : p));
      }
    } catch (err) {
      console.error(`Error toggling plugin ${pluginId}:`, err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleInstall = async () => {
    if (!importUrl.trim() || !window.electron?.plugins?.installFromUrl) return;
    setInstalling(true);
    setActionError('');
    try {
      const result = await window.electron.plugins.installFromUrl(importUrl.trim());
      if (!result?.success) throw new Error(result?.error || 'Falha ao instalar plugin.');
      setImportUrl('');
      await fetchPlugins();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setInstalling(false);
    }
  };

  const handleConfigure = async (plugin) => {
    const baseUrl = window.prompt('URL base da API:', plugin.config?.baseUrl || plugin.baseUrl || '');
    if (baseUrl === null) return;
    let authValue;
    if (plugin.auth?.type && plugin.auth.type !== 'none') {
      authValue = window.prompt(`Credencial para ${plugin.auth.type} (deixe vazio para manter/remover):`, '');
      if (authValue === null) return;
    }
    const result = await window.electron.plugins.configure(plugin.id, { baseUrl, authValue });
    if (!result?.success) setActionError(result?.error || 'Falha ao configurar plugin.');
    else await fetchPlugins();
  };

  const handleRemove = async (plugin) => {
    if (!window.confirm(`Remover o plugin "${plugin.name}"?`)) return;
    const result = await window.electron.plugins.remove(plugin.id);
    if (!result?.success) setActionError(result?.error || 'Falha ao remover plugin.');
    else await fetchPlugins();
  };

  const categories = [
    { id: 'all', label: 'Todos' },
    ...Array.from(new Set(plugins.map(plugin => plugin.category).filter(Boolean)))
      .sort()
      .map(category => ({ id: category, label: category }))
  ];

  const filteredPlugins = plugins.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeCount = plugins.filter(p => p.enabled !== false).length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border text-card-foreground rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Blocks className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">Módulos & Extensões (Plugins Hub)</h2>
                <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20">
                  {activeCount} de {plugins.length} ativos
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Arquitetura Micro-Kernel com Lazy Loading • 0MB de consumo em repouso quando inativo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OpenAPI plugin installation */}
        <div className="px-6 py-3 border-b border-border bg-primary/5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={importUrl}
                onChange={event => setImportUrl(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') handleInstall(); }}
                placeholder="URL de um manifesto ai-plugin.json ou especificação OpenAPI"
                className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              onClick={handleInstall}
              disabled={installing || !importUrl.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
            >
              {installing ? 'Instalando…' : 'Instalar OpenAPI'}
            </button>
          </div>
          {actionError && <p className="mt-2 text-xs text-destructive">{actionError}</p>}
        </div>

        {/* Filters & Search */}
        <div className="px-6 py-3.5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar módulos..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
        </div>

        {/* Plugins Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Carregando catálogo de módulos...</p>
            </div>
          ) : filteredPlugins.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Blocks className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum módulo encontrado para a busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredPlugins.map(plugin => {
                const isEnabled = plugin.enabled !== false;
                const isToggling = togglingId === plugin.id;

                return (
                  <div
                    key={plugin.id}
                    className={cn(
                      'p-4 rounded-xl border transition-all flex flex-col justify-between gap-3',
                      isEnabled
                        ? 'bg-card border-border hover:border-primary/40 shadow-2xs'
                        : 'bg-muted/30 border-border/60 opacity-65 hover:opacity-85'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                          isEnabled
                            ? 'bg-primary/10 border-primary/20 text-primary'
                            : 'bg-muted border-border text-muted-foreground'
                        )}>
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-foreground">{plugin.name}</h3>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border bg-muted text-muted-foreground">
                              v{plugin.version || '1.0'}
                            </Badge>
                            {plugin.pluginType === 'api' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-sky-500/30 text-sky-600 dark:text-sky-400">
                                API · {plugin.functions?.length || 0} ferramentas
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {plugin.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <Switch
                          checked={isEnabled}
                          disabled={isToggling}
                          onCheckedChange={() => handleToggle(plugin.id, isEnabled)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-medium',
                          isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                        )}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                          )} />
                          {isEnabled ? 'Ativo (Lazy)' : 'Inativo (0 MB)'}
                        </span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-[11px] text-muted-foreground capitalize">{plugin.category}</span>
                      </div>

                      <div className="flex items-center gap-2">
                      {plugin.pluginType === 'api' && (
                        <button
                          onClick={() => handleConfigure(plugin)}
                          className="text-[11px] text-primary font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Settings className="w-3 h-3" /> Configurar
                        </button>
                      )}
                      {plugin.pluginType === 'api' && plugin.builtIn === false && (
                        <button
                          onClick={() => handleRemove(plugin)}
                          className="text-[11px] text-destructive font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Trash2 className="w-3 h-3" /> Remover
                        </button>
                      )}
                      {isEnabled && plugin.pluginType !== 'api' && onOpenPluginModal && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenPluginModal(plugin.id);
                          }}
                          className="text-[11px] text-primary hover:text-primary/80 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          Abrir <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Plugins OpenAPI ativos viram ferramentas disponíveis ao modelo; credenciais são protegidas pelo cofre do sistema operacional.</span>
          </div>
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer shadow-2xs"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

export default PluginsManagerModal;

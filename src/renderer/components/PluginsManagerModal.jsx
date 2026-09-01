import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Blocks,
  X,
  Search,
  Zap,
  Sparkles,
  RefreshCw,
  ChevronRight
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

  const categories = [
    { id: 'all', label: 'Todos os Módulos' },
    { id: 'intelligence', label: 'Inteligência & IA' },
    { id: 'developer', label: 'Desenvolvimento' },
    { id: 'productivity', label: 'Produtividade' },
    { id: 'tools', label: 'Ferramentas' },
    { id: 'automation', label: 'Automação' }
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

                      {isEnabled && onOpenPluginModal && (
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
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Adicione novos arquivos em <code className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[11px] text-foreground">electron/plugins/</code> para expansão instantânea.</span>
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

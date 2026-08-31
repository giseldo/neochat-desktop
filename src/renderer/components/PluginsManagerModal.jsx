import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Blocks,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Power,
  Zap,
  Cpu,
  Sparkles,
  Code,
  Globe,
  Radio,
  Share2,
  Sun,
  Shield,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import Switch from './ui/Switch';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Blocks className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Módulos & Extensões (Plugins Hub)</h2>
                <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                  {activeCount} de {plugins.length} ativos
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Arquitetura Micro-Kernel com Lazy Loading • 0MB de consumo em repouso quando inativo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar módulos..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Plugins Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-zinc-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs">Carregando catálogo de módulos...</p>
            </div>
          ) : filteredPlugins.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <Blocks className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum módulo encontrado para a busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPlugins.map(plugin => {
                const isEnabled = plugin.enabled !== false;
                const isToggling = togglingId === plugin.id;

                return (
                  <div
                    key={plugin.id}
                    className={cn(
                      'p-4 rounded-xl border transition-all flex flex-col justify-between gap-3',
                      isEnabled
                        ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                        : 'bg-zinc-950/40 border-zinc-900 opacity-65 hover:opacity-85'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border',
                          isEnabled
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : 'bg-zinc-800/40 border-zinc-800 text-zinc-500'
                        )}>
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-zinc-100">{plugin.name}</h3>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-800 text-zinc-400">
                              v{plugin.version || '1.0'}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
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

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-medium',
                          isEnabled ? 'text-emerald-400' : 'text-zinc-500'
                        )}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                          )} />
                          {isEnabled ? 'Ativo (Lazy)' : 'Inativo (0 MB)'}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-[11px] text-zinc-500 capitalize">{plugin.category}</span>
                      </div>

                      {isEnabled && onOpenPluginModal && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenPluginModal(plugin.id);
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 hover:underline"
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
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Adicione novos arquivos em <code>electron/plugins/</code> para expansão instantânea.</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="border-zinc-700 text-zinc-300">
            Fechar
          </Button>
        </div>

      </div>
    </div>,
    document.body
  );
}

export default PluginsManagerModal;

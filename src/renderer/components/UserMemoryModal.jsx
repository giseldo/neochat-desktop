import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Brain, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Search, 
  Sparkles, 
  User, 
  ShieldAlert, 
  FolderKanban,
  SlidersHorizontal,
  Download,
  Upload,
  Copy,
  ChevronDown,
  FileCode,
  FileText
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import Switch from './ui/Switch';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

const CATEGORY_CONFIG = {
  preference: {
    label: 'Preferência',
    labelEn: 'Preference',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    icon: Sparkles
  },
  fact: {
    label: 'Fato',
    labelEn: 'Fact',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: User
  },
  rule: {
    label: 'Regra',
    labelEn: 'Rule',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: ShieldAlert
  },
  context: {
    label: 'Contexto',
    labelEn: 'Context',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: FolderKanban
  }
};

export function UserMemoryModal({ isOpen, onClose, isMemoryEnabled: propIsMemoryEnabled }) {
  const { t, language } = useLanguage();
  const [internalEnabled, setInternalEnabled] = useState(propIsMemoryEnabled !== false);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (propIsMemoryEnabled !== undefined) {
      setInternalEnabled(propIsMemoryEnabled);
    }
    if (isOpen && window.electron?.getSettings) {
      window.electron.getSettings().then(s => {
        setInternalEnabled(s?.userMemory?.enabled !== false);
      }).catch(() => {});
    }
  }, [isOpen, propIsMemoryEnabled]);

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

  const isMemoryEnabled = propIsMemoryEnabled !== undefined ? propIsMemoryEnabled : internalEnabled;
  
  // Add memory form state
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('preference');
  const [isAdding, setIsAdding] = useState(false);

  // Edit memory state
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('preference');

  // Toast alert & copy state
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Export / Import state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const exportMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev && prev.text === text ? null : prev);
    }, 4000);
  };

  // Close export menu on click outside
  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);

  const isEn = language === 'en';

  const loadMemories = async () => {
    if (!window.electron?.memory?.getAll) return;
    setLoading(true);
    try {
      const list = await window.electron.memory.getAll();
      setMemories(list || []);
    } catch (err) {
      console.error('Failed to load user memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen]);

  // Listen for real-time memory updates from AI during chat
  useEffect(() => {
    if (!window.electron?.memory?.onMemoryUpdated) return;
    const cleanup = window.electron.memory.onMemoryUpdated((data) => {
      loadMemories();
    });
    return () => cleanup && cleanup();
  }, []);

  const handleExport = async (format = 'json') => {
    setIsExportMenuOpen(false);
    if (!memories || memories.length === 0) {
      showToast(t('memory.noMemoriesToExport') || 'Nenhuma memória para exportar.', 'error');
      return;
    }

    setIsExporting(true);
    try {
      if (window.electron?.memory?.export) {
        const res = await window.electron.memory.export({ format });
        if (res && res.success) {
          showToast(t('memory.exportSuccess') || `Memória salva com sucesso: ${res.filename}`);
        } else if (res && res.canceled) {
          // Dialog canceled by user
        } else {
          showToast(res?.error || 'Erro ao exportar memória.', 'error');
        }
      } else {
        // Fallback for browser download
        const dateStr = new Date().toISOString().slice(0, 10);
        let blob;
        let filename;
        const activeCount = memories.filter(m => m.enabled !== false).length;

        if (format === 'md' || format === 'markdown') {
          filename = `neochat-memorias-${dateStr}.md`;
          const categoryLabels = {
            preference: 'Preferências (Preferences)',
            fact: 'Fatos (Facts)',
            rule: 'Regras (Rules)',
            context: 'Contexto (Context)'
          };

          const sections = ['preference', 'fact', 'rule', 'context'].map(cat => {
            const items = memories.filter(m => (m.category || 'preference') === cat);
            const title = categoryLabels[cat] || cat;
            if (items.length === 0) return `### ${title}\n*(Nenhuma memória cadastrada)*\n`;
            const list = items.map(m => {
              const status = m.enabled !== false ? '✅ Ativa' : '⏸️ Desativada';
              const source = m.source === 'ai_extracted' ? 'Aprendido pela IA' : 'Manual';
              const date = m.createdAt ? new Date(m.createdAt).toLocaleDateString() : dateStr;
              return `- **${m.content}**\n  - *Status:* ${status} | *Origem:* ${source} | *Data:* ${date}`;
            }).join('\n');
            return `### ${title} (${items.length})\n${list}\n`;
          });

          const mdContent = [
            '# Memória Persistente do Usuário - NeoChat',
            '',
            `> **Data de exportação:** ${new Date().toLocaleString()}  `,
            `> **Total de memórias:** ${memories.length} (${activeCount} ativas)`,
            '',
            '---',
            '',
            ...sections
          ].join('\n');

          blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
        } else {
          filename = `neochat-memorias-${dateStr}.json`;
          const payload = {
            version: 1,
            appName: 'NeoChat',
            exportedAt: new Date().toISOString(),
            total: memories.length,
            active: activeCount,
            memories
          };
          blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(t('memory.exportSuccess') || 'Memória salva e exportada com sucesso!');
      }
    } catch (err) {
      console.error('Failed to export memory:', err);
      showToast(err.message || 'Falha ao exportar memória.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsExportMenuOpen(false);
    if (window.electron?.memory?.import) {
      setIsImporting(true);
      try {
        const res = await window.electron.memory.import({ merge: true });
        if (res && res.success) {
          const count = res.imported ?? res.added ?? 0;
          showToast(t('memory.importSuccess', { count }) || `${count} memória(s) importada(s) com sucesso!`);
          await loadMemories();
        } else if (res && res.canceled) {
          // Canceled by user
        } else {
          showToast(res?.error || 'Erro ao importar memórias.', 'error');
        }
      } catch (err) {
        console.error('Failed to import memory:', err);
        showToast(err.message || 'Falha ao importar memórias.', 'error');
      } finally {
        setIsImporting(false);
      }
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed) ? parsed : parsed.memories;
      if (!incoming || !Array.isArray(incoming)) {
        throw new Error('Arquivo JSON inválido para memórias.');
      }
      let added = 0;
      for (const item of incoming) {
        if (item && item.content && window.electron?.memory?.add) {
          await window.electron.memory.add(item.content, item.category || 'preference', item.source || 'imported');
          added++;
        }
      }
      showToast(t('memory.importSuccess', { count: added }) || `${added} memória(s) importada(s) com sucesso!`);
      await loadMemories();
    } catch (err) {
      showToast(err.message || 'Falha ao ler arquivo de memórias.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleCopyMemory = async (mem) => {
    try {
      await navigator.clipboard.writeText(mem.content);
      setCopiedId(mem.id);
      showToast(t('memory.copied') || 'Memória copiada!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!isOpen) return null;

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!isMemoryEnabled) {
      showToast(t('memory.disabledAlert') || 'A memória geral está desativada nas configurações.', 'error');
      return;
    }
    if (!newContent.trim() || !window.electron?.memory?.add) return;

    setIsAdding(true);
    try {
      const res = await window.electron.memory.add(newContent.trim(), newCategory, 'manual');
      if (res && res.error) {
        showToast(res.error, 'error');
        return;
      }
      setNewContent('');
      await loadMemories();
    } catch (err) {
      console.error('Failed to add memory:', err);
      showToast(err.message || 'Falha ao adicionar memória', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleMemory = async (id, currentEnabled) => {
    if (!window.electron?.memory?.update) return;
    try {
      await window.electron.memory.update(id, { enabled: !currentEnabled });
      setMemories(prev => prev.map(m => m.id === id ? { ...m, enabled: !currentEnabled } : m));
    } catch (err) {
      console.error('Failed to toggle memory:', err);
    }
  };

  const handleStartEdit = (memory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
    setEditCategory(memory.category || 'preference');
  };

  const handleSaveEdit = async (id) => {
    if (!editContent.trim() || !window.electron?.memory?.update) return;
    try {
      await window.electron.memory.update(id, { content: editContent.trim(), category: editCategory });
      setEditingId(null);
      await loadMemories();
    } catch (err) {
      console.error('Failed to update memory:', err);
    }
  };

  const handleDeleteMemory = async (id) => {
    if (!window.electron?.memory?.delete) return;
    try {
      await window.electron.memory.delete(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(t('memory.clearConfirm') || 'Deseja apagar todas as memórias salvas?')) return;
    if (!window.electron?.memory?.clear) return;
    try {
      await window.electron.memory.clear();
      setMemories([]);
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  };

  const filteredMemories = memories.filter(m => {
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.content.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q);
    }
    return true;
  });

  const activeCount = memories.filter(m => m.enabled !== false).length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span>{t('memory.title')}</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10.5px] font-normal py-0",
                    !isMemoryEnabled && "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {!isMemoryEnabled 
                    ? (t('common.disabled') || 'Desativado') 
                    : t('memory.activeCount', { active: activeCount, total: memories.length })}
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('memory.description')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toast Alert */}
        {toastMessage && (
          <div className={cn(
            "px-5 py-2 text-xs font-medium flex items-center justify-between border-b transition-all animate-in fade-in duration-150",
            toastMessage.type === 'error'
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          )}>
            <div className="flex items-center gap-2">
              {toastMessage.type === 'error' ? (
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-muted-foreground hover:text-foreground ml-2 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Memory Disabled Alert Banner */}
        {!isMemoryEnabled && (
          <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <span className="font-medium">{t('memory.disabledAlert')}</span>
            </div>
          </div>
        )}

        {/* Add Memory Form */}
        <div className="p-4 border-b border-border bg-muted/10">
          <form onSubmit={handleAddMemory} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={!isMemoryEnabled ? (t('memory.disabledAlert') || 'Memória desativada nas configurações') : t('memory.addMemoryPlaceholder')}
                className="flex-1 text-xs bg-background disabled:opacity-60"
                disabled={isAdding || !isMemoryEnabled}
              />
              
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                disabled={isAdding || !isMemoryEnabled}
                className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="preference">{isEn ? 'Preference' : 'Preferência'}</option>
                <option value="fact">{isEn ? 'Fact' : 'Fato'}</option>
                <option value="rule">{isEn ? 'Rule' : 'Regra'}</option>
                <option value="context">{isEn ? 'Context' : 'Contexto'}</option>
              </select>

              <Button
                type="submit"
                size="sm"
                disabled={!newContent.trim() || isAdding || !isMemoryEnabled}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('memory.addMemoryBtn')}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2 bg-muted/20 flex-wrap">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                selectedCategory === 'all' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isEn ? 'All' : 'Todas'} ({memories.length})
            </button>
            {Object.keys(CATEGORY_CONFIG).map((catKey) => {
              const count = memories.filter(m => m.category === catKey).length;
              const cfg = CATEGORY_CONFIG[catKey];
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(catKey)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    selectedCategory === catKey ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isEn ? cfg.labelEn : cfg.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-40 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('memory.searchPlaceholder')}
              className="h-7 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {loading ? (
            <div className="h-36 flex items-center justify-center text-xs text-muted-foreground">
              Carregando memórias...
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
              <Brain className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium text-foreground">{t('memory.empty')}</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                {t('memory.emptyDesc')}
              </p>
            </div>
          ) : (
            filteredMemories.map((mem) => {
              const catCfg = CATEGORY_CONFIG[mem.category] || CATEGORY_CONFIG.preference;
              const isEditing = editingId === mem.id;

              return (
                <div
                  key={mem.id}
                  className={cn(
                    "p-3 rounded-xl border transition-all flex items-start justify-between gap-3 group",
                    mem.enabled !== false
                      ? "bg-card border-border hover:border-purple-500/30"
                      : "bg-muted/30 border-border/40 opacity-60"
                  )}
                >
                  {isEditing ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="text-xs bg-background"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="text-xs bg-background border border-border rounded px-2 py-1"
                        >
                          <option value="preference">{isEn ? 'Preference' : 'Preferência'}</option>
                          <option value="fact">{isEn ? 'Fact' : 'Fato'}</option>
                          <option value="rule">{isEn ? 'Rule' : 'Regra'}</option>
                          <option value="context">{isEn ? 'Context' : 'Contexto'}</option>
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(mem.id)}
                          className="h-7 text-xs bg-primary text-primary-foreground"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          <span>{t('memory.save')}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          className="h-7 text-xs"
                        >
                          {t('memory.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", catCfg.color)}>
                          {isEn ? catCfg.labelEn : catCfg.label}
                        </span>
                        {mem.source === 'ai_extracted' && (
                          <span className="text-[10px] text-purple-500/80 flex items-center gap-1 font-mono">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{t('memory.aiSource')}</span>
                          </span>
                        )}
                        <span className="text-[10.5px] text-muted-foreground/60 ml-auto">
                          {new Date(mem.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed break-words font-medium">
                        {mem.content}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <Switch
                        checked={mem.enabled !== false}
                        onChange={() => handleToggleMemory(mem.id, mem.enabled !== false)}
                        title={mem.enabled !== false ? 'Memória ativa' : 'Memória desativada'}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyMemory(mem)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('memory.copyMemory') || 'Copiar memória'}
                      >
                        {copiedId === mem.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(mem)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('memory.edit')}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('memory.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
          {memories.length > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-destructive hover:underline font-medium"
            >
              {t('memory.clearAll')}
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            {/* Hidden file input for web fallback */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".json"
              className="hidden"
            />

            {/* Import Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImport}
              disabled={isImporting}
              className="text-xs h-8 flex items-center gap-1.5"
              title={t('memory.importTooltip') || 'Importar memórias de arquivo JSON'}
            >
              <Upload className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t('memory.importMemories') || 'Importar'}</span>
            </Button>

            {/* Save & Export Button with Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={memories.length === 0 || isExporting}
                className={cn(
                  "text-xs h-8 flex items-center gap-1.5 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5 text-purple-600 dark:text-purple-400 font-medium",
                  isExportMenuOpen && "bg-purple-500/10"
                )}
                title="Salvar e exportar memórias em arquivo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('memory.exportMemories') || 'Salvar e Exportar'}</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
              </Button>

              {isExportMenuOpen && (
                <div className="absolute right-0 bottom-full mb-1.5 w-64 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border/50 mb-1">
                    Formato de Exportação
                  </div>

                  {/* JSON */}
                  <button
                    type="button"
                    onClick={() => handleExport('json')}
                    className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/80 text-foreground transition-colors text-left group"
                  >
                    <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0 group-hover:bg-purple-500/20">
                      <FileCode className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                        <span>{t('memory.exportJson')}</span>
                        <span className="text-[10px] font-mono text-purple-500 font-normal">.json</span>
                      </div>
                      <div className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">
                        {t('memory.exportJsonDesc')}
                      </div>
                    </div>
                  </button>

                  {/* Markdown */}
                  <button
                    type="button"
                    onClick={() => handleExport('md')}
                    className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/80 text-foreground transition-colors text-left group mt-0.5"
                  >
                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0 group-hover:bg-blue-500/20">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                        <span>{t('memory.exportMd')}</span>
                        <span className="text-[10px] font-mono text-blue-500 font-normal">.md</span>
                      </div>
                      <div className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">
                        {t('memory.exportMdDesc')}
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              className="text-xs h-8"
            >
              {t('memory.cancel') || 'Fechar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserMemoryModal;

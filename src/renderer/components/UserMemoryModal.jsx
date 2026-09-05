import React, { useState, useEffect, useMemo } from 'react';
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
  SlidersHorizontal
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

export function UserMemoryModal({ isOpen, onClose }) {
  const { t, language } = useLanguage();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Add memory form state
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('preference');
  const [isAdding, setIsAdding] = useState(false);

  // Edit memory state
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('preference');

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

  if (!isOpen) return null;

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!newContent.trim() || !window.electron?.memory?.add) return;

    setIsAdding(true);
    try {
      await window.electron.memory.add(newContent.trim(), newCategory, 'manual');
      setNewContent('');
      await loadMemories();
    } catch (err) {
      console.error('Failed to add memory:', err);
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
                <Badge variant="outline" className="text-[10.5px] font-normal py-0">
                  {t('memory.activeCount', { active: activeCount, total: memories.length })}
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

        {/* Add Memory Form */}
        <div className="p-4 border-b border-border bg-muted/10">
          <form onSubmit={handleAddMemory} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={t('memory.addMemoryPlaceholder')}
                className="flex-1 text-xs bg-background"
                disabled={isAdding}
              />
              
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="preference">{isEn ? 'Preference' : 'Preferência'}</option>
                <option value="fact">{isEn ? 'Fact' : 'Fato'}</option>
                <option value="rule">{isEn ? 'Rule' : 'Regra'}</option>
                <option value="context">{isEn ? 'Context' : 'Contexto'}</option>
              </select>

              <Button
                type="submit"
                size="sm"
                disabled={!newContent.trim() || isAdding}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0 flex items-center gap-1.5"
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
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
          {memories.length > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-destructive hover:underline font-medium"
            >
              {t('memory.clearAll')}
            </button>
          ) : <div />}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            className="text-xs"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UserMemoryModal;

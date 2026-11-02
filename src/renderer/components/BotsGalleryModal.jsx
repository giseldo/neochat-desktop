import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bot, 
  X, 
  Search, 
  Plus, 
  MessageSquare, 
  Edit2, 
  Trash2, 
  SlidersHorizontal 
} from 'lucide-react';
import { Button } from './ui/button';
import { BotAvatar } from './PersonaSelector';
import BotConfigModal from './BotConfigModal';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export function BotsGalleryModal({
  isOpen,
  onClose,
  botsList = [],
  activeBot = null,
  onSelectBot,
  onRefreshBots,
  availableModels = []
}) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState(null);
  const [botMemoriesCounts, setBotMemoriesCounts] = useState({});

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load memories count for bots
  useEffect(() => {
    if (!isOpen || !Array.isArray(botsList)) return;
    let isMounted = true;
    const loadCounts = async () => {
      const counts = {};
      for (const bot of botsList) {
        if (window.electron?.bots?.getMemories) {
          try {
            const mems = await window.electron.bots.getMemories(bot.id);
            counts[bot.id] = Array.isArray(mems) ? mems.length : 0;
          } catch (e) {
            counts[bot.id] = 0;
          }
        }
      }
      if (isMounted) setBotMemoriesCounts(counts);
    };
    loadCounts();
    return () => { isMounted = false; };
  }, [isOpen, botsList]);

  // Filtered bots list
  const filteredBots = useMemo(() => {
    if (!searchQuery.trim()) return botsList;
    const q = searchQuery.toLowerCase();
    return botsList.filter(b =>
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.description && b.description.toLowerCase().includes(q)) ||
      (b.preferredModel && b.preferredModel.toLowerCase().includes(q))
    );
  }, [botsList, searchQuery]);

  const handleOpenCreate = () => {
    setEditingBot(null);
    setIsConfigModalOpen(true);
  };

  const handleOpenEdit = (e, bot) => {
    if (e) e.stopPropagation();
    setEditingBot(bot);
    setIsConfigModalOpen(true);
  };

  const handleDelete = async (e, botId) => {
    if (e) e.stopPropagation();
    if (!confirm(t('bots.confirmDelete') || 'Tem certeza de que deseja excluir este Funcionário Agêntico?')) return;
    if (window.electron?.bots?.delete) {
      await window.electron.bots.delete(botId);
      onRefreshBots?.();
    }
  };

  const handleBotSaved = () => {
    setIsConfigModalOpen(false);
    onRefreshBots?.();
  };

  if (!isOpen) return null;

  return (
    <>
      {typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0 duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose?.();
            }
          }}
        >
          <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">
                      {t('sidebar.botsTitle') || 'Funcionários Agênticos'}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold bg-primary/10 text-primary">
                      {botsList.length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {t('sidebar.botsModalSubtitle') || 'Colaboradores autônomos com instruções, ferramentas e sandbox dedicada'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenCreate}
                  className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('sidebar.newBot') || 'Novo Funcionário'}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  title={t('common.close') || 'Fechar'}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-5 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('sidebar.searchBotsPlaceholder') || "Buscar funcionário agêntico ou modelo..."}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-muted/50 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Bots List */}
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2">
              {filteredBots.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Bot className="h-10 w-10 mx-auto mb-2 opacity-30 text-muted-foreground" />
                  <p className="font-semibold text-foreground/80">{t('sidebar.noBotsFound') || 'Nenhum funcionário agêntico encontrado'}</p>
                  <p className="text-[11px] mt-1 text-muted-foreground/70">{t('sidebar.noBotsDesc') || 'Crie um funcionário agêntico personalizado clicando em + acima.'}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCreate}
                    className="mt-4 gap-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('sidebar.newBot') || 'Novo Funcionário'}</span>
                  </Button>
                </div>
              ) : (
                filteredBots.map((bot) => {
                  const isSelected = activeBot?.id === bot.id;
                  const subtitle = bot.description || '';

                  return (
                    <div
                      key={bot.id}
                      className={cn(
                        "group relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all",
                        isSelected
                          ? "bg-primary/5 border-primary/40 shadow-xs"
                          : "border-border/60 hover:border-border hover:bg-muted/40"
                      )}
                    >
                      <div
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        onClick={() => {
                          onSelectBot?.(bot);
                          onClose?.();
                        }}
                      >
                        <BotAvatar persona={bot} className="w-10 h-10 rounded-xl shadow-2xs shrink-0" iconClassName="w-5 h-5" />
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {bot.name}
                            </span>
                            {bot.vmConfig?.enabled !== false && (
                              <span 
                                className="text-[9px] px-1.5 py-0.2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full font-mono font-medium flex items-center gap-0.5" 
                                title={`Máquina Virtual Dedicada: ${bot.vmConfig?.type?.toUpperCase() || 'SANDBOX'} (${bot.vmConfig?.isolation || 'isolada'})`}
                              >
                                💻 VM
                              </span>
                            )}
                            {botMemoriesCounts[bot.id] > 0 && (
                              <span 
                                className="text-[9px] px-1.5 py-0.2 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-full font-mono font-medium flex items-center gap-0.5" 
                                title={`${botMemoriesCounts[bot.id]} notas aprendidas`}
                              >
                                🧠 {botMemoriesCounts[bot.id]}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5">
                            {bot.preferredModel && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-muted text-muted-foreground rounded font-mono truncate max-w-[120px]">
                                {bot.preferredModel}
                              </span>
                            )}
                            <p className="text-xs text-muted-foreground truncate leading-tight flex-1">
                              {subtitle}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            onSelectBot?.(bot);
                            onClose?.();
                          }}
                          className="h-8 px-2.5 rounded-lg text-xs gap-1 cursor-pointer font-medium"
                          title={t('sidebar.chatWithBot') || 'Conversar'}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t('sidebar.chatWithBot') || 'Conversar'}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleOpenEdit(e, bot)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          title={t('common.edit') || 'Editar'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {!bot.isBuiltIn && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(e, bot.id)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title={t('common.delete') || 'Excluir'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <span>{filteredBots.length} {filteredBots.length === 1 ? 'funcionário disponível' : 'funcionários disponíveis'}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 px-3 rounded-lg text-xs cursor-pointer"
              >
                {t('common.close') || 'Fechar'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bot Configuration Modal */}
      <BotConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        bot={editingBot}
        availableModels={availableModels}
        onSave={handleBotSaved}
      />
    </>
  );
}

export default BotsGalleryModal;

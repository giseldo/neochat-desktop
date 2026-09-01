import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Blocks, Cpu, Check, ChevronDown, Bot } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';

export function AgentEngineSelector({ agentHarness = 'native', onHarnessChange, className }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeHarness = agentHarness === 'pi' ? 'pi' : 'native';

  const engineOptions = useMemo(() => [
    {
      id: 'native',
      title: t('settings.agentHarnessNativeTitle') || 'Neo Native',
      shortTitle: 'Neo Native',
      description: t('settings.agentHarnessNativeDesc') || 'Runtime estável do NeoChat com roteamento multiprovedor, MCP e compactação nativa.',
      badge: t('settings.agentHarnessDefaultBadge') || 'Padrão',
      icon: Blocks,
      colorClass: 'text-amber-500 dark:text-amber-400',
      activeBgClass: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      badgeVariant: 'secondary'
    },
    {
      id: 'pi',
      title: t('settings.agentHarnessPiTitle') || 'Pi Agent Core',
      shortTitle: 'Pi Agent Core',
      description: t('settings.agentHarnessPiDesc') || 'Loop do Pi incorporado ao NeoChat, mantendo os modelos e a interface atuais.',
      badge: 'MIT',
      icon: Cpu,
      colorClass: 'text-indigo-500 dark:text-indigo-400',
      activeBgClass: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      badgeVariant: 'outline'
    }
  ], [t]);

  const currentOption = engineOptions.find(opt => opt.id === activeHarness) || engineOptions[0];
  const CurrentIcon = currentOption.icon;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = async (optionId) => {
    const validHarness = optionId === 'pi' ? 'pi' : 'native';
    if (onHarnessChange) {
      onHarnessChange(validHarness);
    }
    if (window.electron?.saveSettings) {
      try {
        const currentSettings = await window.electron.getSettings();
        await window.electron.saveSettings({
          ...currentSettings,
          agentHarness: validHarness
        });
      } catch (err) {
        console.error('Failed to save agentHarness from top bar:', err);
      }
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-7 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs transition-all duration-150 shadow-2xs group/btn cursor-pointer select-none",
          activeHarness === 'pi'
            ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 font-semibold"
            : "border-border bg-background hover:bg-muted text-foreground font-medium"
        )}
        title={`${t('settings.agentHarnessTitle') || 'Engine do Agente'}: ${currentOption.title} • ${t('common.clickToChange') || 'Clique para alterar'}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <CurrentIcon className={cn("w-3.5 h-3.5 shrink-0", currentOption.colorClass)} />
        <span className="truncate max-w-[120px] font-semibold">
          {currentOption.shortTitle}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1 py-0 leading-none h-3.5 font-mono hidden sm:inline-flex",
            activeHarness === 'pi'
              ? "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
              : "border-border/60 text-muted-foreground bg-muted/60"
          )}
        >
          {currentOption.badge}
        </Badge>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-88 rounded-2xl border border-border bg-popover p-2.5 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 backdrop-blur-md">
          {/* Header */}
          <div className="px-2 py-1.5 border-b border-border/80 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
              <Bot className="w-4 h-4 text-primary" />
              <span>{t('settings.agentHarnessTitle') || 'Engine do Agente'}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {t('settings.agentHarnessDesc') || 'Escolha o runtime que executa o modo Código. O chat normal não é afetado.'}
            </p>
          </div>

          {/* Engine Options */}
          <div className="space-y-1.5">
            {engineOptions.map(option => {
              const isSelected = activeHarness === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer group",
                    isSelected
                      ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30 text-foreground"
                      : "border-border/70 hover:bg-muted/80 hover:border-border text-foreground"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors",
                    isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-xs truncate">{option.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                          {option.badge}
                        </Badge>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </div>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Security & Checkpoint Note */}
          <div className="mt-2.5 pt-2 border-t border-border/60 px-1.5 text-[10px] text-muted-foreground/80 leading-relaxed">
            {t('settings.agentHarnessSecurityNote') || 'Nos dois engines, leitura, escrita, shell, Git e MCP continuam passando pelas permissões e checkpoints do NeoChat.'}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentEngineSelector;

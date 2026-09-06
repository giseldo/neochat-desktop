import React, { useEffect, useRef } from 'react';
import { 
  FileText, 
  Code2, 
  BookOpen, 
  Wrench, 
  CheckCircle2, 
  Languages, 
  GitBranch, 
  Database, 
  FlaskConical, 
  FileCode, 
  Sparkles, 
  Zap, 
  Bot, 
  Settings2,
  Terminal,
  Layers,
  HelpCircle,
  Globe,
  Hammer
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

const ICON_MAP = {
  FileText,
  Code2,
  BookOpen,
  Wrench,
  CheckCircle2,
  Languages,
  GitBranch,
  Database,
  FlaskConical,
  FileCode,
  Sparkles,
  Zap,
  Bot,
  Terminal,
  Layers,
  Globe,
  Hammer
};

export default function SlashCommandsPopover({
  commands = [],
  selectedIndex = 0,
  onSelectCommand,
  onOpenManageModal,
  onClose,
  filterQuery = ''
}) {
  const { t } = useLanguage();
  const listRef = useRef(null);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedElement = listRef.current.children[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const renderIcon = (iconName) => {
    const IconComponent = ICON_MAP[iconName] || Sparkles;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div 
      className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 flex flex-col max-h-[340px]"
      style={{ minWidth: '320px' }}
      onMouseDown={(e) => e.preventDefault()} // Keep focus on textarea
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span>{t('slashCommands.title')}</span>
          {filterQuery && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono font-normal">
              /{filterQuery}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenManageModal}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={t('slashCommands.manageTemplates')}
        >
          <Settings2 className="w-3 h-3" />
          <span>{t('common.edit')}</span>
        </button>
      </div>

      {/* Commands List */}
      <div ref={listRef} className="overflow-y-auto p-1.5 space-y-0.5 max-h-[240px]">
        {commands.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            <HelpCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>{t('slashCommands.noCommands', { query: filterQuery })}</p>
          </div>
        ) : (
          commands.map((cmd, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={cmd.id || cmd.command}
                onClick={() => onSelectCommand(cmd)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors select-none",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors",
                    isSelected
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-muted/80 text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {renderIcon(cmd.icon)}
                </div>

                {/* Command text details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-mono font-semibold tracking-wide",
                        isSelected ? "text-primary-foreground" : "text-primary"
                      )}
                    >
                      /{cmd.command}
                    </span>
                    <span
                      className={cn(
                        "font-medium truncate",
                        isSelected ? "text-primary-foreground/90" : "text-foreground"
                      )}
                    >
                      {cmd.title}
                    </span>
                    {cmd.isSkill ? (
                      <span
                        className={cn(
                          "text-[9px] px-1.5 py-0.2 rounded-md font-mono uppercase font-bold tracking-wider",
                          isSelected
                            ? "bg-primary-foreground/25 text-primary-foreground"
                            : "bg-primary/15 text-primary"
                        )}
                      >
                        Skill
                      </span>
                    ) : !cmd.isBuiltIn && (
                      <span
                        className={cn(
                          "text-[9px] px-1 py-0.2 rounded font-mono uppercase font-semibold",
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {t('promptTemplates.customBadge')}
                      </span>
                    )}
                  </div>
                  {cmd.description && (
                    <p
                      className={cn(
                        "text-[11px] truncate mt-0.5",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {cmd.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Instructions */}
      <div className="px-3 py-1.5 border-t border-border/40 bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>{t('slashCommands.pressToSelect')}</span>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Keyboard, 
  Search, 
  X, 
  Sliders, 
  Globe, 
  Compass, 
  MessageSquare, 
  Terminal, 
  ExternalLink 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { formatAccelerator } from '../lib/shortcutUtils.js';

export { formatAccelerator };

export const KeyBadge = ({ children, className }) => (
  <kbd
    className={cn(
      "inline-flex items-center justify-center min-w-[24px] h-6 px-2 py-0.5",
      "text-xs font-mono font-semibold rounded-md",
      "bg-muted/80 dark:bg-muted/50 text-foreground border border-border/80 shadow-2xs select-none",
      className
    )}
  >
    {children}
  </kbd>
);

export const KeyCombo = ({ keys, className }) => (
  <div className={cn("inline-flex items-center gap-1.5 flex-wrap", className)}>
    {keys.map((k, idx) => (
      <React.Fragment key={idx}>
        <KeyBadge>{k}</KeyBadge>
        {idx < keys.length - 1 && (
          <span className="text-xs text-muted-foreground font-medium">+</span>
        )}
      </React.Fragment>
    ))}
  </div>
);

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPopupShortcut, setCurrentPopupShortcut] = useState('CommandOrControl+Shift+Space');
  const [isPopupEnabled, setIsPopupEnabled] = useState(true);
  const searchInputRef = useRef(null);

  const isMac = useMemo(() => {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform);
  }, []);

  // Fetch current popup shortcut from settings
  useEffect(() => {
    if (isOpen && window.electron?.getSettings) {
      window.electron.getSettings().then(settings => {
        if (settings) {
          if (settings.popupShortcut) setCurrentPopupShortcut(settings.popupShortcut);
          if (settings.popupEnabled !== undefined) setIsPopupEnabled(settings.popupEnabled);
        }
      }).catch(err => console.warn('Could not load settings for shortcuts:', err));
    }
  }, [isOpen]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setActiveCategory('all');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const modKey = isMac ? '⌘' : 'Ctrl';
  const altKey = isMac ? '⌥' : 'Alt';
  const shiftKey = isMac ? '⇧' : 'Shift';

  const shortcutList = useMemo(() => {
    const popupKeys = formatAccelerator(currentPopupShortcut, isMac);

    return [
      // Global & Floating Window
      {
        id: 'popupToggle',
        category: 'global',
        title: t('shortcuts.items.popupToggle'),
        description: t('shortcuts.items.popupToggleDesc'),
        keys: popupKeys.length ? popupKeys : [modKey, shiftKey, 'Space'],
        isCustomizable: true,
        isEnabled: isPopupEnabled
      },
      {
        id: 'popupClose',
        category: 'global',
        title: t('shortcuts.items.popupClose'),
        description: t('shortcuts.items.popupCloseDesc'),
        keys: ['Esc']
      },
      {
        id: 'popupSend',
        category: 'global',
        title: t('shortcuts.items.popupSend'),
        description: t('shortcuts.items.popupSendDesc'),
        keys: ['Enter']
      },

      // Navigation & General
      {
        id: 'newChat',
        category: 'navigation',
        title: t('shortcuts.items.newChat'),
        description: t('shortcuts.items.newChatDesc'),
        keys: [modKey, 'N']
      },
      {
        id: 'openShortcuts',
        category: 'navigation',
        title: t('shortcuts.items.openShortcuts'),
        description: t('shortcuts.items.openShortcutsDesc'),
        keys: [modKey, '/'],
        altKeys: ['?']
      },
      {
        id: 'openSettings',
        category: 'navigation',
        title: t('shortcuts.items.openSettings'),
        description: t('shortcuts.items.openSettingsDesc'),
        keys: [modKey, ',']
      },
      {
        id: 'toggleSidebar',
        category: 'navigation',
        title: t('shortcuts.items.toggleSidebar'),
        description: t('shortcuts.items.toggleSidebarDesc'),
        keys: [modKey, 'B']
      },
      {
        id: 'closeModals',
        category: 'navigation',
        title: t('shortcuts.items.closeModals'),
        description: t('shortcuts.items.closeModalsDesc'),
        keys: ['Esc']
      },
      {
        id: 'zoomIn',
        category: 'navigation',
        title: t('shortcuts.items.zoomIn'),
        description: t('shortcuts.items.zoomInDesc'),
        keys: [modKey, '+']
      },
      {
        id: 'zoomOut',
        category: 'navigation',
        title: t('shortcuts.items.zoomOut'),
        description: t('shortcuts.items.zoomOutDesc'),
        keys: [modKey, '-']
      },
      {
        id: 'zoomReset',
        category: 'navigation',
        title: t('shortcuts.items.zoomReset'),
        description: t('shortcuts.items.zoomResetDesc'),
        keys: [modKey, '0']
      },

      // Chat & Typing
      {
        id: 'sendMessage',
        category: 'chat',
        title: t('shortcuts.items.sendMessage'),
        description: t('shortcuts.items.sendMessageDesc'),
        keys: ['Enter']
      },
      {
        id: 'newLine',
        category: 'chat',
        title: t('shortcuts.items.newLine'),
        description: t('shortcuts.items.newLineDesc'),
        keys: [shiftKey, 'Enter']
      },
      {
        id: 'focusInput',
        category: 'chat',
        title: t('shortcuts.items.focusInput'),
        description: t('shortcuts.items.focusInputDesc'),
        keys: ['/']
      },
      {
        id: 'slashCommands',
        category: 'chat',
        title: t('shortcuts.items.slashCommands'),
        description: t('shortcuts.items.slashCommandsDesc'),
        keys: ['/']
      },
      {
        id: 'voicePushToTalk',
        category: 'chat',
        title: t('shortcuts.items.voicePushToTalk'),
        description: t('shortcuts.items.voicePushToTalkDesc'),
        keys: [modKey, altKey],
        altKeys: [modKey, altKey, 'Space']
      },
      {
        id: 'acceptAutocomplete',
        category: 'chat',
        title: t('shortcuts.items.acceptAutocomplete'),
        description: t('shortcuts.items.acceptAutocompleteDesc'),
        keys: ['Tab']
      },
      {
        id: 'discardAutocomplete',
        category: 'chat',
        title: t('shortcuts.items.discardAutocomplete'),
        description: t('shortcuts.items.discardAutocompleteDesc'),
        keys: ['Esc']
      },
      {
        id: 'navigateMenu',
        category: 'chat',
        title: t('shortcuts.items.navigateMenu'),
        description: t('shortcuts.items.navigateMenuDesc'),
        keys: ['↑ / ↓', 'Enter']
      },

      // Execution & Tools
      {
        id: 'runCode',
        category: 'execution',
        title: t('shortcuts.items.runCode'),
        description: t('shortcuts.items.runCodeDesc'),
        keys: [modKey, 'Enter']
      }
    ];
  }, [currentPopupShortcut, isPopupEnabled, isMac, modKey, altKey, shiftKey, t]);

  const filteredShortcuts = useMemo(() => {
    return shortcutList.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchKeys = item.keys.some(k => k.toLowerCase().includes(q)) || 
        (item.altKeys && item.altKeys.some(k => k.toLowerCase().includes(q)));
      
      return matchTitle || matchDesc || matchKeys;
    });
  }, [shortcutList, activeCategory, searchQuery]);

  const categories = [
    { id: 'all', label: t('shortcuts.categories.all'), icon: Keyboard },
    { id: 'global', label: t('shortcuts.categories.global'), icon: Globe },
    { id: 'navigation', label: t('shortcuts.categories.navigation'), icon: Compass },
    { id: 'chat', label: t('shortcuts.categories.chat'), icon: MessageSquare },
    { id: 'execution', label: t('shortcuts.categories.execution'), icon: Terminal },
  ];

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                {t('shortcuts.title')}
                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                  {shortcutList.length}
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('shortcuts.subtitle')}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 border-b border-border bg-card space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={t('shortcuts.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm rounded-xl bg-muted/40 border-border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shortcuts List Content */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-border/50">
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Keyboard className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-medium">{t('shortcuts.noResults')}</p>
            </div>
          ) : (
            filteredShortcuts.map((item) => (
              <div 
                key={item.id}
                className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-muted/30 rounded-xl transition-colors group"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    {item.isCustomizable && (
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5 py-0 px-1.5">
                        {t('shortcuts.badgeCustomizable')}
                      </Badge>
                    )}
                    {item.isEnabled === false && (
                      <Badge variant="secondary" className="text-[10px] text-muted-foreground py-0 px-1.5">
                        {t('common.disabled')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <KeyCombo keys={item.keys} />
                  {item.altKeys && (
                    <>
                      <span className="text-xs text-muted-foreground font-mono">/</span>
                      <KeyCombo keys={item.altKeys} />
                    </>
                  )}
                  {item.isCustomizable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        onClose();
                        navigate('/settings');
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 ml-1 rounded-lg"
                      title={t('shortcuts.configureInSettings')}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info & link */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Dica: Pressione</span>
            <KeyBadge className="h-5 text-[10px] px-1.5">Esc</KeyBadge>
            <span>para fechar a qualquer momento.</span>
          </div>

          <Button
            variant="link"
            size="sm"
            onClick={() => {
              onClose();
              navigate('/settings');
            }}
            className="h-auto p-0 text-xs text-primary hover:underline flex items-center gap-1"
          >
            <span>{t('shortcuts.configureInSettings')}</span>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

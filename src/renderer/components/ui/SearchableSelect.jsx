import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Layers, Key, Star, Bot, Plus, SlidersHorizontal } from 'lucide-react';
import { BotAvatar } from '../PersonaSelector';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/utils';

/**
 * A searchable select component that allows filtering options by typing
 * and optionally grouping options by categories/providers.
 * Also supports a prominent unified top section for "Funcionários Agênticos" (TypingMind style).
 */
export function SearchableSelect({ 
  value, 
  onValueChange, 
  options = [], 
  placeholder = "Select...",
  className,
  disabled = false,
  getDisplayValue,
  getOptionLabel,
  getOptionValue,
  groupBy = null, // Optional grouping function: (option) => string
  dropdownWidthClass = "w-full min-w-[240px] max-w-[90vw]",
  favoriteItems = [],
  onToggleFavorite = null,
  dropdownPosition = "top",
  botsList = [],
  activeBot = null,
  onSelectBot = null,
  onOpenBotManager = null,
  showAgenticEmployees = false,
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const favoriteSet = useMemo(() => new Set(favoriteItems || []), [favoriteItems]);

  // Filtered Funcionários Agênticos (visible only when enabled in NeoChat Labs)
  const filteredBots = useMemo(() => {
    if (!showAgenticEmployees || !botsList || botsList.length === 0) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return botsList;
    return botsList.filter(b =>
      (b.name && b.name.toLowerCase().includes(query)) ||
      (b.description && b.description.toLowerCase().includes(query)) ||
      (b.preferredModel && b.preferredModel.toLowerCase().includes(query))
    );
  }, [showAgenticEmployees, botsList, searchQuery]);

  // Default accessors if not provided
  const displayValue = getDisplayValue 
    ? getDisplayValue(value)
    : (typeof options[0] === 'string' ? value : options.find(opt => opt.value === value)?.label || value);
  
  const getLabel = getOptionLabel || ((opt) => typeof opt === 'string' ? opt : opt.label);
  const getValue = getOptionValue || ((opt) => typeof opt === 'string' ? opt : opt.value);

  // Filter options based on search query (matches label, value, or group name)
  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;

    return options.filter(option => {
      const label = String(getLabel(option) || '').toLowerCase();
      const val = String(getValue(option) || '').toLowerCase();
      const group = groupBy ? String(groupBy(option) || '').toLowerCase() : '';
      return label.includes(query) || val.includes(query) || group.includes(query);
    });
  }, [options, searchQuery, getLabel, getValue, groupBy]);

  // Group filtered options if groupBy is provided
  const groupedSections = useMemo(() => {
    if (!groupBy || filteredOptions.length === 0) {
      return null;
    }

    const sections = [];

    // If favoriteItems is provided, create a Favoritos section at the top
    if (favoriteItems && favoriteItems.length > 0) {
      const favOptions = filteredOptions.filter(opt => favoriteSet.has(getValue(opt)));
      if (favOptions.length > 0) {
        sections.push({
          group: t('common.favorites') || 'Favoritos',
          isFavoriteGroup: true,
          items: favOptions
        });
      }
    }

    const groupsMap = new Map();
    filteredOptions.forEach(option => {
      const groupName = groupBy(option) || 'Outros';
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, []);
      }
      groupsMap.get(groupName).push(option);
    });

    Array.from(groupsMap.entries()).forEach(([group, items]) => {
      sections.push({
        group,
        isFavoriteGroup: false,
        items
      });
    });

    return sections;
  }, [filteredOptions, groupBy, favoriteItems, favoriteSet, getValue, t]);

  // Compute flat list of all visible items across sections for accurate keyboard navigation
  const allDisplayItems = useMemo(() => {
    if (groupedSections) {
      return groupedSections.flatMap(section => section.items);
    }
    return filteredOptions;
  }, [groupedSections, filteredOptions]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.querySelector(`[data-item-index="${highlightedIndex}"]`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < allDisplayItems.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (allDisplayItems[highlightedIndex]) {
          const selectedValue = getValue(allDisplayItems[highlightedIndex]);
          onValueChange(selectedValue);
          setIsOpen(false);
          setSearchQuery('');
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      default:
        // Allow typing to filter
        break;
    }
  };

  const handleOptionClick = (option) => {
    const selectedValue = getValue(option);
    onSelectBot?.(null);
    onValueChange(selectedValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Keep a running index counter across grouped sections for keyboard navigation mapping
  let runningItemIndex = 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-xl border border-border/80 bg-background/50 px-2.5 py-1 text-xs sm:text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors min-w-0 overflow-hidden",
          (activeBot && showAgenticEmployees) ? "border-primary/50 bg-primary/10 hover:bg-primary/15 shadow-2xs" : "",
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {(activeBot && showAgenticEmployees) ? (
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <BotAvatar persona={activeBot} className="w-4 h-4 rounded-sm shadow-2xs shrink-0" iconClassName="w-2.5 h-2.5" />
            <span className="truncate text-left font-semibold text-xs text-foreground">
              {activeBot.name}
            </span>
            {activeBot.vmConfig?.enabled !== false && (
              <span className="text-[9px] px-1 py-0.1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded font-mono font-medium shrink-0">
                VM
              </span>
            )}
          </div>
        ) : (
          <span className="truncate text-left flex-1 min-w-0 text-foreground">{displayValue || placeholder}</span>
        )}
        <ChevronDown className={cn(
          "h-3.5 w-3.5 opacity-50 transition-transform duration-200 flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          "absolute z-50 rounded-xl border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 backdrop-blur-md",
          dropdownPosition === "bottom"
            ? "top-full left-0 mt-1.5"
            : "bottom-full right-0 mb-1",
          dropdownWidthClass
        )}>
          {/* Search Input */}
          <div className="p-2 border-b border-border/60">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('sidebar.searchBotsPlaceholder') || "Buscar modelo ou funcionário..."}
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-background/80 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Options List */}
          <div 
            ref={listRef}
            className="max-h-[340px] overflow-y-auto p-1 space-y-0.5"
            role="listbox"
          >
            {/* --- SECTION: 👔 FUNCIONÁRIOS AGÊNTICOS (TypingMind Style) --- */}
            {filteredBots.length > 0 && (
              <div className="py-1">
                {/* Section Header */}
                <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase flex items-center justify-between border-b border-primary/20 bg-primary/5 rounded-t-md text-primary mb-1">
                  <span className="flex items-center gap-1.5 truncate">
                    <Bot className="w-3.5 h-3.5" />
                    <span>{t('sidebar.botsTitle') || 'Funcionários Agênticos'}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">
                    {filteredBots.length}
                  </span>
                </div>

                {/* List of Employees */}
                <div className="space-y-0.5">
                  {filteredBots.map((bot) => {
                    const isSelected = activeBot?.id === bot.id;
                    return (
                      <div
                        key={`bot-${bot.id}`}
                        onClick={() => {
                          onSelectBot?.(bot);
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                        className={cn(
                          "group relative flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg py-1.5 px-2.5 text-xs outline-none transition-colors text-foreground",
                          isSelected
                            ? "bg-primary/15 text-primary font-medium"
                            : "hover:bg-muted"
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <BotAvatar persona={bot} className="w-6 h-6 rounded-md shadow-2xs shrink-0" iconClassName="w-3.5 h-3.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold truncate text-xs">{bot.name}</span>
                            {bot.vmConfig?.enabled !== false && (
                              <span className="text-[8px] px-1 py-0.2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full font-mono font-medium">
                                💻 VM
                              </span>
                            )}
                            {bot.preferredModel && (
                              <span className="text-[8px] px-1 py-0.2 bg-muted text-muted-foreground rounded font-mono truncate max-w-[85px]">
                                {bot.preferredModel}
                              </span>
                            )}
                          </div>
                          {bot.description && (
                            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{bot.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Manage Employees Link */}
                {onOpenBotManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenBotManager();
                    }}
                    className="w-full mt-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer border border-primary/20 border-dashed"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('sidebar.manageBots') || 'Gerenciar Funcionários Agênticos'}</span>
                  </button>
                )}

                <div className="my-1.5 border-t border-border/40" />
              </div>
            )}

            {options.length === 0 ? (
              <div className="py-5 px-3 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2.5">
                <span className="leading-relaxed text-foreground/80">{t('common.noModelsConfigured')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    window.location.hash = '#/settings';
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  {t('common.goToSettings')}
                </button>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs sm:text-sm text-muted-foreground">
                {t('common.noModelsFound')}
              </div>
            ) : groupedSections ? (
              // Grouped rendering
              groupedSections.map((section) => (
                <div key={section.group} className="py-1">
                  {/* Group Header */}
                  <div className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase flex items-center justify-between border-b mb-1",
                    section.isFavoriteGroup 
                      ? "text-amber-500 dark:text-amber-400 border-amber-500/20 bg-amber-500/5 rounded-t-md" 
                      : "text-muted-foreground border-border/30"
                  )}>
                    <span className="flex items-center gap-1.5 truncate">
                      {section.isFavoriteGroup && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                      {section.group}
                    </span>
                    <span className={cn(
                      "text-[10px] font-mono font-normal",
                      section.isFavoriteGroup ? "text-amber-500/80" : "text-muted-foreground/70"
                    )}>
                      {section.items.length}
                    </span>
                  </div>

                  {/* Group Items */}
                  <div className="space-y-0.5">
                    {section.items.map((option) => {
                      const optionValue = getValue(option);
                      const optionLabel = getLabel(option);
                      const isSelected = !activeBot && optionValue === value;
                      const isFavorite = favoriteSet.has(optionValue);
                      const currentIndex = runningItemIndex++;
                      const isHighlighted = currentIndex === highlightedIndex;

                      return (
                        <div
                          key={`${section.isFavoriteGroup ? 'fav-' : ''}${optionValue}`}
                          data-item-index={currentIndex}
                          onClick={() => handleOptionClick(option)}
                          onMouseEnter={() => setHighlightedIndex(currentIndex)}
                          className={cn(
                            "group relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg py-1.5 pl-7 pr-1.5 text-xs sm:text-sm outline-none transition-colors text-foreground",
                            isHighlighted && "bg-accent text-accent-foreground",
                            isSelected && "font-medium text-primary bg-primary/10"
                          )}
                          role="option"
                          aria-selected={isSelected}
                        >
                          {isSelected && (
                            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-primary">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span className="truncate flex-1 min-w-0">{optionLabel}</span>
                          {onToggleFavorite && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onToggleFavorite(optionValue);
                              }}
                              className={cn(
                                "ml-1.5 p-1 rounded-md transition-all shrink-0 z-10",
                                isFavorite 
                                  ? "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 opacity-100" 
                                  : "text-muted-foreground/30 hover:text-amber-400 hover:bg-muted/80 opacity-0 group-hover:opacity-100 focus:opacity-100"
                              )}
                              title={isFavorite ? (t('common.removeFromFavorites') || 'Remover dos favoritos') : (t('common.addToFavorites') || 'Adicionar aos favoritos')}
                              aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                            >
                              <Star className={cn("h-3.5 w-3.5 transition-transform active:scale-125", isFavorite ? "fill-amber-400 text-amber-400" : "")} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              // Flat rendering
              filteredOptions.map((option, index) => {
                const optionValue = getValue(option);
                const optionLabel = getLabel(option);
                const isSelected = !activeBot && optionValue === value;
                const isFavorite = favoriteSet.has(optionValue);
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={optionValue}
                    data-item-index={index}
                    onClick={() => handleOptionClick(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "group relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg py-1.5 pl-7 pr-1.5 text-xs sm:text-sm outline-none transition-colors text-foreground",
                      isHighlighted && "bg-accent text-accent-foreground",
                      isSelected && "font-medium text-primary bg-primary/10"
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {isSelected && (
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <span className="truncate flex-1 min-w-0">{optionLabel}</span>
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onToggleFavorite(optionValue);
                        }}
                        className={cn(
                          "ml-1.5 p-1 rounded-md transition-all shrink-0 z-10",
                          isFavorite 
                            ? "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 opacity-100" 
                            : "text-muted-foreground/30 hover:text-amber-400 hover:bg-muted/80 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        )}
                        title={isFavorite ? (t('common.removeFromFavorites') || 'Remover dos favoritos') : (t('common.addToFavorites') || 'Adicionar aos favoritos')}
                        aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Star className={cn("h-3.5 w-3.5 transition-transform active:scale-125", isFavorite ? "fill-amber-400 text-amber-400" : "")} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

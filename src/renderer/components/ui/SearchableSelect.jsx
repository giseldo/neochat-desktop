import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Layers, Key } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/utils';

/**
 * A searchable select component that allows filtering options by typing
 * and optionally grouping options by categories/providers.
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
  dropdownWidthClass = "w-full min-w-[240px] max-w-[90vw]"
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

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

    const groupsMap = new Map();
    filteredOptions.forEach(option => {
      const groupName = groupBy(option) || 'Outros';
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, []);
      }
      groupsMap.get(groupName).push(option);
    });

    return Array.from(groupsMap.entries()).map(([group, items]) => ({
      group,
      items
    }));
  }, [filteredOptions, groupBy]);

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
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          const selectedValue = getValue(filteredOptions[highlightedIndex]);
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
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate text-left flex-1 min-w-0 text-foreground">{displayValue || placeholder}</span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 opacity-50 transition-transform duration-200 flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          "absolute z-50 bottom-full right-0 mb-1 rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 backdrop-blur-md",
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
              placeholder={t('common.typeToFilter')}
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-background/80 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Options List */}
          <div 
            ref={listRef}
            className="max-h-[320px] overflow-y-auto p-1 space-y-0.5"
            role="listbox"
          >
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
                  <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-between border-b border-border/30 mb-1">
                    <span className="truncate">{section.group}</span>
                    <span className="text-[10px] text-muted-foreground/70 font-mono font-normal">
                      {section.items.length}
                    </span>
                  </div>

                  {/* Group Items */}
                  <div className="space-y-0.5">
                    {section.items.map((option) => {
                      const optionValue = getValue(option);
                      const optionLabel = getLabel(option);
                      const isSelected = optionValue === value;
                      const currentIndex = runningItemIndex++;
                      const isHighlighted = currentIndex === highlightedIndex;

                      return (
                        <div
                          key={optionValue}
                          data-item-index={currentIndex}
                          onClick={() => handleOptionClick(option)}
                          onMouseEnter={() => setHighlightedIndex(currentIndex)}
                          className={cn(
                            "relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-7 pr-2 text-xs sm:text-sm outline-none transition-colors text-foreground",
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
                          <span className="truncate">{optionLabel}</span>
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
                const isSelected = optionValue === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={optionValue}
                    data-item-index={index}
                    onClick={() => handleOptionClick(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-7 pr-2 text-xs sm:text-sm outline-none transition-colors text-foreground",
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
                    <span className="truncate">{optionLabel}</span>
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

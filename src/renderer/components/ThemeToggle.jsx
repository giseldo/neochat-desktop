import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Laptop, Palette, Type, Settings, Check, Sparkles } from 'lucide-react';
import { useTheme, COLOR_THEMES, BG_THEMES, FONT_THEMES, FONT_SIZES } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export function ThemeToggle({ className }) {
  const {
    theme,
    setTheme,
    resolvedTheme,
    isDark,
    colorTheme,
    setColorTheme,
    bgTheme,
    setBgTheme,
    fontTheme,
    setFontTheme,
    fontSize,
    setFontSize
  } = useTheme();
  
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('colors'); // 'colors' | 'fonts'
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const modeOptions = [
    { value: 'light', label: t('theme.light'), icon: Sun },
    { value: 'dark', label: t('theme.dark'), icon: Moon },
    { value: 'system', label: t('theme.system'), icon: Laptop },
  ];

  const CurrentIcon = theme === 'system' ? Laptop : (resolvedTheme === 'dark' ? Moon : Sun);
  const activeColorObj = COLOR_THEMES.find(c => c.id === colorTheme) || COLOR_THEMES[0];

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs group"
        title={t('theme.toggleTitle')}
        aria-label={t('theme.toggleLabel')}
      >
        <span
          className="w-3 h-3 rounded-full shrink-0 shadow-xs transition-transform group-hover:scale-110"
          style={{ backgroundColor: activeColorObj.hex }}
        />
        <CurrentIcon className="w-3.5 h-3.5 text-foreground/80" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border bg-popover text-popover-foreground p-3.5 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/70">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: activeColorObj.hex }}
              >
                <Sparkles className="w-2.5 h-2.5" />
              </div>
              <span className="text-xs font-semibold">{t('theme.quickMenuTitle')}</span>
            </div>
            
            {/* Tabs */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab('colors')}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
                  activeTab === 'colors'
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Palette className="w-3 h-3" />
                <span>Cores</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fonts')}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
                  activeTab === 'fonts'
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Type className="w-3 h-3" />
                <span>Tipografia</span>
              </button>
            </div>
          </div>

          {/* Mode Selector (Light / Dark / System) */}
          <div className="mb-3">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {t('theme.modeTitle')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {modeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all duration-150",
                    theme === value
                      ? "bg-primary/10 border-primary/40 text-primary font-semibold shadow-2xs"
                      : "bg-background/80 border-border/70 text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'colors' ? (
            <>
              {/* Accent Color Palettes */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('theme.colorThemeTitle')}
                  </label>
                  <span className="text-[10px] text-primary font-medium">
                    {t(`theme.colors.${colorTheme}`, activeColorObj.name)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_THEMES.map((c) => {
                    const isSelected = colorTheme === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setColorTheme(c.id)}
                        className={cn(
                          "group relative flex items-center justify-center p-1.5 rounded-xl border transition-all duration-150",
                          isSelected
                            ? "border-primary bg-primary/10 scale-105 shadow-xs"
                            : "border-border/60 bg-background/50 hover:bg-muted hover:border-border"
                        )}
                        title={t(`theme.colors.${c.id}`, c.name)}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shadow-xs transition-transform group-hover:scale-110"
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white drop-shadow-sm" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background Style */}
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  {t('theme.bgThemeTitle')}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(isDark
                    ? [
                        { id: 'slate', name: t('theme.backgrounds.slate', 'Dark Slate') },
                        { id: 'oled', name: t('theme.backgrounds.oled', 'Preto OLED') },
                        { id: 'zinc', name: t('theme.backgrounds.zinc', 'Cinza Neutro') },
                        { id: 'tinted', name: t('theme.backgrounds.tinted', 'Acentuado') },
                      ]
                    : [
                        { id: 'white', name: t('theme.backgrounds.white', 'Branco Puro') },
                        { id: 'warm', name: t('theme.backgrounds.warm', 'Papel Quente') },
                        { id: 'slate', name: t('theme.backgrounds.slate', 'Cinza Frio') },
                        { id: 'tinted', name: t('theme.backgrounds.tinted', 'Acentuado') },
                      ]
                  ).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBgTheme(b.id)}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left",
                        bgTheme === b.id
                          ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                          : "bg-background/80 border-border/70 text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="truncate">{b.name}</span>
                      {bgTheme === b.id && <Check className="w-3 h-3 text-primary shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Font Theme Selector */}
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  {t('theme.fontThemeTitle')}
                </label>
                <div className="max-h-44 overflow-y-auto space-y-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {FONT_THEMES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontTheme(f.id)}
                      className={cn(
                        "flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left",
                        fontTheme === f.id
                          ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                          : "bg-background/80 border-border/70 text-foreground hover:bg-muted"
                      )}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{f.desc}</span>
                      </div>
                      {fontTheme === f.id && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Selector */}
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  {t('theme.fontSizeTitle')}
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFontSize(s.id)}
                      className={cn(
                        "flex flex-col items-center justify-center py-1 px-1 rounded-lg border text-xs transition-all",
                        fontSize === s.id
                          ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                          : "bg-background/80 border-border/70 text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="text-xs">{s.name}</span>
                      <span className="text-[9px] text-muted-foreground">{s.scale}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer link to Settings */}
          <div className="pt-2 border-t border-border/70 flex items-center justify-between">
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 py-0.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t('theme.moreSettings')}</span>
            </Link>
            <span className="text-[10px] text-muted-foreground font-mono">
              {fontTheme} • {fontSize}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;


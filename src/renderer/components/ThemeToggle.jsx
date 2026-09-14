import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Laptop, Check, ArrowRight } from 'lucide-react';
import { useTheme, COLOR_THEMES, FONT_THEMES, FONT_SIZES, LETTER_SPACINGS, PARAGRAPH_SPACINGS } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export function ThemeToggle({ className, interfaceMode: propInterfaceMode, onInterfaceModeChange }) {
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
    setFontSize,
    chatWidth,
    setChatWidth,
    textAlign,
    setTextAlign,
    letterSpacing,
    setLetterSpacing,
    paragraphSpacing,
    setParagraphSpacing
  } = useTheme();
  
  const { t, language } = useLanguage();
  const pt = language === 'pt';
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('colors'); // 'colors' | 'fonts' | 'experience'
  const [internalInterfaceMode, setInternalInterfaceMode] = useState(propInterfaceMode || 'user');
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (propInterfaceMode !== undefined) {
      setInternalInterfaceMode(propInterfaceMode);
    } else {
      window.electron?.getSettings?.().then((s) => {
        if (s?.interfaceMode) {
          setInternalInterfaceMode(s.interfaceMode === 'power' ? 'power' : 'user');
        }
      }).catch(() => {});
    }
  }, [propInterfaceMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape' && dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const modeOptions = [
    { value: 'light', label: t('theme.light'), icon: Sun },
    { value: 'dark', label: t('theme.dark'), icon: Moon },
    { value: 'system', label: t('theme.system'), icon: Laptop },
  ];

  const CurrentIcon = theme === 'system' ? Laptop : (resolvedTheme === 'dark' ? Moon : Sun);
  const activeColorObj = COLOR_THEMES.find(c => c.id === colorTheme) || COLOR_THEMES[0];
  const currentInterfaceMode = propInterfaceMode !== undefined ? propInterfaceMode : internalInterfaceMode;

  const handleModeSelect = async (mode) => {
    const validMode = mode === 'power' ? 'power' : 'user';
    setInternalInterfaceMode(validMode);
    if (onInterfaceModeChange) {
      onInterfaceModeChange(validMode);
    } else if (window.electron?.saveSettings) {
      try {
        const currentSettings = await window.electron.getSettings();
        await window.electron.saveSettings({
          ...currentSettings,
          interfaceMode: validMode
        });
      } catch (e) {
        console.error('Failed to save interface mode:', e);
      }
    }
  };

  const focusStyle = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-popover";
  const optionStyle = (selected) => cn("min-w-0 rounded-md px-2 py-2 text-xs transition-colors", focusStyle, selected ? "bg-background text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-background/50");
  const fontFamily = (font) => font?.id === 'system' ? 'system-ui, sans-serif' : `"${font?.name}", ${font?.category === 'Monospace' ? 'monospace' : font?.category === 'Serif' ? 'serif' : 'sans-serif'}`;
  const selectedFont = FONT_THEMES.find(f => f.id === fontTheme) || FONT_THEMES[0];
  const selectedSize = FONT_SIZES.find(f => f.id === fontSize) || FONT_SIZES[1];
  const backgrounds = isDark ? ['slate', 'oled', 'zinc', 'tinted'] : ['white', 'warm', 'slate', 'tinted'];

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button ref={triggerRef} type="button" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-label={t('theme.toggleLabel')} title={t('theme.toggleTitle')} className={cn("flex items-center gap-1.5 px-2.5 h-8 rounded-lg hover:bg-muted text-foreground transition-colors", focusStyle)}>
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: activeColorObj.hex }} />
        <CurrentIcon className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[370px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-80px)] overflow-y-auto rounded-xl border border-border/60 bg-popover text-popover-foreground p-4 shadow-lg z-50">
          <h3 className="text-sm font-semibold mb-3">{t('theme.quickMenuTitle')}</h3>
          <div className="grid grid-cols-3 border-b border-border/50 mb-4" aria-label={pt ? 'Categorias de aparência' : 'Appearance categories'}>
            {[['colors', pt ? 'Cores' : 'Colors'], ['fonts', pt ? 'Tipografia' : 'Typography'], ['experience', pt ? 'Experiência' : 'Experience']].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={activeTab === id} onClick={() => setActiveTab(id)} className={cn("px-1 py-2 text-xs border-b-2 transition-colors", focusStyle, activeTab === id ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>{label}</button>
            ))}
          </div>

          {activeTab === 'colors' && (
            <div className="space-y-4 mb-4">
              <fieldset>
                <legend className="text-xs text-muted-foreground mb-2">{pt ? 'Modo de exibição' : 'Display mode'}</legend>
                <div className="grid grid-cols-3 gap-1 bg-muted/60 rounded-lg p-1">
                  {modeOptions.map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)} className={cn(optionStyle(theme === value), "flex items-center justify-center gap-1.5")}><Icon className="w-3.5 h-3.5" />{label}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-xs text-muted-foreground mb-2">{pt ? 'Cor de destaque' : 'Accent color'}</legend>
                <div className="grid grid-cols-8 gap-1">
                  {COLOR_THEMES.map(c => <button key={c.id} type="button" aria-label={t(`theme.colors.${c.id}`, c.name)} aria-pressed={colorTheme === c.id} title={t(`theme.colors.${c.id}`, c.name)} onClick={() => setColorTheme(c.id)} className={cn("flex items-center justify-center rounded-full aspect-square p-1", focusStyle, colorTheme === c.id && "ring-1 ring-primary")}><span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: c.hex }}>{colorTheme === c.id && <Check className="w-3.5 h-3.5 text-white" />}</span></button>)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t(`theme.colors.${colorTheme}`, activeColorObj.name)}</p>
              </fieldset>
              <label className="block text-xs text-muted-foreground">
                {pt ? 'Fundo' : 'Background'}
                <select value={bgTheme} onChange={e => setBgTheme(e.target.value)} className={cn("mt-2 w-full rounded-lg border border-border/60 bg-popover text-foreground px-2 py-2 text-xs", focusStyle)}>
                  {backgrounds.map(id => <option key={id} value={id}>{t(`theme.backgrounds.${id}`)}</option>)}
                </select>
              </label>
            </div>
          )}

          {activeTab === 'fonts' && (
            <div className="space-y-4 mb-4">
              <fieldset>
                <legend className="text-xs text-muted-foreground mb-2">{pt ? 'Fonte' : 'Font'}</legend>
                <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
                  {FONT_THEMES.map(f => <button key={f.id} type="button" aria-pressed={fontTheme === f.id} onClick={() => setFontTheme(f.id)} style={{ fontFamily: fontFamily(f) }} className={cn("w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-left", focusStyle, fontTheme === f.id ? "bg-muted text-foreground" : "hover:bg-muted/50 text-muted-foreground")}><span>{f.name}</span>{fontTheme === f.id && <Check className="w-3.5 h-3.5 shrink-0" />}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-xs text-muted-foreground mb-2">{pt ? 'Tamanho' : 'Size'}</legend>
                <div className="grid grid-cols-4 gap-1 bg-muted/60 rounded-lg p-1">
                  {FONT_SIZES.map((size, index) => <button key={size.id} type="button" aria-pressed={fontSize === size.id} onClick={() => setFontSize(size.id)} className={optionStyle(fontSize === size.id)}>{(pt ? ['Pequeno', 'Padrão', 'Grande', 'Extra'] : ['Small', 'Default', 'Large', 'Extra'])[index]}</button>)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{selectedSize.scale}</p>
              </fieldset>
              <div className="border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground mb-2">{pt ? 'Prévia' : 'Preview'}</p>
                <p style={{ fontFamily: fontFamily(selectedFont), fontSize: selectedSize.scale }} className={cn("leading-relaxed break-words", textAlign === 'justify' ? "text-justify [text-justify:inter-word]" : "text-left")}>{pt ? 'Um espaço para conversar e criar.' : 'A space to talk and create.'}</p>
              </div>
            </div>
          )}

          {activeTab === 'experience' && (
            <div className="space-y-5 mb-4">
              <fieldset>
                <legend className="text-xs text-muted-foreground mb-2">{pt ? 'Largura do chat' : 'Chat width'}</legend>
                <div className="grid grid-cols-2 gap-1 bg-muted/60 rounded-lg p-1">
                  {[['wide', pt ? 'Centralizado' : 'Centered'], ['full', pt ? 'Amplo' : 'Full width']].map(([id, label]) => <button key={id} type="button" aria-pressed={chatWidth === id} onClick={() => setChatWidth(id)} className={optionStyle(chatWidth === id)}>{label}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-xs text-muted-foreground mb-2">{t('theme.textAlignTitle') || (pt ? 'Alinhamento do texto' : 'Text alignment')}</legend>
                <div className="grid grid-cols-2 gap-1 bg-muted/60 rounded-lg p-1">
                  {[['left', t('theme.textAlignLeft') || (pt ? 'À Esquerda' : 'Left')], ['justify', t('theme.textAlignJustify') || (pt ? 'Justificado' : 'Justified')]].map(([id, label]) => (
                    <button key={id} type="button" aria-pressed={textAlign === id} onClick={() => setTextAlign(id)} className={optionStyle(textAlign === id)}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-xs text-muted-foreground mb-2">{pt ? 'Espaçamento entre letras' : 'Letter spacing'}</legend>
                <div className="grid grid-cols-3 gap-1 bg-muted/60 rounded-lg p-1">
                  {LETTER_SPACINGS.map((option, index) => (
                    <button key={option.id} type="button" aria-pressed={letterSpacing === option.id} onClick={() => setLetterSpacing(option.id)} className={optionStyle(letterSpacing === option.id)}>
                      {(pt ? ['Padrão', 'Suave', 'Amplo'] : ['Default', 'Relaxed', 'Wide'])[index]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{pt ? 'Aplicado ao texto das conversas; código mantém o espaçamento original.' : 'Applies to conversation text; code keeps its original spacing.'}</p>
                <p className="mt-2 text-sm leading-relaxed break-words" style={{ letterSpacing: LETTER_SPACINGS.find(option => option.id === letterSpacing)?.value }}>
                  {pt ? 'Um espaço para conversar e criar.' : 'A space to talk and create.'}
                </p>
              </fieldset>
              <fieldset>
                <legend className="text-xs text-muted-foreground mb-2">{pt ? 'Espaçamento entre parágrafos' : 'Paragraph spacing'}</legend>
                <div className="grid grid-cols-3 gap-1 bg-muted/60 rounded-lg p-1">
                  {PARAGRAPH_SPACINGS.map((option, index) => (
                    <button key={option.id} type="button" aria-pressed={paragraphSpacing === option.id} onClick={() => setParagraphSpacing(option.id)} className={optionStyle(paragraphSpacing === option.id)}>
                      {(pt ? ['Padrão', 'Suave', 'Amplo'] : ['Default', 'Relaxed', 'Wide'])[index]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{pt ? 'Prévia do espaçamento nas conversas' : 'Preview of conversation spacing'}</p>
                <div className="mt-2 text-sm leading-relaxed break-words" style={{ letterSpacing: LETTER_SPACINGS.find(option => option.id === letterSpacing)?.value }}>
                  <p style={{ marginBottom: PARAGRAPH_SPACINGS.find(option => option.id === paragraphSpacing)?.value }}>{pt ? 'Um espaço para conversar e criar.' : 'A space to talk and create.'}</p>
                  <p>{pt ? 'Mais espaço para uma leitura confortável.' : 'More space for comfortable reading.'}</p>
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-xs text-muted-foreground mb-2">{pt ? 'Modo da interface' : 'Interface mode'}</legend>
                <div className="grid grid-cols-2 gap-1 bg-muted/60 rounded-lg p-1">
                  {[['user', pt ? 'Essencial' : 'Essential'], ['power', pt ? 'Avançado' : 'Advanced']].map(([id, label]) => <button key={id} type="button" aria-pressed={currentInterfaceMode === id} onClick={() => handleModeSelect(id)} className={optionStyle(currentInterfaceMode === id)}>{label}</button>)}
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{currentInterfaceMode === 'power' ? (pt ? 'Inclui modelos, agentes, ferramentas e métricas.' : 'Includes models, agents, tools and metrics.') : (pt ? 'Conversa, anexos, voz e pesquisa.' : 'Chat, attachments, voice and search.')}</p>
              </fieldset>
            </div>
          )}

          <div className="pt-3 border-t border-border/50">
            <Link to="/settings" onClick={() => setIsOpen(false)} className={cn("inline-flex items-center gap-2 rounded text-xs text-muted-foreground hover:text-foreground", focusStyle)}>{pt ? 'Todas as configurações' : 'All settings'}<ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;

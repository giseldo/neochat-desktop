import React, { createContext, useContext, useEffect, useState } from 'react';

export const COLOR_THEMES = [
  { id: 'orange', name: 'Groq Orange', hex: '#F55036', ringHex: '#F55036', desc: 'Laranja vibrante clássico' },
  { id: 'blue', name: 'Azul Oceano', hex: '#2563EB', ringHex: '#3B82F6', desc: 'Azul cobalto moderno e focado' },
  { id: 'green', name: 'Verde Esmeralda', hex: '#10B981', ringHex: '#059669', desc: 'Verde natural equilibrado' },
  { id: 'purple', name: 'Roxo Imperial', hex: '#7C3AED', ringHex: '#8B5CF6', desc: 'Púrpura criativo e elegante' },
  { id: 'rose', name: 'Rosa Framboesa', hex: '#E11D48', ringHex: '#F43F5E', desc: 'Rosa moderno e expressivo' },
  { id: 'amber', name: 'Âmbar Solar', hex: '#D97706', ringHex: '#F59E0B', desc: 'Dourado caloroso e amigável' },
  { id: 'teal', name: 'Turquesa Ciano', hex: '#0D9488', ringHex: '#14B8A6', desc: 'Ciano elétrico e tecnológico' },
  { id: 'slate', name: 'Grafite Minimalista', hex: '#475569', ringHex: '#64748B', desc: 'Monocromático sóbrio e limpo' },
];

export const BG_THEMES = [
  { id: 'white', name: 'Branco Puro', desc: 'Fundo branco limpo com alto contraste', forDark: false },
  { id: 'warm', name: 'Papel Quente', desc: 'Tom bege acolhedor original', forDark: false },
  { id: 'slate', name: 'Cinza Suave / Escuro Slate', desc: 'Tons neutros de ardósia balanceados', forDark: true },
  { id: 'oled', name: 'Preto OLED', desc: 'Preto absoluto com economia de energia', forDark: true },
  { id: 'zinc', name: 'Cinza Neutro', desc: 'Carvão refinado e discreto', forDark: true },
  { id: 'tinted', name: 'Acentuado (Tinted)', desc: 'Leve reflexo suave da cor primária', forDark: true },
];

export const FONT_THEMES = [
  { id: 'montserrat', name: 'Montserrat', category: 'Sans-Serif', desc: 'Geométrica, moderna e dinâmica' },
  { id: 'inter', name: 'Inter', category: 'Sans-Serif', desc: 'Ultra-limpa, legível e otimizada para telas' },
  { id: 'roboto', name: 'Roboto', category: 'Sans-Serif', desc: 'Neutra, clara e equilibrada' },
  { id: 'plus-jakarta', name: 'Plus Jakarta Sans', category: 'Sans-Serif', desc: 'Sofisticada, contemporânea e tech' },
  { id: 'source-sans', name: 'Source Sans 3', category: 'Sans-Serif', desc: 'Excelente fluidez de leitura e clareza' },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', category: 'Monospace', desc: 'Fonte de código com legibilidade extrema' },
  { id: 'fira-code', name: 'Fira Code', category: 'Monospace', desc: 'Estilo dev com ligaduras de programação' },
  { id: 'playfair', name: 'Playfair Display', category: 'Serif', desc: 'Editorial, elegante e clássica' },
  { id: 'system', name: 'Sistema Operacional', category: 'System', desc: 'Fonte nativa do seu sistema (Segoe UI / SF Pro)' },
];

export const FONT_SIZES = [
  { id: 'sm', name: 'Pequeno', scale: '14px' },
  { id: 'md', name: 'Padrão', scale: '16px' },
  { id: 'lg', name: 'Grande', scale: '17.5px' },
  { id: 'xl', name: 'Extra Grande', scale: '19px' },
];

export const LETTER_SPACINGS = [
  { id: 'normal', value: 'normal' },
  { id: 'relaxed', value: '0.025em' },
  { id: 'wide', value: '0.05em' },
];

export const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => {},
  colorTheme: 'blue',
  setColorTheme: () => {},
  bgTheme: 'white',
  setBgTheme: () => {},
  fontTheme: 'montserrat',
  setFontTheme: () => {},
  fontSize: 'md',
  setFontSize: () => {},
  chatWidth: 'wide',
  setChatWidth: () => {},
  textAlign: 'left',
  setTextAlign: () => {},
  letterSpacing: 'normal',
  setLetterSpacing: () => {},
  resolvedTheme: 'light',
  isDark: false,
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'system';
    } catch {
      return 'system';
    }
  });

  const [colorTheme, setColorThemeState] = useState(() => {
    try {
      return localStorage.getItem('neochat_color_theme') || 'blue';
    } catch {
      return 'blue';
    }
  });

  const [lightBgTheme, setLightBgThemeState] = useState(() => {
    try {
      const savedLight = localStorage.getItem('neochat_light_bg_theme');
      if (savedLight) return savedLight;
      const legacyBg = localStorage.getItem('neochat_bg_theme');
      if (legacyBg && ['warm', 'white', 'slate', 'tinted'].includes(legacyBg)) return legacyBg;
      return 'white';
    } catch {
      return 'white';
    }
  });

  const [darkBgTheme, setDarkBgThemeState] = useState(() => {
    try {
      const savedDark = localStorage.getItem('neochat_dark_bg_theme');
      if (savedDark) return savedDark;
      const legacyBg = localStorage.getItem('neochat_bg_theme');
      if (legacyBg && ['slate', 'oled', 'zinc', 'tinted'].includes(legacyBg)) return legacyBg;
      return 'slate';
    } catch {
      return 'slate';
    }
  });

  const [fontTheme, setFontThemeState] = useState(() => {
    try {
      return localStorage.getItem('neochat_font_theme') || 'montserrat';
    } catch {
      return 'montserrat';
    }
  });

  const [fontSize, setFontSizeState] = useState(() => {
    try {
      return localStorage.getItem('neochat_font_size') || 'md';
    } catch {
      return 'md';
    }
  });

  const [chatWidth, setChatWidthState] = useState(() => {
    try {
      return localStorage.getItem('neochat_chat_width') || 'wide';
    } catch {
      return 'wide';
    }
  });

  const [textAlign, setTextAlignState] = useState(() => {
    try {
      return localStorage.getItem('neochat_text_align') || 'left';
    } catch {
      return 'left';
    }
  });

  const [letterSpacing, setLetterSpacingState] = useState(() => {
    try {
      const saved = localStorage.getItem('neochat_letter_spacing');
      return LETTER_SPACINGS.some(option => option.id === saved) ? saved : 'normal';
    } catch {
      return 'normal';
    }
  });

  useEffect(() => {
    const spacing = LETTER_SPACINGS.find(option => option.id === letterSpacing);
    document.documentElement.style.setProperty('--chat-letter-spacing', spacing?.value || 'normal');
  }, [letterSpacing]);

  const setLetterSpacing = (value) => {
    const valid = LETTER_SPACINGS.some(option => option.id === value) ? value : 'normal';
    setLetterSpacingState(valid);
    try {
      localStorage.setItem('neochat_letter_spacing', valid);
    } catch (error) {
      console.error('Failed to save letter spacing:', error);
    }
  };

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;
  const isDark = resolvedTheme === 'dark';
  const effectiveBgTheme = isDark ? darkBgTheme : lightBgTheme;

  // Apply all theme attributes directly to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Dark mode class
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Data attributes for colors, background, font, font-size, chat-width and text-align
    root.setAttribute('data-color-theme', colorTheme);
    root.setAttribute('data-bg-theme', effectiveBgTheme);
    root.setAttribute('data-font', fontTheme);
    root.setAttribute('data-font-size', fontSize);
    root.setAttribute('data-chat-width', chatWidth);
    root.setAttribute('data-text-align', textAlign);
  }, [isDark, colorTheme, effectiveBgTheme, fontTheme, fontSize, chatWidth, textAlign]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }
  };

  const setColorTheme = (newColorTheme) => {
    setColorThemeState(newColorTheme);
    try {
      localStorage.setItem('neochat_color_theme', newColorTheme);
    } catch (e) {
      console.error('Failed to save color theme to localStorage:', e);
    }
  };

  const setBgTheme = (newBgTheme) => {
    if (isDark) {
      setDarkBgThemeState(newBgTheme);
      try {
        localStorage.setItem('neochat_dark_bg_theme', newBgTheme);
        localStorage.setItem('neochat_bg_theme', newBgTheme);
      } catch (e) {
        console.error('Failed to save dark bg theme to localStorage:', e);
      }
    } else {
      setLightBgThemeState(newBgTheme);
      try {
        localStorage.setItem('neochat_light_bg_theme', newBgTheme);
        localStorage.setItem('neochat_bg_theme', newBgTheme);
      } catch (e) {
        console.error('Failed to save light bg theme to localStorage:', e);
      }
    }
  };

  const setFontTheme = (newFontTheme) => {
    setFontThemeState(newFontTheme);
    try {
      localStorage.setItem('neochat_font_theme', newFontTheme);
    } catch (e) {
      console.error('Failed to save font theme to localStorage:', e);
    }
  };

  const setFontSize = (newFontSize) => {
    setFontSizeState(newFontSize);
    try {
      localStorage.setItem('neochat_font_size', newFontSize);
    } catch (e) {
      console.error('Failed to save font size to localStorage:', e);
    }
  };

  const setChatWidth = (newChatWidth) => {
    const validWidth = newChatWidth === 'full' ? 'full' : 'wide';
    setChatWidthState(validWidth);
    try {
      localStorage.setItem('neochat_chat_width', validWidth);
    } catch (e) {
      console.error('Failed to save chat width to localStorage:', e);
    }
    if (window.electron?.saveSettings) {
      window.electron.getSettings().then(current => {
        window.electron.saveSettings({ ...current, chatWidth: validWidth }).catch(() => {});
      }).catch(() => {});
    }
  };

  const setTextAlign = (newTextAlign) => {
    const validAlign = newTextAlign === 'justify' ? 'justify' : 'left';
    setTextAlignState(validAlign);
    try {
      localStorage.setItem('neochat_text_align', validAlign);
    } catch (e) {
      console.error('Failed to save text alignment to localStorage:', e);
    }
    if (window.electron?.saveSettings) {
      window.electron.getSettings().then(current => {
        window.electron.saveSettings({ ...current, textAlign: validAlign }).catch(() => {});
      }).catch(() => {});
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      colorTheme,
      setColorTheme,
      bgTheme: effectiveBgTheme,
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
      resolvedTheme,
      isDark,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

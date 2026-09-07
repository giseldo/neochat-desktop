import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations } from '../i18n/translations';

export const LanguageContext = createContext({
  language: 'pt',
  setLanguage: () => {},
  t: (path, params, fallback) => '',
  isPt: true,
  isEn: false,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('language');
      if (saved === 'pt' || saved === 'en') return saved;
      // If browser language is english, fallback to en, else pt
      if (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('en')) {
        return 'en';
      }
    } catch (e) {
      console.error('Error reading language from localStorage:', e);
    }
    return 'pt';
  });

  // Sync with Electron settings on mount
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        if (window.electron && window.electron.getSettings) {
          const settings = await window.electron.getSettings();
          if (settings && (settings.language === 'pt' || settings.language === 'en')) {
            if (settings.language !== language) {
              setLanguageState(settings.language);
              localStorage.setItem('language', settings.language);
            }
          }
        }
      } catch (err) {
        console.error('Error syncing language with settings:', err);
      }
    };
    loadSavedLanguage();
  }, []);

  const setLanguage = useCallback(async (newLang) => {
    if (newLang !== 'pt' && newLang !== 'en') return;
    setLanguageState(newLang);
    try {
      localStorage.setItem('language', newLang);
      if (window.electron && window.electron.getSettings && window.electron.saveSettings) {
        const settings = await window.electron.getSettings();
        if (settings.language !== newLang) {
          await window.electron.saveSettings({ ...settings, language: newLang });
        }
      }
    } catch (e) {
      console.error('Failed to persist language:', e);
    }
  }, []);

  /**
   * Helper function to translate a key with optional interpolation params
   * Usage: t('sidebar.newChat') or t('chat.attachedFiles', { count: 3 })
   */
  const t = useCallback((path, params = {}, fallback = '') => {
    if (!path) return fallback || '';

    let actualParams = params;
    let actualFallback = fallback;
    if (typeof params === 'string') {
      actualFallback = params;
      actualParams = {};
    }

    const keys = path.split('.');
    let current = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        current = null;
        break;
      }
    }

    // Fallback to PT or EN if missing
    if (current === null || current === undefined) {
      const fallbackLang = language === 'pt' ? 'en' : 'pt';
      let fbCurrent = translations[fallbackLang];
      for (const key of keys) {
        if (fbCurrent && typeof fbCurrent === 'object' && key in fbCurrent) {
          fbCurrent = fbCurrent[key];
        } else {
          fbCurrent = null;
          break;
        }
      }
      if (fbCurrent !== null && fbCurrent !== undefined) {
        current = fbCurrent;
      } else {
        current = actualFallback || '';
      }
    }

    if (typeof current !== 'string') {
      return actualFallback || '';
    }

    // Interpolate params (e.g. {count}, {name}, etc.)
    let result = current;
    if (actualParams && typeof actualParams === 'object') {
      Object.entries(actualParams).forEach(([paramKey, paramVal]) => {
        const regex = new RegExp(`\\{${paramKey}\\}`, 'g');
        result = result.replace(regex, paramVal !== undefined && paramVal !== null ? String(paramVal) : '');
      });
    }

    return result;
  }, [language]);

  const isPt = language === 'pt';
  const isEn = language === 'en';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isPt, isEn }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export const useI18n = () => useContext(LanguageContext);
export default LanguageContext;

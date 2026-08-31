/* eslint-disable react/no-unknown-property */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Smartphone, 
  Monitor, 
  ExternalLink, 
  Plus, 
  X, 
  Maximize2, 
  Minimize2, 
  Lock, 
  AlertCircle,
  Sparkles,
  Code2,
  Square
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function BrowserPanel({
  onClose,
  isMaximized,
  onToggleMaximize,
  initialUrl = 'https://www.google.com'
}) {
  const { t } = useLanguage();
  const isElectron = typeof window !== 'undefined' && Boolean(window.electron);

  const normalizeUrl = (raw) => {
    if (!raw || typeof raw !== 'string') return 'https://www.google.com';
    let trimmed = raw.trim();
    if (/^\d{2,5}$/.test(trimmed)) {
      return `http://localhost:${trimmed}`;
    }
    if (trimmed.startsWith('localhost:')) {
      return `http://${trimmed}`;
    }
    if (trimmed === 'localhost') {
      return 'http://localhost:3000';
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('file://') && !trimmed.startsWith('about:')) {
      if (trimmed.includes('.') || trimmed.includes(':')) {
        return `https://${trimmed}`;
      }
      return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    }
    return trimmed;
  };

  const [tabs, setTabs] = useState(() => [
    { 
      id: 'tab-1', 
      url: normalizeUrl(initialUrl), 
      title: 'Navegador',
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
      loadError: null,
      isDevToolsOpen: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [inputUrl, setInputUrl] = useState(() => normalizeUrl(initialUrl));
  const [isMobileView, setIsMobileView] = useState(false);

  const webviewRefs = useRef(new Map());

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || {
    id: 'tab-1',
    url: 'https://www.google.com',
    title: 'Navegador',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    loadError: null
  };

  // Sync address input when active tab changes
  useEffect(() => {
    if (activeTab?.url) {
      setInputUrl(activeTab.url);
    }
  }, [activeTabId]);

  const updateTabState = useCallback((tabId, updates) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, ...updates };
      }
      return tab;
    }));
  }, []);

  const handleNavigate = (urlToNav, tabId = activeTabId) => {
    const targetUrl = normalizeUrl(urlToNav || inputUrl);
    setInputUrl(targetUrl);
    updateTabState(tabId, { 
      url: targetUrl, 
      loadError: null, 
      isLoading: true 
    });

    const webview = webviewRefs.current.get(tabId);
    if (webview) {
      if (typeof webview.loadURL === 'function') {
        webview.loadURL(targetUrl);
      } else {
        webview.src = targetUrl;
      }
    }
  };

  const handleCreateTab = (url = 'https://www.google.com') => {
    const newId = `tab-${Date.now()}`;
    const cleanUrl = normalizeUrl(url);
    const newTab = { 
      id: newId, 
      url: cleanUrl, 
      title: 'Nova Aba',
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
      loadError: null,
      isDevToolsOpen: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setInputUrl(cleanUrl);
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    
    // Close DevTools if open before destroying tab
    const webview = webviewRefs.current.get(tabId);
    if (webview && typeof webview.closeDevTools === 'function') {
      try { webview.closeDevTools(); } catch (_) {}
    }
    webviewRefs.current.delete(tabId);

    const nextTabs = tabs.filter(t => t.id !== tabId);
    setTabs(nextTabs);

    if (activeTabId === tabId) {
      const fallbackTab = nextTabs[0];
      setActiveTabId(fallbackTab.id);
      setInputUrl(fallbackTab.url);
    }
  };

  const handleBack = (tabId = activeTabId) => {
    const webview = webviewRefs.current.get(tabId);
    if (webview) {
      if (typeof webview.goBack === 'function' && typeof webview.canGoBack === 'function' && webview.canGoBack()) {
        webview.goBack();
      } else if (webview.contentWindow) {
        try { webview.contentWindow.history.back(); } catch (_) {}
      }
    }
  };

  const handleForward = (tabId = activeTabId) => {
    const webview = webviewRefs.current.get(tabId);
    if (webview) {
      if (typeof webview.goForward === 'function' && typeof webview.canGoForward === 'function' && webview.canGoForward()) {
        webview.goForward();
      } else if (webview.contentWindow) {
        try { webview.contentWindow.history.forward(); } catch (_) {}
      }
    }
  };

  const handleReloadOrStop = (tabId = activeTabId) => {
    const current = tabs.find(t => t.id === tabId);
    const webview = webviewRefs.current.get(tabId);
    if (!webview) return;

    if (current?.isLoading) {
      if (typeof webview.stop === 'function') {
        webview.stop();
      }
      updateTabState(tabId, { isLoading: false });
    } else {
      updateTabState(tabId, { isLoading: true, loadError: null });
      if (typeof webview.reload === 'function') {
        webview.reload();
      } else if (typeof webview.loadURL === 'function') {
        webview.loadURL(current.url);
      } else {
        webview.src = current.url;
      }
    }
  };

  const handleToggleDevTools = (tabId = activeTabId) => {
    const webview = webviewRefs.current.get(tabId);
    if (webview && typeof webview.openDevTools === 'function') {
      try {
        if (typeof webview.isDevToolsOpened === 'function' && webview.isDevToolsOpened()) {
          webview.closeDevTools();
          updateTabState(tabId, { isDevToolsOpen: false });
        } else {
          webview.openDevTools();
          updateTabState(tabId, { isDevToolsOpen: true });
        }
      } catch (err) {
        console.warn('DevTools toggle warning:', err);
      }
    }
  };

  const handleOpenExternal = (url = activeTab?.url) => {
    const cleanUrl = normalizeUrl(url);
    if (window.electron?.browser?.openExternal) {
      window.electron.browser.openExternal(cleanUrl);
    } else {
      window.open(cleanUrl, '_blank');
    }
  };

  const handleOpenPopout = (url = activeTab?.url) => {
    const cleanUrl = normalizeUrl(url);
    if (window.electron?.browser?.openPopout) {
      window.electron.browser.openPopout(cleanUrl);
    } else {
      window.open(cleanUrl, '_blank', 'width=1000,height=700');
    }
  };

  // Attach Electron Webview events to DOM elements
  useEffect(() => {
    const cleanups = [];

    tabs.forEach(tab => {
      const el = webviewRefs.current.get(tab.id);
      if (!el) return;

      const handleStartLoading = () => {
        updateTabState(tab.id, { isLoading: true, loadError: null });
      };

      const handleStopLoading = () => {
        const canBack = typeof el.canGoBack === 'function' ? el.canGoBack() : false;
        const canFwd = typeof el.canGoForward === 'function' ? el.canGoForward() : false;
        const curUrl = typeof el.getURL === 'function' ? el.getURL() : '';
        const curTitle = typeof el.getTitle === 'function' ? el.getTitle() : '';

        updateTabState(tab.id, {
          isLoading: false,
          canGoBack: canBack,
          canGoForward: canFwd,
          ...(curUrl && !curUrl.startsWith('about:blank') ? { url: curUrl } : {}),
          ...(curTitle ? { title: curTitle } : {})
        });
      };

      const handleDidNavigate = (e) => {
        const navUrl = e.url || (typeof el.getURL === 'function' ? el.getURL() : '');
        if (navUrl && !navUrl.startsWith('about:blank')) {
          updateTabState(tab.id, {
            url: navUrl,
            canGoBack: typeof el.canGoBack === 'function' ? el.canGoBack() : false,
            canGoForward: typeof el.canGoForward === 'function' ? el.canGoForward() : false
          });
          if (tab.id === activeTabId) {
            setInputUrl(navUrl);
          }
        }
      };

      const handleDidNavigateInPage = (e) => {
        if (e.isMainFrame && e.url) {
          updateTabState(tab.id, {
            url: e.url,
            canGoBack: typeof el.canGoBack === 'function' ? el.canGoBack() : false,
            canGoForward: typeof el.canGoForward === 'function' ? el.canGoForward() : false
          });
          if (tab.id === activeTabId) {
            setInputUrl(e.url);
          }
        }
      };

      const handlePageTitleUpdated = (e) => {
        if (e.title) {
          updateTabState(tab.id, { title: e.title });
        }
      };

      const handleFailLoad = (e) => {
        // Error code -3 is ERR_ABORTED (normal during user navigation or fast redirect)
        if (e.errorCode && e.errorCode !== -3) {
          updateTabState(tab.id, {
            isLoading: false,
            loadError: {
              code: e.errorCode,
              description: e.errorDescription || 'Falha ao carregar a página.',
              url: e.validatedURL || tab.url
            }
          });
        }
      };

      const handleNewWindow = (e) => {
        if (e.url) {
          handleCreateTab(e.url);
        }
      };

      const handleDomReady = () => {
        const canBack = typeof el.canGoBack === 'function' ? el.canGoBack() : false;
        const canFwd = typeof el.canGoForward === 'function' ? el.canGoForward() : false;
        const curTitle = typeof el.getTitle === 'function' ? el.getTitle() : '';

        updateTabState(tab.id, {
          canGoBack: canBack,
          canGoForward: canFwd,
          ...(curTitle ? { title: curTitle } : {})
        });
      };

      el.addEventListener('did-start-loading', handleStartLoading);
      el.addEventListener('did-stop-loading', handleStopLoading);
      el.addEventListener('did-navigate', handleDidNavigate);
      el.addEventListener('did-navigate-in-page', handleDidNavigateInPage);
      el.addEventListener('page-title-updated', handlePageTitleUpdated);
      el.addEventListener('did-fail-load', handleFailLoad);
      el.addEventListener('new-window', handleNewWindow);
      el.addEventListener('dom-ready', handleDomReady);

      cleanups.push(() => {
        el.removeEventListener('did-start-loading', handleStartLoading);
        el.removeEventListener('did-stop-loading', handleStopLoading);
        el.removeEventListener('did-navigate', handleDidNavigate);
        el.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
        el.removeEventListener('page-title-updated', handlePageTitleUpdated);
        el.removeEventListener('did-fail-load', handleFailLoad);
        el.removeEventListener('new-window', handleNewWindow);
        el.removeEventListener('dom-ready', handleDomReady);
      });
    });

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [tabs.map(t => t.id).join(','), activeTabId, updateTabState]);

  const isSecure = activeTab?.url ? activeTab.url.startsWith('https://') : false;

  return (
    <div className={cn(
      "flex flex-col bg-card text-card-foreground border border-border/80 shadow-2xl rounded-2xl overflow-hidden transition-all duration-200",
      isMaximized ? "fixed inset-4 z-50 rounded-2xl" : "w-full h-full min-h-[420px]"
    )}>
      {/* Top Header Bar with Tabs */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/60 border-b border-border select-none">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[70%]">
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-muted-foreground shrink-0">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>Navegador</span>
          </div>

          <div className="h-4 w-px bg-border mx-1 shrink-0" />

          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setInputUrl(tab.url);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border shrink-0",
                  isActive
                    ? "bg-background text-foreground border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                )}
              >
                {tab.isLoading ? (
                  <RotateCw className="w-3 h-3 text-primary animate-spin shrink-0" />
                ) : (
                  <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                )}
                <span className="truncate max-w-[120px]">{tab.title || tab.url}</span>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="opacity-60 hover:opacity-100 hover:text-destructive rounded p-0.5 ml-0.5 transition-colors"
                    title="Fechar Aba"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => handleCreateTab()}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title="Nova Aba"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-1">
          {/* DevTools Toggle Button (Electron only) */}
          {isElectron && (
            <button
              type="button"
              onClick={() => handleToggleDevTools()}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeTab.isDevToolsOpen
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title={activeTab.isDevToolsOpen ? "Fechar DevTools" : "Inspecionar Elementos (DevTools)"}
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenPopout()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Abrir em Janela Externa"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {onToggleMaximize && (
            <button
              type="button"
              onClick={onToggleMaximize}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={isMaximized ? "Restaurar" : "Maximizar"}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-background border-b border-border/80 text-xs">
        <button
          type="button"
          onClick={() => handleBack()}
          disabled={!activeTab.canGoBack}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            activeTab.canGoBack 
              ? "text-foreground hover:bg-muted cursor-pointer" 
              : "text-muted-foreground/40 cursor-not-allowed"
          )}
          title="Voltar"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleForward()}
          disabled={!activeTab.canGoForward}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            activeTab.canGoForward 
              ? "text-foreground hover:bg-muted cursor-pointer" 
              : "text-muted-foreground/40 cursor-not-allowed"
          )}
          title="Avançar"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleReloadOrStop()}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title={activeTab.isLoading ? "Parar" : "Recarregar"}
        >
          {activeTab.isLoading ? (
            <Square className="w-3.5 h-3.5 text-destructive" />
          ) : (
            <RotateCw className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Address & Search Bar */}
        <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/70 focus-within:border-primary focus-within:bg-background transition-all">
          {isSecure ? (
            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Conexão Segura (HTTPS)" />
          ) : (
            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" title="HTTP / Conexão Local" />
          )}

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleNavigate();
              }
            }}
            placeholder="Digite uma URL ou termo de pesquisa (ex: google.com, localhost:3000)..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-hidden font-mono"
          />

          <Button
            type="button"
            size="sm"
            onClick={() => handleNavigate()}
            className="h-5 px-2 text-[10.5px] rounded-md shadow-2xs cursor-pointer"
          >
            Ir
          </Button>
        </div>

        {/* Viewport Mode Toggle (Desktop vs Mobile 390px) */}
        <button
          type="button"
          onClick={() => setIsMobileView(!isMobileView)}
          className={cn(
            "p-1.5 rounded-lg transition-colors border cursor-pointer",
            isMobileView
              ? "bg-primary/15 text-primary border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
          )}
          title={isMobileView ? "Mudar para Visualização Desktop" : "Mudar para Visualização Mobile (390px)"}
        >
          {isMobileView ? <Smartphone className="w-3.5 h-3.5 text-primary" /> : <Monitor className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => handleOpenExternal()}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Abrir no Navegador Padrão do Sistema"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dev & Top Sites Quick-Launch Shortcuts Bar */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 border-b border-border/40 text-[11px] overflow-x-auto no-scrollbar select-none">
        <span className="text-muted-foreground font-medium flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Atalhos:
        </span>
        {[
          { label: 'Google', url: 'https://www.google.com' },
          { label: 'GitHub', url: 'https://github.com' },
          { label: 'localhost:5173', url: 'http://localhost:5173' },
          { label: 'localhost:3000', url: 'http://localhost:3000' },
          { label: 'localhost:8080', url: 'http://localhost:8080' },
          { label: 'localhost:8000', url: 'http://localhost:8000' }
        ].map(site => (
          <button
            key={site.label}
            type="button"
            onClick={() => handleNavigate(site.url)}
            className="px-2 py-0.5 rounded-md bg-muted hover:bg-accent text-foreground/80 hover:text-foreground transition-colors shrink-0 cursor-pointer font-mono text-[10.5px]"
          >
            {site.label}
          </button>
        ))}
      </div>

      {/* Browser Viewport Area */}
      <div className={cn(
        "flex-1 bg-slate-900/5 dark:bg-black/20 overflow-hidden relative flex flex-col items-center justify-center p-2",
        isMobileView && "p-4"
      )}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={cn(
                "w-full h-full flex flex-col items-center justify-center relative",
                isActive ? "flex flex-1" : "hidden"
              )}
            >
              {tab.loadError ? (
                <div className="flex flex-col items-center justify-center p-6 text-center max-w-md bg-card border border-border rounded-2xl shadow-xl m-auto">
                  <AlertCircle className="w-10 h-10 text-destructive mb-3" />
                  <h4 className="text-sm font-semibold text-foreground">Não foi possível carregar a página</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tab.loadError.description || 'Ocorreu um erro ao carregar a URL informada.'}
                  </p>
                  <p className="text-[11px] font-mono text-primary/90 mt-2 break-all bg-muted px-2 py-1 rounded-md">
                    {tab.url}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <Button size="sm" onClick={() => handleReloadOrStop(tab.id)}>
                      Tentar novamente
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenExternal(tab.url)}>
                      Abrir no navegador externo
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "w-full h-full transition-all duration-300 flex items-center justify-center",
                  isMobileView && "max-w-[390px] h-[720px] max-h-full rounded-3xl border-8 border-slate-800 dark:border-slate-700 shadow-2xl overflow-hidden bg-background"
                )}>
                  {isElectron ? (
                    <webview
                      ref={(el) => {
                        if (el) {
                          webviewRefs.current.set(tab.id, el);
                        } else {
                          webviewRefs.current.delete(tab.id);
                        }
                      }}
                      src={tab.url}
                      className="w-full h-full border-none bg-background flex-1"
                      allowpopups="true"
                      webpreferences="contextIsolation=yes, nodeIntegration=no, sandbox=yes"
                    />
                  ) : (
                    <iframe
                      ref={(el) => {
                        if (el) {
                          webviewRefs.current.set(tab.id, el);
                        } else {
                          webviewRefs.current.delete(tab.id);
                        }
                      }}
                      src={tab.url}
                      title="Neo Browser View"
                      className="w-full h-full border-none bg-background flex-1"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

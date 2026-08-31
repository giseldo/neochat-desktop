import React, { useState, useRef, useCallback } from 'react';
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
  Unlock, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function BrowserPanel({
  onClose,
  isMaximized,
  onToggleMaximize,
  initialUrl = 'http://localhost:5173'
}) {
  const { t } = useLanguage();
  const [tabs, setTabs] = useState([
    { id: 'tab-1', url: initialUrl, title: 'Local Dev' }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const iframeRef = useRef(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const normalizeUrl = (raw) => {
    if (!raw || typeof raw !== 'string') return 'http://localhost:5173';
    let trimmed = raw.trim();
    if (/^\d{2,5}$/.test(trimmed)) {
      return `http://localhost:${trimmed}`;
    }
    if (trimmed.startsWith('localhost:')) {
      return `http://${trimmed}`;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('file://')) {
      if (trimmed.includes('.') || trimmed.includes(':')) {
        return `https://${trimmed}`;
      }
      return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    }
    return trimmed;
  };

  const handleNavigate = (urlToNav) => {
    const finalUrl = normalizeUrl(urlToNav || inputUrl);
    setInputUrl(finalUrl);
    setLoadError(null);
    setIsLoading(true);

    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return { ...tab, url: finalUrl, title: finalUrl.replace(/^https?:\/\//, '').split('/')[0] };
      }
      return tab;
    }));
  };

  const handleCreateTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab = { id: newId, url: 'http://localhost:5173', title: 'Nova Aba' };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setInputUrl(newTab.url);
    setLoadError(null);
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter(t => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[0].id);
      setInputUrl(nextTabs[0].url);
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    setLoadError(null);
    if (iframeRef.current) {
      iframeRef.current.src = activeTab.url;
    }
  };

  const handleOpenExternal = () => {
    if (window.electron?.browser?.openExternal) {
      window.electron.browser.openExternal(activeTab.url);
    } else {
      window.open(activeTab.url, '_blank');
    }
  };

  const handleOpenPopout = () => {
    if (window.electron?.browser?.openPopout) {
      window.electron.browser.openPopout(activeTab.url);
    } else {
      window.open(activeTab.url, '_blank', 'width=1000,height=700');
    }
  };

  const isSecure = activeTab.url.startsWith('https://');

  return (
    <div className={cn(
      "flex flex-col bg-card text-card-foreground border border-border/80 shadow-2xl rounded-2xl overflow-hidden transition-all duration-200",
      isMaximized ? "fixed inset-4 z-50 rounded-2xl" : "w-full h-full min-h-[420px]"
    )}>
      {/* Top Header Bar with Tabs */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/60 border-b border-border select-none">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[70%]">
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-muted-foreground">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>Navegador</span>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setInputUrl(tab.url);
                  setLoadError(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border",
                  isActive
                    ? "bg-background text-foreground border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                )}
              >
                <span className="truncate max-w-[110px]">{tab.title || tab.url}</span>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="opacity-60 hover:opacity-100 hover:text-destructive rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleCreateTab}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Nova Aba"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleOpenPopout}
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
          onClick={() => {
            try { iframeRef.current?.contentWindow?.history.back(); } catch (_) {}
          }}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Voltar"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            try { iframeRef.current?.contentWindow?.history.forward(); } catch (_) {}
          }}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Avançar"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleReload}
          className={cn("p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors", isLoading && "animate-spin text-primary")}
          title="Recarregar"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Address Input Bar */}
        <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/70 focus-within:border-primary focus-within:bg-background transition-all">
          {isSecure ? (
            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Conexão Segura (HTTPS)" />
          ) : (
            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" title="HTTP / Local" />
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
            placeholder="Digite uma URL ou porta (ex: localhost:8080)..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-hidden"
          />

          <Button
            type="button"
            size="sm"
            onClick={() => handleNavigate()}
            className="h-5 px-2 text-[10.5px] rounded-md shadow-2xs"
          >
            Ir
          </Button>
        </div>

        {/* Viewport Mode Toggle (Desktop vs Mobile 375px) */}
        <button
          type="button"
          onClick={() => setIsMobileView(!isMobileView)}
          className={cn(
            "p-1.5 rounded-lg transition-colors border",
            isMobileView
              ? "bg-primary/15 text-primary border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
          )}
          title={isMobileView ? "Mudar para Visualização Desktop" : "Mudar para Visualização Mobile (375px)"}
        >
          {isMobileView ? <Smartphone className="w-3.5 h-3.5 text-primary" /> : <Monitor className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={handleOpenExternal}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Abrir no Navegador Padrão do Sistema"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dev Quick-Launch Shortcuts Bar */}
      <div className="flex items-center gap-1 px-3 py-1 bg-muted/30 border-b border-border/40 text-[11px] overflow-x-auto no-scrollbar">
        <span className="text-muted-foreground font-medium flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Locais:
        </span>
        {['localhost:3000', 'localhost:5173', 'localhost:8080', 'localhost:8000'].map(host => (
          <button
            key={host}
            type="button"
            onClick={() => handleNavigate(`http://${host}`)}
            className="px-2 py-0.5 rounded-md bg-muted hover:bg-accent text-foreground/80 transition-colors shrink-0"
          >
            {host}
          </button>
        ))}
      </div>

      {/* Browser View Area */}
      <div className={cn(
        "flex-1 bg-slate-900/5 dark:bg-black/20 overflow-hidden relative flex items-center justify-center p-2",
        isMobileView && "p-4"
      )}>
        {loadError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md bg-card border border-border rounded-2xl shadow-xl">
            <AlertCircle className="w-10 h-10 text-destructive mb-3" />
            <h4 className="text-sm font-semibold text-foreground">Não foi possível carregar a página</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Verifique se o servidor de desenvolvimento está rodando em <code className="text-primary font-mono">{activeTab.url}</code>.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Button size="sm" onClick={handleReload}>
                Tentar novamente
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenExternal}>
                Abrir no navegador externo
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn(
            "w-full h-full transition-all duration-300 flex items-center justify-center",
            isMobileView && "max-w-[390px] h-[720px] max-h-full rounded-3xl border-8 border-slate-800 dark:border-slate-700 shadow-2xl overflow-hidden bg-background"
          )}>
            <iframe
              ref={iframeRef}
              src={activeTab.url}
              title="Neo Browser View"
              className="w-full h-full border-none bg-background"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setLoadError(true);
              }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
          </div>
        )}
      </div>
    </div>
  );
}

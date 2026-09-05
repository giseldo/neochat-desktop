import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Code,
  X,
  Play,
  RotateCw,
  Monitor,
  Tablet,
  Smartphone,
  Terminal,
  Download,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  SplitSquareVertical
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const DEFAULT_SAMPLE_CODE = `<div class="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4">
  <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  </div>
  <h1 class="text-2xl font-bold text-zinc-100 tracking-tight">NeoChat Live Sandbox</h1>
  <p class="text-sm text-zinc-400 max-w-md">
    Edite o código HTML/Tailwind/React no editor à esquerda e veja a renderização instantânea em tempo real.
  </p>
  <div class="flex gap-2">
    <button onclick="console.log('Botão de ação clicado!')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-all">
      Testar Ação & Console
    </button>
  </div>
</div>`;

export function LiveSandboxModal({
  isOpen,
  onClose,
  initialCode = ''
}) {
  const [code, setCode] = useState(initialCode || DEFAULT_SAMPLE_CODE);
  const [bundledSrc, setBundledSrc] = useState('');
  const [viewport, setViewport] = useState('desktop'); // desktop, tablet, mobile
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const iframeRef = useRef(null);

  const compilePreview = async (sourceCode) => {
    setIsCompiling(true);
    try {
      if (window.electron?.livePreview?.bundle) {
        const res = await window.electron.livePreview.bundle({
          code: sourceCode || code,
          framework: (sourceCode || code).includes('React') ? 'react' : 'vanilla'
        });
        if (res?.bundledHtml) {
          setBundledSrc(res.bundledHtml);
        }
      } else {
        // Fallback local bundle
        setBundledSrc(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-zinc-900 text-white p-4">${sourceCode || code}</body></html>`);
      }
    } catch (err) {
      console.error('Compilation error:', err);
    } finally {
      setIsCompiling(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      compilePreview(initialCode || code);
    }
  }, [isOpen]);

  // Listen to messages posted by iframe console
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.source === 'neochat-sandbox') {
        setConsoleLogs(prev => [...prev.slice(-49), {
          type: event.data.type,
          message: event.data.message,
          time: event.data.timestamp
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportHtml = () => {
    const blob = new Blob([bundledSrc || code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neochat-sandbox-export.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewportWidthClass = {
    desktop: 'w-full',
    tablet: 'max-w-[768px] mx-auto',
    mobile: 'max-w-[375px] mx-auto'
  }[viewport];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border text-card-foreground rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Web Sandbox & Live Dev Preview</h2>
                <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  Hot-Reload Ativo
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                HTML5 • Tailwind CSS • React 18 • Console Logger Sandboxed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Switcher */}
            <div className="bg-muted p-1 rounded-xl border border-border flex items-center gap-1">
              <button
                onClick={() => setViewport('desktop')}
                className={cn(
                  'p-1.5 rounded-lg transition-all cursor-pointer',
                  viewport === 'desktop' 
                    ? 'bg-primary text-primary-foreground shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
                title="Desktop (100%)"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewport('tablet')}
                className={cn(
                  'p-1.5 rounded-lg transition-all cursor-pointer',
                  viewport === 'tablet' 
                    ? 'bg-primary text-primary-foreground shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
                title="Tablet (768px)"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                className={cn(
                  'p-1.5 rounded-lg transition-all cursor-pointer',
                  viewport === 'mobile' 
                    ? 'bg-primary text-primary-foreground shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
                title="Mobile (375px)"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => compilePreview(code)}
              className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCw className={cn('w-3.5 h-3.5', isCompiling && 'animate-spin text-primary')} />
              Recarregar
            </button>

            <button
              onClick={handleExportHtml}
              className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar HTML
            </button>

            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Editor and Preview Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left: Code Editor */}
          <div className="w-full md:w-1/2 border-r border-border flex flex-col bg-card">
            <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span className="font-semibold text-foreground/80">editor.html / jsx</span>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <textarea
              value={code}
              onChange={e => {
                setCode(e.target.value);
                compilePreview(e.target.value);
              }}
              spellCheck={false}
              className="flex-1 w-full p-4 bg-background/50 text-xs font-mono text-foreground resize-none focus:outline-none leading-relaxed selection:bg-primary/20"
              placeholder="Cole ou escreva seu código HTML/React aqui..."
            />
          </div>

          {/* Right: Preview Iframe + Console */}
          <div className="w-full md:w-1/2 flex flex-col bg-muted/10 overflow-hidden">
            
            {/* Live Preview Iframe Container */}
            <div className="flex-1 p-3 overflow-auto flex items-center justify-center bg-muted/20">
              <div className={cn('h-full transition-all duration-300 rounded-xl overflow-hidden border border-border shadow-lg bg-background', viewportWidthClass)}>
                <iframe
                  ref={iframeRef}
                  srcDoc={bundledSrc}
                  title="NeoChat Live Sandbox"
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  className="w-full h-full border-0"
                />
              </div>
            </div>

            {/* Bottom Console Panel */}
            <div className="h-36 border-t border-border bg-card flex flex-col">
              <div className="px-4 py-1.5 border-b border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold text-foreground">Console Logs</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-border bg-muted text-muted-foreground">
                    {consoleLogs.length} logs
                  </Badge>
                </div>
                {consoleLogs.length > 0 && (
                  <button
                    onClick={() => setConsoleLogs([])}
                    className="text-muted-foreground hover:text-foreground text-[10px] cursor-pointer transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1">
                {consoleLogs.length === 0 ? (
                  <p className="text-muted-foreground italic">Nenhum log gerado pela aplicação.</p>
                ) : (
                  consoleLogs.map((log, lIdx) => (
                    <div key={lIdx} className="flex items-start gap-2">
                      <span className="text-muted-foreground/60 text-[10px]">{log.time}</span>
                      <span className={cn(
                        log.type === 'error' ? 'text-rose-500 font-medium' :
                        log.type === 'warn' ? 'text-amber-500 font-medium' :
                        'text-foreground'
                      )}>
                        [{log.type.toUpperCase()}] {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}

export default LiveSandboxModal;

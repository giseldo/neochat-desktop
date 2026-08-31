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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Web Sandbox & Live Dev Preview</h2>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Hot-Reload Ativo
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400">
                HTML5 • Tailwind CSS • React 18 • Console Logger Sandboxed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Switcher */}
            <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex items-center gap-1">
              <button
                onClick={() => setViewport('desktop')}
                className={cn('p-1.5 rounded transition-colors', viewport === 'desktop' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
                title="Desktop (100%)"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewport('tablet')}
                className={cn('p-1.5 rounded transition-colors', viewport === 'tablet' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
                title="Tablet (768px)"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                className={cn('p-1.5 rounded transition-colors', viewport === 'mobile' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
                title="Mobile (375px)"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => compilePreview(code)}
              className="border-zinc-700 text-xs flex items-center gap-1.5 text-zinc-300"
            >
              <RotateCw className={cn('w-3.5 h-3.5', isCompiling && 'animate-spin')} />
              Recarregar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportHtml}
              className="border-zinc-700 text-xs flex items-center gap-1.5 text-zinc-300"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar HTML
            </Button>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Editor and Preview Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left: Code Editor */}
          <div className="w-full md:w-1/2 border-r border-zinc-800 flex flex-col bg-zinc-950">
            <div className="px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span>editor.html / jsx</span>
              <button
                onClick={handleCopy}
                className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
              className="flex-1 w-full p-4 bg-transparent text-xs font-mono text-zinc-200 resize-none focus:outline-none leading-relaxed"
              placeholder="Cole ou escreva seu código HTML/React aqui..."
            />
          </div>

          {/* Right: Preview Iframe + Console */}
          <div className="w-full md:w-1/2 flex flex-col bg-zinc-900/40 overflow-hidden">
            
            {/* Live Preview Iframe Container */}
            <div className="flex-1 p-3 overflow-auto flex items-center justify-center bg-zinc-950/60">
              <div className={cn('h-full transition-all duration-300 rounded-xl overflow-hidden border border-zinc-800 shadow-lg bg-zinc-900', viewportWidthClass)}>
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
            <div className="h-36 border-t border-zinc-800 bg-zinc-950 flex flex-col">
              <div className="px-4 py-1.5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-zinc-300">Console Logs</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-zinc-800">
                    {consoleLogs.length} logs
                  </Badge>
                </div>
                {consoleLogs.length > 0 && (
                  <button
                    onClick={() => setConsoleLogs([])}
                    className="text-zinc-500 hover:text-zinc-300 text-[10px]"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1">
                {consoleLogs.length === 0 ? (
                  <p className="text-zinc-600 italic">Nenhum log gerado pela aplicação.</p>
                ) : (
                  consoleLogs.map((log, lIdx) => (
                    <div key={lIdx} className="flex items-start gap-2">
                      <span className="text-zinc-600 text-[10px]">{log.time}</span>
                      <span className={cn(
                        log.type === 'error' ? 'text-rose-400' :
                        log.type === 'warn' ? 'text-amber-400' :
                        'text-zinc-300'
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

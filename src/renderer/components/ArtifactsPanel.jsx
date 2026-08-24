import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Code2, 
  Eye, 
  Download, 
  Copy, 
  Check, 
  Play, 
  Terminal, 
  RotateCcw, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Cpu, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Settings2
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { runJavaScript } from '../lib/codeRunners/jsRunner';
import { runPythonWithPyodide } from '../lib/codeRunners/pyodideRunner';

export function ArtifactsPanel({ artifact, onClose, className }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'code' | 'console'
  const [copied, setCopied] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [currentCode, setCurrentCode] = useState('');

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [executionOutput, setExecutionOutput] = useState(null); // { success, logs, result, durationMs, error }
  const [runtimeMode, setRuntimeMode] = useState('auto'); // 'auto' | 'wasm' | 'local'
  const [localRuntimes, setLocalRuntimes] = useState({ python: { available: false }, node: { available: false } });

  // Sync artifact changes
  useEffect(() => {
    if (artifact) {
      const code = artifact.code || '';
      setCurrentCode(code);
      setExecutionOutput(null);
      setIsEditingCode(false);

      const type = (artifact.type || '').toLowerCase();
      const isVisual = ['html', 'svg', 'mermaid', 'markdown', 'md'].includes(type);
      const isExecutable = ['js', 'javascript', 'ts', 'typescript', 'py', 'python'].includes(type);

      if (isVisual) {
        setActiveTab('preview');
      } else if (isExecutable) {
        setActiveTab('code');
      } else {
        setActiveTab('code');
      }
    }
  }, [artifact]);

  // Check local runtimes on mount
  useEffect(() => {
    const detectRuntimes = async () => {
      try {
        if (window.electron?.codeRunner?.checkRuntimes) {
          const runtimes = await window.electron.codeRunner.checkRuntimes();
          if (runtimes) {
            setLocalRuntimes(runtimes);
          }
        }
      } catch (err) {
        console.error('Error detecting local runtimes:', err);
      }
    };
    detectRuntimes();
  }, []);

  if (!artifact) return null;

  const rawType = (artifact.type || 'html').toLowerCase();
  const title = artifact.title || t('artifacts.defaultTitle', { type: rawType.toUpperCase() });

  const isPython = rawType === 'py' || rawType === 'python';
  const isJS = rawType === 'js' || rawType === 'javascript' || rawType === 'ts' || rawType === 'typescript';
  const isExecutable = isPython || isJS;
  const isVisual = ['html', 'svg', 'mermaid', 'markdown', 'md'].includes(rawType);

  const handleCopy = async (textToCopy = currentCode) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    const extMap = {
      html: 'html',
      svg: 'svg',
      mermaid: 'mmd',
      python: 'py',
      py: 'py',
      javascript: 'js',
      js: 'js',
      typescript: 'ts',
      ts: 'ts',
      json: 'json',
      markdown: 'md',
      md: 'md'
    };
    const ext = extMap[rawType] || 'txt';
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artifact-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const executeCode = async () => {
    if (!isExecutable || isRunning) return;

    setIsRunning(true);
    setActiveTab('console');
    setStatusMessage(t('artifacts.runningCode'));

    try {
      let result = null;

      if (isPython) {
        // Python execution: check if user chose local or if local is preferred
        const useLocal = runtimeMode === 'local' || (runtimeMode === 'auto' && localRuntimes.python?.available);

        if (useLocal && window.electron?.codeRunner?.executeCode) {
          setStatusMessage('Executando Python localmente...');
          const localRes = await window.electron.codeRunner.executeCode({
            language: 'python',
            code: currentCode
          });

          const logs = [];
          if (localRes.stdout) {
            logs.push({ type: 'log', message: localRes.stdout.replace(/\n$/, ''), timestamp: Date.now() });
          }
          if (localRes.stderr) {
            logs.push({ type: 'error', message: localRes.stderr.replace(/\n$/, ''), timestamp: Date.now() });
          }

          result = {
            success: localRes.success,
            logs,
            result: null,
            durationMs: localRes.durationMs,
            error: localRes.error,
            runtime: localRuntimes.python?.version || 'Python Local'
          };
        } else {
          // Use WebAssembly Pyodide
          setStatusMessage('Executando no WebAssembly Pyodide...');
          const pyodideRes = await runPythonWithPyodide(currentCode, (msg) => setStatusMessage(msg));
          result = {
            ...pyodideRes,
            runtime: 'Pyodide (WebAssembly)'
          };
        }
      } else if (isJS) {
        // JavaScript execution
        const useLocalNode = runtimeMode === 'local' && localRuntimes.node?.available && window.electron?.codeRunner?.executeCode;

        if (useLocalNode) {
          setStatusMessage('Executando Node.js localmente...');
          const localRes = await window.electron.codeRunner.executeCode({
            language: 'javascript',
            code: currentCode
          });

          const logs = [];
          if (localRes.stdout) {
            logs.push({ type: 'log', message: localRes.stdout.replace(/\n$/, ''), timestamp: Date.now() });
          }
          if (localRes.stderr) {
            logs.push({ type: 'error', message: localRes.stderr.replace(/\n$/, ''), timestamp: Date.now() });
          }

          result = {
            success: localRes.success,
            logs,
            result: null,
            durationMs: localRes.durationMs,
            error: localRes.error,
            runtime: localRuntimes.node?.version || 'Node.js Local'
          };
        } else {
          // In-browser Sandbox execution
          setStatusMessage('Executando em Sandbox JavaScript...');
          const jsRes = await runJavaScript(currentCode);
          result = {
            ...jsRes,
            runtime: 'JavaScript (Sandbox)'
          };
        }
      }

      setExecutionOutput(result);
    } catch (err) {
      setExecutionOutput({
        success: false,
        logs: [],
        result: null,
        durationMs: 0,
        error: err instanceof Error ? err.message : String(err),
        runtime: 'Desconhecido'
      });
    } finally {
      setIsRunning(false);
      setStatusMessage('');
    }
  };

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run code
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (isExecutable) {
          e.preventDefault();
          executeCode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExecutable, currentCode, runtimeMode, localRuntimes]);

  return (
    <div className={cn("flex flex-col h-full bg-background border-l border-border shadow-2xl z-40 animate-in slide-in-from-right duration-200", className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            {isExecutable ? <Terminal className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs text-foreground truncate">{title}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-mono">{rawType}</span>
              {isExecutable && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono font-medium">
                  {isPython ? 'Python' : 'JavaScript'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons & tabs */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Main Tabs */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border text-xs">
            {isVisual && (
              <button
                onClick={() => setActiveTab('preview')}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors",
                  activeTab === 'preview' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="w-3 h-3" />
                <span>{t('artifacts.tabPreview')}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('code')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors",
                activeTab === 'code' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code2 className="w-3 h-3" />
              <span>{t('artifacts.tabCode')}</span>
            </button>

            {isExecutable && (
              <button
                onClick={() => setActiveTab('console')}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors relative",
                  activeTab === 'console' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Terminal className="w-3 h-3 text-primary" />
                <span>{t('artifacts.tabConsole')}</span>
                {executionOutput && (
                  <span className={cn("w-1.5 h-1.5 rounded-full", executionOutput.success ? "bg-green-500" : "bg-destructive")} />
                )}
              </button>
            )}
          </div>

          {/* Run Button (for executable code) */}
          {isExecutable && (
            <button
              onClick={executeCode}
              disabled={isRunning}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold shadow-xs transition-all",
                isRunning
                  ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95"
              )}
              title={t('artifacts.runCodeTooltip')}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('artifacts.runningCode')}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t('artifacts.runCode')}</span>
                </>
              )}
            </button>
          )}

          {/* Copy Code */}
          <button
            onClick={() => handleCopy(currentCode)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t('artifacts.copyTooltip')}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Download Artifact */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t('artifacts.downloadTooltip')}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close Panel */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-1"
            title={t('artifacts.closeTooltip')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secondary Controls Bar (for runtime options and edit mode) */}
      {isExecutable && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-b border-border/50 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{t('artifacts.runtimeLabel')}</span>
            <select
              value={runtimeMode}
              onChange={(e) => setRuntimeMode(e.target.value)}
              className="px-2 py-0.5 rounded-md bg-background border border-border text-foreground text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="auto">Auto (Mais Rápido / Padrão)</option>
              {isPython && <option value="wasm">WebAssembly (Pyodide)</option>}
              {isPython && localRuntimes.python?.available && (
                <option value="local">Python Local ({localRuntimes.python.version})</option>
              )}
              {isJS && <option value="wasm">JavaScript (Sandbox)</option>}
              {isJS && localRuntimes.node?.available && (
                <option value="local">Node.js Local ({localRuntimes.node.version})</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingCode(!isEditingCode)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors",
                isEditingCode
                  ? "bg-primary/15 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditingCode ? t('artifacts.viewCode') : t('artifacts.editCode')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Panel Content */}
      <div className="flex-1 overflow-hidden relative bg-card flex flex-col">
        {/* TAB 1: VISUAL PREVIEW */}
        {activeTab === 'preview' && (
          <div className="w-full h-full overflow-hidden">
            {rawType === 'html' ? (
              <iframe
                title="Artifact Preview"
                srcDoc={currentCode}
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-none bg-white"
              />
            ) : rawType === 'svg' ? (
              <div className="w-full h-full flex items-center justify-center p-6 overflow-auto bg-white/5">
                <div 
                  className="max-w-full max-h-full" 
                  dangerouslySetInnerHTML={{ __html: currentCode }} 
                />
              </div>
            ) : (
              <div className="p-4 overflow-auto h-full text-xs font-mono whitespace-pre-wrap text-foreground">
                {currentCode}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CODE VIEWER / EDITOR */}
        {activeTab === 'code' && (
          <div className="w-full h-full overflow-hidden flex flex-col">
            {isEditingCode ? (
              <textarea
                value={currentCode}
                onChange={(e) => setCurrentCode(e.target.value)}
                className="w-full h-full p-4 bg-background text-foreground font-mono text-xs resize-none focus:outline-none leading-relaxed"
                style={{ tabSize: 2 }}
                placeholder="Digite ou edite o código aqui..."
                autoFocus
              />
            ) : (
              <div className="overflow-auto h-full p-2 bg-muted/15">
                <SyntaxHighlighter
                  language={rawType === 'py' ? 'python' : (rawType === 'js' ? 'javascript' : rawType)}
                  style={isDark ? oneDark : oneLight}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent',
                    backgroundColor: 'transparent',
                    fontSize: '0.8rem',
                    lineHeight: '1.5',
                  }}
                >
                  {currentCode}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONSOLE & OUTPUT */}
        {activeTab === 'console' && (
          <div className="w-full h-full overflow-hidden flex flex-col bg-[#0f172a] text-slate-100 font-mono text-xs">
            {/* Console Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px]">
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{statusMessage || t('artifacts.runningCode')}</span>
                  </div>
                ) : executionOutput ? (
                  <div className="flex items-center gap-1.5">
                    {executionOutput.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span className={executionOutput.success ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                      {executionOutput.success ? t('artifacts.executionSuccess') : t('artifacts.executionError')}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      ({executionOutput.durationMs}ms)
                    </span>
                    {executionOutput.runtime && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {executionOutput.runtime}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">Console Pronto</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {executionOutput && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const allOutput = [
                          ...(executionOutput.logs || []).map(l => l.message),
                          executionOutput.result ? `Return: ${executionOutput.result}` : '',
                          executionOutput.error ? `Error: ${executionOutput.error}` : ''
                        ].filter(Boolean).join('\n');
                        handleCopy(allOutput);
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title={t('artifacts.copyOutput')}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExecutionOutput(null)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title={t('artifacts.clearConsole')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Console Output Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 select-text leading-relaxed">
              {!executionOutput && !isRunning ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                  <Terminal className="w-8 h-8 opacity-40 mb-2" />
                  <p className="text-xs">{t('artifacts.noOutput')}</p>
                  <button
                    type="button"
                    onClick={executeCode}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{t('artifacts.runCode')}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Console Logs */}
                  {executionOutput?.logs && executionOutput.logs.length > 0 && (
                    <div className="space-y-1">
                      {executionOutput.logs.map((log, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "px-2 py-1 rounded whitespace-pre-wrap break-all",
                            log.type === 'error'
                              ? "bg-rose-950/40 text-rose-300 border-l-2 border-rose-500"
                              : log.type === 'warn'
                                ? "bg-amber-950/40 text-amber-300 border-l-2 border-amber-500"
                                : log.type === 'info'
                                  ? "bg-sky-950/40 text-sky-300 border-l-2 border-sky-500"
                                  : "text-slate-200"
                          )}
                        >
                          {log.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Return Value */}
                  {executionOutput?.result && (
                    <div className="mt-2 p-2 rounded bg-indigo-950/40 border border-indigo-900/60 text-indigo-200">
                      <span className="text-[10px] text-indigo-400 font-semibold block mb-0.5">
                        {t('artifacts.returnValue')}
                      </span>
                      <pre className="whitespace-pre-wrap break-all m-0">
                        {executionOutput.result}
                      </pre>
                    </div>
                  )}

                  {/* Errors */}
                  {executionOutput?.error && (
                    <div className="mt-2 p-2 rounded bg-rose-950/50 border border-rose-900 text-rose-200 whitespace-pre-wrap break-all">
                      <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-[11px] mb-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{t('artifacts.executionError')}</span>
                      </div>
                      {executionOutput.error}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArtifactsPanel;

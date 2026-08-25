import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
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
  Settings2,
  Columns2,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  AlignLeft,
  FileCode
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { runJavaScript } from '../lib/codeRunners/jsRunner';
import { runPythonWithPyodide } from '../lib/codeRunners/pyodideRunner';
import { 
  buildHtmlSandboxDoc, 
  buildReactSandboxDoc, 
  buildMermaidDoc, 
  isReactCode 
} from '../lib/sandboxUtils';

/**
 * Map artifact type string to Monaco language ID
 */
function getMonacoLanguage(type = '') {
  const t = type.toLowerCase();
  const map = {
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    py: 'python',
    python: 'python',
    sql: 'sql',
    md: 'markdown',
    markdown: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bash: 'shell',
    ps1: 'powershell',
    xml: 'xml',
    svg: 'xml',
    mermaid: 'markdown'
  };
  return map[t] || 'plaintext';
}

export function ArtifactsPanel({ artifact, onClose, className }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  // Tabs: 'preview' | 'split' | 'code' | 'console'
  const [activeTab, setActiveTab] = useState('preview');
  const [copied, setCopied] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  
  // Viewport mode: 'desktop' | 'tablet' | 'mobile'
  const [viewportMode, setViewportMode] = useState('desktop');
  const [sandboxKey, setSandboxKey] = useState(0);

  // Console logs from Live Sandbox
  const [sandboxLogs, setSandboxLogs] = useState([]);
  
  // Code execution state (Python / Node / JS Sandbox)
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [executionOutput, setExecutionOutput] = useState(null);
  const [runtimeMode, setRuntimeMode] = useState('auto');
  const [localRuntimes, setLocalRuntimes] = useState({ python: { available: false }, node: { available: false } });

  // Monaco Editor Ref
  const editorRef = useRef(null);

  // Sync artifact changes
  useEffect(() => {
    if (artifact) {
      const code = artifact.code || '';
      setCurrentCode(code);
      setExecutionOutput(null);
      setSandboxLogs([]);

      const rawType = (artifact.type || '').toLowerCase();
      const isVisual = ['html', 'svg', 'mermaid', 'markdown', 'md', 'jsx', 'tsx', 'react'].includes(rawType) || isReactCode(code);
      const isExecutable = ['js', 'javascript', 'ts', 'typescript', 'py', 'python'].includes(rawType) && !isReactCode(code);

      if (isVisual) {
        setActiveTab('preview');
      } else if (isExecutable) {
        setActiveTab('code');
      } else {
        setActiveTab('code');
      }
    }
  }, [artifact]);

  // Listen to sandbox postMessage logs
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'NEOCHAT_SANDBOX_CONSOLE') {
        setSandboxLogs((prev) => [
          ...prev,
          {
            level: event.data.level || 'log',
            message: event.data.message || '',
            timestamp: event.data.timestamp || Date.now()
          }
        ]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  const hasReact = isReactCode(currentCode) || rawType === 'jsx' || rawType === 'tsx' || rawType === 'react';
  const isPython = rawType === 'py' || rawType === 'python';
  const isJS = (rawType === 'js' || rawType === 'javascript' || rawType === 'ts' || rawType === 'typescript') && !hasReact;
  const isExecutable = isPython || isJS;
  const isVisual = ['html', 'svg', 'mermaid', 'markdown', 'md', 'jsx', 'tsx', 'react'].includes(rawType) || hasReact;

  // Build live sandbox iframe doc
  const sandboxDoc = useMemo(() => {
    if (rawType === 'mermaid') {
      return buildMermaidDoc(currentCode, isDark);
    }
    if (hasReact) {
      return buildReactSandboxDoc(currentCode, isDark);
    }
    if (rawType === 'html' || rawType === 'svg') {
      return buildHtmlSandboxDoc(currentCode, isDark);
    }
    return buildHtmlSandboxDoc(currentCode, isDark);
  }, [currentCode, rawType, hasReact, isDark]);

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
      jsx: 'jsx',
      tsx: 'tsx',
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

  const handleOpenInBrowser = () => {
    const blob = new Blob([sandboxDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const executeCode = async () => {
    if (!isExecutable || isRunning) return;

    setIsRunning(true);
    setActiveTab('console');
    setStatusMessage(t('artifacts.runningCode'));

    try {
      let result = null;

      if (isPython) {
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
          setStatusMessage('Executando no WebAssembly Pyodide...');
          const pyodideRes = await runPythonWithPyodide(currentCode, (msg) => setStatusMessage(msg));
          result = {
            ...pyodideRes,
            runtime: 'Pyodide (WebAssembly)'
          };
        }
      } else if (isJS) {
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

  const totalConsoleErrors = sandboxLogs.filter(l => l.level === 'error').length + (executionOutput?.error ? 1 : 0);

  return (
    <div className={cn("flex flex-col h-full bg-background border-l border-border shadow-2xl z-40 animate-in slide-in-from-right duration-200 min-w-[340px]", className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 gap-2 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            {hasReact ? <FileCode className="w-4 h-4 text-cyan-500" /> : isExecutable ? <Terminal className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs text-foreground truncate">{title}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-mono">{hasReact ? 'React (JSX)' : rawType}</span>
              {isVisual && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-medium">
                  Live Sandbox
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons & tabs */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Main Tabs */}
          <div className="flex items-center bg-muted/80 rounded-lg p-0.5 border border-border text-xs">
            {isVisual && (
              <>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors",
                    activeTab === 'preview' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={t('artifacts.tabPreview')}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('artifacts.tabPreview')}</span>
                </button>

                <button
                  onClick={() => setActiveTab('split')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors",
                    activeTab === 'split' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={t('artifacts.tabSplit')}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('artifacts.tabSplit')}</span>
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('code')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors",
                activeTab === 'code' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
              title={t('artifacts.tabCode')}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('artifacts.tabCode')}</span>
            </button>

            <button
              onClick={() => setActiveTab('console')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors relative",
                activeTab === 'console' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
              title={t('artifacts.tabConsole')}
            >
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{t('artifacts.tabConsole')}</span>
              {(sandboxLogs.length > 0 || executionOutput) && (
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full ml-0.5",
                  totalConsoleErrors > 0 ? "bg-destructive animate-ping" : "bg-primary"
                )} />
              )}
            </button>
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

      {/* Secondary Controls Bar (Viewports, Runtimes, Reload) */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-b border-border/50 text-[11px] text-muted-foreground">
        {/* Left: Viewport Switcher for visual previews OR runtime selector */}
        {(activeTab === 'preview' || activeTab === 'split') && isVisual ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Viewport:</span>
            <div className="flex items-center bg-muted/60 rounded-md p-0.5 border border-border/40">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={cn(
                  "p-1 rounded transition-colors",
                  viewportMode === 'desktop' ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground"
                )}
                title={t('artifacts.viewportDesktop')}
              >
                <Monitor className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('tablet')}
                className={cn(
                  "p-1 rounded transition-colors",
                  viewportMode === 'tablet' ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground"
                )}
                title={t('artifacts.viewportTablet')}
              >
                <Tablet className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={cn(
                  "p-1 rounded transition-colors",
                  viewportMode === 'mobile' ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground"
                )}
                title={t('artifacts.viewportMobile')}
              >
                <Smartphone className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : isExecutable ? (
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
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span>Monaco Editor</span>
          </div>
        )}

        {/* Right: Quick actions (Format, Reload, Open in Browser) */}
        <div className="flex items-center gap-1.5">
          {(activeTab === 'code' || activeTab === 'split') && (
            <button
              type="button"
              onClick={handleFormatCode}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t('artifacts.formatDocument')}
            >
              <AlignLeft className="w-3 h-3" />
              <span>{t('artifacts.formatDocument')}</span>
            </button>
          )}

          {isVisual && (
            <>
              <button
                type="button"
                onClick={() => setSandboxKey(k => k + 1)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={t('artifacts.reloadSandbox')}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('artifacts.reloadSandbox')}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenInBrowser}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={t('artifacts.openInBrowser')}
              >
                <ExternalLink className="w-3 h-3" />
                <span>{t('artifacts.openInBrowser')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-hidden relative bg-card flex flex-col">
        {/* TAB 1: FULL PREVIEW */}
        {activeTab === 'preview' && (
          <div className="w-full h-full overflow-hidden flex items-center justify-center bg-muted/10 p-2">
            <div 
              className={cn(
                "h-full transition-all duration-200 overflow-hidden rounded-xl border border-border/60 shadow-md bg-background",
                viewportMode === 'desktop' && "w-full",
                viewportMode === 'tablet' && "w-[768px] max-w-full",
                viewportMode === 'mobile' && "w-[375px] max-w-full"
              )}
            >
              <iframe
                key={sandboxKey}
                title="Live Sandbox Preview"
                srcDoc={sandboxDoc}
                sandbox="allow-scripts allow-modals allow-same-origin"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        )}

        {/* TAB 2: SPLIT VIEW (MONACO + LIVE PREVIEW) */}
        {activeTab === 'split' && (
          <div className="w-full h-full grid grid-cols-2 divide-x divide-border overflow-hidden">
            {/* Left: Monaco Editor */}
            <div className="h-full overflow-hidden">
              <Editor
                height="100%"
                language={getMonacoLanguage(rawType)}
                theme={isDark ? 'vs-dark' : 'light'}
                value={currentCode}
                onChange={(value) => setCurrentCode(value || '')}
                onMount={(editor) => { editorRef.current = editor; }}
                options={{
                  fontSize: 12.5,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  padding: { top: 8, bottom: 8 }
                }}
              />
            </div>

            {/* Right: Live Sandbox Preview */}
            <div className="h-full overflow-hidden flex items-center justify-center bg-muted/10 p-2">
              <div 
                className={cn(
                  "h-full transition-all duration-200 overflow-hidden rounded-xl border border-border/60 shadow-md bg-background",
                  viewportMode === 'desktop' && "w-full",
                  viewportMode === 'tablet' && "w-[768px] max-w-full",
                  viewportMode === 'mobile' && "w-[375px] max-w-full"
                )}
              >
                <iframe
                  key={sandboxKey}
                  title="Live Sandbox Split Preview"
                  srcDoc={sandboxDoc}
                  sandbox="allow-scripts allow-modals allow-same-origin"
                  className="w-full h-full border-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FULL MONACO CODE EDITOR */}
        {activeTab === 'code' && (
          <div className="w-full h-full overflow-hidden">
            <Editor
              height="100%"
              language={getMonacoLanguage(rawType)}
              theme={isDark ? 'vs-dark' : 'light'}
              value={currentCode}
              onChange={(value) => setCurrentCode(value || '')}
              onMount={(editor) => { editorRef.current = editor; }}
              options={{
                fontSize: 13,
                minimap: { enabled: true },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>
        )}

        {/* TAB 4: CONSOLE & LOGS */}
        {activeTab === 'console' && (
          <div className="w-full h-full p-4 overflow-y-auto font-mono text-xs space-y-4 bg-muted/10 custom-scrollbar">
            {/* Header / Clear button */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">
                  {t('artifacts.tabConsole')}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {sandboxLogs.length + (executionOutput?.logs?.length || 0)} logs
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSandboxLogs([]);
                  setExecutionOutput(null);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('artifacts.clearConsole')}</span>
              </button>
            </div>

            {/* Execution Status Banner (if run) */}
            {executionOutput && (
              <div className={cn(
                "p-3 rounded-xl border space-y-1.5",
                executionOutput.success
                  ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {executionOutput.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{executionOutput.success ? t('artifacts.executionSuccess') : t('artifacts.executionError')}</span>
                  </div>
                  <span className="text-[10px] opacity-80">
                    {executionOutput.runtime} • {executionOutput.durationMs}ms
                  </span>
                </div>

                {executionOutput.error && (
                  <pre className="text-[11px] p-2 rounded bg-black/10 dark:bg-black/30 overflow-x-auto whitespace-pre-wrap">
                    {executionOutput.error}
                  </pre>
                )}
              </div>
            )}

            {/* Sandbox Live Logs */}
            {sandboxLogs.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Logs em Tempo Real da Sandbox:
                </div>
                {sandboxLogs.map((log, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-2 rounded-lg border text-[11.5px] leading-relaxed flex items-start gap-2",
                      log.level === 'error'
                        ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                        : log.level === 'warn'
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-muted/30 border-border/40 text-foreground/90"
                    )}
                  >
                    <span className="text-[10px] opacity-60 shrink-0 font-mono mt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono flex-1">
                      {log.message}
                    </pre>
                  </div>
                ))}
              </div>
            ) : !executionOutput && (
              <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                <Terminal className="w-8 h-8 mx-auto opacity-40" />
                <div>{t('artifacts.noConsoleLogs')}</div>
                <p className="text-[11px] max-w-xs mx-auto opacity-80">
                  Os `console.log`, avisos e erros executados na Live Sandbox aparecerão automaticamente aqui.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ArtifactsPanel;

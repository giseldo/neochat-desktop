import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Terminal as TerminalIcon, 
  Plus, 
  X, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Square, 
  Copy, 
  Check, 
  ChevronRight,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import Convert from 'ansi-to-html';

const ansiConverter = new Convert({
  fg: '#e2e8f0',
  bg: '#0f172a',
  newline: true,
  escapeXML: true
});

const TERMINAL_WIDTH_KEY = 'neochat_terminal_panel_width';
const DEFAULT_TERMINAL_WIDTH = 580;
const MIN_TERMINAL_WIDTH = 360;

export default function TerminalPanel({
  onClose,
  isMaximized,
  onToggleMaximize,
  initialCwd,
  className
}) {
  const { t } = useLanguage();

  // Width & Resize state
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem(TERMINAL_WIDTH_KEY);
    return saved ? Math.max(MIN_TERMINAL_WIDTH, parseInt(saved, 10)) : DEFAULT_TERMINAL_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(panelWidth);
  widthRef.current = panelWidth;

  // Resize Drag Handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  const handleResizeReset = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setPanelWidth(DEFAULT_TERMINAL_WIDTH);
    localStorage.setItem(TERMINAL_WIDTH_KEY, String(DEFAULT_TERMINAL_WIDTH));
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const maxWidth = Math.max(MIN_TERMINAL_WIDTH, window.innerWidth - 320);
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, MIN_TERMINAL_WIDTH), maxWidth);
      widthRef.current = newWidth;
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(TERMINAL_WIDTH_KEY, String(widthRef.current));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const [sessions, setSessions] = useState([
    { id: 'term-1', name: 'PowerShell', cwd: initialCwd || '' }
  ]);
  const [activeSessionId, setActiveSessionId] = useState('term-1');
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [logs, setLogs] = useState({}); // { [sessionId]: string[] }
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const [openMenu, setOpenMenu] = useState(null);
  const actionsRef = useRef(null);
  const shortcutsRef = useRef(null);

  useEffect(() => {
    if (!openMenu) return;
    const dismiss = (event) => {
      if (!actionsRef.current?.contains(event.target) && !shortcutsRef.current?.contains(event.target)) setOpenMenu(null);
    };
    const escape = (event) => {
      if (event.key === 'Escape') {
        const trigger = openMenu === 'actions' ? actionsRef : shortcutsRef;
        setOpenMenu(null);
        trigger.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [openMenu]);

  const logsEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync initial sessions from main process
  useEffect(() => {
    if (window.electron?.terminal?.listSessions) {
      window.electron.terminal.listSessions().then(list => {
        if (list && list.length > 0) {
          setSessions(list);
          setActiveSessionId(list[0].id);
        }
      }).catch(() => {});
    }
  }, []);

  // Fetch initial buffer when active session changes
  useEffect(() => {
    if (window.electron?.terminal?.getBuffer && activeSessionId) {
      window.electron.terminal.getBuffer(activeSessionId).then(buf => {
        if (buf) {
          setLogs(prev => ({
            ...prev,
            [activeSessionId]: [buf]
          }));
        }
      }).catch(() => {});
    }
  }, [activeSessionId]);

  // Subscribe to real-time streaming data from terminal sessions
  useEffect(() => {
    if (!window.electron?.terminal?.onData) return;

    const cleanup = window.electron.terminal.onData(({ sessionId, data }) => {
      setLogs(prev => {
        const sessionLogs = prev[sessionId] || [];
        return {
          ...prev,
          [sessionId]: [...sessionLogs, data]
        };
      });
    });

    return () => cleanup();
  }, []);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeSessionId]);

  const handleCreateTab = useCallback(async () => {
    const nextNum = sessions.length + 1;
    const newId = `term-${Date.now()}`;
    const name = `Terminal ${nextNum}`;
    
    if (window.electron?.terminal?.createSession) {
      try {
        const sessionInfo = await window.electron.terminal.createSession({ id: newId, name, cwd: initialCwd });
        setSessions(prev => [...prev, sessionInfo || { id: newId, name, cwd: initialCwd }]);
        setActiveSessionId(newId);
      } catch (err) {
        setSessions(prev => [...prev, { id: newId, name, cwd: initialCwd }]);
        setActiveSessionId(newId);
      }
    } else {
      setSessions(prev => [...prev, { id: newId, name, cwd: initialCwd }]);
      setActiveSessionId(newId);
    }
  }, [sessions.length, initialCwd]);

  const handleCloseTab = useCallback(async (e, idToClose) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;

    if (window.electron?.terminal?.destroySession) {
      try {
        await window.electron.terminal.destroySession(idToClose);
      } catch (_) {}
    }

    const nextSessions = sessions.filter(s => s.id !== idToClose);
    setSessions(nextSessions);

    if (activeSessionId === idToClose) {
      setActiveSessionId(nextSessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const handleExecuteCommand = async (cmdToRun) => {
    const cmd = (cmdToRun || commandInput).trim();
    if (!cmd) return;

    setHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setCommandInput('');
    setIsRunning(true);

    try {
      if (window.electron?.terminal?.exec) {
        await window.electron.terminal.exec(activeSessionId, cmd, initialCwd);
      } else {
        // Fallback simulation
        setLogs(prev => ({
          ...prev,
          [activeSessionId]: [...(prev[activeSessionId] || []), `\r\n> ${cmd}\r\n[Simulation] Done.`]
        }));
      }
    } catch (err) {
      setLogs(prev => ({
        ...prev,
        [activeSessionId]: [...(prev[activeSessionId] || []), `\r\n\x1b[31mError: ${err.message}\x1b[0m\r\n`]
      }));
    } finally {
      setIsRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommandInput(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setCommandInput('');
      } else {
        setHistoryIndex(nextIndex);
        setCommandInput(history[nextIndex]);
      }
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey) && isRunning) {
      e.preventDefault();
      handleKill();
    }
  };

  const handleKill = async () => {
    if (window.electron?.terminal?.kill) {
      await window.electron.terminal.kill(activeSessionId);
    }
    setIsRunning(false);
  };

  const handleClear = async () => {
    if (window.electron?.terminal?.clear) {
      await window.electron.terminal.clear(activeSessionId);
    }
    setLogs(prev => ({ ...prev, [activeSessionId]: [] }));
  };

  const handleCopyLogs = () => {
    const raw = (logs[activeSessionId] || []).join('');
    // eslint-disable-next-line no-control-regex
    const plainText = raw.replace(/\x1b\[[0-9;]*m/g, '');
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentLogs = (logs[activeSessionId] || []).join('');
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  return (
    <div 
      style={!isMaximized ? { width: `${panelWidth}px` } : undefined}
      className={cn(
        "relative flex flex-col bg-slate-950 text-slate-100 border-l border-border/80 shadow-2xl overflow-hidden transition-all duration-200 shrink-0",
        isMaximized ? "fixed inset-4 z-50 rounded-2xl border" : "h-full min-w-[360px]",
        className
      )}
    >
      {/* Left Resize Handle */}
      {!isMaximized && (
        <div
          onMouseDown={handleResizeStart}
          onDoubleClick={handleResizeReset}
          className={cn(
            "absolute top-0 left-0 -ml-1 w-2.5 h-full cursor-col-resize z-50 group select-none flex items-center justify-center transition-colors",
            isResizing ? "bg-emerald-500/40" : "hover:bg-emerald-500/20"
          )}
          title={t('sidebar.dragToResize') || 'Arraste para redimensionar (Duplo clique para redefinir)'}
        >
          <div className={cn(
            "w-1 h-8 rounded-full transition-colors",
            isResizing ? "bg-emerald-500" : "bg-slate-700 group-hover:bg-emerald-500/80"
          )} />
        </div>
      )}

      {/* Resize Overlay */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto bg-transparent" />
      )}

      {/* Top Header Bar */}
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 px-3 bg-slate-900/60 border-b border-slate-800/60 select-none">
        {/* Left: Terminal Tabs */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar flex-1">
          <div className="flex shrink-0 items-center gap-1 px-1 py-1 text-xs font-semibold text-slate-400">
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Terminal</span>
          </div>


          {sessions.map(session => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 px-2.5 h-11 text-xs font-medium transition-colors border-b-2",
                  isActive
                    ? "text-slate-100 border-primary"
                    : "text-slate-400 hover:text-slate-200 border-transparent"
                )}
              >
                <button type="button" onClick={() => setActiveSessionId(session.id)} aria-pressed={isActive} className="truncate max-w-[100px] h-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">{session.name}</button>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(e, session.id)}
                    aria-label={`Fechar ${session.name}`}
                    className="opacity-60 hover:opacity-100 hover:text-red-400 rounded p-0.5"
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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title={t('terminal.newTab') || 'Nova Aba de Terminal'}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Header Controls */}
        <div className="flex shrink-0 items-center gap-1">
          <div className="relative" ref={actionsRef}>
            <button type="button" aria-label="Ações do terminal" aria-expanded={openMenu === 'actions'} onClick={() => setOpenMenu(openMenu === 'actions' ? null : 'actions')} className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800" title="Ações do terminal">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <MoreHorizontal className="w-4 h-4" />}
            </button>
            {openMenu === 'actions' && (
              <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-lg">
                <button type="button" onClick={() => { handleCopyLogs(); setOpenMenu(null); }} className="w-full flex items-center gap-2 rounded-md p-2 text-xs text-slate-200 hover:bg-slate-800"><Copy className="w-3.5 h-3.5" />Copiar saída</button>
                <button type="button" onClick={() => { handleClear(); setOpenMenu(null); }} className="w-full flex items-center gap-2 rounded-md p-2 text-xs text-slate-200 hover:bg-slate-800"><Trash2 className="w-3.5 h-3.5" />Limpar terminal</button>
              </div>
            )}
          </div>

          {onToggleMaximize && (
            <button
              type="button"
              onClick={onToggleMaximize}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title={isMaximized ? "Restaurar" : "Maximizar"}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title={t('common.close') || 'Fechar'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output Area */}
      <div 
        className="flex-1 p-3 font-mono text-xs overflow-y-auto bg-slate-950/90 select-text leading-relaxed text-slate-200"
        onClick={() => inputRef.current?.focus()}
      >
        {currentLogs ? (
          <div
            dangerouslySetInnerHTML={{
              __html: ansiConverter.toHtml(currentLogs)
            }}
          />
        ) : (
          <div className="text-slate-400 py-3 font-sans">
            Terminal pronto. Digite um comando abaixo.
          </div>
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Interactive Command Input Bar */}
      <div className="flex items-center gap-1.5 p-2.5 bg-slate-900/60 border-t border-slate-800/60">
        <div className="flex items-center text-primary font-mono font-bold text-xs shrink-0 pl-1">
          <ChevronRight className="w-4 h-4 text-primary" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? "Executando processo... (Ctrl+C para interromper)" : "Digite um comando shell..."}
          className="h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-slate-100 placeholder:text-slate-400 font-mono text-xs outline-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          aria-label="Comando do terminal"
          autoFocus
        />
        <div className="relative shrink-0" ref={shortcutsRef}>
          <button type="button" aria-expanded={openMenu === 'shortcuts'} onClick={() => setOpenMenu(openMenu === 'shortcuts' ? null : 'shortcuts')} className="h-10 flex items-center gap-1 rounded-lg px-2 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            Atalhos <ChevronDown className="w-3 h-3" />
          </button>
          {openMenu === 'shortcuts' && (
            <div className="absolute right-0 bottom-full mb-2 z-50 w-40 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-lg">
              {['pnpm dev', 'pnpm test', 'git status', 'git diff', 'node -v'].map(cmd => (
                <button key={cmd} type="button" disabled={isRunning} onClick={() => { setOpenMenu(null); handleExecuteCommand(cmd); }} className="w-full rounded-md p-2 text-left font-mono text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50">{cmd}</button>
              ))}
            </div>
          )}
        </div>
        {isRunning ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleKill}
            className="h-10 shrink-0 px-2 text-xs flex items-center gap-1 rounded-lg"
            title="Interromper processo (Ctrl+C)"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Parar</span>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => handleExecuteCommand()}
            disabled={!commandInput.trim()}
            className="h-10 shrink-0 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-400 disabled:opacity-100"
          >
            Executar
          </Button>
        )}
      </div>
    </div>
  );
}

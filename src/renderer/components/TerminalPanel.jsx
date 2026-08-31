import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Terminal as TerminalIcon, 
  Plus, 
  X, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  Trash2, 
  Square, 
  Copy, 
  Check, 
  ChevronRight,
  Sparkles
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

export default function TerminalPanel({
  onClose,
  isMaximized,
  onToggleMaximize,
  initialCwd
}) {
  const { t } = useLanguage();
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
    const plainText = raw.replace(/\x1b\[[0-9;]*m/g, '');
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentLogs = (logs[activeSessionId] || []).join('');
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  return (
    <div className={cn(
      "flex flex-col bg-slate-950 text-slate-100 border border-border/80 shadow-2xl rounded-2xl overflow-hidden transition-all duration-200",
      isMaximized ? "fixed inset-4 z-50 rounded-2xl" : "w-full h-full min-h-[420px]"
    )}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 select-none">
        {/* Left: Terminal Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[70%]">
          <div className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-400">
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Terminal</span>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {sessions.map(session => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border",
                  isActive
                    ? "bg-slate-800 text-slate-100 border-slate-700 shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent"
                )}
              >
                <span className="truncate max-w-[100px]">{session.name}</span>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(e, session.id)}
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title={t('common.copy') || 'Copiar saída'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title={t('common.clear') || 'Limpar terminal'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

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
          <div className="text-slate-500 py-4 italic">
            Neo Terminal pronto. Digite um comando abaixo ou selecione um atalho.
          </div>
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Quick Command Suggestions */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/80 overflow-x-auto no-scrollbar text-[11px]">
        <span className="text-slate-500 font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Atalhos:
        </span>
        {['pnpm dev', 'pnpm test', 'git status', 'git diff', 'node -v'].map(cmd => (
          <button
            key={cmd}
            type="button"
            onClick={() => handleExecuteCommand(cmd)}
            disabled={isRunning}
            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 disabled:opacity-50"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Interactive Command Input Bar */}
      <div className="flex items-center gap-2 p-2.5 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center text-emerald-400 font-mono font-bold text-xs shrink-0 pl-1">
          <ChevronRight className="w-4 h-4 text-emerald-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? "Executando processo... (Ctrl+C para interromper)" : "Digite um comando shell..."}
          className="flex-1 bg-transparent text-slate-100 placeholder:text-slate-500 font-mono text-xs outline-hidden focus:outline-hidden"
          autoFocus
        />
        {isRunning ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleKill}
            className="h-7 px-2 text-xs flex items-center gap-1 rounded-lg shadow-xs"
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
            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors"
          >
            Executar
          </Button>
        )}
      </div>
    </div>
  );
}

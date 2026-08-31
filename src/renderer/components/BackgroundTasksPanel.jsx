import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Loader2, 
  Play, 
  Square, 
  Trash2, 
  X, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

const TASKS_WIDTH_KEY = 'neochat_tasks_panel_width';
const DEFAULT_TASKS_WIDTH = 480;
const MIN_TASKS_WIDTH = 340;

export default function BackgroundTasksPanel({
  onClose,
  isMaximized,
  onToggleMaximize,
  className
}) {
  const { t } = useLanguage();

  // Width & Resize state
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem(TASKS_WIDTH_KEY);
    return saved ? Math.max(MIN_TASKS_WIDTH, parseInt(saved, 10)) : DEFAULT_TASKS_WIDTH;
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
    setPanelWidth(DEFAULT_TASKS_WIDTH);
    localStorage.setItem(TASKS_WIDTH_KEY, String(DEFAULT_TASKS_WIDTH));
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const maxWidth = Math.max(MIN_TASKS_WIDTH, window.innerWidth - 320);
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, MIN_TASKS_WIDTH), maxWidth);
      widthRef.current = newWidth;
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(TASKS_WIDTH_KEY, String(widthRef.current));
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

  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'running' | 'completed' | 'error'
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskLogs, setTaskLogs] = useState([]);
  const [copied, setCopied] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  // Close filter dropdown on click outside
  useEffect(() => {
    if (!filterDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterDropdownOpen]);

  // Load initial tasks list
  const loadTasks = useCallback(async () => {
    if (window.electron?.tasks?.list) {
      try {
        const list = await window.electron.tasks.list();
        setTasks(list || []);
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Subscribe to real-time task update events
  useEffect(() => {
    if (!window.electron?.tasks?.onUpdate) return;

    const cleanup = window.electron.tasks.onUpdate(({ event, data }) => {
      if (event === 'task:started' || event === 'task:completed' || event === 'task:killed') {
        loadTasks();
      } else if (event === 'task:output' && selectedTaskId && data.taskId === selectedTaskId) {
        setTaskLogs(prev => [...prev, { type: data.type, text: data.text, timestamp: Date.now() }]);
      }
    });

    return () => cleanup();
  }, [loadTasks, selectedTaskId]);

  // Load logs when a task is selected
  useEffect(() => {
    if (selectedTaskId && window.electron?.tasks?.getLogs) {
      window.electron.tasks.getLogs(selectedTaskId).then(logs => {
        setTaskLogs(logs || []);
      }).catch(() => {});
    }
  }, [selectedTaskId]);

  const handleKillTask = async (e, taskId) => {
    e.stopPropagation();
    if (window.electron?.tasks?.kill) {
      await window.electron.tasks.kill(taskId);
      loadTasks();
    }
  };

  const handleClearCompleted = async () => {
    if (window.electron?.tasks?.clear) {
      const remaining = await window.electron.tasks.clear();
      setTasks(remaining || []);
      if (selectedTaskId) {
        const stillExists = (remaining || []).some(t => t.id === selectedTaskId);
        if (!stillExists) setSelectedTaskId(null);
      }
    }
  };

  const handleCopyLogs = () => {
    const text = taskLogs.map(l => l.text).join('');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runningCount = tasks.filter(t => t.status === 'running').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const errorCount = tasks.filter(t => t.status === 'error' || t.status === 'cancelled').length;

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'running') return task.status === 'running';
    if (statusFilter === 'completed') return task.status === 'completed';
    if (statusFilter === 'error') return task.status === 'error' || task.status === 'cancelled';
    return true;
  });

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div 
      style={!isMaximized ? { width: `${panelWidth}px` } : undefined}
      className={cn(
        "relative flex flex-col bg-card text-card-foreground border-l border-border/80 shadow-2xl overflow-hidden transition-all duration-200 shrink-0",
        isMaximized ? "fixed inset-4 z-50 rounded-2xl border" : "h-full min-w-[340px]",
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
            isResizing ? "bg-primary/40" : "hover:bg-primary/20"
          )}
          title={t('sidebar.dragToResize') || 'Arraste para redimensionar (Duplo clique para redefinir)'}
        >
          <div className={cn(
            "w-1 h-8 rounded-full transition-colors",
            isResizing ? "bg-primary" : "bg-border group-hover:bg-primary/80"
          )} />
        </div>
      )}

      {/* Resize Overlay */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto bg-transparent" />
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/50 border-b border-border select-none">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-semibold text-xs tracking-tight">Tarefas em segundo plano</span>
          {runningCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10.5px] font-bold animate-pulse">
              {runningCount} ativa{runningCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
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

      {/* Sub-bar: Status Filter & Clear button */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-background/80 border-b border-border/60 text-xs">
        {/* Status Dropdown */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-accent font-medium text-foreground transition-colors"
          >
            <span>
              {statusFilter === 'completed' && `Concluído ${completedCount}`}
              {statusFilter === 'running' && `Em execução ${runningCount}`}
              {statusFilter === 'error' && `Com erro ${errorCount}`}
              {statusFilter === 'all' && `Todas (${tasks.length})`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {filterDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-30 w-44 bg-popover border border-border rounded-xl shadow-xl py-1 text-xs">
              <button
                type="button"
                onClick={() => { setStatusFilter('all'); setFilterDropdownOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 hover:bg-accent transition-colors flex items-center justify-between", statusFilter === 'all' && "font-bold text-primary")}
              >
                <span>Todas as tarefas</span>
                <span className="text-muted-foreground">{tasks.length}</span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('running'); setFilterDropdownOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 hover:bg-accent transition-colors flex items-center justify-between", statusFilter === 'running' && "font-bold text-blue-500")}
              >
                <span>Em execução</span>
                <span className="text-muted-foreground">{runningCount}</span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('completed'); setFilterDropdownOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 hover:bg-accent transition-colors flex items-center justify-between", statusFilter === 'completed' && "font-bold text-emerald-500")}
              >
                <span>Concluído</span>
                <span className="text-muted-foreground">{completedCount}</span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('error'); setFilterDropdownOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 hover:bg-accent transition-colors flex items-center justify-between", statusFilter === 'error' && "font-bold text-destructive")}
              >
                <span>Com erro / Cancelado</span>
                <span className="text-muted-foreground">{errorCount}</span>
              </button>
            </div>
          )}
        </div>

        {/* Clear Button */}
        <button
          type="button"
          onClick={handleClearCompleted}
          disabled={tasks.length === 0 || tasks.every(t => t.status === 'running')}
          className="text-xs text-muted-foreground hover:text-foreground font-medium disabled:opacity-40 transition-colors"
        >
          Limpar
        </button>
      </div>

      {/* Task List Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <Clock className="w-8 h-8 stroke-1 mb-2 opacity-40" />
            <p className="text-xs font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-[11px] opacity-70 mt-0.5">Tarefas iniciadas em background aparecerão aqui.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isSelected = selectedTaskId === task.id;
            return (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-primary/5 border-primary/40 shadow-xs"
                    : "bg-muted/30 hover:bg-muted/60 border-border/80"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {task.name || task.command}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">{task.runner || 'Bash'}</span>
                      <span>•</span>
                      <span className={cn(
                        "flex items-center gap-1 font-medium",
                        task.status === 'running' && "text-blue-500 dark:text-blue-400",
                        task.status === 'completed' && "text-emerald-600 dark:text-emerald-400",
                        task.status === 'error' && "text-destructive",
                        task.status === 'cancelled' && "text-amber-500"
                      )}>
                        {task.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {task.status === 'error' && <AlertCircle className="w-3 h-3" />}
                        {task.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                        
                        {task.status === 'running' && 'Em execução'}
                        {task.status === 'completed' && 'Concluído'}
                        {task.status === 'error' && 'Erro'}
                        {task.status === 'cancelled' && 'Cancelado'}
                      </span>
                      {task.durationMs > 0 && (
                        <>
                          <span>•</span>
                          <span>{(task.durationMs / 1000).toFixed(1)}s</span>
                        </>
                      )}
                    </div>
                  </div>

                  {task.status === 'running' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={(e) => handleKillTask(e, task.id)}
                      className="h-6 px-2 text-[11px] rounded-lg shadow-2xs"
                    >
                      <Square className="w-2.5 h-2.5 fill-current mr-1" />
                      Parar
                    </Button>
                  )}
                </div>

                {/* Expanded Live Logs inside selected card */}
                {isSelected && (
                  <div className="mt-3 pt-2.5 border-t border-border/80">
                    <div className="flex items-center justify-between mb-1.5 text-[11px]">
                      <span className="font-mono text-muted-foreground font-semibold">Logs de execução:</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCopyLogs(); }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 text-slate-200 font-mono text-[10.5px] max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap select-text">
                      {taskLogs.length > 0 ? (
                        taskLogs.map((l, idx) => (
                          <div key={idx} className={l.type === 'stderr' ? 'text-rose-400' : 'text-slate-200'}>
                            {l.text}
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-500 italic">Aguardando saída...</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

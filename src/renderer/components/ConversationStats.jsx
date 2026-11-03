import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft, 
  PanelRight, 
  PanelRightClose, 
  ArrowRight,
  Gauge,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { calculateContextUsage } from '../lib/contextUsage';

const METRICS_WIDTH_KEY = 'neochat_metrics_panel_width';
const DEFAULT_METRICS_WIDTH = 350;
const MIN_METRICS_WIDTH = 280;
const MAX_METRICS_WIDTH = 560;

/**
 * Custom hook to compute aggregated statistics and context usage from chat messages.
 */
export function useConversationStatsData({ messages = [], selectedModel = '', modelConfigs = {} }) {
  const contextUsage = useMemo(
    () => calculateContextUsage({ messages, selectedModel, modelConfigs }), 
    [messages, selectedModel, modelConfigs]
  );

  const stats = useMemo(() => {
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCachedTokens = 0;
    let totalTimeSec = 0;
    let assistantTurnCount = 0;
    let userTurnCount = 0;
    let latestContextSize = 0;
    let cumulativeHistoryChars = 0;

    messages.forEach((msg) => {
      const msgContent = typeof msg.content === 'string'
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content.map(p => (p.type === 'text' ? p.text : '')).join(' ')
          : '';
      const charCount = msgContent.length + (msg.reasoning ? msg.reasoning.length : 0);

      if (msg.role === 'user') {
        userTurnCount++;
        cumulativeHistoryChars += charCount;
      } else if (msg.role === 'tool') {
        cumulativeHistoryChars += charCount;
      } else if (msg.role === 'assistant') {
        assistantTurnCount++;

        const u = msg.usage || {};
        const hasDirectUsage = u.prompt_tokens !== undefined || u.input !== undefined || u.input_tokens !== undefined;
        let prompt = u.prompt_tokens ?? u.input_tokens ?? (u.input !== undefined ? (Number(u.input || 0) + Number(u.cacheRead || 0)) : 0);
        let comp = u.completion_tokens ?? u.output_tokens ?? u.output ?? 0;
        let cached = Number(u.prompt_cache_hit_tokens ?? u.cache_read_input_tokens ?? u.cached_tokens ?? u.cacheRead ?? u.prompt_tokens_details?.cached_tokens ?? 0);
        const time = Number(u.completion_time || u.total_time || u.client_duration || (msg.reasoningDuration ? Number(msg.reasoningDuration) : 0)) || 0;

        // If prompt is 0 and no direct usage recorded, estimate prompt tokens from history
        if (!hasDirectUsage && prompt === 0 && cumulativeHistoryChars > 0) {
          prompt = Math.max(1, Math.round(cumulativeHistoryChars / 4));
        }

        // If completion is 0 and no direct usage recorded, estimate completion tokens
        if (!hasDirectUsage && comp === 0 && charCount > 0) {
          comp = Math.max(1, Math.round(charCount / 4));
        }

        totalPromptTokens += prompt;
        totalCompletionTokens += comp;
        totalCachedTokens += cached;
        totalTimeSec += time;
        latestContextSize = prompt + comp;

        cumulativeHistoryChars += charCount;
      }
    });

    const totalTokens = totalPromptTokens + totalCompletionTokens;
    const avgTokensPerSec = totalTimeSec > 0 && totalCompletionTokens > 0
      ? Math.round(totalCompletionTokens / totalTimeSec)
      : 0;

    return {
      totalPromptTokens,
      totalCompletionTokens,
      totalCachedTokens,
      totalTokens,
      totalTimeSec,
      avgTokensPerSec,
      assistantTurnCount,
      userTurnCount,
      totalTurns: userTurnCount + assistantTurnCount,
      latestContextSize,
    };
  }, [messages]);

  return { contextUsage, stats };
}

/**
 * Header button trigger for the Conversation Metrics collapsible tab.
 */
export function ConversationStatsTrigger({
  messages = [],
  selectedModel = '',
  modelConfigs = {},
  isOpen = false,
  onToggle,
  className
}) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { contextUsage, stats } = useConversationStatsData({ messages, selectedModel, modelConfigs });

  const formatNumber = (num) => (num ? num.toLocaleString(pt ? 'pt-BR' : 'en-US') : '0');
  const title = pt ? 'Métricas da conversa' : 'Conversation metrics';
  const contextLabel = pt ? 'Ocupação do contexto' : 'Context usage';
  const usageColor = contextUsage.clampedPercentage >= 90 
    ? 'text-rose-500 font-semibold' 
    : contextUsage.clampedPercentage >= 70 
      ? 'text-amber-500 font-medium' 
      : 'text-muted-foreground';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className={cn(
        "h-8 flex items-center gap-1.5 px-2.5 rounded-xl border transition-all text-xs cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        isOpen
          ? "bg-primary/10 text-primary border-primary/30 shadow-2xs font-semibold"
          : "border-border/60 hover:bg-muted/80 text-foreground hover:border-border",
        className
      )}
      title={`${title} · ${isOpen ? (pt ? 'Recolher aba lateral' : 'Collapse side tab') : (pt ? 'Abrir aba lateral' : 'Open side tab')}`}
      aria-label={`${pt ? 'Uso' : 'Usage'} · ${contextUsage.displayPercentage}% · ${contextLabel} · ${formatNumber(stats.totalTokens)} tokens`}
    >
      <Activity className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isOpen ? "text-primary" : usageColor)} />
      <span className={cn("tabular-nums whitespace-nowrap", usageColor)}>
        {pt ? 'Uso' : 'Usage'} · {contextUsage.displayPercentage}% · {formatNumber(stats.totalTokens)} tokens
      </span>
      <PanelRight className={cn("w-3.5 h-3.5 ml-0.5 transition-transform shrink-0", isOpen ? "text-primary" : "text-muted-foreground/60")} />
    </button>
  );
}

/**
 * Right-side collapsible tab panel displaying Conversation Metrics.
 */
export function ConversationStatsPanel({
  messages = [],
  selectedModel = '',
  modelConfigs = {},
  onClose,
  onOpenTrajectory,
  isTrajectoryActive = false,
  className
}) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const locale = pt ? 'pt-BR' : 'en-US';

  const { contextUsage, stats } = useConversationStatsData({ messages, selectedModel, modelConfigs });

  // Width & Resize state
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(METRICS_WIDTH_KEY);
      return saved ? Math.min(MAX_METRICS_WIDTH, Math.max(MIN_METRICS_WIDTH, parseInt(saved, 10))) : DEFAULT_METRICS_WIDTH;
    } catch {
      return DEFAULT_METRICS_WIDTH;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(panelWidth);
  widthRef.current = panelWidth;

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      const newWidth = Math.min(MAX_METRICS_WIDTH, Math.max(MIN_METRICS_WIDTH, window.innerWidth - e.clientX));
      setPanelWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem(METRICS_WIDTH_KEY, String(widthRef.current));
      } catch {}
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Escape key handler
  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [onClose]);

  const promptPercent = stats.totalTokens > 0 
    ? Math.round((stats.totalPromptTokens / stats.totalTokens) * 100) 
    : 0;
  const completionPercent = stats.totalTokens > 0 ? 100 - promptPercent : 0;

  const formatNumber = (num) => (num ? num.toLocaleString(locale) : '0');
  const formatTime = (sec) => {
    if (sec < 60) return `${sec.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
    const roundedSeconds = Math.round(sec);
    return `${Math.floor(roundedSeconds / 60)} min ${roundedSeconds % 60} s`;
  };

  const inputLabel = pt ? 'Entrada' : 'Input';
  const outputLabel = pt ? 'Saída' : 'Output';
  const title = pt ? 'Métricas da conversa' : 'Conversation metrics';
  const contextLabel = pt ? 'Ocupação do contexto' : 'Context usage';
  const usageColor = contextUsage.clampedPercentage >= 90 ? 'text-rose-500' : contextUsage.clampedPercentage >= 70 ? 'text-amber-500' : 'text-primary';
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';
  const trajectoryLabel = pt ? 'Ver trajetória da conversa' : 'View conversation trajectory';
  const trajectoryBadge = pt ? 'Trajetória' : 'Trajectory';

  return (
    <aside
      style={{ width: `${panelWidth}px` }}
      aria-label={title}
      className={cn(
        "relative flex flex-col h-full bg-card/95 backdrop-blur-md border-l border-border shadow-2xl z-40 select-none animate-in slide-in-from-right duration-200 shrink-0 font-sans",
        "max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:w-full max-md:z-50",
        className
      )}
    >
      {/* Left Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        onDoubleClick={() => setPanelWidth(DEFAULT_METRICS_WIDTH)}
        className={cn(
          "absolute top-0 left-0 -ml-1 w-2.5 h-full cursor-col-resize z-50 group select-none flex items-center justify-center transition-colors max-md:hidden",
          isResizing ? "bg-primary/40" : "hover:bg-primary/20"
        )}
        title={pt ? 'Arraste para redimensionar (Duplo clique para redefinir)' : 'Drag to resize (Double click to reset)'}
      >
        <div className={cn(
          "w-1 h-8 rounded-full transition-colors",
          isResizing ? "bg-primary" : "bg-border group-hover:bg-primary/80"
        )} />
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 select-none gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs text-foreground truncate">{title}</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {formatNumber(stats.totalTurns)} {stats.totalTurns === 1 ? (pt ? 'mensagem' : 'message') : (pt ? 'mensagens' : 'messages')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenTrajectory && (
            <button
              type="button"
              onClick={onOpenTrajectory}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer select-none",
                isTrajectoryActive
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
              )}
              title={`${trajectoryLabel} (${modKey}+T)`}
              aria-label={`${trajectoryLabel} (${modKey}+T)`}
            >
              <Activity className="w-3 h-3 text-emerald-500" />
              <span className="text-[11px] font-medium">{trajectoryBadge}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={pt ? "Recolher aba" : "Collapse tab"}
            aria-label={pt ? "Recolher aba" : "Collapse tab"}
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Metrics Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-xs">
        {/* Context Occupancy Section */}
        <section aria-label={contextLabel} className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground font-medium">{contextLabel}</span>
            <span className={cn('font-semibold tabular-nums', usageColor)}>{contextUsage.usedPctStr}%</span>
          </div>

          <div 
            role="progressbar" 
            aria-label={contextLabel} 
            aria-valuemin={0} 
            aria-valuemax={100} 
            aria-valuenow={contextUsage.clampedPercentage} 
            className="h-2 rounded-full overflow-hidden bg-muted/80 ring-1 ring-border/40"
          >
            <div 
              className={cn(
                'h-full transition-all duration-300', 
                contextUsage.clampedPercentage >= 90 
                  ? 'bg-rose-500' 
                  : contextUsage.clampedPercentage >= 70 
                    ? 'bg-amber-500' 
                    : 'bg-primary'
              )} 
              style={{ width: `${contextUsage.clampedPercentage}%` }} 
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular-nums font-mono">
              {formatNumber(contextUsage.conversationTokens)} / {formatNumber(contextUsage.totalContext)} tokens
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            {pt ? 'Estimativa de ocupação; o total abaixo acumula os turnos da conversa.' : 'Estimated usage; the total below accumulates conversation turns.'}
          </p>
        </section>

        {/* Big Numbers Grid */}
        <dl className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-border/60 bg-muted/10">
            <dt className="text-[11px] text-muted-foreground">{pt ? 'Total de tokens' : 'Total tokens'}</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {formatNumber(stats.totalTokens)}
            </dd>
          </div>
          <div className="p-3 rounded-xl border border-border/60 bg-muted/10">
            <dt className="text-[11px] text-muted-foreground">{pt ? 'Velocidade média' : 'Average speed'}</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {stats.avgTokensPerSec > 0 ? (
                <>
                  {formatNumber(stats.avgTokensPerSec)}{' '}
                  <span className="text-xs font-normal tracking-normal text-muted-foreground">tokens/s</span>
                </>
              ) : '—'}
            </dd>
          </div>
        </dl>

        {/* Input vs Output Breakdown */}
        <section aria-label={pt ? 'Distribuição de tokens' : 'Token distribution'} className="p-3.5 rounded-xl border border-border/60 bg-muted/10">
          <div aria-hidden="true" className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${promptPercent}%` }} />
            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${completionPercent}%` }} />
          </div>
          <dl className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div>
              <dt className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                {inputLabel}
              </dt>
              <dd className="mt-1 tabular-nums font-semibold text-foreground">
                {formatNumber(stats.totalPromptTokens)}{' '}
                <span className="text-xs font-normal text-muted-foreground">({promptPercent}%)</span>
              </dd>
            </div>
            <div className="text-right">
              <dt className="flex items-center justify-end gap-1.5 text-muted-foreground font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                {outputLabel}
              </dt>
              <dd className="mt-1 tabular-nums font-semibold text-foreground">
                {formatNumber(stats.totalCompletionTokens)}{' '}
                <span className="text-xs font-normal text-muted-foreground">({completionPercent}%)</span>
              </dd>
            </div>
          </dl>
        </section>

        {/* Detailed Turn & Latency Stats */}
        <dl className="border-t border-border/60 pt-3 space-y-2.5 text-xs">
          <div className="flex justify-between items-baseline gap-3">
            <dt className="text-muted-foreground">{pt ? 'Tempo de geração' : 'Generation time'}</dt>
            <dd className="font-medium text-right tabular-nums text-foreground">{formatTime(stats.totalTimeSec)}</dd>
          </div>
          <div className="flex justify-between items-baseline gap-3">
            <dt className="text-muted-foreground">{pt ? 'Contexto atual' : 'Current context'}</dt>
            <dd className="font-medium text-right tabular-nums text-foreground">{formatNumber(contextUsage.conversationTokens)} tokens</dd>
          </div>
          {stats.totalCachedTokens > 0 && (
            <div className="flex justify-between items-baseline gap-3">
              <dt className="text-muted-foreground">{pt ? 'Tokens em cache' : 'Cached tokens'}</dt>
              <dd className="font-medium text-right tabular-nums text-foreground">{formatNumber(stats.totalCachedTokens)} tokens</dd>
            </div>
          )}
          <div className="flex justify-between items-baseline gap-3">
            <dt className="text-muted-foreground">{pt ? 'Turnos' : 'Turns'}</dt>
            <dd className="font-medium text-right tabular-nums text-foreground">
              {formatNumber(stats.userTurnCount)} {pt ? (stats.userTurnCount === 1 ? 'pergunta' : 'perguntas') : (stats.userTurnCount === 1 ? 'question' : 'questions')} · {formatNumber(stats.assistantTurnCount)} {pt ? (stats.assistantTurnCount === 1 ? 'resposta' : 'respostas') : (stats.assistantTurnCount === 1 ? 'answer' : 'answers')}
            </dd>
          </div>
        </dl>

        {/* Shortcut Action Links */}
        {onOpenTrajectory && (
          <div className="pt-3 border-t border-border/60 space-y-1">
            {onOpenTrajectory && (
              <button
                type="button"
                onClick={onOpenTrajectory}
                className={cn(
                  "w-full flex items-center justify-between py-2 px-2.5 rounded-lg text-xs transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isTrajectoryActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
                title={`${trajectoryLabel} (${modKey}+T)`}
              >
                <span className="flex items-center gap-2">
                  <Activity className={cn("w-3.5 h-3.5 shrink-0", isTrajectoryActive ? "text-emerald-500" : "text-emerald-500/80 group-hover:text-emerald-500")} />
                  <span className="group-hover:text-foreground transition-colors font-medium">
                    {trajectoryLabel}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border/60 text-muted-foreground">
                    {modKey}+T
                  </kbd>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            )}

          </div>
        )}
      </div>

      {/* Bottom Footer Collapse Action */}
      <div className="p-2.5 border-t border-border/60 bg-muted/20">
        <button
          type="button"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          <span>{pt ? 'Recolher aba' : 'Collapse tab'}</span>
        </button>
      </div>
    </aside>
  );
}

export { ConversationStatsPanel as ConversationStats };
export default ConversationStatsPanel;

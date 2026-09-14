import React, { useState, useMemo, useEffect, useRef, useId } from 'react';
import { Activity, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { calculateContextUsage } from '../lib/contextUsage';

export function ConversationStats({ messages = [], selectedModel = '', modelConfigs = {}, onConfigureModel, className }) {
  const { language } = useLanguage();
  const contextUsage = useMemo(() => calculateContextUsage({ messages, selectedModel, modelConfigs }), [messages, selectedModel, modelConfigs]);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelId = useId();
  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [isOpen]);

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

  const promptPercent = stats.totalTokens > 0 
    ? Math.round((stats.totalPromptTokens / stats.totalTokens) * 100) 
    : 0;
  const completionPercent = stats.totalTokens > 0 ? 100 - promptPercent : 0;

  const formatNumber = (num) => (num ? num.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US') : '0');
  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const pt = language === 'pt';
  const formatTime = (sec) => {
    if (sec < 60) return `${sec.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
    const roundedSeconds = Math.round(sec);
    return `${Math.floor(roundedSeconds / 60)} min ${roundedSeconds % 60} s`;
  };
  const inputLabel = pt ? 'Entrada' : 'Input';
  const outputLabel = pt ? 'Saída' : 'Output';
  const title = pt ? 'Métricas da conversa' : 'Conversation metrics';
  const contextLabel = pt ? 'Ocupação do contexto' : 'Context usage';
  const usageColor = contextUsage.clampedPercentage >= 90 ? 'text-rose-500' : contextUsage.clampedPercentage >= 70 ? 'text-amber-500' : 'text-muted-foreground';

  return (
    <div className={cn("relative inline-block text-left select-none font-sans", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn("h-8 flex items-center gap-1.5 px-2 rounded-lg hover:bg-muted hover:text-foreground transition-colors text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", usageColor)}
        title={title}
        aria-label={`${pt ? 'Uso' : 'Usage'} · ${contextUsage.displayPercentage}% · ${contextLabel} · ${formatNumber(stats.totalTokens)} tokens`}
      >
        <Activity className="w-3.5 h-3.5 shrink-0" />
        <span className="tabular-nums whitespace-nowrap">{pt ? 'Uso' : 'Usage'} · {contextUsage.displayPercentage}% · {formatNumber(stats.totalTokens)} tokens</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <section id={panelId} aria-label={title} className="absolute left-0 mt-2 w-[340px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-80px)] overflow-y-auto rounded-xl border border-border/60 bg-popover text-popover-foreground p-5 shadow-lg z-50">
            <header className="mb-5">
              <h4 className="font-semibold text-sm text-foreground">{title}</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatNumber(stats.totalTurns)} {stats.totalTurns === 1 ? (pt ? 'mensagem' : 'message') : (pt ? 'mensagens' : 'messages')}
              </p>
            </header>

            <div className="mb-5 space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{contextLabel}</span>
                <span className={cn('font-medium tabular-nums', usageColor)}>{contextUsage.usedPctStr}%</span>
              </div>
              <div role="progressbar" aria-label={contextLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={contextUsage.clampedPercentage} className="h-1.5 rounded-full overflow-hidden bg-muted">
                <div className={cn('h-full', contextUsage.clampedPercentage >= 90 ? 'bg-rose-500' : contextUsage.clampedPercentage >= 70 ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${contextUsage.clampedPercentage}%` }} />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">{formatNumber(contextUsage.conversationTokens)} / {formatNumber(contextUsage.totalContext)} tokens</p>
              <p className="text-[11px] text-muted-foreground">{pt ? 'Estimativa de ocupação; o total abaixo acumula os turnos da conversa.' : 'Estimated usage; the total below accumulates conversation turns.'}</p>
            </div>

            <dl className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <dt className="text-xs text-muted-foreground">{pt ? 'Total de tokens' : 'Total tokens'}</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{formatNumber(stats.totalTokens)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{pt ? 'Velocidade média' : 'Average speed'}</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.avgTokensPerSec > 0 ? <>{formatNumber(stats.avgTokensPerSec)} <span className="text-xs font-normal tracking-normal text-muted-foreground">tokens/s</span></> : '—'}
                </dd>
              </div>
            </dl>

            <div className="mb-5">
              <div aria-hidden="true" className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                <div className="bg-primary h-full" style={{ width: `${promptPercent}%` }} />
                <div className="bg-emerald-500 h-full" style={{ width: `${completionPercent}%` }} />
              </div>
              <dl className="grid grid-cols-2 gap-3 mt-2.5 text-xs">
                <div>
                  <dt className="flex items-center gap-1.5 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-primary" />{inputLabel}</dt>
                  <dd className="mt-1 tabular-nums">{formatNumber(stats.totalPromptTokens)} <span className="text-muted-foreground">({promptPercent}%)</span></dd>
                </div>
                <div className="text-right">
                  <dt className="flex items-center justify-end gap-1.5 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{outputLabel}</dt>
                  <dd className="mt-1 tabular-nums">{formatNumber(stats.totalCompletionTokens)} <span className="text-muted-foreground">({completionPercent}%)</span></dd>
                </div>
              </dl>
            </div>

            <dl className="border-t border-border/50 pt-3 space-y-3 text-xs">
              <div className="flex justify-between items-baseline gap-3">
                <dt className="text-muted-foreground">{pt ? 'Tempo de geração' : 'Generation time'}</dt>
                <dd className="font-medium text-right tabular-nums">{formatTime(stats.totalTimeSec)}</dd>
              </div>
              <div className="flex justify-between items-baseline gap-3">
                <dt className="text-muted-foreground">{pt ? 'Contexto atual' : 'Current context'}</dt>
                <dd className="font-medium text-right tabular-nums">{formatNumber(contextUsage.conversationTokens)} tokens</dd>
              </div>
              {stats.totalCachedTokens > 0 && (
                <div className="flex justify-between items-baseline gap-3">
                  <dt className="text-muted-foreground">{pt ? 'Tokens em cache' : 'Cached tokens'}</dt>
                  <dd className="font-medium text-right tabular-nums">{formatNumber(stats.totalCachedTokens)} tokens</dd>
                </div>
              )}
              <div className="flex justify-between items-baseline gap-3">
                <dt className="text-muted-foreground">{pt ? 'Turnos' : 'Turns'}</dt>
                <dd className="font-medium text-right tabular-nums">
                  {formatNumber(stats.userTurnCount)} {pt ? (stats.userTurnCount === 1 ? 'pergunta' : 'perguntas') : (stats.userTurnCount === 1 ? 'question' : 'questions')} · {formatNumber(stats.assistantTurnCount)} {pt ? (stats.assistantTurnCount === 1 ? 'resposta' : 'respostas') : (stats.assistantTurnCount === 1 ? 'answer' : 'answers')}
                </dd>
              </div>
            </dl>
            {onConfigureModel && (
              <button type="button" onClick={() => { setIsOpen(false); onConfigureModel(); }} className="mt-4 pt-3 border-t border-border/50 w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {pt ? 'Parâmetros do modelo' : 'Model parameters'}
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default ConversationStats;

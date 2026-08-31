import React, { useState, useMemo } from 'react';
import { Activity, Zap, Clock, MessageSquare, ChevronDown, Sparkles, Cpu, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export function ConversationStats({ messages = [], className }) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

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

        let prompt = msg.usage?.prompt_tokens ?? msg.usage?.input_tokens ?? 0;
        let comp = msg.usage?.completion_tokens ?? msg.usage?.output_tokens ?? 0;
        let cached = Number(msg.usage?.prompt_cache_hit_tokens ?? msg.usage?.cache_read_input_tokens ?? msg.usage?.cached_tokens ?? 0);
        const time = msg.usage?.completion_time || msg.usage?.total_time || msg.usage?.client_duration || 0;

        // If prompt_tokens is 0 but we have historical text, estimate prompt tokens
        if (prompt === 0 && cumulativeHistoryChars > 0) {
          prompt = Math.max(1, Math.round(cumulativeHistoryChars / 4));
        }

        // If completion_tokens is 0 but we have content, estimate completion tokens
        if (comp === 0 && charCount > 0) {
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

  // If there are no messages or no tokens recorded yet, hide or show minimal
  if (stats.totalTurns === 0 || (stats.totalTokens === 0 && !stats.totalTimeSec)) {
    return null;
  }

  const promptPercent = stats.totalTokens > 0 
    ? Math.round((stats.totalPromptTokens / stats.totalTokens) * 100) 
    : 50;
  const completionPercent = 100 - promptPercent;

  const formatNumber = (num) => (num ? num.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US') : '0');
  const formatTime = (sec) => {
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const mins = Math.floor(sec / 60);
    const remainingSec = (sec % 60).toFixed(0);
    return `${mins}m ${remainingSec}s`;
  };

  return (
    <div className={cn("relative inline-block text-left select-none", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-border/70 bg-background/60 hover:bg-muted text-foreground transition-all text-xs font-medium shadow-2xs group cursor-pointer"
        title={t('stats.buttonTitle')}
      >
        <Activity className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatNumber(stats.totalTokens)} tk
        </span>
        {stats.avgTokensPerSec > 0 && (
          <span className="flex items-center gap-0.5 text-amber-500 font-mono text-[11px] font-semibold border-l border-border/60 pl-1.5">
            <Zap className="w-3 h-3 fill-amber-500/20" />
            {stats.avgTokensPerSec} t/s
          </span>
        )}
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Popover Breakdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border bg-popover text-popover-foreground p-4 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-foreground">{t('stats.headerTitle')}</h4>
                  <p className="text-[10px] text-muted-foreground">{t('stats.headerSubtitle')}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                {stats.totalTurns} {stats.totalTurns === 1 ? (language === 'pt' ? 'mensagem' : 'message') : (language === 'pt' ? 'mensagens' : 'messages')}
              </span>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-mono mb-1">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-primary" />
                    <span>{t('stats.totalTokens')}</span>
                  </div>
                  <span className="text-[10px] font-bold text-foreground font-mono">Σ {formatNumber(stats.totalTokens)}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-border/40 text-[11px] font-mono">
                  <div className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium" title={t('stats.promptInput')}>
                    <ArrowUp className="w-3 h-3 shrink-0" />
                    <span className="truncate">{formatNumber(stats.totalPromptTokens)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium justify-end" title={t('stats.completionOutput')}>
                    <ArrowDown className="w-3 h-3 shrink-0" />
                    <span className="truncate">{formatNumber(stats.totalCompletionTokens)}</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between">
                <div className="flex items-center gap-1 text-muted-foreground text-[10px] uppercase font-mono mb-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{t('stats.avgSpeed')}</span>
                </div>
                <div className="text-base font-bold text-foreground">
                  {stats.avgTokensPerSec > 0 ? `${stats.avgTokensPerSec} t/s` : '—'}
                </div>
              </div>
            </div>

            {/* Token Distribution Bar */}
            <div className="space-y-1.5 mb-3.5 p-2.5 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{t('stats.promptInput')}</span>
                  <strong className="text-foreground font-mono">{formatNumber(stats.totalPromptTokens)}</strong>
                  <span className="text-[10px] text-muted-foreground font-mono">({promptPercent}%)</span>
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t('stats.completionOutput')}</span>
                  <strong className="text-foreground font-mono">{formatNumber(stats.totalCompletionTokens)}</strong>
                  <span className="text-[10px] text-muted-foreground font-mono">({completionPercent}%)</span>
                </span>
              </div>
              
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                <div 
                  className="bg-blue-500 h-full transition-all duration-500" 
                  style={{ width: `${promptPercent}%` }} 
                  title={`Prompt: ${formatNumber(stats.totalPromptTokens)} (${promptPercent}%)`} 
                />
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${completionPercent}%` }} 
                  title={`${t('stats.completionOutput')}: ${formatNumber(stats.totalCompletionTokens)} (${completionPercent}%)`} 
                />
              </div>
            </div>

            {/* Detailed Row List */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" /> {t('stats.totalGenTime')}
                </span>
                <span className="font-semibold text-foreground">{formatTime(stats.totalTimeSec)}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-primary" /> {t('stats.currentContext')}
                </span>
                <span className="font-semibold text-foreground">{formatNumber(stats.latestContextSize)} {t('stats.tokensLabel')}</span>
              </div>

              {stats.totalCachedTokens > 0 && (
                <div className="flex items-center justify-between py-1 border-b border-border/40 text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" /> Prompt Cache Hit
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatNumber(stats.totalCachedTokens)} tokens
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" /> {t('stats.turnCount')}
                </span>
                <span className="font-semibold text-foreground">{stats.userTurnCount} Q / {stats.assistantTurnCount} A</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ConversationStats;

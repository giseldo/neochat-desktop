import React, { useState, useMemo } from 'react';
import { 
  Columns2, 
  Sparkles, 
  Copy, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  ArrowRight, 
  Zap, 
  Clock, 
  Cpu, 
  Brain, 
  ChevronDown, 
  ChevronRight,
  AlertCircle,
  Loader2,
  Key,
  Scale,
  X
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { getModelGroup } from '../lib/modelGrouping';

export function CompareChatView({
  modelA,
  modelB,
  onModelAChange,
  onModelBChange,
  availableModels = [],
  streamStateA = {},
  streamStateB = {},
  onSelectWinningResponse,
  onPreviewArtifact,
  onClose
}) {
  const { t } = useLanguage();
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);
  const [feedbackA, setFeedbackA] = useState(null); // 'up' | 'down'
  const [feedbackB, setFeedbackB] = useState(null);
  const [showReasoningA, setShowReasoningA] = useState(false);
  const [showReasoningB, setShowReasoningB] = useState(false);

  const handleCopy = async (text, setCopied) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const groupedModels = useMemo(() => {
    const groups = new Map();
    availableModels.forEach((m) => {
      const groupName = getModelGroup(m.id);
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName).push(m);
    });
    return Array.from(groups.entries()).map(([group, items]) => ({
      group,
      items
    }));
  }, [availableModels]);

  if (availableModels.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-8 text-center bg-background/50">
        <div className="max-w-md p-6 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 shadow-sm flex flex-col items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Key className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {t('chat.noModelsBannerTitle')}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('chat.noModelsBannerDesc')}
          </p>
          <a
            href="#/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 text-xs font-medium transition-colors mt-2 shadow-xs"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{t('common.goToSettings')}</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col h-full overflow-hidden bg-background/50 rounded-2xl border border-border/80 shadow-xs">
      {/* Compare Top Subheader */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Scale className="w-4 h-4 text-purple-500 shrink-0" />
          <span className="font-semibold text-xs text-foreground truncate">
            {t('header.compareModels') || 'Comparar Modelos'}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            · {t('header.compareModelsSubtitle') || 'Visualização lado a lado'}
          </span>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
            title={t('header.closeCompare') || 'Fechar comparação e voltar ao chat'}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="w-full flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
        {/* MODEL A COLUMN */}
      <div className="flex flex-col h-full overflow-hidden p-4 space-y-3">
        {/* Model A Header / Selector */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/80 bg-muted/20">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 shrink-0 font-mono text-[11px]">
              Modelo A
            </Badge>
            <select
              value={modelA}
              onChange={(e) => onModelAChange(e.target.value)}
              className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary truncate flex-1"
            >
              {groupedModels.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName || m.id}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {streamStateA.isLoading && (
            <div className="flex items-center gap-1 text-[11px] text-primary font-medium shrink-0 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Gerando...</span>
            </div>
          )}
        </div>

        {/* Metrics Bar A */}
        {(streamStateA.metrics || streamStateA.ttft) && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground font-mono">
            {streamStateA.ttft && (
              <span className="flex items-center gap-1" title="Time To First Token">
                <Clock className="w-3 h-3 text-amber-500" />
                TTFT: {streamStateA.ttft}ms
              </span>
            )}
            {streamStateA.metrics?.tokensPerSec && (
              <span className="flex items-center gap-1" title="Tokens por segundo">
                <Zap className="w-3 h-3 text-green-500" />
                {streamStateA.metrics.tokensPerSec} t/s
              </span>
            )}
            {streamStateA.metrics?.estimatedTokens && (
              <span className="flex items-center gap-1" title="Total de tokens">
                <Cpu className="w-3 h-3 text-blue-500" />
                {streamStateA.metrics.estimatedTokens} tokens
              </span>
            )}
          </div>
        )}

        {/* Reasoning Accordion A */}
        {streamStateA.reasoning && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowReasoningA(!showReasoningA)}
              className="w-full flex items-center justify-between p-2.5 text-primary font-medium text-left hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 animate-pulse" />
                <span>Raciocínio ({streamStateA.reasoning.length} chars)</span>
              </div>
              {showReasoningA ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {showReasoningA && (
              <div className="p-3 border-t border-primary/15 bg-background/50 font-mono text-[11.5px] text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                {streamStateA.reasoning}
              </div>
            )}
          </div>
        )}

        {/* Content Box A */}
        <div className="flex-1 overflow-y-auto p-4 rounded-xl border border-border/60 bg-card/60 custom-scrollbar space-y-2">
          {streamStateA.error ? (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{streamStateA.error}</div>
            </div>
          ) : streamStateA.content ? (
            <MarkdownRenderer 
              content={streamStateA.content} 
              sources={streamStateA.sources || []}
              onPreviewArtifact={onPreviewArtifact} 
            />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
              Aguardando envio de prompt para comparar...
            </div>
          )}
        </div>

        {/* Bottom Actions A */}
        {streamStateA.content && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(streamStateA.content, setCopiedA)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Copiar resposta"
              >
                {copiedA ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFeedbackA(feedbackA === 'up' ? null : 'up')}
                className={cn("h-8 px-2 text-xs", feedbackA === 'up' ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:text-foreground")}
                title="Melhor resposta"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFeedbackA(feedbackA === 'down' ? null : 'down')}
                className={cn("h-8 px-2 text-xs", feedbackA === 'down' ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-foreground")}
                title="Pior resposta"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button
              size="sm"
              onClick={() => onSelectWinningResponse?.(streamStateA.content, modelA)}
              className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
            >
              <span>Escolher esta</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* MODEL B COLUMN */}
      <div className="flex flex-col h-full overflow-hidden p-4 space-y-3">
        {/* Model B Header / Selector */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/80 bg-muted/20">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 shrink-0 font-mono text-[11px]">
              Modelo B
            </Badge>
            <select
              value={modelB}
              onChange={(e) => onModelBChange(e.target.value)}
              className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary truncate flex-1"
            >
              {groupedModels.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName || m.id}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {streamStateB.isLoading && (
            <div className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium shrink-0 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Gerando...</span>
            </div>
          )}
        </div>

        {/* Metrics Bar B */}
        {(streamStateB.metrics || streamStateB.ttft) && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground font-mono">
            {streamStateB.ttft && (
              <span className="flex items-center gap-1" title="Time To First Token">
                <Clock className="w-3 h-3 text-amber-500" />
                TTFT: {streamStateB.ttft}ms
              </span>
            )}
            {streamStateB.metrics?.tokensPerSec && (
              <span className="flex items-center gap-1" title="Tokens por segundo">
                <Zap className="w-3 h-3 text-green-500" />
                {streamStateB.metrics.tokensPerSec} t/s
              </span>
            )}
            {streamStateB.metrics?.estimatedTokens && (
              <span className="flex items-center gap-1" title="Total de tokens">
                <Cpu className="w-3 h-3 text-blue-500" />
                {streamStateB.metrics.estimatedTokens} tokens
              </span>
            )}
          </div>
        )}

        {/* Reasoning Accordion B */}
        {streamStateB.reasoning && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowReasoningB(!showReasoningB)}
              className="w-full flex items-center justify-between p-2.5 text-purple-600 dark:text-purple-400 font-medium text-left hover:bg-purple-500/10 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 animate-pulse" />
                <span>Raciocínio ({streamStateB.reasoning.length} chars)</span>
              </div>
              {showReasoningB ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {showReasoningB && (
              <div className="p-3 border-t border-purple-500/15 bg-background/50 font-mono text-[11.5px] text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                {streamStateB.reasoning}
              </div>
            )}
          </div>
        )}

        {/* Content Box B */}
        <div className="flex-1 overflow-y-auto p-4 rounded-xl border border-border/60 bg-card/60 custom-scrollbar space-y-2">
          {streamStateB.error ? (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{streamStateB.error}</div>
            </div>
          ) : streamStateB.content ? (
            <MarkdownRenderer 
              content={streamStateB.content} 
              sources={streamStateB.sources || []}
              onPreviewArtifact={onPreviewArtifact} 
            />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
              Aguardando envio de prompt para comparar...
            </div>
          )}
        </div>

        {/* Bottom Actions B */}
        {streamStateB.content && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(streamStateB.content, setCopiedB)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Copiar resposta"
              >
                {copiedB ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFeedbackB(feedbackB === 'up' ? null : 'up')}
                className={cn("h-8 px-2 text-xs", feedbackB === 'up' ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:text-foreground")}
                title="Melhor resposta"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFeedbackB(feedbackB === 'down' ? null : 'down')}
                className={cn("h-8 px-2 text-xs", feedbackB === 'down' ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-foreground")}
                title="Pior resposta"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button
              size="sm"
              onClick={() => onSelectWinningResponse?.(streamStateB.content, modelB)}
              className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
            >
              <span>Escolher esta</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

export default CompareChatView;

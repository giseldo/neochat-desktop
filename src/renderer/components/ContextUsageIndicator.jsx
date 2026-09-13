import { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { calculateContextUsage } from '../lib/contextUsage';

export function ContextUsageIndicator({
  messages = [],
  selectedModel = '',
  modelConfigs = {},
  draftMessage = '',
  draftFiles = [],
  className = '',
  onClick = null
}) {
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const stats = useMemo(() => {
    return calculateContextUsage({
      messages,
      selectedModel,
      modelConfigs,
      draftMessage,
      draftFiles
    });
  }, [messages, selectedModel, modelConfigs, draftMessage, draftFiles]);

  const {
    conversationTokens,
    totalContext,
    clampedPercentage,
    displayPercentage,
    usedPctStr,
    leftPctStr
  } = stats;

  // SVG circle calculation for radius 7
  // Circumference = 2 * PI * 7 ≈ 43.982
  const circumference = 43.982;
  const dashOffset = circumference - (clampedPercentage / 100) * circumference;

  // Determine state colors based on usage threshold
  const isHigh = clampedPercentage >= 90;
  const isMedium = clampedPercentage >= 70 && !isHigh;

  const colorClasses = isHigh
    ? {
        ring: 'text-rose-500',
        pill: 'border-rose-400/60 dark:border-rose-500/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-900/40'
      }
    : isMedium
    ? {
        ring: 'text-amber-500',
        pill: 'border-amber-400/60 dark:border-amber-500/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/40'
      }
    : {
        ring: 'text-sky-500 dark:text-sky-400',
        pill: 'border-sky-400/60 dark:border-sky-500/50 bg-sky-50/50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100/60 dark:hover:bg-sky-900/30'
      };

  const showTooltip = isHovered || isFocused;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "h-7 px-2 flex items-center gap-1.5 rounded-full border transition-all select-none cursor-pointer focus:outline-none shadow-2xs shrink-0",
          colorClasses.pill,
          className
        )}
        aria-label={`${conversationTokens} / ${totalContext} tokens (${displayPercentage}%)`}
        title={t('chat.contextUsageTooltip', null, 'Uso do Contexto do Modelo')}
      >
        <svg
          className="w-3.5 h-3.5 -rotate-90 flex-shrink-0"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          {/* Background track circle */}
          <circle
            cx="10"
            cy="10"
            r="7"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            className="opacity-20"
          />
          {/* Progress arc circle */}
          <circle
            cx="10"
            cy="10"
            r="7"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={cn("transition-all duration-300", colorClasses.ring)}
          />
        </svg>

        <span className="text-[11px] font-mono font-semibold leading-none">
          {displayPercentage}%
        </span>
      </button>

      {/* Floating Tooltip displaying exact context usage */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute bottom-full right-0 mb-2 p-2.5 rounded-xl bg-popover border border-border text-popover-foreground shadow-xl backdrop-blur-sm z-50 pointer-events-none whitespace-nowrap select-none text-left animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="text-xs text-foreground/90 font-medium leading-relaxed">
            <div>
              {t(
                'chat.currentConversationTokens',
                { tokens: conversationTokens.toLocaleString() },
                `Current conversation tokens: ${conversationTokens}`
              )}
            </div>
            <div>
              {t(
                'chat.totalLoadedContext',
                { context: totalContext.toLocaleString() },
                `Total loaded context: ${totalContext}`
              )}
            </div>
            <div className="text-muted-foreground mt-0.5">
              {t(
                'chat.contextUsageSummary',
                { used: usedPctStr, left: leftPctStr },
                `${usedPctStr}% used (${leftPctStr}% left)`
              )}
            </div>
            <div className="text-[10.5px] text-primary font-medium mt-1.5 pt-1.5 border-t border-border/50 flex items-center gap-1">
              <span>{t('chat.clickToConfigureModel', null, 'Clique para configurar parâmetros do modelo')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContextUsageIndicator;

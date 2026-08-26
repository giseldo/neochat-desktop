import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Mic, 
  Camera, 
  Bot, 
  Scale, 
  Zap, 
  Terminal, 
  FolderKanban, 
  FileCode, 
  Globe, 
  Coffee, 
  Smile, 
  ShieldCheck, 
  Cpu, 
  Lightbulb, 
  Dices,
  RefreshCw,
  ArrowRight,
  Key
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getRandomGreeting, getRandomTip, SUGGESTION_PROMPTS } from '../data/welcomeTips';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

import { NeoSymbol, ClaudeAsterisk } from './NeoSymbol';
export { NeoSymbol, ClaudeAsterisk };

const getTipIcon = (iconName) => {
  const props = { className: "w-3.5 h-3.5 shrink-0" };
  switch (iconName) {
    case 'Mic': return <Mic {...props} />;
    case 'Camera': return <Camera {...props} />;
    case 'Bot': return <Bot {...props} />;
    case 'Scale': return <Scale {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'Zap': return <Zap {...props} />;
    case 'Terminal': return <Terminal {...props} />;
    case 'FolderKanban': return <FolderKanban {...props} />;
    case 'FileCode': return <FileCode {...props} />;
    case 'Globe': return <Globe {...props} />;
    case 'Coffee': return <Coffee {...props} />;
    case 'Smile': return <Smile {...props} />;
    case 'ShieldCheck': return <ShieldCheck {...props} />;
    case 'Cpu': return <Cpu {...props} />;
    default: return <Lightbulb {...props} />;
  }
};

export default function WelcomeScreen({ 
  onSelectPrompt,
  showTips = false,
  showWelcomeTips,
  showSuggestions = false,
  showWelcomeSuggestions,
  hasNoModels = false,
  className = ""
}) {
  const isTipsVisible = showWelcomeTips !== undefined ? showWelcomeTips : showTips;
  const isSuggestionsVisible = showWelcomeSuggestions !== undefined ? showWelcomeSuggestions : showSuggestions;
  const { language, t } = useLanguage();
  const lang = language === 'en' ? 'en' : 'pt';

  const [greeting, setGreeting] = useState(() => getRandomGreeting(lang));
  const [currentTip, setCurrentTip] = useState(() => getRandomTip(lang));
  const [isFading, setIsFading] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const [isGreetingSpinning, setIsGreetingSpinning] = useState(false);

  // Sync when language changes
  useEffect(() => {
    setGreeting(getRandomGreeting(lang));
    setCurrentTip(getRandomTip(lang));
  }, [lang]);

  const handleNextTip = useCallback(() => {
    setIsRotating(true);
    setIsFading(true);
    setTimeout(() => {
      setCurrentTip(prev => getRandomTip(lang, prev?.id));
      setIsFading(false);
      setTimeout(() => setIsRotating(false), 300);
    }, 150);
  }, [lang]);

  const handleShuffleGreeting = useCallback(() => {
    setIsGreetingSpinning(true);
    setGreeting(getRandomGreeting(lang));
    setTimeout(() => setIsGreetingSpinning(false), 600);
  }, [lang]);

  const suggestions = SUGGESTION_PROMPTS.map(item => ({
    id: item.id,
    icon: item.icon,
    label: item.label[lang] || item.label.pt,
    prompt: item.prompt[lang] || item.prompt.pt
  }));

  return (
    <div className={cn("flex flex-col items-center justify-center text-center select-none w-full max-w-3xl mx-auto mb-6 px-4 animate-in fade-in duration-300", className)}>
      {/* Neo Greeting Header */}
      <div 
        className="flex items-center justify-center gap-3.5 mb-5 cursor-pointer group"
        onClick={handleShuffleGreeting}
        title={lang === 'pt' ? 'Clique para trocar saudação' : 'Click to change greeting'}
      >
        <NeoSymbol 
          className="w-8 h-8 md:w-9 md:h-9 group-hover:scale-110 transition-transform duration-300" 
          spinning={true}
          spinBurst={isGreetingSpinning}
        />
        <h2 className="text-2xl md:text-3xl lg:text-[2rem] font-medium tracking-tight text-foreground font-serif group-hover:text-primary transition-colors">
          {greeting}
        </h2>
      </div>

      {/* No Models Available Notice */}
      {hasNoModels && (
        <div className="w-full max-w-xl mb-6 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-foreground shadow-sm animate-in fade-in duration-300 text-left">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <Key className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {t('chat.noModelsBannerTitle')}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {t('chat.noModelsBannerDesc')}
              </p>
              <Link 
                to="/settings"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 text-xs font-medium transition-colors shadow-xs"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{t('common.configureApiKey')}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Random Tip / Joke Card */}
      {isTipsVisible && currentTip && (
        <div 
          className="w-full max-w-xl mb-6 bg-card/60 hover:bg-card/90 dark:bg-card/40 dark:hover:bg-card/70 backdrop-blur-sm border border-border/70 hover:border-primary/30 rounded-2xl p-3.5 md:p-4 shadow-sm transition-all duration-300 text-left group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 mt-0.5 shadow-2xs border",
                currentTip.type === 'humor'
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  : currentTip.type === 'shortcut'
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                  : "bg-primary/10 text-primary border-primary/20"
              )}>
                {getTipIcon(currentTip.icon)}
                <span>{currentTip.badge}</span>
              </span>

              <p 
                className={cn(
                  "text-xs md:text-sm text-foreground/80 leading-relaxed transition-opacity duration-200",
                  isFading ? "opacity-0" : "opacity-100"
                )}
              >
                {currentTip.text}
              </p>
            </div>

            {/* Shuffle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNextTip();
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all shrink-0 hover:scale-105 active:scale-95"
              title={lang === 'pt' ? 'Ver outra dica ou curiosidade' : 'See another tip or joke'}
              aria-label="Next tip"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 transition-transform duration-300", isRotating && "rotate-180")} />
            </button>
          </div>
        </div>
      )}

      {/* Suggestion Prompts / Quick Inspiration Chips */}
      {isSuggestionsVisible && suggestions.length > 0 && (
        <div className="w-full flex flex-wrap items-center justify-center gap-2 max-w-2xl">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPrompt && onSelectPrompt(item.prompt)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/80 hover:bg-accent/80 hover:border-primary/40 border border-border/80 text-xs font-medium text-foreground/85 hover:text-foreground shadow-2xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

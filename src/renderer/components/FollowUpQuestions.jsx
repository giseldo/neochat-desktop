import { useId } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FollowUpQuestions({ questions = [], onClick, disabled = false }) {
  const headingId = useId();
  const { t } = useLanguage();
  const visibleQuestions = questions
    .map(question => String(question || '').trim())
    .filter(Boolean)
    .slice(0, 5);

  if (visibleQuestions.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      className="mt-3 mb-2 flex px-3 py-1 animate-in fade-in-0 slide-in-from-top-2 duration-300 print:hidden"
    >
      <div className="w-8 shrink-0 md:w-12" />
      <div className="min-w-0 flex-1 pl-1 md:pl-0 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80 select-none">
          <Sparkles className="h-3.5 w-3.5 text-primary/70" />
          <h2 id={headingId}>{t('settings.relatedQuestionsTitle') || 'Perguntas relacionadas'}</h2>
        </div>
        <div className="flex flex-col gap-1.5">
          {visibleQuestions.map((question, index) => (
            <button
              key={`${question}-${index}`}
              type="button"
              aria-label={`Perguntar: ${question}`}
              onClick={() => onClick?.(question)}
              disabled={disabled}
              className="group flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/70 hover:border-primary/40 px-3.5 py-2 text-left text-sm text-foreground/90 transition-all hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <span className="min-w-0 break-words line-clamp-2">{question}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}


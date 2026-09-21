import { useId } from 'react';

export default function FollowUpQuestions({ questions = [], onClick, disabled = false }) {
  const headingId = useId();
  const visibleQuestions = questions.map(question => String(question || '').trim()).filter(Boolean).slice(0, 5);
  if (visibleQuestions.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="mb-2 flex px-3 py-1 animate-in fade-in-0 slide-in-from-top-2 duration-500 print:hidden">
      <h2 id={headingId} className="sr-only">Perguntas relacionadas</h2>
      <div className="w-8 shrink-0 md:w-12" />
      <ul className="min-w-0 flex-1 divide-y divide-border/70 pl-1 md:pl-0">
        {visibleQuestions.map((question, index) => (
          <li key={`${question}-${index}`} className="min-w-0">
            <button type="button" aria-label={`Perguntar: ${question}`} onClick={() => onClick?.(question)} disabled={disabled} className="w-full rounded-md px-2 py-2 text-left text-sm leading-relaxed text-muted-foreground/75 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50">
              <span className="block min-w-0 break-words">{question}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

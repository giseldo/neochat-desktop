import React, { useState } from 'react';
import { Globe, ExternalLink, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export function SourcesList({ sources = [], className = '' }) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!sources || sources.length === 0) return null;

  return (
    <div className={cn("my-3 rounded-xl border border-border/70 bg-card/60 overflow-hidden shadow-xs text-foreground", className)}>
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors select-none text-xs"
      >
        <div className="flex items-center gap-2 font-medium text-foreground">
          <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <span>{t('sources.title')}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-semibold">
            {sources.length}
          </span>
        </div>

        <button 
          type="button" 
          className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-transform"
          aria-label={isExpanded ? "Collapse sources" : "Expand sources"}
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Sources Grid / List */}
      {isExpanded && (
        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sources.map((source, index) => {
            const domain = source.domain || (source.url ? (() => {
              try { return new URL(source.url).hostname.replace(/^www\./, ''); } catch { return ''; }
            })() : '');

            const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;

            return (
              <a
                key={source.url || index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col p-2.5 rounded-lg border border-border/50 bg-background/80 hover:bg-muted/50 hover:border-primary/40 hover:shadow-xs transition-all no-underline text-foreground"
                title={source.snippet || source.title}
              >
                <div className="flex items-center gap-2 mb-1.5 min-w-0">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    {index + 1}
                  </span>
                  
                  {faviconUrl ? (
                    <img 
                      src={faviconUrl} 
                      alt="" 
                      className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}

                  <span className="text-[11px] font-medium text-muted-foreground truncate group-hover:text-foreground">
                    {domain || 'web'}
                  </span>

                  <ExternalLink className="w-3 h-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 group-hover:text-primary ml-auto shrink-0 transition-opacity" />
                </div>

                <div className="text-xs font-medium text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {source.title || source.url}
                </div>

                {source.snippet && (
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {source.snippet}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SourcesList;

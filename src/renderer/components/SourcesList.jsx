import React, { useState } from 'react';
import { Globe, ExternalLink, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export function SourcesList({ sources = [], className = '' }) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className={cn("my-1.5 rounded-md border border-border/50 bg-muted/60 overflow-hidden shadow-xs text-foreground", className)}>
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-2.5 py-1 hover:bg-muted/80 cursor-pointer transition-colors select-none text-xs"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded shrink-0">
            <Globe className="w-3 h-3 shrink-0" />
            <span>{t('sources.title')}</span>
          </span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-semibold shrink-0">
            {sources.length}
          </span>
        </div>

        <ChevronDown 
          className={cn("w-3 h-3 text-muted-foreground hover:text-foreground shrink-0 transition-transform duration-200 ml-1", isExpanded && "rotate-180")} 
        />
      </div>

      {/* Sources Grid / List */}
      {isExpanded && (
        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-border/40 bg-card/40">
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

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Copy, Check, ExternalLink, FileCode, Folder } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function KnowledgeSourcesList({ sources = [] }) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  if (!sources || sources.length === 0) return null;

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenFolder = (filePath) => {
    if (window.electron?.rag?.openFolder) {
      // Open directory of the file
      window.electron.rag.openFolder(filePath);
    }
  };

  return (
    <div className="my-1.5 rounded-md border border-border/50 bg-muted/60 overflow-hidden shadow-xs text-foreground">
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="flex items-center justify-between px-2.5 py-1 hover:bg-muted/80 cursor-pointer select-none transition-colors text-xs"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
            <BookOpen className="w-3 h-3 shrink-0" />
            <span>{t('rag.knowledgeSourcesTitle')}</span>
          </span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-semibold shrink-0">
            {sources.length}
          </span>
        </div>

        <ChevronDown 
          className={cn("w-3 h-3 text-muted-foreground hover:text-foreground shrink-0 transition-transform duration-200 ml-1", isExpanded && "rotate-180")} 
        />
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-2.5 space-y-2 border-t border-border/40 bg-card/40">
          {sources.map((item, idx) => {
            const chunkId = item.id || `k_${idx}`;
            const isCopied = copiedId === chunkId;
            const startLine = item.startLine || 1;
            const endLine = item.endLine || 1;
            const relPath = item.relativePath || item.filePath || 'file';

            return (
              <div 
                key={chunkId}
                className="rounded-lg border border-border/50 bg-background/80 dark:bg-background/50 overflow-hidden text-xs"
              >
                {/* File Bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/40">
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <FileCode className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono font-medium text-foreground truncate" title={item.filePath}>
                      {relPath}
                    </span>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono font-medium">
                      L{startLine}-{endLine}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.score && (
                      <span className="text-[10px] text-muted-foreground hidden sm:inline" title="BM25 Relevance Score">
                        {t('rag.scoreLabel')} {(item.score * 10).toFixed(1)}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(chunkId, item.content || '');
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      title={t('rag.copySnippet')}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {item.filePath && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFolder(item.filePath);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                        title={t('rag.openFolder')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Snippet Content */}
                {item.content && (
                  <pre className="p-2.5 font-mono text-[11.5px] leading-relaxed overflow-x-auto text-foreground/90 bg-muted/10 max-h-48 overflow-y-auto">
                    <code>{item.content}</code>
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

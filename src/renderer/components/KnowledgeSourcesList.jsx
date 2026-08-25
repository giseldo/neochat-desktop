import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Copy, Check, ExternalLink, FileCode, Folder } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function KnowledgeSourcesList({ sources = [] }) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
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
    <div className="my-3 rounded-xl border border-border/70 bg-card/60 dark:bg-card/40 backdrop-blur-xs overflow-hidden shadow-xs">
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 hover:bg-muted/70 cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground">
            {t('rag.knowledgeSourcesTitle')}
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {sources.length}
          </span>
        </div>

        <button 
          type="button" 
          className="text-muted-foreground hover:text-foreground p-0.5 rounded-md"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 space-y-2.5">
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

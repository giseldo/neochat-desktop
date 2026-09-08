import React, { useState, useEffect, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Globe, 
  BookOpen, 
  FileText, 
  Wrench, 
  ChevronDown, 
  Loader2, 
  Sparkles, 
  Layout, 
  ExternalLink, 
  Undo2, 
  Copy, 
  Check 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCanvas } from '../context/CanvasContext';
import { CanvasCard } from './CanvasCard';
import { cn } from '../lib/utils';

/**
 * Dedicated first-class component for Canvas tool calls in chat messages.
 * Displays version (v1, v2, etc.), document title, word count, quick open/restore action,
 * and an expandable document preview.
 */
function CanvasToolCall({ toolCall, toolResult, parsedData, allMessages, isPending, error }) {
  const { t } = useLanguage();
  const { canvasDoc, isOpen: isCanvasOpen, restoreOrOpenVersion, openCanvas } = useCanvas();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  let args = {};
  try {
    args = JSON.parse(toolCall?.function?.arguments || '{}');
  } catch (e) {
    args = {};
  }

  const functionName = toolCall?.function?.name || '';

  // 1. Resolve version number
  const version = useMemo(() => {
    if (parsedData?.document?.version) return Number(parsedData.document.version);
    if (parsedData?.version) return Number(parsedData.version);

    if (toolResult && typeof toolResult === 'string') {
      const vMatch = toolResult.match(/"version"\s*:\s*(\d+)/) || toolResult.match(/vers[aã]o\s*(\d+)/i);
      if (vMatch) return parseInt(vMatch[1], 10);
    }

    if (functionName === 'canvas_create_document') return 1;

    if (Array.isArray(allMessages)) {
      let count = 0;
      for (const msg of allMessages) {
        if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
          for (const tc of msg.tool_calls) {
            const fn = tc.function?.name || tc.name;
            if (fn && fn.startsWith('canvas_') && fn !== 'canvas_get_document') {
              count++;
              if (tc.id === toolCall?.id) return count;
            }
          }
        }
      }
    }
    return 1;
  }, [parsedData, toolResult, functionName, allMessages, toolCall?.id]);

  // 2. Resolve document title
  const title = (
    args?.title ||
    parsedData?.document?.title ||
    parsedData?.title ||
    (canvasDoc?.history?.find(h => h.version === version)?.title) ||
    canvasDoc?.title ||
    'Documento Canvas'
  ).trim();

  // 3. Resolve language
  const language = (
    args?.language ||
    parsedData?.document?.language ||
    parsedData?.language ||
    canvasDoc?.language ||
    'markdown'
  ).toLowerCase();

  // 4. Resolve content
  const content = (
    parsedData?.document?.content ||
    parsedData?.content ||
    args?.content ||
    (canvasDoc?.history?.find(h => h.version === version)?.content) ||
    (args?.replacementText || args?.replacement_text || args?.newText || '')
  );

  // 5. Resolve summary
  const summary = (
    parsedData?.summary ||
    args?.summary ||
    (version > 1 ? `Versão ${version} gerada no Canvas` : 'Documento criado no Canvas')
  );

  // 6. Metrics
  const stats = useMemo(() => {
    if (parsedData?.document?.stats) return parsedData.document.stats;
    if (parsedData?.stats) return parsedData.stats;
    const text = String(content || '').trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    const lines = text ? text.split('\n').length : 0;
    return { words, chars, readingTime, lines };
  }, [parsedData, content]);

  // 7. Check active status in current CanvasContext
  const isCanvasDeleted = !canvasDoc;
  const isActiveVersion = Boolean(
    canvasDoc &&
    canvasDoc.version === version &&
    (!content || canvasDoc.content === content)
  );
  const isCurrentlyOpen = isCanvasOpen && isActiveVersion;

  const handleOpenOrRestore = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (restoreOrOpenVersion) {
      restoreOrOpenVersion({
        version,
        title,
        content,
        language,
        summary,
        docId: parsedData?.docId || parsedData?.document?.id
      });
    } else if (openCanvas) {
      openCanvas();
    }
  };

  const handleCopy = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  };

  const previewSnippet = content ? content.slice(0, 1200) : '';

  return (
    <div className="tool-call-container w-full max-w-2xl my-2">
      <div className={cn(
        "border rounded-xl transition-all duration-200 overflow-hidden shadow-xs",
        isActiveVersion 
          ? "border-primary/40 bg-card hover:border-primary/60" 
          : "border-border/60 bg-muted/40 hover:bg-muted/70 hover:border-border"
      )}>
        {/* Header Bar */}
        <div 
          className="flex items-center justify-between p-2.5 sm:px-3 cursor-pointer select-none gap-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-md shrink-0 shadow-2xs">
              <Layout className="w-3.5 h-3.5 shrink-0" />
              <span>Canvas v{version}</span>
            </span>

            <span className="text-xs font-medium text-foreground truncate" title={title}>
              &ldquo;{title}&rdquo;
            </span>

            {isPending && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0 ml-1" />
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Action Button */}
            <button
              type="button"
              onClick={handleOpenOrRestore}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer",
                isActiveVersion
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                  : isCanvasDeleted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-primary/10 text-primary border border-primary/25 hover:bg-primary hover:text-primary-foreground"
              )}
              title={
                isActiveVersion 
                  ? (isCurrentlyOpen ? (t('canvas.openActiveTooltip') || "Canvas aberto nesta versão") : (t('canvas.openCanvas') || "Abrir versão atual no Canvas"))
                  : isCanvasDeleted 
                    ? (t('canvas.restoreTooltip', { version }) || `Restaurar Versão ${version} no Canvas`) 
                    : (t('canvas.openVersionTooltip', { version }) || `Abrir Versão ${version} no Canvas`)
              }
            >
              {isActiveVersion ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isCurrentlyOpen ? (t('canvas.opened') || 'Aberto') : (t('canvas.openCanvas') || 'Abrir Canvas')}</span>
                </>
              ) : isCanvasDeleted ? (
                <>
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>{t('canvas.restore') || 'Restaurar'} v{version}</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('canvas.openVersion') || 'Abrir'} v{version}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              aria-label="Toggle details"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-2.5 text-xs bg-card/60">
            {/* Version details & meta */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                <span className="font-semibold text-foreground">{t('canvas.versionLabel', { version }) || `Versão ${version}`}</span>
                <span>•</span>
                <span>{stats.words} {t('canvas.words') || 'palavras'}</span>
                <span>•</span>
                <span>~{stats.readingTime} {t('canvas.readTime') || 'min de leitura'}</span>
                <span>•</span>
                <span className="uppercase font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/40">
                  {language}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground border border-border/50 text-xs transition-colors cursor-pointer"
                  title={t('common.copy') || 'Copiar texto desta versão'}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (t('common.copied') || 'Copiado!') : (t('common.copy') || 'Copiar')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenOrRestore}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-all shadow-xs cursor-pointer"
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>
                    {isActiveVersion 
                      ? (t('canvas.openInCanvas') || 'Abrir no Canvas') 
                      : (t('canvas.restoreVersionTitle', { version }) || `Restaurar Versão ${version} no Canvas`)}
                  </span>
                </button>
              </div>
            </div>

            {summary && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground italic bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{summary}</span>
              </div>
            )}

            {/* Formatted Content Preview */}
            {content ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>{t('canvas.documentPreview', { version }) || `Prévia do Documento (v${version})`}</span>
                  <span>{stats.lines} {t('canvas.lines') || 'linhas'}</span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 max-h-64 overflow-y-auto font-mono text-xs text-foreground/90 whitespace-pre-wrap select-text leading-relaxed">
                  {previewSnippet}
                  {content.length > 1200 && (
                    <div className="mt-2 text-[10px] text-muted-foreground italic border-t border-border/40 pt-1">
                      ... ({t('canvas.moreCharsNotice', { count: content.length - 1200 }) || `mais ${content.length - 1200} caracteres. Clique em "Abrir no Canvas" para visualizar e editar o documento completo`})
                    </div>
                  )}
                </div>
              </div>
            ) : isPending ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>{t('canvas.generatingDoc') || 'Gerando documento no Canvas...'}</span>
              </div>
            ) : null}

            {/* Error display if any */}
            {error && (
              <div className="text-red-500 text-xs p-2 bg-red-500/10 border border-red-500/20 rounded-md">
                <div className="font-medium mb-0.5">{t('canvas.canvasError') || 'Erro na ferramenta Canvas:'}</div>
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">{error}</pre>
              </div>
            )}

            {/* Raw JSON toggle for developers */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline cursor-pointer"
              >
                {showRawJson ? (t('canvas.hideJson') || 'Ocultar JSON técnico') : (t('canvas.showJson') || 'Ver argumentos JSON técnicos')}
              </button>

              {showRawJson && (
                <div className="mt-1.5 rounded-md overflow-x-auto">
                  <SyntaxHighlighter
                    language="json"
                    style={vscDarkPlus}
                    customStyle={{
                      borderRadius: '0.375rem',
                      margin: 0,
                      padding: '0.375rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#1c1d21'
                    }}
                    wrapLongLines={true}
                  >
                    {JSON.stringify(args, null, 2)}
                  </SyntaxHighlighter>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCall({ toolCall, toolResult, allMessages }) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  useEffect(() => {
    setResult(null);
    setError(null);
    setParsedData(null);

    if (toolResult) {
      try {
        const parsed = JSON.parse(toolResult);
        if (parsed.error) {
          setError(parsed.error);
        } else {
          setParsedData(parsed);
          setResult(JSON.stringify(parsed, null, 2));
        }
      } catch (e) {
        setResult(toolResult);
      }
    }
  }, [toolResult]);

  const formatFunctionName = (name) => {
    if (!name) return '';
    
    const words = name.split('_');
    
    const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    const restWords = words.slice(1);
    
    return [firstWord, ...restWords].join(' ');
  };

  if (!toolCall) return null;

  const { function: func, server_label } = toolCall;
  const functionName = func.name;
  const formattedName = formatFunctionName(functionName);
  let args = {};
  try {
    args = JSON.parse(func.arguments || '{}');
  } catch (e) {
    console.error("Failed to parse tool call arguments:", func.arguments, e);
    args = { parse_error: "Could not parse arguments", original_arguments: func.arguments };
  }

  const isPending = toolResult === null || toolResult === undefined;
  const isWebSearch = functionName === 'web_search';
  const isKnowledgeSearch = functionName === 'query_project_knowledge';
  const isReadFile = functionName === 'read_project_file';
  const isCanvasMutation = ['canvas_create_document', 'canvas_update_document', 'canvas_edit_selection'].includes(functionName);

  // If this is a Canvas document creation, update, or edit tool call, use the dedicated CanvasToolCall component!
  if (isCanvasMutation) {
    return (
      <CanvasToolCall
        toolCall={toolCall}
        toolResult={toolResult}
        parsedData={parsedData}
        allMessages={allMessages}
        isPending={isPending}
        error={error}
      />
    );
  }

  const isCanvasTool = functionName.startsWith('canvas_');
  const searchQuery = args?.query || args?.q || '';
  const filePathArg = args?.filePath || args?.path || '';

  let labelText = formattedName;
  if (isWebSearch) {
    labelText = searchQuery ? `"${searchQuery}"` : t('toolCall.webSearch');
  } else if (isKnowledgeSearch) {
    labelText = searchQuery ? `"${searchQuery}"` : t('toolCall.knowledgeBase');
  } else if (isReadFile) {
    labelText = filePathArg ? `${filePathArg}` : t('toolCall.readFile');
  } else if (isCanvasTool) {
    labelText = args?.title ? `"${args.title}"` : (args?.summary || formattedName);
  }

  return (
    <div className="tool-call-container w-fit max-w-full">
      <div className="border border-border/50 bg-muted/60 hover:bg-muted transition-colors rounded-md px-2.5 py-1 text-xs">
        <div 
          className="flex justify-between items-center cursor-pointer gap-2 select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isCanvasTool ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded shrink-0">
                <Layout className="w-3 h-3 shrink-0" />
                <span>Canvas</span>
              </span>
            ) : isWebSearch ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded shrink-0">
                <Globe className="w-3 h-3 shrink-0" />
                <span>{t('toolCall.webSearch')}</span>
              </span>
            ) : isKnowledgeSearch ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                <BookOpen className="w-3 h-3 shrink-0" />
                <span>{t('toolCall.knowledgeBase')}</span>
              </span>
            ) : isReadFile ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                <FileText className="w-3 h-3 shrink-0" />
                <span>{t('toolCall.readFile')}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted border border-border/40 px-1.5 py-0.5 rounded shrink-0">
                <Wrench className="w-3 h-3 text-muted-foreground shrink-0" />
                <span>{server_label ? `${server_label}` : t('toolCall.tool')}</span>
              </span>
            )}
            <span className="text-xs text-muted-foreground hover:text-foreground font-normal truncate max-w-[280px] sm:max-w-[420px]" title={labelText}>
              {labelText}
            </span>
            {isPending && !isExpanded && (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0 ml-0.5" />
            )}
          </div>
          <ChevronDown className={cn("w-3 h-3 text-muted-foreground hover:text-foreground shrink-0 transition-transform duration-200 ml-1", isExpanded && "rotate-180")} />
        </div>

        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-border/50 space-y-2 text-xs">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground mb-1">{t('toolCall.arguments')}:</div>
              <div className="rounded-md overflow-x-auto">
                <SyntaxHighlighter 
                  language="json" 
                  style={vscDarkPlus}
                  customStyle={{
                    borderRadius: '0.375rem', 
                    margin: 0,
                    padding: '0.375rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#1c1d21'
                  }}
                  wrapLongLines={true}
                >
                  {JSON.stringify(args, null, 2)}
                </SyntaxHighlighter>
              </div>
            </div>

            {isPending && (
              <div className="text-[11px] flex items-center text-muted-foreground gap-1.5 mt-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
                <span>{t('toolCall.executing')}</span>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-xs mt-1.5 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
                <div className="font-medium mb-0.5">{t('toolCall.error')}:</div>
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">{error}</pre>
              </div>
            )}

            {result && !error && (
              <div>
                <div className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center justify-between">
                  <span>{t('toolCall.result')}:</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {t('toolCall.characters', { count: result.length.toLocaleString() })}
                  </span>
                </div>
                <div className="rounded-md overflow-x-auto">
                  <SyntaxHighlighter 
                    language="json" 
                    style={vscDarkPlus}
                    customStyle={{
                      borderRadius: '0.375rem', 
                      margin: 0,
                      padding: '0.375rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#1c1d21'
                    }}
                    wrapLongLines={true}
                  >
                    {result}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ToolCall;
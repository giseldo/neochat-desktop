import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Globe, BookOpen, FileText, Wrench, ChevronDown, Loader2, Sparkles, Layout } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { CanvasCard } from './CanvasCard';
import { cn } from '../lib/utils';

function ToolCall({ toolCall, toolResult }) {
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

  // If this is a completed Canvas document creation/update, render CanvasCard directly!
  if (isCanvasTool && parsedData && parsedData.document) {
    return (
      <div className="w-full max-w-2xl my-2">
        <CanvasCard canvasData={parsedData} />
      </div>
    );
  }

  return (
    <div className="tool-call-container w-fit max-w-full my-1">
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
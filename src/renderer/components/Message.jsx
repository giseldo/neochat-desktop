import React, { useState, useRef, useEffect, useMemo } from 'react';
import ToolCall from './ToolCall';
import SourcesList from './SourcesList';
import KnowledgeSourcesList from './KnowledgeSourcesList';
import MarkdownRenderer from './MarkdownRenderer';
import { TextShimmer } from './ui/text-shimmer';
import { Badge } from './ui/badge';
import { Zap, Volume2, VolumeX, Copy, Check, RotateCw, Clock, Gauge, Layers, Info, GitBranch } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { extractThinking } from '../lib/messageUtils';
import { playSpeech, stopSpeech } from '../lib/ttsUtils';
import { cn } from '../lib/utils';

function Message({
  message,
  children,
  onToolCallExecute,
  allMessages,
  isLastMessage,
  messageIndex,
  onReloadFromMessage,
  onBranchFromMessage,
  loading,
  onActionsVisible,
  hideReasoningUI = false,
  combinedReasoning = null,
  combinedReasoningDuration = null,
  onPreviewArtifact
}) {
  const { t, language } = useLanguage();
  const { role, tool_calls, reasoning, isStreaming, executed_tools, liveReasoning, liveExecutedTools, reasoningSummaries, reasoningDuration, usage } = message;
  const [showReasoning, setShowReasoning] = useState(false);
  const [showExecutedTools, setShowExecutedTools] = useState(false);
  const [collapsedOutputs, setCollapsedOutputs] = useState(new Set());
  const [copySuccess, setCopySuccess] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSettings, setTtsSettings] = useState({ enabled: true, autoSpeak: false, voiceURI: '', rate: 1.05, pitch: 1 });
  const autoSpokenRef = useRef(null);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const wasStreamingRef = useRef(false);
  const actionTimeoutRef = useRef(null);
  
  const isUser = role === 'user';
  const isStreamingMessage = isStreaming === true;

  // Extract <think> / <thought> tags from message content
  const extracted = useMemo(() => {
    if (isUser || !message.content) {
      return { hasThink: false, thinking: '', cleanContent: message.content || '', isStreamingThink: false };
    }
    const rawText = typeof message.content === 'string'
      ? message.content
      : Array.isArray(message.content)
        ? message.content.filter(p => p.type === 'text').map(p => p.text).join('\n')
        : '';
    return extractThinking(rawText);
  }, [isUser, message.content]);

  // Combine reasoning from all sources: combinedReasoning (grouping), liveReasoning, reasoning field, and extracted thinking
  const currentReasoning = useMemo(() => {
    if (isUser) return '';
    const parts = [];
    if (combinedReasoning) {
      parts.push(combinedReasoning);
    } else {
      if (liveReasoning) parts.push(liveReasoning);
      else if (reasoning) parts.push(reasoning);
    }
    if (extracted.thinking && !parts.some(p => p.includes(extracted.thinking))) {
      parts.push(extracted.thinking);
    }
    return parts.join('\n\n---\n\n');
  }, [isUser, combinedReasoning, liveReasoning, reasoning, extracted.thinking]);

  const hasReasoning = (Boolean(currentReasoning) || extracted.isStreamingThink) && !isUser;
  const hasExecutedTools = (executed_tools?.length > 0 || liveExecutedTools?.length > 0) && !isUser;
  const hasReasoningSummaries = reasoningSummaries && reasoningSummaries.length > 0;
  
  const currentTools = liveExecutedTools?.length > 0 ? liveExecutedTools : executed_tools;
  const effectiveReasoningDuration = combinedReasoningDuration || reasoningDuration;
  
  const isReasoningComplete = (effectiveReasoningDuration && hasReasoning) || (!isStreamingMessage && hasReasoning) || (!extracted.isStreamingThink && hasReasoning);
  
  // Auto-collapse when streaming finishes
  useEffect(() => {
    window.electron?.getSettings?.().then(settings => setTtsSettings(current => ({ ...current, ...(settings.tts || {}) }))).catch(() => {});
  }, []);

  useEffect(() => {
    if (wasStreamingRef.current && !isStreamingMessage) {
      setShowReasoning(false);
    }
    wasStreamingRef.current = isStreamingMessage;
  }, [isStreamingMessage]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Debounced show actions
  useEffect(() => {
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
    }

    if (loading || !isLastMessage || isStreamingMessage) {
      setShowActions(false);
      return;
    }

    actionTimeoutRef.current = setTimeout(() => {
      setShowActions(true);
    }, 200);

    return () => {
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, [loading, isLastMessage, isStreamingMessage]);

  // Scroll to bottom when actions become visible
  useEffect(() => {
    if (showActions && onActionsVisible) {
      setTimeout(() => {
        onActionsVisible(true);
      }, 50);
    }
  }, [showActions, onActionsVisible]);

  const findToolResult = (toolCallId) => {
    if (!allMessages) return null;
    const toolMessage = allMessages.find(
      msg => msg.role === 'tool' && msg.tool_call_id === toolCallId
    );
    return toolMessage ? toolMessage.content : null;
  };

  // Extract web search sources
  const webSearchSources = useMemo(() => {
    if (isUser) return [];

    if (Array.isArray(message.sources) && message.sources.length > 0) {
      return message.sources;
    }

    const sources = [];

    // Check tool_calls + allMessages
    if (tool_calls && tool_calls.length > 0 && allMessages) {
      for (const tc of tool_calls) {
        if (tc.function?.name === 'web_search') {
          const res = findToolResult(tc.id);
          if (res) {
            try {
              const parsed = typeof res === 'string' ? JSON.parse(res) : res;
              if (Array.isArray(parsed.results)) {
                sources.push(...parsed.results);
              }
            } catch (e) {
              console.warn('Failed to parse web_search tool results:', e);
            }
          }
        }
      }
    }

    // Check executed_tools / liveExecutedTools
    const tools = liveExecutedTools?.length > 0 ? liveExecutedTools : executed_tools;
    if (tools && tools.length > 0) {
      for (const t of tools) {
        if (t.name === 'web_search' && t.output) {
          try {
            const parsed = typeof t.output === 'string' ? JSON.parse(t.output) : t.output;
            if (Array.isArray(parsed.results)) {
              for (const r of parsed.results) {
                if (!sources.some(s => s.url === r.url)) {
                  sources.push(r);
                }
              }
            }
          } catch (e) {
            console.warn('Failed to parse executed_tools web_search:', e);
          }
        }
      }
    }

    // Deduplicate by URL
    const unique = [];
    for (const s of sources) {
      if (s && s.url && !unique.some(u => u.url === s.url)) {
        unique.push(s);
      }
    }

    return unique;
  }, [isUser, message.sources, tool_calls, allMessages, executed_tools, liveExecutedTools]);

  // Extract Local Knowledge Base / RAG sources
  const knowledgeSources = useMemo(() => {
    if (isUser) return [];

    const sources = [];

    // Check tool_calls + allMessages
    if (tool_calls && tool_calls.length > 0 && allMessages) {
      for (const tc of tool_calls) {
        if (tc.function?.name === 'query_project_knowledge' || tc.function?.name === 'read_project_file') {
          const res = findToolResult(tc.id);
          if (res) {
            try {
              const parsed = typeof res === 'string' ? JSON.parse(res) : res;
              if (Array.isArray(parsed.results)) {
                sources.push(...parsed.results);
              } else if (parsed.filePath && parsed.content) {
                sources.push(parsed);
              }
            } catch (e) {
              console.warn('Failed to parse RAG tool results:', e);
            }
          }
        }
      }
    }

    // Check executed_tools / liveExecutedTools
    const tools = liveExecutedTools?.length > 0 ? liveExecutedTools : executed_tools;
    if (tools && tools.length > 0) {
      for (const t of tools) {
        if ((t.name === 'query_project_knowledge' || t.name === 'read_project_file') && t.output) {
          try {
            const parsed = typeof t.output === 'string' ? JSON.parse(t.output) : t.output;
            if (Array.isArray(parsed.results)) {
              for (const r of parsed.results) {
                if (!sources.some(s => s.id === r.id || (s.filePath === r.filePath && s.startLine === r.startLine))) {
                  sources.push(r);
                }
              }
            } else if (parsed.filePath && parsed.content) {
              if (!sources.some(s => s.filePath === parsed.filePath && s.startLine === parsed.startLine)) {
                sources.push(parsed);
              }
            }
          } catch (e) {
            console.warn('Failed to parse executed_tools RAG:', e);
          }
        }
      }
    }

    return sources;
  }, [isUser, tool_calls, allMessages, executed_tools, liveExecutedTools]);

  const messageClasses = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
  const bubbleClasses = isUser
    ? `relative overflow-x-auto px-4 py-3 rounded-2xl max-w-xl max-h-[500px] overflow-y-auto bg-primary/10 border border-primary/20 text-foreground shadow-xs`
    : `relative w-full text-foreground`;
  const wrapperClasses = `message-content-wrapper text-foreground break-words text-sm overflow-hidden leading-relaxed`;

  const toggleReasoning = () => setShowReasoning(!showReasoning);
  const toggleExecutedTools = () => setShowExecutedTools(!showExecutedTools);
  
  const toggleOutputCollapse = (toolIndex) => {
    setCollapsedOutputs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolIndex)) {
        newSet.delete(toolIndex);
      } else {
        newSet.add(toolIndex);
      }
      return newSet;
    });
  };

  const handleCopy = async () => {
    try {
      const textToCopy = typeof message.content === 'string' 
        ? (extracted.cleanContent !== undefined ? extracted.cleanContent : message.content)
        : Array.isArray(message.content)
          ? extractThinking(message.content.filter(p => p.type === 'text').map(p => p.text || '').join('\n')).cleanContent
          : JSON.stringify(message.content);

      await navigator.clipboard.writeText(textToCopy || '');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      const rawText = typeof message.content === 'string' 
        ? (extracted.cleanContent !== undefined ? extracted.cleanContent : message.content)
        : Array.isArray(message.content)
          ? extractThinking(message.content.filter(p => p.type === 'text').map(p => p.text || '').join(' ')).cleanContent
          : '';

      if (!rawText.trim()) return;

      playSpeech({
        text: rawText,
        language: language === 'pt' ? 'pt' : 'en',
        voiceURI: ttsSettings.voiceURI,
        rate: Number(ttsSettings.rate) || 1.05,
        pitch: Number(ttsSettings.pitch) || 1,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    }
  };

  useEffect(() => {
    if (!ttsSettings.autoSpeak || isUser || !isLastMessage || isStreamingMessage || loading) return;
    const key = `${message.timestamp || message.createdAt || ''}:${typeof message.content === 'string' ? message.content : ''}`;
    if (!key || autoSpokenRef.current === key) return;
    autoSpokenRef.current = key;
    toggleSpeech();
  }, [ttsSettings.autoSpeak, isUser, isLastMessage, isStreamingMessage, loading, message.content, message.timestamp, message.createdAt]);

  const isOutputCollapsed = (toolIndex) => {
    return !collapsedOutputs.has(toolIndex);
  };

  // Calculate speed & tokens
  const completionTokens = usage?.completion_tokens ?? usage?.output_tokens ?? 0;
  const promptTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? 0;
  const totalTokens = usage?.total_tokens || (completionTokens + promptTokens);
  const durationSec = usage?.completion_time || usage?.total_time || usage?.client_duration || 0;
  const tokensPerSec = durationSec > 0 && completionTokens > 0 
    ? Math.round(completionTokens / durationSec) 
    : 0;
  const ttftMs = usage?.ttft ? Math.round(usage.ttft) : null;

  return (
    <div className={messageClasses}>
      <div className={bubbleClasses}>
        {isStreamingMessage && (
          <div className="streaming-indicator mb-2">
            <span className="dot-1"></span>
            <span className="dot-2"></span>
            <span className="dot-3"></span>
          </div>
        )}

        {/* Reasoning and Tools Dropdowns */}
        {!isUser && (hasReasoning || hasExecutedTools || hasReasoningSummaries) && (
          <div className="pb-1.5 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {!hideReasoningUI && hasReasoningSummaries && isStreamingMessage && !effectiveReasoningDuration && !message.content && (
                <div className="flex flex-col gap-1.5 w-full mb-2">
                  {(() => {
                    const latestSummary = reasoningSummaries[reasoningSummaries.length - 1];
                    return (
                      <div key={latestSummary.index} className="flex items-center text-sm">
                        <TextShimmer as="span" duration={2.5} spread={3} className="text-sm font-medium text-foreground">
                          {latestSummary.summary}
                        </TextShimmer>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {!hideReasoningUI && hasReasoningSummaries && isReasoningComplete && effectiveReasoningDuration != null && (
                <button 
                  onClick={toggleReasoning}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md bg-muted/60 hover:bg-muted border border-border/50 cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-primary" />
                  <span>{t('message.thoughtFor', { duration: effectiveReasoningDuration })}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-3 w-3 ml-0.5 transition-transform duration-200 ${showReasoning ? 'rotate-90' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              
              {!hideReasoningUI && hasReasoning && !hasReasoningSummaries && (
                <button 
                  onClick={toggleReasoning}
                  className="flex items-center text-xs px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors font-medium cursor-pointer"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-3 w-3 mr-1 transition-transform duration-200 ${showReasoning ? 'rotate-90' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {isStreamingMessage && (liveReasoning || extracted.isStreamingThink)
                    ? t('message.thinking')
                    : (effectiveReasoningDuration 
                        ? t('message.thoughtFor', { duration: effectiveReasoningDuration }) 
                        : t('message.viewReasoning'))}
                  {isStreamingMessage && (liveReasoning || extracted.isStreamingThink) && (
                    <span className="w-2.5 h-2.5 ml-1.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
                  )}
                </button>
              )}
              
              {hasExecutedTools && (
                <button 
                  onClick={toggleExecutedTools}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md bg-muted/60 hover:bg-muted border border-border/50 cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{t('message.executedTools', { count: currentTools?.length || 0 })}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-3 w-3 ml-0.5 transition-transform duration-200 ${showExecutedTools ? 'rotate-90' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Reasoning content */}
            {!hideReasoningUI && showReasoning && currentReasoning && (
              <div className="mt-2 p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground transition-all duration-200 max-h-[500px] overflow-y-auto font-mono">
                <MarkdownRenderer
                  content={currentReasoning
                    .replace(/<tool[^>]*>([\s\S]*?)<\/tool>/gi, '**Tool call:**\n```$1```')
                    .replace(/<output[^>]*>([\s\S]*?)<\/output>/gi, '**Tool output:**\n $1')
                    .replace(/<\/?\s*(think|thought|thinking)(?:\s[^>]*)?>/gi, '')
                  }
                  disableMath={true}
                  onPreviewArtifact={onPreviewArtifact}
                />
              </div>
            )}
            
            {/* Tool execution content */}
            {showExecutedTools && currentTools?.length > 0 && (
              <div className="space-y-2 mt-2">
                {currentTools.map((tool, index) => {
                  const isLive = liveExecutedTools?.length > 0;
                  const isExecuting = isLive && !tool.output;
                  return (
                    <div key={`tool-${tool.index || index}`} className="p-2.5 rounded-md text-xs border border-border/50 bg-muted/40">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-foreground">{tool.name || tool.type || 'tool'}</span>
                        {tool.server_label && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground border border-border/50">
                            {tool.server_label}
                          </span>
                        )}
                        <span className={`text-[11px] font-medium ${isExecuting ? 'text-amber-500 animate-pulse' : 'text-green-500'}`}>
                          {isExecuting ? t('message.executing') : t('message.completed')}
                        </span>
                      </div>
                      
                      {tool.arguments && (
                        <div className="mb-2">
                          <div className="text-[11px] mb-1 text-muted-foreground font-medium">{t('message.arguments')}</div>
                          <pre className="p-2 rounded overflow-x-auto text-[11px] bg-muted/60 border border-border/50 text-foreground font-mono">
                            {typeof tool.arguments === 'string' ? tool.arguments : JSON.stringify(tool.arguments, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {tool.output && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[11px] text-muted-foreground font-medium">{t('message.output')}</div>
                            <button
                              onClick={() => toggleOutputCollapse(tool.index || index)}
                              className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border/50"
                            >
                              {isOutputCollapsed(tool.index || index) ? t('message.expand') : t('message.collapse')}
                            </button>
                          </div>
                          {isOutputCollapsed(tool.index || index) ? (
                            <div className="bg-muted/30 p-2 rounded text-[11px] border border-border/50 text-muted-foreground italic">
                              {t('message.hiddenOutput', { count: tool.output.length })}
                            </div>
                          ) : (
                            <pre className="bg-muted/60 p-2 rounded overflow-x-auto text-[11px] border border-border/50 text-foreground font-mono max-h-60 overflow-y-auto">
                              {tool.output}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className={wrapperClasses}>
          {children}
        </div>

        {/* Web Search Sources / Citations */}
        {webSearchSources.length > 0 && (
          <SourcesList sources={webSearchSources} />
        )}

        {/* Local Knowledge Base (RAG) Sources / Code Citations */}
        {knowledgeSources.length > 0 && (
          <KnowledgeSourcesList sources={knowledgeSources} />
        )}
        
        {/* Client-side tool calls */}
        {tool_calls && tool_calls.length > 0 && (() => {
          const clientSideToolCalls = tool_calls.filter(tc => !tc.server_label);
          return clientSideToolCalls.length > 0 ? (
            <div className="mb-2 space-y-1">
              {clientSideToolCalls.map((toolCall, index) => (
                <ToolCall 
                  key={toolCall.id || index} 
                  toolCall={toolCall} 
                  toolResult={findToolResult(toolCall.id)}
                />
              ))}
            </div>
          ) : null;
        })()}

        {/* Action bar and Performance Metrics */}
        {!isUser && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-border/70 text-xs text-muted-foreground">
            {/* Speed & Performance Metrics */}
            <div className="flex flex-wrap items-center gap-2">
              {tokensPerSec > 0 && (
                <div 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-semibold cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => setShowDetailedStats(!showDetailedStats)}
                  title={t('message.metricsTooltip')}
                >
                  <Zap className="w-3 h-3 text-primary fill-primary" />
                  <span>{tokensPerSec} t/s</span>
                </div>
              )}

              {ttftMs != null && ttftMs > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                  <Clock className="w-3 h-3" />
                  <span>TTFT: {ttftMs}ms</span>
                </div>
              )}

              {durationSec > 0 && (
                <div className="text-[11px] text-muted-foreground">
                  {durationSec.toFixed(2)}s
                </div>
              )}

              {/* Detailed popover/stats */}
              {showDetailedStats && (
                <div className="w-full mt-1 p-2 rounded-lg bg-card border border-border shadow-md text-xs space-y-1 animate-in fade-in-0">
                  <div className="flex items-center justify-between text-muted-foreground border-b border-border/50 pb-1 font-medium">
                    <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-primary" /> {t('message.inferenceMetrics')}</span>
                    <button onClick={() => setShowDetailedStats(false)} className="hover:text-foreground">✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>{t('message.tokensPrompt')} <span className="font-semibold text-foreground">{promptTokens}</span></div>
                    <div>{t('message.tokensResponse')} <span className="font-semibold text-foreground">{completionTokens}</span></div>
                    <div>{t('message.totalTokens')} <span className="font-semibold text-foreground">{totalTokens}</span></div>
                    <div>{t('message.speed')} <span className="font-semibold text-primary">{tokensPerSec} t/s</span></div>
                    {ttftMs && <div>{t('message.ttft')} <span className="font-semibold text-foreground">{ttftMs}ms</span></div>}
                    {usage?.queue_time && <div>{t('message.groqQueue')} <span className="font-semibold text-foreground">{(usage.queue_time * 1000).toFixed(0)}ms</span></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Actions: TTS, Copy, Reload */}
            <div className="flex items-center gap-1">
              {ttsSettings.enabled !== false && <button
                onClick={toggleSpeech}
                className={cn(
                  "flex items-center gap-1 p-1.5 rounded-md transition-colors",
                  isSpeaking
                    ? "bg-primary text-primary-foreground animate-pulse"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title={isSpeaking ? t('message.ttsStop') : t('message.ttsListen')}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>}

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={t('message.copyMessage')}
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {onReloadFromMessage && messageIndex !== undefined && (
                <button
                  onClick={() => onReloadFromMessage(messageIndex)}
                  className="flex items-center gap-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={t('message.regenerate')}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
              {onBranchFromMessage && messageIndex !== undefined && (
                <button
                  onClick={() => onBranchFromMessage(messageIndex)}
                  className="flex items-center gap-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={t('message.branchConversation')}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Message;

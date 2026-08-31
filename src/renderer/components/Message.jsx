import React, { useState, useRef, useEffect, useMemo } from 'react';
import ToolCall from './ToolCall';
import SourcesList from './SourcesList';
import KnowledgeSourcesList from './KnowledgeSourcesList';
import MarkdownRenderer from './MarkdownRenderer';
import { TextShimmer } from './ui/text-shimmer';
import { Badge } from './ui/badge';
import { Zap, Volume2, VolumeX, Copy, Check, RotateCw, Clock, Gauge, Layers, Info, GitBranch, ArrowUp, ArrowDown, Activity, PenSquare } from 'lucide-react';
import { useCanvas } from '../context/CanvasContext';
import { useLanguage } from '../context/LanguageContext';
import { extractThinking, extractWebSearchSources, extractKnowledgeSources } from '../lib/messageUtils';
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
  onPreviewArtifact,
  interfaceMode: propInterfaceMode
}) {
  const { t, language } = useLanguage();
  const { createNewDocument } = useCanvas();
  const { role, tool_calls, reasoning, isStreaming, executed_tools, liveReasoning, liveExecutedTools, reasoningSummaries, reasoningDuration, usage } = message;
  const [localInterfaceMode, setLocalInterfaceMode] = useState(propInterfaceMode || 'user');
  const currentInterfaceMode = propInterfaceMode || localInterfaceMode;
  const isPowerUser = currentInterfaceMode === 'power';

  const [showReasoning, setShowReasoning] = useState(false);
  const [showExecutedTools, setShowExecutedTools] = useState(false);
  const [collapsedOutputs, setCollapsedOutputs] = useState(new Set());
  const [copySuccess, setCopySuccess] = useState(false);
  const [sendCanvasSuccess, setSendCanvasSuccess] = useState(false);
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
    window.electron?.getSettings?.().then(settings => {
      setTtsSettings(current => ({ ...current, ...(settings.tts || {}) }));
      if (settings?.interfaceMode) {
        setLocalInterfaceMode(settings.interfaceMode);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (propInterfaceMode) {
      setLocalInterfaceMode(propInterfaceMode);
    }
  }, [propInterfaceMode]);

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
    return extractWebSearchSources(message, allMessages);
  }, [message, allMessages]);

  // Extract Local Knowledge Base / RAG sources
  const knowledgeSources = useMemo(() => {
    return extractKnowledgeSources(message, allMessages);
  }, [message, allMessages]);

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

  const handleSendToCanvas = () => {
    try {
      const rawText = typeof message.content === 'string' 
        ? (extracted.cleanContent !== undefined ? extracted.cleanContent : message.content)
        : Array.isArray(message.content)
          ? extractThinking(message.content.filter(p => p.type === 'text').map(p => p.text || '').join('\n')).cleanContent
          : '';

      if (!rawText || !rawText.trim()) return;

      const trimmedText = rawText.trim();

      // Check if message is a single code fence: e.g. ```typescript \n ... \n ```
      const singleCodeBlockMatch = trimmedText.match(/^```([a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/);
      
      let docContent = trimmedText;
      let docLang = 'markdown';
      let docTitle = '';

      if (singleCodeBlockMatch) {
        docLang = (singleCodeBlockMatch[1] || 'text').toLowerCase();
        docContent = singleCodeBlockMatch[2];
      }

      // Try to find a markdown header (# Title) in the content
      const headingMatch = trimmedText.match(/^#+\s+([^\n\r]+)/m);
      if (headingMatch && headingMatch[1]?.trim()) {
        docTitle = headingMatch[1].trim();
      } else {
        // Fallback: Use first non-empty line (capped at 40 chars)
        const firstLine = trimmedText.split(/\r?\n/).find(line => line.trim().length > 0) || '';
        const cleanFirstLine = firstLine.replace(/^[#*`\-=>_~[\]()]+\s*/, '').replace(/[*`_~]/g, '').trim();
        if (cleanFirstLine.length > 0) {
          docTitle = cleanFirstLine.length > 40 ? `${cleanFirstLine.slice(0, 40)}...` : cleanFirstLine;
        } else {
          docTitle = t('canvas.aiResponseDoc') || t('canvas.defaultTitle') || 'Documento do Assistente';
        }
      }

      createNewDocument({
        title: docTitle,
        language: docLang,
        content: docContent,
        summary: t('canvas.importedFromChat') || 'Importado da conversa',
        source: 'ai'
      });

      setSendCanvasSuccess(true);
      setTimeout(() => setSendCanvasSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to send message to canvas:', err);
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
    if (!isPowerUser || !ttsSettings.autoSpeak || isUser || !isLastMessage || isStreamingMessage || loading) return;
    const key = `${message.timestamp || message.createdAt || ''}:${typeof message.content === 'string' ? message.content : ''}`;
    if (!key || autoSpokenRef.current === key) return;
    autoSpokenRef.current = key;
    toggleSpeech();
  }, [isPowerUser, ttsSettings.autoSpeak, isUser, isLastMessage, isStreamingMessage, loading, message.content, message.timestamp, message.createdAt]);

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

        {/* Reasoning and Tools Dropdowns (Power Mode only) */}
        {!isUser && isPowerUser && (hasReasoning || hasExecutedTools || hasReasoningSummaries) && (
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
          <div className="flex flex-wrap items-center justify-start gap-2 mt-2 pt-1 text-xs text-muted-foreground opacity-80 hover:opacity-100 transition-opacity">
            {/* Speed & Performance Metrics (Power Mode only) */}
            {isPowerUser && (
              <div className="flex flex-wrap items-center gap-2">
                {(tokensPerSec > 0 || totalTokens > 0) && (
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-semibold cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => setShowDetailedStats(!showDetailedStats)}
                    title={t('message.metricsTooltip')}
                  >
                    {tokensPerSec > 0 ? (
                      <>
                        <Zap className="w-3 h-3 text-primary fill-primary" />
                        <span>{tokensPerSec} t/s</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-3 h-3 text-primary" />
                        <span>{totalTokens.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')} tk</span>
                      </>
                    )}
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
              </div>
            )}

            {/* Actions: TTS (Power Mode only), Copy, Reload, Branch */}
            <div className="flex items-center gap-1">
              {isPowerUser && ttsSettings.enabled !== false && (
                <button
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
                </button>
              )}

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={t('message.copyMessage')}
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleSendToCanvas}
                className={cn(
                  "flex items-center gap-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
                  sendCanvasSuccess && "text-green-500 hover:text-green-600"
                )}
                title={t('message.sendToCanvas') || 'Enviar para o Canvas'}
              >
                {sendCanvasSuccess ? <Check className="w-3.5 h-3.5 text-green-500" /> : <PenSquare className="w-3.5 h-3.5" />}
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

            {/* Detailed popover/stats (Power Mode only) */}
            {isPowerUser && showDetailedStats && (
              <div className="basis-full">
                <div className="w-72 max-w-full mt-1.5 p-3 rounded-xl bg-card border border-border shadow-md text-xs space-y-2 animate-in fade-in-0">
                  <div className="flex items-center justify-between text-muted-foreground border-b border-border/50 pb-1.5 font-medium">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Gauge className="w-3.5 h-3.5 text-primary" /> {t('message.inferenceMetrics')}
                    </span>
                    <button
                      onClick={() => setShowDetailedStats(false)}
                      className="p-0.5 px-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors leading-none"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                        <ArrowUp className="w-3 h-3 shrink-0" /> {t('message.tokensPrompt')}
                      </span>
                      <span className="font-semibold text-foreground">{promptTokens.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <ArrowDown className="w-3 h-3 shrink-0" /> {t('message.tokensResponse')}
                      </span>
                      <span className="font-semibold text-foreground">{completionTokens.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5 border-t border-border/40 font-medium pt-1">
                      <span className="flex items-center gap-1 text-foreground">
                        <Layers className="w-3 h-3 text-primary shrink-0" /> {t('message.totalTokens')}
                      </span>
                      <span className="font-bold text-foreground">Σ {totalTokens.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5 pt-1 border-t border-border/30 text-muted-foreground">
                      <span className="font-sans">{t('message.speed')}</span>
                      <span className="font-semibold text-primary">{tokensPerSec > 0 ? `${tokensPerSec} t/s` : '—'}</span>
                    </div>
                    {ttftMs && (
                      <div className="flex items-center justify-between py-0.5 text-muted-foreground">
                        <span className="font-sans">{t('message.ttft')}</span>
                        <span className="font-semibold text-foreground">{ttftMs}ms</span>
                      </div>
                    )}
                    {usage?.queue_time && (
                      <div className="flex items-center justify-between py-0.5 text-muted-foreground">
                        <span className="font-sans">{t('message.groqQueue')}</span>
                        <span className="font-semibold text-foreground">{(usage.queue_time * 1000).toFixed(0)}ms</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(Message);

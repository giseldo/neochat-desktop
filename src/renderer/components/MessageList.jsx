import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Message from './Message';
import MarkdownRenderer from './MarkdownRenderer';
import { Bot, Download, Maximize2, Copy, Check, Sparkles, Loader2, RotateCw } from 'lucide-react';
import { Button } from './ui/button';
import { NeoSymbol } from './NeoSymbol';
import { useLanguage } from '../context/LanguageContext';
import { extractThinking, extractWebSearchSources } from '../lib/messageUtils';
import { cn } from '../lib/utils';

function ImageGeneratingCard({ prompt, model, provider, timestamp }) {
  const { t } = useLanguage();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = timestamp || Date.now();
    const updateElapsed = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 500);
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div className="space-y-3 mt-1 max-w-lg">
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6 flex flex-col items-center justify-center text-center shadow-xs">
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shadow-sm">
              <Sparkles className="w-6 h-6 text-purple-500 animate-spin" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-sm text-foreground flex items-center justify-center gap-2">
              <span>{t('chat.generatingImage', { model: model || '' }) || 'Gerando imagem com IA...'}</span>
              <span className="text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full font-bold">
                {elapsed}s
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              {t('settings.imageGenerationTestingNote') || 'Aguarde alguns instantes enquanto a IA sintetiza e renderiza a imagem.'}
            </p>
          </div>

          {prompt && (
            <div className="mt-1 text-[11px] text-muted-foreground/80 bg-background/60 backdrop-blur border border-border/60 rounded-xl px-3 py-1.5 max-w-sm line-clamp-2 italic">
              &quot;{prompt}&quot;
            </div>
          )}

          {model && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
              {provider === 'openai' ? 'OpenAI · ' : 'xAI · '}{model}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneratedImageCard({ image, onExpand, onRegenerate, isRegenerating }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imgSrc = image?.dataUrl || image?.url;

  if (!imgSrc) return null;

  const handleCopy = async () => {
    try {
      if (imgSrc.startsWith('data:image/')) {
        const res = await fetch(imgSrc);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        await navigator.clipboard.writeText(imgSrc);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn('Could not copy blob to clipboard, copying text URL:', err);
      await navigator.clipboard.writeText(imgSrc || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!window.electron?.saveImage || !imgSrc) return;
    setSaving(true);
    try {
      const res = await window.electron.saveImage({
        dataUrl: imgSrc,
        defaultName: (image.prompt || 'neochat-generated-image').slice(0, 30)
      });
      if (res?.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save image failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 mt-1 max-w-lg">
      <div className="relative group overflow-hidden rounded-2xl border border-border bg-card/60 shadow-md">
        {imgError ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {t('chat.imageGenerationFailed', { error: 'Não foi possível carregar a imagem' }) || 'Não foi possível carregar a imagem'}
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={image?.prompt || "Generated image"}
            className="w-full max-h-[500px] object-contain rounded-2xl cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
            onClick={() => onExpand(imgSrc)}
            onError={() => setImgError(true)}
          />
        )}
        {!imgError && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpand(imgSrc);
              }}
              className="pointer-events-auto p-2 rounded-xl bg-background/90 hover:bg-background text-foreground shadow-lg backdrop-blur transition-transform hover:scale-105 cursor-pointer"
              title={t('message.expandImage') || 'Visualizar em tela cheia'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Action buttons & details */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 px-2.5 rounded-lg text-xs gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Download className="w-3.5 h-3.5 text-primary" />
            )}
            <span>{saveSuccess ? (t('message.imageSavedSuccess') || 'Salvo!') : (t('message.downloadImage') || 'Salvar')}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2.5 rounded-lg text-xs gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            <span>{copied ? (t('message.imageCopied') || 'Copiado!') : (t('message.copyImage') || 'Copiar')}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onExpand(imgSrc)}
            className="h-7 px-2.5 rounded-lg text-xs gap-1.5"
          >
            <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{t('message.expandImage') || 'Ampliar'}</span>
          </Button>

          {onRegenerate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="h-7 px-2.5 rounded-lg text-xs gap-1.5"
              title={t('message.regenerate') || 'Regenerar imagem'}
            >
              <RotateCw className={cn("w-3.5 h-3.5 text-muted-foreground", isRegenerating && "animate-spin")} />
              <span>{t('message.regenerate') || 'Regenerar'}</span>
            </Button>
          )}
        </div>

        {image?.model && (
          <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-mono text-muted-foreground">
            {image.provider === 'openai' ? 'OpenAI · ' : 'xAI · '}{image.model}
          </span>
        )}
      </div>

      {image?.revisedPrompt && image.revisedPrompt !== image.prompt && (
        <details className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-xl border border-border/50">
          <summary className="cursor-pointer font-medium hover:text-foreground">
            Prompt ajustado pelo modelo
          </summary>
          <p className="mt-1 pl-2 text-foreground/80 leading-relaxed font-sans">
            {image.revisedPrompt}
          </p>
        </details>
      )}
    </div>
  );
}

function MessageList({ 
  messages = [], 
  onToolCallExecute, 
  onRemoveLastMessage, 
  onReloadFromMessage, 
  onBranchFromMessage,
  loading, 
  onActionsVisible,
  onPreviewArtifact,
  interfaceMode = 'user'
}) {
  const { t } = useLanguage();
  const [fullScreenImage, setFullScreenImage] = useState(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFullScreenImage(null);
      }
    };

    if (fullScreenImage) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullScreenImage]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-muted-foreground select-none p-6 animate-in fade-in duration-300">
        <NeoSymbol className="w-8 h-8 mb-3" />
        <h3 className="font-semibold text-sm text-foreground mb-1">{t('welcome.title')}</h3>
        <p className="text-center text-xs max-w-sm text-muted-foreground">
          {t('welcome.subtitle')}
        </p>
      </div>
    );
  }

  const displayMessages = messages.filter(message => message.role !== 'tool');

  const assistantGroupInfo = useMemo(() => {
    const groupInfo = new Map();
    const groups = [];
    let currentGroupStart = null;
    let currentGroupIndices = [];
    
    displayMessages.forEach((message, index) => {
      if (message.role === 'assistant') {
        if (currentGroupStart === null) {
          currentGroupStart = index;
          currentGroupIndices = [index];
        } else {
          currentGroupIndices.push(index);
        }
      } else {
        if (currentGroupStart !== null && currentGroupIndices.length > 1) {
          groups.push({
            startIndex: currentGroupStart,
            endIndex: currentGroupIndices[currentGroupIndices.length - 1],
            indices: [...currentGroupIndices]
          });
        }
        currentGroupStart = null;
        currentGroupIndices = [];
      }
    });
    
    if (currentGroupStart !== null && currentGroupIndices.length > 1) {
      groups.push({
        startIndex: currentGroupStart,
        endIndex: currentGroupIndices[currentGroupIndices.length - 1],
        indices: [...currentGroupIndices]
      });
    }
    
    groups.forEach(group => {
      const reasoningParts = [];
      let totalDuration = 0;
      let hasAnyReasoning = false;
      
      group.indices.forEach((idx) => {
        const msg = displayMessages[idx];
        const rawContent = typeof msg.content === 'string' ? msg.content : '';
        const { thinking } = extractThinking(rawContent);
        const reasoning = msg.liveReasoning || msg.reasoning || thinking;
        const duration = msg.reasoningDuration || 0;
        
        if (reasoning) {
          hasAnyReasoning = true;
          if (reasoningParts.length > 0) {
            reasoningParts.push('\n\n---\n\n');
          }
          reasoningParts.push(reasoning);
        }
        totalDuration += duration;
      });
      
      const combinedReasoning = hasAnyReasoning ? reasoningParts.join('') : null;
      
      group.indices.forEach((idx, positionInGroup) => {
        groupInfo.set(idx, {
          isFirstInGroup: positionInGroup === 0,
          groupStartIndex: group.startIndex,
          groupSize: group.indices.length,
          combinedReasoning: positionInGroup === 0 ? combinedReasoning : null,
          combinedDuration: positionInGroup === 0 ? totalDuration : null
        });
      });
    });
    
    return groupInfo;
  }, [displayMessages]);

  return (
    <div className="space-y-1 pt-4 p-4">
      {displayMessages.map((message, index) => {
        const originalIndex = messages.findIndex((m, i) => {
          let nonToolCount = 0;
          for (let j = 0; j <= i; j++) {
            if (messages[j].role !== 'tool') {
              if (nonToolCount === index) {
                return j === i;
              }
              nonToolCount++;
            }
          }
          return false;
        });

        const groupInfo = assistantGroupInfo.get(index);
        const hideReasoningUI = groupInfo && !groupInfo.isFirstInGroup && groupInfo.groupSize > 1;
        const combinedReasoning = groupInfo?.combinedReasoning || null;
        const combinedReasoningDuration = groupInfo?.combinedDuration || null;
        
        const prevMessage = index > 0 ? displayMessages[index - 1] : null;
        const prevContent = prevMessage && typeof prevMessage.content === 'string' ? prevMessage.content : '';
        const prevClean = prevContent ? extractThinking(prevContent).cleanContent : '';
        const prevIsToolOnly = prevMessage && prevMessage.role === 'assistant' && 
          (!prevClean || !prevClean.trim()) && 
          Boolean(prevMessage.tool_calls && prevMessage.tool_calls.length > 0);
        
        return (
          <Message 
            key={index} 
            message={message} 
            messageIndex={originalIndex}
            onToolCallExecute={onToolCallExecute}
            onReloadFromMessage={onReloadFromMessage}
            onBranchFromMessage={onBranchFromMessage}
            allMessages={messages}
            isLastMessage={index === displayMessages.length - 1}
            loading={loading}
            onActionsVisible={onActionsVisible}
            hideReasoningUI={hideReasoningUI}
            combinedReasoning={combinedReasoning}
            combinedReasoningDuration={combinedReasoningDuration}
            onPreviewArtifact={onPreviewArtifact}
            interfaceMode={interfaceMode}
            isAfterToolOnly={Boolean(prevIsToolOnly)}
          >
          {message.role === 'user' ? (
            <div className="flex items-start gap-2">
              <div className="flex-1 flex flex-col gap-2">
                {Array.isArray(message.content) ? (
                  message.content.map((part, partIndex) => {
                    if (part.type === 'text') {
                      return <div key={`text-${partIndex}`} className="whitespace-pre-wrap text-sm">{part.text || ''}</div>;
                    } else if (part.type === 'image_url' && part.image_url?.url) {
                      return (
                        <img
                          key={`image-${partIndex}`}
                          src={part.image_url.url}
                          alt={`Uploaded image ${partIndex + 1}`}
                          className="max-w-xs max-h-48 rounded-md cursor-pointer self-start border border-border"
                          onClick={() => setFullScreenImage(part.image_url.url)}
                        />
                      );
                    }
                    return null;
                  })
                ) : (
                  <div className="space-y-1">
                    {message.isImagePrompt && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[10px] font-semibold w-fit">
                        <Sparkles className="w-3 h-3" />
                        {t('chat.generateImage') || 'Gerar imagem'}
                      </span>
                    )}
                    <div className="whitespace-pre-wrap text-sm">{message.content || ''}</div>
                  </div>
                )}
              </div>
            </div>
          ) : message.role === 'assistant' ? (
            message.isGeneratingImage ? (
              <ImageGeneratingCard
                prompt={message.imagePrompt}
                model={message.imageModel}
                provider={message.imageProvider}
                timestamp={message.timestamp}
              />
            ) : (message.isGeneratedImage || message.image) && (message.image?.dataUrl || message.image?.url) ? (
              <GeneratedImageCard
                image={message.image}
                onExpand={(src) => setFullScreenImage(src)}
                onRegenerate={onReloadFromMessage && originalIndex !== undefined ? () => onReloadFromMessage(originalIndex) : undefined}
                isRegenerating={loading}
              />
            ) : (
              <MarkdownRenderer 
                content={typeof message.content === 'string' ? extractThinking(message.content).cleanContent : (message.content || '')} 
                sources={extractWebSearchSources(message, messages)}
                onPreviewArtifact={onPreviewArtifact}
              />
            )
          ) : null}
        </Message>
        );
      })}

      {/* Fullscreen Image Overlay */}
      {fullScreenImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => setFullScreenImage(null)}
        >
          <img 
            src={fullScreenImage} 
            alt="Fullscreen view" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

export default MessageList;

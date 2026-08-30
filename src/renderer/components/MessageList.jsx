import React, { useState, useEffect, useMemo } from 'react';
import Message from './Message';
import MarkdownRenderer from './MarkdownRenderer';
import { Bot } from 'lucide-react';
import { NeoSymbol } from './NeoSymbol';
import { useLanguage } from '../context/LanguageContext';
import { extractThinking, extractWebSearchSources } from '../lib/messageUtils';

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
                  <div className="whitespace-pre-wrap text-sm">{message.content || ''}</div>
                )}
              </div>
            </div>
          ) : message.role === 'assistant' ? (
            <MarkdownRenderer 
              content={typeof message.content === 'string' ? extractThinking(message.content).cleanContent : (message.content || '')} 
              sources={extractWebSearchSources(message, messages)}
              onPreviewArtifact={onPreviewArtifact}
            />
          ) : null}
        </Message>
        );
      })}

      {/* Fullscreen Image Overlay */}
      {fullScreenImage && (
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
        </div>
      )}
    </div>
  );
}

export default MessageList;

'use client';

import React, { useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Send, Square } from 'lucide-react';

export default function ChatInput({
  input,
  setInput,
  onSend,
  isLoading,
  onStop,
  placeholder = 'Escreva sua mensagem...',
  disabled = false,
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="p-3 bg-gradient-to-t from-background via-background/95 to-transparent">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-2xl bg-card border border-border focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/40 shadow-lg transition-all p-2 flex flex-col gap-1 backdrop-blur-md">
          <TextareaAutosize
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            minRows={1}
            maxRows={7}
            className="w-full bg-transparent resize-none outline-none px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground leading-relaxed disabled:opacity-50"
          />

          <div className="flex items-center justify-between pt-1 border-t border-border/40 px-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="hidden sm:inline">Pressione</span>
              <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-secondary text-[9px] text-foreground/80 font-mono border border-border">
                Enter ↵
              </kbd>
              <span className="hidden sm:inline">para enviar</span>
            </div>

            <div className="flex items-center gap-2">
              {isLoading ? (
                <button
                  onClick={onStop}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 text-xs font-semibold transition-all"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Interromper</span>
                </button>
              ) : (
                <button
                  onClick={onSend}
                  disabled={!input.trim() || disabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 disabled:opacity-30 text-primary-foreground text-xs font-bold shadow-xs transition-all active:scale-95"
                >
                  <span>Enviar</span>
                  <Send className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-1.5 text-center text-[10px] text-muted-foreground">
          NeoChat Web • Modelo 100% BYOK (Bring Your Own Key) • Chaves armazenadas no cliente.
        </div>
      </div>
    </div>
  );
}

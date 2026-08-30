'use client';

import React, { useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Send, Square, Sparkles, CornerDownLeft } from 'lucide-react';

export default function ChatInput({
  input,
  setInput,
  onSend,
  isLoading,
  onStop,
  placeholder = 'Envie uma mensagem (Shift + Enter para quebra de linha)...',
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
    <div className="p-4 bg-gradient-to-t from-[#090d16] via-[#090d16]/95 to-transparent">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-blue-500/60 shadow-xl transition-all p-2 flex flex-col gap-1 backdrop-blur-xl">
          <TextareaAutosize
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            minRows={1}
            maxRows={8}
            className="w-full bg-transparent resize-none outline-none px-3 py-2 text-sm text-slate-100 placeholder-slate-500 leading-relaxed disabled:opacity-50"
          />

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 px-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Pressione</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono border border-slate-700">
                Enter ↵
              </kbd>
              <span className="hidden sm:inline">para enviar</span>
            </div>

            <div className="flex items-center gap-2">
              {isLoading ? (
                <button
                  onClick={onStop}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 text-xs font-semibold transition-all"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Interromper</span>
                </button>
              ) : (
                <button
                  onClick={onSend}
                  disabled={!input.trim() || disabled}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-600 text-xs font-semibold shadow-md shadow-blue-600/20 disabled:shadow-none transition-all active:scale-95"
                >
                  <span>Enviar</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 text-center text-[11px] text-slate-500">
          NeoChat Web utiliza modelo BYOK (Bring Your Own Key) • Chaves nunca são compartilhadas.
        </div>
      </div>
    </div>
  );
}

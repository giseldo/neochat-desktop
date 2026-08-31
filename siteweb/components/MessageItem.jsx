'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ChevronDown, ChevronRight, Brain, User } from 'lucide-react';
import { NeoSymbol } from './NeoSymbol';

export default function MessageItem({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Separa o pensamento (<think>...</think>) se existir
  let reasoning = message.reasoning || '';
  let cleanContent = message.content || '';

  if (!reasoning && cleanContent.includes('<think>')) {
    const match = cleanContent.match(/<think>([\s\S]*?)<\/think>/);
    if (match) {
      reasoning = match[1].trim();
      cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    }
  }

  return (
    <div className={`py-4 px-3 sm:px-6 transition-colors ${isUser ? 'bg-transparent' : 'bg-card/40 border-y border-border/40'}`}>
      <div className="max-w-4xl mx-auto flex gap-3.5">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground">
              <User className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <NeoSymbol className="w-4 h-4" speed="normal" />
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {isUser ? 'Você' : 'NeoChat'}
              </span>
              {message.model && (
                <span className="text-[10px] px-1.5 py-0.2 bg-secondary text-muted-foreground border border-border rounded font-mono">
                  {message.model}
                </span>
              )}
            </div>

            <button
              onClick={() => handleCopy(message.content)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-secondary"
              title="Copiar mensagem"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Raciocínio (DeepSeek R1 / Reasoning models) */}
          {reasoning && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden text-xs">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full px-3 py-1.5 flex items-center justify-between text-primary font-semibold hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] uppercase tracking-wider">Processo de Raciocínio (Thinking)</span>
                </div>
                {showReasoning ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {showReasoning && (
                <div className="px-3.5 py-2 text-muted-foreground border-t border-primary/15 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {reasoning}
                </div>
              )}
            </div>
          )}

          {/* Markdown & LaTeX */}
          <div className={`text-sm leading-relaxed text-foreground/90 prose prose-invert max-w-none prose-p:my-1.5 prose-headings:text-foreground prose-code:text-primary ${
            isUser ? 'p-3 rounded-xl bg-[#222326] border border-border inline-block max-w-full' : ''
          }`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && match) {
                    return (
                      <div className="relative my-2.5 rounded-xl overflow-hidden border border-border bg-[#14161d] shadow-md">
                        <div className="flex items-center justify-between px-3.5 py-1 bg-[#1a1d26] border-b border-border text-[11px] text-muted-foreground font-mono">
                          <span className="uppercase font-bold text-primary text-[10px]">{match[1]}</span>
                          <button
                            onClick={() => handleCopy(codeString)}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            padding: '0.85rem',
                            fontSize: '0.82rem',
                            background: 'transparent',
                            fontFamily: 'var(--font-mono)',
                          }}
                          {...props}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }

                  return (
                    <code className="px-1.5 py-0.5 rounded bg-secondary text-primary font-mono text-xs border border-border/50" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {cleanContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

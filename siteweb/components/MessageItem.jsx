'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ChevronDown, ChevronRight, Brain, User, Bot, Sparkles } from 'lucide-react';

export default function MessageItem({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Separa o pensamento (<think>...</think>) do conteúdo principal se houver
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
    <div
      className={`py-5 px-4 md:px-6 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-slate-900/40 border-y border-slate-800/40'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3.5 md:gap-5">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Conteúdo da Mensagem */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                {isUser ? 'Você' : 'NeoChat'}
              </span>
              {message.model && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700/50 rounded font-mono">
                  {message.model}
                </span>
              )}
            </div>

            <button
              onClick={() => handleCopy(message.content)}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors rounded"
              title="Copiar mensagem"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Raciocínio (DeepSeek R1 / Reasoning models) */}
          {reasoning && (
            <div className="rounded-xl border border-indigo-950 bg-indigo-950/20 overflow-hidden text-xs">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full px-3 py-2 flex items-center justify-between text-indigo-300 font-medium hover:bg-indigo-950/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Processo de Raciocínio (Thinking)</span>
                </div>
                {showReasoning ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {showReasoning && (
                <div className="px-3.5 py-2.5 text-slate-400 border-t border-indigo-900/40 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {reasoning}
                </div>
              )}
            </div>
          )}

          {/* Markdown e LaTeX */}
          <div className="text-sm leading-relaxed text-slate-200 prose prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-headings:text-slate-100 prose-code:text-blue-300">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && match) {
                    return (
                      <div className="relative my-3 rounded-xl overflow-hidden border border-slate-800 bg-[#1e1e1e] shadow-lg">
                        <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                          <span>{match[1]}</span>
                          <button
                            onClick={() => handleCopy(codeString)}
                            className="flex items-center gap-1 hover:text-white transition-colors"
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
                            padding: '1rem',
                            fontSize: '0.82rem',
                            background: 'transparent',
                          }}
                          {...props}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }

                  return (
                    <code className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono text-xs" {...props}>
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

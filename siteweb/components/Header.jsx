'use client';

import React from 'react';
import { Menu, Key, Sparkles, Trash2, Download, ExternalLink, Settings2 } from 'lucide-react';
import ModelSelector from './ModelSelector';

export default function Header({
  sidebarOpen,
  setSidebarOpen,
  provider,
  setProvider,
  model,
  setModel,
  onOpenSettings,
  onOpenTemplates,
  onClearChat,
  hasMessages,
  hasKey,
}) {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 transition-colors"
          title="Alternar Barra Lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <img src="/icon.png" alt="NeoChat" className="w-8 h-8 rounded-lg shadow-md shadow-blue-500/20" />
          <div className="hidden sm:flex flex-col">
            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100 tracking-wide">
              <span>NeoChat</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                WEB
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Multi-Provedor & BYOK</span>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

        <ModelSelector
          provider={provider}
          setProvider={setProvider}
          model={model}
          setModel={setModel}
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Botão de Templates de Prompt */}
        <button
          onClick={onOpenTemplates}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Templates</span>
        </button>

        {/* Status de Chave BYOK */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            hasKey
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
          }`}
          title={hasKey ? 'Chave de API configurada' : 'Clique para configurar sua chave de API (BYOK)'}
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{hasKey ? 'Chave Ativa' : 'Configurar BYOK'}</span>
        </button>

        {/* Limpar Conversa */}
        {hasMessages && (
          <button
            onClick={onClearChat}
            className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
            title="Limpar Conversa Atual"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Configurações Gerais */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Configurações & Chaves de API"
        >
          <Settings2 className="w-5 h-5" />
        </button>

        {/* Link para o App Desktop */}
        <a
          href="https://neochatdesktop.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 transition-colors"
          title="Baixar a versão Desktop com Ollama, MCP local e RAG offline"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Desktop</span>
        </a>
      </div>
    </header>
  );
}

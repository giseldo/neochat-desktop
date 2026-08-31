'use client';

import React from 'react';
import { Menu, Key, Sparkles, Trash2, Download, Settings, Palette } from 'lucide-react';
import { NeoSymbol } from './NeoSymbol';
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
  colorTheme,
  onChangeColorTheme,
}) {
  const THEME_COLORS = [
    { id: 'orange', name: 'Laranja Neo', color: '#F55036' },
    { id: 'blue', name: 'Azul Elétrico', color: '#3b82f6' },
    { id: 'green', name: 'Verde Esmeralda', color: '#10b981' },
    { id: 'purple', name: 'Roxo Deep', color: '#a855f7' },
    { id: 'amber', name: 'Âmbar Solar', color: '#f59e0b' },
  ];

  return (
    <header className="h-14 border-b border-border bg-card/75 backdrop-blur-md px-3.5 flex items-center justify-between z-20 shrink-0 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Alternar Barra Lateral"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <NeoSymbol className="w-6 h-6" speed="normal" />
          <div className="flex items-center gap-1.5 font-bold text-sm tracking-tight text-foreground">
            <span className="font-extrabold tracking-wide">NEOCHAT</span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-primary/15 text-primary border border-primary/30 rounded uppercase tracking-wider">
              WEB
            </span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

        <ModelSelector
          provider={provider}
          setProvider={setProvider}
          model={model}
          setModel={setModel}
        />
      </div>

      <div className="flex items-center gap-1.5">
        {/* Seletor Rápido de Cor do Tema Desktop */}
        <div className="hidden md:flex items-center gap-1 bg-secondary/60 p-1 rounded-lg border border-border">
          {THEME_COLORS.map((tc) => (
            <button
              key={tc.id}
              onClick={() => onChangeColorTheme(tc.id)}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                colorTheme === tc.id ? 'scale-125 ring-2 ring-primary ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: tc.color }}
              title={`Tema ${tc.name}`}
            />
          ))}
        </div>

        {/* Botão de Templates */}
        <button
          onClick={onOpenTemplates}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Personas</span>
        </button>

        {/* Status de Chave BYOK */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            hasKey
              ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
          }`}
          title={hasKey ? 'Chave de API ativa' : 'Configurar chave BYOK'}
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{hasKey ? 'BYOK Ativo' : 'Configurar Chave'}</span>
        </button>

        {/* Limpar Conversa */}
        {hasMessages && (
          <button
            onClick={onClearChat}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Limpar Conversa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Configurações */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Configurações & Chaves"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Link para o Desktop */}
        <a
          href="https://neochatdesktop.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors border border-primary/20"
          title="Baixar a versão Desktop com Ollama, MCP local e RAG offline"
        >
          <Download className="w-3 h-3" />
          <span>Desktop</span>
        </a>
      </div>
    </header>
  );
}

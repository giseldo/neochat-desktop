'use client';

import React, { useState } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Eye, EyeOff, Save, Sparkles, Sliders } from 'lucide-react';
import { PROVIDERS } from '@/lib/providers';

export default function SettingsModal({
  isOpen,
  onClose,
  apiKeys,
  onSaveKeys,
  systemPrompt,
  setSystemPrompt,
  temperature,
  setTemperature,
}) {
  const [keys, setKeys] = useState(apiKeys || {});
  const [showKeys, setShowKeys] = useState({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleKeyChange = (providerId, value) => {
    setKeys((prev) => ({ ...prev, [providerId]: value }));
  };

  const toggleShowKey = (providerId) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const handleSave = () => {
    onSaveKeys(keys);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-card text-foreground border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Configurações & Chaves de API (BYOK)</h2>
              <p className="text-[11px] text-muted-foreground">Bring Your Own Key — Suas credenciais salvas no seu navegador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Alerta de Segurança */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground/90 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              O NeoChat Web é <strong>100% BYOK</strong>. Suas chaves de API nunca são enviadas para bancos de dados de terceiros ou expostas a outros usuários.
            </p>
          </div>

          {/* Provedores e Chaves */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Chaves dos Provedores
            </h3>

            <div className="space-y-2.5">
              {Object.entries(PROVIDERS).map(([provId, prov]) => (
                <div key={provId} className="p-2.5 rounded-xl bg-secondary/50 border border-border space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{prov.name}</span>
                    <a
                      href={prov.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Obter chave</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type={showKeys[provId] ? 'text' : 'password'}
                      value={keys[provId] || ''}
                      onChange={(e) => handleKeyChange(provId, e.target.value)}
                      placeholder={prov.keyPlaceholder}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 pr-9 text-xs text-foreground font-mono focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/40"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(provId)}
                      className="absolute right-2 p-1 text-muted-foreground hover:text-foreground"
                    >
                      {showKeys[provId] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>System Prompt Padrão</span>
            </h3>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Ex: Você é o NeoChat, um assistente inteligente, conciso e técnico..."
              rows={3}
              className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground outline-none focus:border-primary leading-relaxed resize-none font-mono"
            />
          </div>

          {/* Temperatura */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>Temperatura ({temperature})</span>
              </span>
              <span className="text-muted-foreground text-[10px]">
                {temperature < 0.4 ? 'Mais preciso' : temperature > 0.8 ? 'Mais criativo' : 'Equilibrado'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-card/80 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-primary-foreground shadow-xs transition-all active:scale-95 ${
              savedSuccess ? 'bg-emerald-600' : 'bg-primary hover:opacity-90'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savedSuccess ? 'Salvo com Sucesso!' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

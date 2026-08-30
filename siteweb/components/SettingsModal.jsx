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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Configurações & Chaves de API (BYOK)</h2>
              <p className="text-xs text-slate-400">Bring Your Own Key — Suas chaves ficam salvas no seu navegador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alerta de Segurança */}
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              O NeoChat Web é <strong>100% BYOK</strong>. As chaves de API informadas são enviadas criptografadas apenas durante a requisição de inferência e ficam armazenadas com segurança no seu navegador.
            </p>
          </div>

          {/* Provedores e Chaves */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Chaves dos Provedores
            </h3>

            <div className="space-y-3">
              {Object.entries(PROVIDERS).map(([provId, prov]) => (
                <div key={provId} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{prov.name}</span>
                    <a
                      href={prov.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                    >
                      <span>Obter chave</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type={showKeys[provId] ? 'text' : 'password'}
                      value={keys[provId] || ''}
                      onChange={(e) => handleKeyChange(provId, e.target.value)}
                      placeholder={prov.keyPlaceholder}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 pr-10 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500/60 transition-all placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(provId)}
                      className="absolute right-2.5 p-1 text-slate-500 hover:text-slate-300"
                    >
                      {showKeys[provId] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instrução do Sistema (System Prompt) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Prompt do Sistema Padrão</span>
              </h3>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Ex: Você é o NeoChat, um assistente prestativo, preciso e fluente em programação e redação técnica..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-blue-500/60 leading-relaxed resize-none font-mono"
            />
          </div>

          {/* Temperatura */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Temperatura ({temperature})</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                {temperature < 0.4 ? 'Mais preciso e determinístico' : temperature > 0.8 ? 'Mais criativo' : 'Equilibrado'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 ${
              savedSuccess ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
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

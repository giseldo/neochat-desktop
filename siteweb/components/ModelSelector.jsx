'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Cpu } from 'lucide-react';
import { PROVIDERS } from '@/lib/providers';

export default function ModelSelector({ provider, setProvider, model, setModel }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentProvider = PROVIDERS[provider] || PROVIDERS.groq;
  const currentModelObj = currentProvider.models.find((m) => m.id === model) || currentProvider.models[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModel = (provKey, modelId) => {
    setProvider(provKey);
    setModel(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-all shadow-sm max-w-[200px] sm:max-w-[280px]"
      >
        <Cpu className="w-4 h-4 text-blue-400 shrink-0" />
        <div className="flex flex-col text-left truncate">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {currentProvider.name}
          </span>
          <span className="text-xs font-semibold truncate">
            {currentModelObj ? currentModelObj.name : model}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-80 max-h-96 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 divide-y divide-slate-800/60 backdrop-blur-xl">
          {Object.entries(PROVIDERS).map(([provKey, prov]) => (
            <div key={provKey} className="py-2 first:pt-0 last:pb-0">
              <div className="px-2.5 py-1 text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
                <span>{prov.name}</span>
                <span className="text-[10px] text-slate-500 lowercase font-normal">
                  {prov.models.length} modelos
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {prov.models.map((m) => {
                  const isSelected = provider === provKey && model === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectModel(provKey, m.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-blue-600/20 text-blue-300 font-medium'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="truncate">{m.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {m.id} • {Math.round(m.context / 1000)}k ctx
                        </span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

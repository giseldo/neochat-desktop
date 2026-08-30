'use client';

import React from 'react';
import { X, Sparkles, Code2, Bug, Sigma, FileText, Cpu, Database } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'architect',
    title: 'Arquiteto de Software',
    category: 'Engenharia',
    icon: Cpu,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    description: 'Design de sistemas distribuídos, padrões de projeto, diagramas e decisões arquiteturais.',
    systemPrompt: 'Você é um arquiteto de software principal especialista em sistemas distribuídos, padrões de design (Clean Architecture, DDD, Hexagonal), microsserviços e computação em nuvem. Forneça análises aprofundadas, trade-offs claros e recomendações pragmáticas.',
  },
  {
    id: 'debugger',
    title: 'Especialista em Debugging',
    category: 'Desenvolvimento',
    icon: Bug,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    description: 'Diagnóstico de memory leaks, erros de concorrência, stack traces e análise de causa-raiz.',
    systemPrompt: 'Você é um engenheiro sênior especialista em depuração e análise de causa-raiz. Ao receber um erro ou stack trace, identifique a causa fundamental, explique por que ela ocorre e forneça o código corrigido com testes de regressão.',
  },
  {
    id: 'latex-math',
    title: 'Tutor de Matemática & LaTeX',
    category: 'Ciência & Pesquisa',
    icon: Sigma,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    description: 'Equações matemáticas passo a passo com formatação completa em KaTeX e demonstrações.',
    systemPrompt: 'Você é um professor e pesquisador de matemática e computação científica. Todas as equações devem ser rigorosamente formatadas em LaTeX usando $ para termos em linha e $$ para blocos destacados de equações, com explicações detalhadas passo a passo.',
  },
  {
    id: 'clean-code',
    title: 'Refatorador Clean Code',
    category: 'Qualidade',
    icon: Code2,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    description: 'Refatoração para legibilidade, redução de complexidade ciclomática e tipagem TypeScript estrita.',
    systemPrompt: 'Você é um especialista em qualidade de software e Clean Code. Analise o código fornecido, remova redundâncias, aplique tipagem segura, simplifique a lógica e demonstre o código refatorado antes e depois com explicações.',
  },
  {
    id: 'academic',
    title: 'Revisor Acadêmico & Paper',
    category: 'Escrita Técnica',
    icon: FileText,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    description: 'Revisão crítica de artigos científicos, abstracts, metodologia e rigor acadêmico.',
    systemPrompt: 'Você é um revisor de periódicos científicos de alto impacto (IEEE, ACM, Nature). Avalie a clareza, rigor metodológico, concisão do abstract e coerência lógica de textos científicos, sugerindo melhorias substanciais de redação.',
  },
  {
    id: 'database',
    title: 'Otimizador de Banco de Dados',
    category: 'Dados & SQL',
    icon: Database,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    description: 'Otimização de consultas SQL, indexação, particionamento e modelagem relacional no PostgreSQL.',
    systemPrompt: 'Você é um DBA sênior especialista em PostgreSQL e modelagem relacional de alta performance. Analise schemas, índices, planos de execução EXPLAIN ANALYZE e otimize consultas para máxima eficiência.',
  },
];

export default function PromptTemplatesModal({ isOpen, onClose, onSelectTemplate }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Templates & Personas Especialistas</h2>
              <p className="text-xs text-slate-400">Selecione uma persona para direcionar as respostas do modelo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid de Templates */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <div
                key={tmpl.id}
                onClick={() => {
                  onSelectTemplate(tmpl);
                  onClose();
                }}
                className="group p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/60 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg border ${tmpl.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition-colors">
                        {tmpl.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {tmpl.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">System Prompt</span>
                  <span className="text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    Aplicar Persona →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

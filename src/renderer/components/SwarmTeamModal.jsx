import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  X,
  Play,
  Square,
  Sparkles,
  Shield,
  Code,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ChevronRight,
  Layers,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCanvas } from '../context/CanvasContext';
import { cn } from '../lib/utils';

const DEFAULT_ROLES = [
  {
    id: 'architect',
    name: 'Lead Architect',
    description: 'Design de alto nível, modularidade e padrões de projeto',
    icon: Layers,
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
  },
  {
    id: 'coder',
    name: 'Senior Dev',
    description: 'Implementação de código robusto, limpo e performático',
    icon: Code,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  },
  {
    id: 'reviewer',
    name: 'Code Reviewer',
    description: 'Revisão de qualidade, boas práticas e edge cases',
    icon: FileCheck,
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10'
  },
  {
    id: 'security',
    name: 'Security Auditor',
    description: 'Auditoria de segurança, vulnerabilidades e OWASP',
    icon: Shield,
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10'
  },
  {
    id: 'tester',
    name: 'QA & Tester',
    description: 'Casos de teste unitários/integração e cobertura',
    icon: CheckCircle2,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  }
];

export function SwarmTeamModal({
  isOpen,
  onClose,
  currentModel,
  onSendToChat
}) {
  const { t } = useLanguage();
  const { openCanvas, createNewDocument } = useCanvas();

  const [prompt, setPrompt] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(['architect', 'coder', 'reviewer']);
  const [mode, setMode] = useState('parallel'); // parallel, pipeline, debate
  const [isRunning, setIsRunning] = useState(false);
  const [currentSwarmId, setCurrentSwarmId] = useState(null);

  const [agentProgress, setAgentProgress] = useState({});
  const [synthesis, setSynthesis] = useState('');
  const [copiedSynthesis, setCopiedSynthesis] = useState(false);
  const [activeTab, setActiveTab] = useState('synthesis'); // synthesis or role id

  const abortListenerRef = useRef(null);

  // Setup swarm event listeners
  useEffect(() => {
    if (window.electron?.agent?.swarm?.onEvent) {
      abortListenerRef.current = window.electron.agent.swarm.onEvent((data) => {
        const { event, role, chunk, output, error, synthesis: masterSynth } = data;

        if (event === 'swarm:agent_started') {
          setAgentProgress(prev => ({
            ...prev,
            [role]: { ...(prev[role] || {}), status: 'running', output: prev[role]?.output || '' }
          }));
        } else if (event === 'swarm:agent_chunk') {
          setAgentProgress(prev => ({
            ...prev,
            [role]: {
              ...(prev[role] || {}),
              status: 'running',
              output: (prev[role]?.output || '') + chunk
            }
          }));
        } else if (event === 'swarm:agent_completed') {
          setAgentProgress(prev => ({
            ...prev,
            [role]: { ...(prev[role] || {}), status: 'completed', output: output || prev[role]?.output || '' }
          }));
        } else if (event === 'swarm:synthesis_chunk') {
          setSynthesis(prev => prev + (chunk || ''));
        } else if (event === 'swarm:completed') {
          setIsRunning(false);
          if (masterSynth) setSynthesis(masterSynth);
        } else if (event === 'swarm:cancelled' || event === 'swarm:error') {
          setIsRunning(false);
        }
      });
    }

    return () => {
      if (abortListenerRef.current) abortListenerRef.current();
    };
  }, []);

  const toggleRole = (roleId) => {
    if (isRunning) return;
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? (prev.length > 1 ? prev.filter(r => r !== roleId) : prev)
        : [...prev, roleId]
    );
  };

  const handleRunSwarm = async () => {
    if (!prompt.trim() || selectedRoles.length === 0 || isRunning) return;

    const swarmId = `swarm_${Date.now()}`;
    setCurrentSwarmId(swarmId);
    setIsRunning(true);
    setSynthesis('');
    setActiveTab('synthesis');

    // Initialize progress map
    const initialProgress = {};
    selectedRoles.forEach(r => {
      initialProgress[r] = { status: 'pending', output: '' };
    });
    setAgentProgress(initialProgress);

    try {
      if (window.electron?.agent?.swarm?.run) {
        await window.electron.agent.swarm.run({
          swarmId,
          prompt,
          roles: selectedRoles,
          mode,
          model: currentModel
        });
      } else {
        // Fallback simulation for testing without electron
        setTimeout(() => {
          setIsRunning(false);
          setSynthesis(`[Simulação Multi-Agente]\n\nPlano consolidado com sucesso para ${selectedRoles.length} especialistas.`);
        }, 1500);
      }
    } catch (err) {
      console.error('Swarm run error:', err);
      setIsRunning(false);
    }
  };

  const handleCancelSwarm = async () => {
    if (currentSwarmId && window.electron?.agent?.swarm?.cancel) {
      await window.electron.agent.swarm.cancel(currentSwarmId);
    }
    setIsRunning(false);
  };

  const handleCopySynthesis = () => {
    if (!synthesis) return;
    navigator.clipboard.writeText(synthesis);
    setCopiedSynthesis(true);
    setTimeout(() => setCopiedSynthesis(false), 2000);
  };

  const handleOpenInCanvas = () => {
    if (!synthesis) return;
    createNewDocument?.({
      title: `Swarm Synthesis - ${prompt.slice(0, 30)}...`,
      content: synthesis,
      language: 'markdown'
    });
    openCanvas?.();
    onClose();
  };

  const handleSendToChatView = () => {
    if (!synthesis) return;
    onSendToChat?.(synthesis);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Multi-Agent Swarm Team
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Neo Runtime
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Orquestre múltiplos subagentes especialistas com debates, concorrência e síntese
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Objective input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Objetivo / Tarefa para a Equipe
            </label>
            <textarea
              className="w-full h-24 p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none font-sans"
              placeholder="Ex: Desenvolva uma arquitetura para processamento assíncrono de pagamentos com tolerância a falhas, testes e segurança..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isRunning}
            />
          </div>

          {/* Role Selection & Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mode selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Modo de Orquestração
              </label>
              <div className="space-y-2">
                {[
                  { id: 'parallel', label: 'Paralelo + Síntese', desc: 'Todos analisam simultaneamente' },
                  { id: 'pipeline', label: 'Pipeline Sequencial', desc: 'Passagem em cadeia de contexto' },
                  { id: 'debate', label: 'Debate Multi-Round', desc: 'Crítica cruzada e consenso' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    disabled={isRunning}
                    className={cn(
                      'w-full text-left p-2.5 rounded-xl border transition-all text-xs',
                      mode === m.id
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-zinc-100'
                        : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    <div className="font-medium text-zinc-200">{m.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Specialist Roles Selection */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Especialistas da Equipe ({selectedRoles.length} selecionados)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEFAULT_ROLES.map(role => {
                  const Icon = role.icon;
                  const isSelected = selectedRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      disabled={isRunning}
                      className={cn(
                        'flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs',
                        isSelected
                          ? 'bg-zinc-800/90 border-indigo-500/40 text-zinc-100'
                          : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-500 hover:text-zinc-300'
                      )}
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5',
                          isSelected ? role.color : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                          {role.name}
                          {isSelected && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{role.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Execution Output & Progress */}
          {(isRunning || synthesis || Object.keys(agentProgress).length > 0) && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setActiveTab('synthesis')}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
                      activeTab === 'synthesis'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Síntese Master
                  </button>
                  {selectedRoles.map(roleId => {
                    const info = DEFAULT_ROLES.find(r => r.id === roleId);
                    const prog = agentProgress[roleId];
                    return (
                      <button
                        key={roleId}
                        onClick={() => setActiveTab(roleId)}
                        className={cn(
                          'px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                          activeTab === roleId
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                            : 'text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        {info?.name || roleId}
                        {prog?.status === 'running' && (
                          <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                        )}
                        {prog?.status === 'completed' && (
                          <Check className="w-3 h-3 text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {synthesis && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopySynthesis}
                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 border border-zinc-700"
                    >
                      {copiedSynthesis ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedSynthesis ? 'Copiado' : 'Copiar'}
                    </button>
                    <button
                      onClick={handleOpenInCanvas}
                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 border border-zinc-700"
                    >
                      <ExternalLink className="w-3 h-3" /> Canvas
                    </button>
                  </div>
                )}
              </div>

              {/* Display Active Tab Output */}
              <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl max-h-72 overflow-y-auto font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {activeTab === 'synthesis' ? (
                  synthesis ? (
                    synthesis
                  ) : isRunning ? (
                    <span className="text-indigo-400 animate-pulse flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Especialistas executando... aguardando síntese master...
                    </span>
                  ) : (
                    <span className="text-zinc-500">Nenhuma síntese gerada ainda.</span>
                  )
                ) : (
                  agentProgress[activeTab]?.output || (
                    <span className="text-zinc-500">Aguardando contribuição do especialista...</span>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            {isRunning ? 'Swarm em execução ativa...' : 'Selecione especialistas e inicie o time'}
          </div>

          <div className="flex items-center gap-3">
            {isRunning ? (
              <button
                onClick={handleCancelSwarm}
                className="px-4 py-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Cancelar
              </button>
            ) : (
              <button
                onClick={handleRunSwarm}
                disabled={!prompt.trim() || selectedRoles.length === 0}
                className={cn(
                  'px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 transition-all',
                  !prompt.trim() || selectedRoles.length === 0
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                )}
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Iniciar Equipe Swarm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SwarmTeamModal;

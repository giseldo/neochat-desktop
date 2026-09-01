import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  X,
  Play,
  Square,
  Sparkles,
  Shield,
  Code,
  CheckCircle2,
  FileCheck,
  Layers,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  MessageSquare
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
    color: 'text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
  },
  {
    id: 'coder',
    name: 'Senior Dev',
    description: 'Implementação de código robusto, limpo e performático',
    icon: Code,
    color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  },
  {
    id: 'reviewer',
    name: 'Code Reviewer',
    description: 'Revisão de qualidade, boas práticas e edge cases',
    icon: FileCheck,
    color: 'text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10'
  },
  {
    id: 'security',
    name: 'Security Auditor',
    description: 'Auditoria de segurança, vulnerabilidades e OWASP',
    icon: Shield,
    color: 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10'
  },
  {
    id: 'tester',
    name: 'QA & Tester',
    description: 'Casos de teste unitários/integração e cobertura',
    icon: CheckCircle2,
    color: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10'
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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isRunning) {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isRunning && prompt.trim() && selectedRoles.length > 0) {
        e.preventDefault();
        handleRunSwarm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRunning, prompt, selectedRoles, mode, currentModel]);

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

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-card border border-border text-card-foreground rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                Multi-Agent Swarm Team
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
                  Neo Runtime
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Orquestre múltiplos subagentes especialistas com debates, concorrência e síntese
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Objective input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Objetivo / Tarefa para a Equipe
              </label>
              <span className="text-[11px] text-muted-foreground font-medium">
                Ctrl+Enter para iniciar
              </span>
            </div>
            <textarea
              className="w-full h-24 p-3.5 bg-background border border-input rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none font-sans transition-all"
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
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
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
                      'w-full text-left p-3 rounded-xl border transition-all text-xs cursor-pointer',
                      mode === m.id
                        ? 'bg-primary/10 border-primary/40 text-foreground ring-1 ring-primary/30 shadow-2xs'
                        : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    <div className="font-semibold text-foreground">{m.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Specialist Roles Selection */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Especialistas da Equipe ({selectedRoles.length} selecionados)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEFAULT_ROLES.map(role => {
                  const Icon = role.icon;
                  const isSelected = selectedRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      disabled={isRunning}
                      className={cn(
                        'flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all text-xs cursor-pointer',
                        isSelected
                          ? 'bg-primary/10 border-primary/40 text-foreground ring-1 ring-primary/20 shadow-2xs'
                          : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5',
                          isSelected ? role.color : 'bg-muted border-border text-muted-foreground'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {role.name}
                          {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{role.description}</div>
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
              <div className="flex flex-wrap items-center justify-between border-b border-border pb-2 gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setActiveTab('synthesis')}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                      activeTab === 'synthesis'
                        ? 'bg-primary/15 text-primary border border-primary/30 shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
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
                          'px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer',
                          activeTab === roleId
                            ? 'bg-muted text-foreground border border-border font-semibold shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                      >
                        {info?.name || roleId}
                        {prog?.status === 'running' && (
                          <RefreshCw className="w-3 h-3 text-primary animate-spin" />
                        )}
                        {prog?.status === 'completed' && (
                          <Check className="w-3 h-3 text-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {synthesis && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopySynthesis}
                      className="px-2.5 py-1.5 rounded-xl bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 border border-border transition-all cursor-pointer shadow-2xs"
                    >
                      {copiedSynthesis ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSynthesis ? 'Copiado' : 'Copiar'}
                    </button>
                    <button
                      onClick={handleOpenInCanvas}
                      className="px-2.5 py-1.5 rounded-xl bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 border border-border transition-all cursor-pointer shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Canvas
                    </button>
                    {onSendToChat && (
                      <button
                        onClick={handleSendToChatView}
                        className="px-2.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs font-medium ring-2 ring-primary/30"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Enviar ao Chat
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Display Active Tab Output */}
              <div className="p-4 bg-muted/30 border border-border rounded-xl max-h-72 overflow-y-auto font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed shadow-2xs">
                {activeTab === 'synthesis' ? (
                  synthesis ? (
                    synthesis
                  ) : isRunning ? (
                    <span className="text-primary animate-pulse flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Especialistas executando... aguardando síntese master...
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Nenhuma síntese gerada ainda.</span>
                  )
                ) : (
                  agentProgress[activeTab]?.output || (
                    <span className="text-muted-foreground">Aguardando contribuição do especialista...</span>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-medium">
            {isRunning ? 'Swarm em execução ativa...' : 'Selecione especialistas e inicie o time'}
          </div>

          <div className="flex items-center gap-3">
            {isRunning ? (
              <button
                onClick={handleCancelSwarm}
                className="px-4 py-2 rounded-xl bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Cancelar
              </button>
            ) : (
              <button
                onClick={handleRunSwarm}
                disabled={!prompt.trim() || selectedRoles.length === 0}
                className={cn(
                  'px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ring-2 ring-primary/30 shadow-xs',
                  !prompt.trim() || selectedRoles.length === 0
                    ? 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                )}
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Iniciar Equipe Swarm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SwarmTeamModal;

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Swords,
  X,
  Play,
  Sparkles,
  Award,
  RefreshCw,
  Copy,
  Check,
  Send,
  Layers,
  Scale,
  Bot,
  Search,
  ChevronDown,
  FolderKanban,
  Flame,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

// Helper to select an appropriate provider icon or badge color
function getProviderColor(provider) {
  switch (provider?.toLowerCase()) {
    case 'anthropic':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    case 'openai':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
    case 'gemini':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    case 'deepseek':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    case 'groq':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
    case 'perplexity':
      return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30';
    case 'grok':
    case 'xai':
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
    case 'mistral':
      return 'bg-red-500/10 text-red-500 border-red-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

// Custom Searchable Model Dropdown Component (Lists ONLY active models of NeoChat)
function ActiveModelPickerPopover({
  value,
  provider,
  onChange,
  activeModels = [],
  className
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return activeModels;
    return activeModels.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.id || '').toLowerCase().includes(q) ||
      (m.provider || '').toLowerCase().includes(q) ||
      (m.group || '').toLowerCase().includes(q)
    );
  }, [activeModels, search]);

  const currentOption = activeModels.find(m => m.id === value || m.rawId === value) || {
    id: value,
    name: value,
    provider: provider || 'groq',
    group: provider || 'Groq'
  };

  const handleSelect = (item) => {
    onChange({
      model: item.rawId || item.id,
      provider: item.provider || 'groq',
      name: item.name || item.id
    });
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={cn('relative', className)} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-background hover:bg-muted/40 border border-input rounded-xl text-xs text-foreground transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-2xs"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-semibold text-foreground truncate">{currentOption.name || value}</span>
          <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px] hidden sm:inline">({value})</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <Badge variant="outline" className={cn('text-[9px] uppercase px-1.5 py-0 font-semibold', getProviderColor(currentOption.provider))}>
            {currentOption.provider}
          </Badge>
          <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 left-0 right-0 w-full min-w-[280px] sm:min-w-[340px] bg-card border border-border/90 rounded-2xl shadow-2xl p-2.5 space-y-2 animate-in fade-in-50 zoom-in-95 duration-150 backdrop-blur-md">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar entre modelos ativos..."
              autoFocus
              className="w-full pl-8 pr-3 py-1.5 bg-muted/40 border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Model list */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Nenhum modelo ativo corresponde à busca &ldquo;{search}&rdquo;.
              </div>
            ) : (
              filteredOptions.map((item) => {
                const isSelected = item.id === value || item.rawId === value;
                return (
                  <button
                    key={`${item.provider}-${item.id}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer',
                      isSelected ? 'bg-primary/10 border border-primary/20 text-primary font-semibold' : 'hover:bg-muted/60 text-foreground'
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{item.name || item.id}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground truncate">{item.id}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className={cn('text-[9px] uppercase px-1.5 py-0', getProviderColor(item.provider))}>
                        {item.provider}
                      </Badge>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-1" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ArenaModal({
  isOpen,
  onClose,
  currentModel,
  availableModels = [],
  modelConfigs = {},
  activeProject = null,
  projects = [],
  onSendToChat,
  onOpenCanvas
}) {
  const [mode, setMode] = useState('debate'); // 'debate' or 'consensus'
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [rounds, setRounds] = useState(2);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showJudgeConfig, setShowJudgeConfig] = useState(false);

  // Selected project for this arena session (defaults to NeoChat's active project)
  const [selectedProjectId, setSelectedProjectId] = useState(activeProject?.id || null);

  // Sync selected project when modal opens or activeProject changes
  useEffect(() => {
    if (isOpen) {
      setSelectedProjectId(activeProject?.id || null);
    }
  }, [isOpen, activeProject]);

  const currentActiveProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return (Array.isArray(projects) ? projects.find(p => p.id === selectedProjectId) : null) || activeProject || null;
  }, [projects, selectedProjectId, activeProject]);

  // Extract strictly ACTIVE models of NeoChat
  const activeModelOptions = useMemo(() => {
    if (!Array.isArray(availableModels) || availableModels.length === 0) {
      if (currentModel) {
        const cfg = modelConfigs?.[currentModel] || {};
        return [{
          id: currentModel,
          rawId: currentModel,
          name: cfg.displayName || currentModel,
          provider: cfg.provider || 'groq',
          group: cfg.group || 'Groq'
        }];
      }
      return [];
    }

    return availableModels.map(modelId => {
      const cfg = modelConfigs?.[modelId] || {};
      return {
        id: cfg.rawModelId || modelId,
        rawId: modelId,
        name: cfg.displayName || cfg.rawModelId || modelId,
        provider: cfg.provider || 'groq',
        group: cfg.group || cfg.provider || 'Groq'
      };
    });
  }, [availableModels, modelConfigs, currentModel]);

  // Initialize participants from NeoChat's active models
  const [participants, setParticipants] = useState([]);
  const [judgeModel, setJudgeModel] = useState({ name: 'Juiz e Sintetizador', model: '', provider: 'groq' });

  // Update default participants when activeModelOptions change
  useEffect(() => {
    if (activeModelOptions.length > 0) {
      const first = activeModelOptions.find(m => m.id === currentModel || m.rawId === currentModel) || activeModelOptions[0];
      const second = activeModelOptions.length > 1
        ? (activeModelOptions.find(m => m.id !== first.id && m.rawId !== first.rawId) || activeModelOptions[1])
        : first;

      setParticipants([
        {
          id: 'p1',
          name: `Debatedor A (${first.name})`,
          model: first.rawId || first.id,
          provider: first.provider,
          role: 'Proponente (Abordagem A)'
        },
        {
          id: 'p2',
          name: `Debatedor B (${second.name})`,
          model: second.rawId || second.id,
          provider: second.provider,
          role: 'Crítico / Refutador (Abordagem B)'
        }
      ]);

      setJudgeModel({
        name: `Juiz (${first.name})`,
        model: first.rawId || first.id,
        provider: first.provider
      });
    }
  }, [activeModelOptions, currentModel, isOpen]);

  // Dynamically generate duels from the user's active models
  const dynamicPresets = useMemo(() => {
    if (activeModelOptions.length < 2) return [];

    const presets = [];
    const m1 = activeModelOptions[0];
    const m2 = activeModelOptions[1];
    const m3 = activeModelOptions.length > 2 ? activeModelOptions[2] : null;

    presets.push({
      id: 'active-duel-1',
      name: `⚔️ ${m1.name} vs ${m2.name}`,
      tag: 'Duelo Principal',
      topic: currentActiveProject?.name
        ? `Qual a melhor abordagem técnica para implementar os novos requisitos do projeto "${currentActiveProject.name}" mantendo alta manutenibilidade e performance?`
        : 'Qual a melhor arquitetura para estado global e fluxo de dados em aplicações modernas: React 19 Actions/Hooks, Zustand ou Signals?',
      participantA: { name: `Debatedor A (${m1.name})`, model: m1.rawId || m1.id, provider: m1.provider, role: 'Proponente (Visão Estrutural)' },
      participantB: { name: `Debatedor B (${m2.name})`, model: m2.rawId || m2.id, provider: m2.provider, role: 'Crítico (Trade-offs & Falhas)' },
      judge: { name: `Juiz (${m1.name})`, model: m1.rawId || m1.id, provider: m1.provider }
    });

    if (m3) {
      presets.push({
        id: 'active-duel-2',
        name: `🧠 ${m1.name} vs ${m3.name}`,
        tag: 'Duelo Alternativo',
        topic: currentActiveProject?.name
          ? `Quais os principais riscos de segurança, gargalos de performance e dívidas técnicas na arquitetura do projeto "${currentActiveProject.name}"?`
          : 'Monolito Modular vs Microsserviços orientados a eventos: quando migrar e quais os trade-offs operacionais reais?',
        participantA: { name: `Debatedor A (${m1.name})`, model: m1.rawId || m1.id, provider: m1.provider, role: 'Proponente (Modular)' },
        participantB: { name: `Debatedor B (${m3.name})`, model: m3.rawId || m3.id, provider: m3.provider, role: 'Crítico (Pragmático)' },
        judge: { name: `Juiz (${m2.name})`, model: m2.rawId || m2.id, provider: m2.provider }
      });
    }

    return presets;
  }, [activeModelOptions, currentActiveProject]);

  const [currentProgress, setCurrentProgress] = useState(null);
  const [roundsData, setRoundsData] = useState([]);
  const [synthesis, setSynthesis] = useState(null);
  const [consensusResults, setConsensusResults] = useState(null);

  const eventListenerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isRunning) {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isRunning && topic.trim()) {
        e.preventDefault();
        handleStartDebate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRunning, topic, mode, rounds, participants, judgeModel, currentActiveProject]);

  useEffect(() => {
    if (window.electron?.arena?.onEvent) {
      eventListenerRef.current = window.electron.arena.onEvent((data) => {
        if (data.type === 'turn_start') {
          setCurrentProgress(`Rodada ${data.round}: ${data.participantName} está discursando...`);
        } else if (data.type === 'turn_complete') {
          setRoundsData(prev => {
            const roundIdx = prev.findIndex(r => r.round === data.round);
            if (roundIdx >= 0) {
              const updated = [...prev];
              updated[roundIdx].turns.push(data.turn);
              return updated;
            } else {
              return [...prev, { round: data.round, turns: [data.turn] }];
            }
          });
        } else if (data.type === 'synthesis_start') {
          setCurrentProgress(`Juiz (${data.judgeName}) está avaliando argumentos e gerando síntese...`);
        } else if (data.type === 'debate_complete') {
          setSynthesis(data.debate.synthesis);
          setIsRunning(false);
          setCurrentProgress(null);
        } else if (data.type === 'debate_error') {
          setIsRunning(false);
          setCurrentProgress(`Erro: ${data.error}`);
        }
      });

      return () => {
        if (typeof eventListenerRef.current === 'function') {
          eventListenerRef.current();
        }
      };
    }
  }, []);

  if (!isOpen) return null;

  const handleStartDebate = async () => {
    if (!topic.trim() || isRunning) return;
    setIsRunning(true);
    setRoundsData([]);
    setSynthesis(null);
    setConsensusResults(null);
    setCurrentProgress('Iniciando arena de debate...');

    try {
      if (mode === 'debate' && window.electron?.arena?.runDebate) {
        await window.electron.arena.runDebate({
          topic,
          context,
          project: currentActiveProject ? {
            id: currentActiveProject.id,
            name: currentActiveProject.name,
            customPrompt: currentActiveProject.customPrompt
          } : null,
          rounds,
          participants,
          judgeModel
        });
      } else if (mode === 'consensus' && window.electron?.arena?.runConsensus) {
        const res = await window.electron.arena.runConsensus({
          prompt: topic,
          models: participants
        });
        setConsensusResults(res);
        setIsRunning(false);
        setCurrentProgress(null);
      }
    } catch (err) {
      console.error('Arena execution failed:', err);
      setIsRunning(false);
      setCurrentProgress(`Falha na execução: ${err.message}`);
    }
  };

  const handleApplyPreset = (preset) => {
    setTopic(preset.topic);
    setParticipants([
      { id: 'p1', ...preset.participantA },
      { id: 'p2', ...preset.participantB }
    ]);
    if (preset.judge) {
      setJudgeModel(preset.judge);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border text-card-foreground rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">AI Arena & Debate Multi-Modelos</h2>
                <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20">
                  {mode === 'debate' ? 'Debate em Rodadas' : 'Votação por Consenso'}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                  • {activeModelOptions.length} {activeModelOptions.length === 1 ? 'modelo ativo' : 'modelos ativos no NeoChat'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Debate técnico automatizado entre os modelos ativos com síntese imparcial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-xl border border-border flex text-xs gap-1">
              <button
                onClick={() => setMode('debate')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all text-xs font-medium cursor-pointer',
                  mode === 'debate' 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                Debate
              </button>
              <button
                onClick={() => setMode('consensus')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all text-xs font-medium cursor-pointer',
                  mode === 'consensus' 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                Consenso
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Project Context Integration Bar */}
          <div className="bg-muted/40 border border-border/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Projeto Vinculado:</span>
                  {currentActiveProject ? (
                    <span 
                      className="text-xs font-semibold px-2 py-0.5 rounded-md border truncate"
                      style={{
                        backgroundColor: `${currentActiveProject.color || '#f55036'}18`,
                        borderColor: `${currentActiveProject.color || '#f55036'}40`,
                        color: currentActiveProject.color || '#f55036'
                      }}
                    >
                      {currentActiveProject.icon || '📁'} {currentActiveProject.name}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Geral (Sem projeto)
                    </span>
                  )}
                </div>
                {currentActiveProject?.customPrompt && (
                  <p className="text-[11px] text-muted-foreground truncate max-w-lg mt-0.5">
                    Diretrizes: {currentActiveProject.customPrompt}
                  </p>
                )}
              </div>
            </div>

            {/* Project Switcher */}
            {projects && projects.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={selectedProjectId || ''}
                  onChange={e => setSelectedProjectId(e.target.value ? e.target.value : null)}
                  disabled={isRunning}
                  className="bg-background border border-input rounded-lg px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  <option value="">🌐 Geral (Sem Projeto)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.icon || '📁'} {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Quick Battle Presets Carousel (if active models >= 2) */}
          {dynamicPresets.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  Duelos Rápidos com seus Modelos Ativos:
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {dynamicPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    disabled={isRunning}
                    className="px-3 py-2 bg-muted/30 hover:bg-muted border border-border/80 hover:border-primary/40 rounded-xl text-left shrink-0 transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                      {preset.tag}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Card */}
          <div className="bg-muted/30 border border-border/80 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Tema do Debate / Pergunta Técnica para os Modelos:
                </label>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Ctrl+Enter para iniciar
                </span>
              </div>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder={currentActiveProject ? `Ex: Qual a melhor arquitetura de componentes e estado para o projeto "${currentActiveProject.name}"? Defenda e aponte trade-offs.` : "Ex: Qual a melhor arquitetura para estado global em React 19: Signals, Zustand ou Context? Defenda e aponte trade-offs."}
                rows={2}
                disabled={isRunning}
                className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y min-h-[72px]"
              />
            </div>

            {/* Participants Grid (Strictly Active Models) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participants.map((p, idx) => (
                <div key={p.id} className="p-4 bg-background border border-border/80 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                      Debatedor {idx === 0 ? 'A (Proponente)' : 'B (Crítico)'}
                    </span>
                    <Badge variant="outline" className={cn('text-[10px] uppercase font-semibold', getProviderColor(p.provider))}>
                      {p.provider}
                    </Badge>
                  </div>

                  {/* Active Models Only Selector */}
                  <ActiveModelPickerPopover
                    value={p.model}
                    provider={p.provider}
                    activeModels={activeModelOptions}
                    onChange={({ model, provider, name }) => {
                      const updated = [...participants];
                      updated[idx].model = model;
                      updated[idx].provider = provider;
                      updated[idx].name = `Debatedor ${idx === 0 ? 'A' : 'B'} (${name})`;
                      setParticipants(updated);
                    }}
                  />

                  {/* Role input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground">Papel no Debate:</label>
                    <input
                      type="text"
                      value={p.role}
                      onChange={e => {
                        const updated = [...participants];
                        updated[idx].role = e.target.value;
                        setParticipants(updated);
                      }}
                      placeholder="Ex: Proponente (Abordagem A)"
                      className="w-full px-2.5 py-1.5 bg-muted/20 border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Judge Model & Rounds Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Rodadas:</span>
                  <select
                    value={rounds}
                    onChange={e => setRounds(Number(e.target.value))}
                    disabled={isRunning}
                    className="bg-background border border-input rounded-xl px-3 py-1.5 text-foreground text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value={1}>1 Rodada (Apresentação Direta)</option>
                    <option value={2}>2 Rodadas (Apresentação + Réplica/Crítica)</option>
                    <option value={3}>3 Rodadas (Debate Aprofundado)</option>
                  </select>
                </div>

                {/* Judge Config Toggle */}
                <button
                  type="button"
                  onClick={() => setShowJudgeConfig(!showJudgeConfig)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  <span>Juiz: <strong className="text-foreground">{judgeModel.name || judgeModel.model}</strong></span>
                  <ChevronDown className={cn('w-3 h-3 transition-transform', showJudgeConfig && 'rotate-180')} />
                </button>
              </div>

              <Button
                onClick={handleStartDebate}
                disabled={isRunning || !topic.trim() || activeModelOptions.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ring-2 ring-primary/30"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Debatendo...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Iniciar Arena
                  </>
                )}
              </Button>
            </div>

            {/* Expandable Judge Selection */}
            {showJudgeConfig && (
              <div className="p-3.5 bg-background border border-border rounded-xl space-y-2 animate-in fade-in-50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-primary" />
                    Modelo Juiz & Sintetizador Final
                  </span>
                  <Badge variant="outline" className={cn('text-[10px] uppercase', getProviderColor(judgeModel.provider))}>
                    {judgeModel.provider}
                  </Badge>
                </div>
                <ActiveModelPickerPopover
                  value={judgeModel.model}
                  provider={judgeModel.provider}
                  activeModels={activeModelOptions}
                  onChange={({ model, provider, name }) => {
                    setJudgeModel({
                      name: `Juiz (${name})`,
                      model,
                      provider
                    });
                  }}
                />
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {currentProgress && (
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium flex items-center gap-2.5 animate-pulse shadow-2xs">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{currentProgress}</span>
            </div>
          )}

          {/* Rounds Display (Debate Mode) */}
          {roundsData.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Histórico das Rodadas de Argumentação
              </h3>

              {roundsData.map((round) => (
                <div key={round.round} className="border border-border rounded-2xl bg-card overflow-hidden shadow-xs">
                  <div className="px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Rodada {round.round}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {round.turns.length} intervenções registradas
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {round.turns.map((turn, tIdx) => (
                      <div key={tIdx} className="p-4 bg-muted/20 border border-border/70 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-primary flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5" />
                            {turn.participantName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                            {turn.latencyMs}ms
                          </span>
                        </div>
                        <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">
                          {turn.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Consensus Results Display */}
          {consensusResults && consensusResults.results && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Respostas Paralelas & Consenso
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {consensusResults.results.map((res, rIdx) => (
                  <div key={rIdx} className="p-4 bg-background border border-border rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary">{res.modelName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                        {res.latencyMs}ms
                      </span>
                    </div>
                    <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {res.content || res.error || 'Sem resposta.'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Synthesis & Judge Verdict */}
          {synthesis && (
            <div className="border border-primary/30 bg-primary/5 rounded-2xl p-5 space-y-3.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Award className="w-5 h-5 text-amber-500" />
                  Veredito &amp; Síntese Otimizada do Juiz ({synthesis.judgeName})
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(synthesis.content)}
                    className="px-3 py-1.5 rounded-xl bg-background hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  {onSendToChat && (
                    <button
                      onClick={() => {
                        onClose();
                        const projectHeader = currentActiveProject ? ` [Projeto: ${currentActiveProject.name}]` : '';
                        onSendToChat(`### ⚔️ Síntese do Debate Multi-Modelos${projectHeader}: ${topic}\n\n${synthesis.content}`);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs flex items-center gap-1.5 font-medium transition-all shadow-xs cursor-pointer ring-2 ring-primary/30"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar ao Chat
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 bg-background border border-border/80 rounded-xl text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto shadow-2xs">
                {synthesis.content}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}

export default ArenaModal;

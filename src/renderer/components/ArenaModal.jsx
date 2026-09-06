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
  Brain,
  Zap,
  Code2,
  Globe,
  Flame
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

// Curated 2025/2026 Frontier & Popular Models Catalog
const CURATED_MODELS_CATALOG = [
  // Anthropic
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'anthropic', category: 'frontier', badge: 'Frontier SOTA' },
  { id: 'anthropic/claude-3.7-sonnet:thinking', name: 'Claude 3.7 Sonnet (Thinking)', provider: 'anthropic', category: 'reasoning', badge: 'Hybrid Reasoning' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', category: 'coding', badge: 'Coding Leader' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'anthropic', category: 'fast', badge: 'Ultra-Fast' },

  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', category: 'frontier', badge: 'Flagship Multimodal' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', category: 'fast', badge: 'Fast & Efficient' },
  { id: 'o3-mini', name: 'o3-mini', provider: 'openai', category: 'reasoning', badge: 'STEM Reasoning' },
  { id: 'o1', name: 'o1', provider: 'openai', category: 'reasoning', badge: 'Deep Reasoning' },
  { id: 'gpt-4.5-preview', name: 'GPT-4.5 Preview', provider: 'openai', category: 'frontier', badge: 'Frontier Next-Gen' },

  // Google Gemini
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', category: 'fast', badge: 'Next-Gen Speed' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini', category: 'frontier', badge: 'Next-Gen Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', category: 'fast', badge: 'Real-time Multimodal' },
  { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini 2.0 Flash Thinking', provider: 'gemini', category: 'reasoning', badge: 'Reasoning Exp' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', category: 'frontier', badge: '2M Context' },

  // DeepSeek
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', category: 'reasoning', badge: 'Open SOTA Reasoning' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', category: 'frontier', badge: '671B MoE' },

  // Groq (LPU Ultra-Fast)
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', provider: 'groq', category: 'frontier', badge: 'LPU Ultra-Fast' },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B (Groq)', provider: 'groq', category: 'reasoning', badge: 'Fast Reasoning' },
  { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B (Groq)', provider: 'groq', category: 'coding', badge: 'Fast Code LPU' },
  { id: 'deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill Qwen 32B (Groq)', provider: 'groq', category: 'reasoning', badge: 'Distill Qwen' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Groq)', provider: 'groq', category: 'fast', badge: 'Instant Response' },

  // xAI (Grok)
  { id: 'grok-2-latest', name: 'Grok 2', provider: 'grok', category: 'frontier', badge: 'xAI Flagship' },
  { id: 'grok-3', name: 'Grok 3', provider: 'grok', category: 'reasoning', badge: 'xAI Reasoning' },

  // Perplexity
  { id: 'sonar-pro', name: 'Sonar Pro', provider: 'perplexity', category: 'frontier', badge: 'Live Web Search' },
  { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', provider: 'perplexity', category: 'reasoning', badge: 'Web Reasoning' },

  // Mistral AI
  { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', category: 'frontier', badge: 'Flagship European' },
  { id: 'codestral-latest', name: 'Codestral', provider: 'mistral', category: 'coding', badge: 'Specialized Code' }
];

// Curated Battle Presets
const BATTLE_PRESETS = [
  {
    id: 'frontier-titans',
    name: '👑 Frontier Titans',
    tag: 'Claude 3.7 vs GPT-4o',
    topic: 'Quais os trade-offs fundamentais entre microsserviços orientados a eventos vs monolito modular em sistemas de alta escala?',
    participantA: { name: 'Debatedor A (Claude 3.7)', model: 'anthropic/claude-3.7-sonnet', provider: 'anthropic', role: 'Proponente (Visão Sistêmica)' },
    participantB: { name: 'Debatedor B (GPT-4o)', model: 'gpt-4o', provider: 'openai', role: 'Crítico (Visão Pragmática & Operacional)' },
    judge: { name: 'Juiz (DeepSeek R1)', model: 'deepseek-reasoner', provider: 'deepseek' }
  },
  {
    id: 'reasoning-masters',
    name: '🧠 Raciocínio Profundo',
    tag: 'DeepSeek R1 vs Claude 3.7 Thinking',
    topic: 'Como resolver formalmente problemas de concorrência com consistência eventual sem deadlocks em bancos distribuídos?',
    participantA: { name: 'Debatedor A (DeepSeek R1)', model: 'deepseek-reasoner', provider: 'deepseek', role: 'Proponente (Análise Matemática/Algorítmica)' },
    participantB: { name: 'Debatedor B (Claude 3.7 Thinking)', model: 'anthropic/claude-3.7-sonnet:thinking', provider: 'anthropic', role: 'Crítico (Casos Limítrofes & Falhas)' },
    judge: { name: 'Juiz (GPT-4o)', model: 'gpt-4o', provider: 'openai' }
  },
  {
    id: 'speed-demons',
    name: '⚡ Ultra-Velozes',
    tag: 'Gemini 2.5 Flash vs GPT-4o Mini',
    topic: 'Qual a estratégia ideal de cache multi-camadas (Redis, Edge CDN, Local Memory) para APIs com SLA sub-10ms?',
    participantA: { name: 'Debatedor A (Gemini 2.5 Flash)', model: 'gemini-2.5-flash', provider: 'gemini', role: 'Proponente (Alta Vazão)' },
    participantB: { name: 'Debatedor B (GPT-4o Mini)', model: 'gpt-4o-mini', provider: 'openai', role: 'Crítico (Invalidação & Consistência)' },
    judge: { name: 'Juiz (Claude 3.7 Sonnet)', model: 'anthropic/claude-3.7-sonnet', provider: 'anthropic' }
  },
  {
    id: 'code-champions',
    name: '💻 Mestres de Código',
    tag: 'Qwen 2.5 Coder vs Claude 3.5 Sonnet',
    topic: 'React 19 Server Components vs Client-Side SPA com Signals: qual oferece a melhor experiência de desenvolvimento e performance em 2026?',
    participantA: { name: 'Debatedor A (Qwen 2.5 Coder)', model: 'qwen-2.5-coder-32b', provider: 'groq', role: 'Proponente (Arquitetura & DX)' },
    participantB: { name: 'Debatedor B (Claude 3.5 Sonnet)', model: 'anthropic/claude-3.5-sonnet', provider: 'anthropic', role: 'Crítico (Complexidade & SSR Trade-offs)' },
    judge: { name: 'Juiz (Claude 3.7 Sonnet)', model: 'anthropic/claude-3.7-sonnet', provider: 'anthropic' }
  },
  {
    id: 'opensource-heavyweights',
    name: '🦙 Open-Source Titans',
    tag: 'Llama 3.3 70B vs DeepSeek R1 Distill',
    topic: 'Rust vs Go para backend de infraestrutura moderna: quando a segurança de memória justifica o custo de curva de aprendizado?',
    participantA: { name: 'Debatedor A (Llama 3.3 70B)', model: 'llama-3.3-70b-versatile', provider: 'groq', role: 'Proponente (Produtividade & Robustez)' },
    participantB: { name: 'Debatedor B (DeepSeek R1 Distill)', model: 'deepseek-r1-distill-llama-70b', provider: 'groq', role: 'Crítico (Performance & Zero-Cost Abstractions)' },
    judge: { name: 'Juiz (Llama 3.3 70B)', model: 'llama-3.3-70b-versatile', provider: 'groq' }
  }
];

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
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

// Custom Searchable Model Dropdown Component
function ModelPickerPopover({
  value,
  provider,
  onChange,
  modelOptions,
  className
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');
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
    if (!q) return modelOptions;
    return modelOptions.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.id || '').toLowerCase().includes(q) ||
      (m.provider || '').toLowerCase().includes(q) ||
      (m.badge || '').toLowerCase().includes(q)
    );
  }, [modelOptions, search]);

  const currentOption = modelOptions.find(m => m.id === value) || {
    id: value,
    name: value,
    provider: provider || 'groq',
    badge: 'Custom'
  };

  const handleSelect = (item) => {
    onChange({
      model: item.id,
      provider: item.provider || 'groq',
      name: item.name || item.id
    });
    setIsOpen(false);
    setSearch('');
  };

  const handleApplyCustom = () => {
    if (customInput.trim()) {
      let inferredProvider = 'groq';
      const val = customInput.trim();
      if (val.includes('claude')) inferredProvider = 'anthropic';
      else if (val.includes('gpt') || val.startsWith('o1') || val.startsWith('o3')) inferredProvider = 'openai';
      else if (val.includes('gemini')) inferredProvider = 'gemini';
      else if (val.includes('deepseek')) inferredProvider = 'deepseek';
      else if (val.includes('sonar')) inferredProvider = 'perplexity';

      onChange({
        model: val,
        provider: inferredProvider,
        name: val
      });
      setIsOpen(false);
      setCustomInput('');
    }
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
              placeholder="Buscar por modelo, ID ou provedor..."
              autoFocus
              className="w-full pl-8 pr-3 py-1.5 bg-muted/40 border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Model list */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Nenhum modelo predefinido encontrado para "{search}".
              </div>
            ) : (
              filteredOptions.map((item) => {
                const isSelected = item.id === value;
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
                        {item.badge && (
                          <span className="text-[9px] px-1 rounded bg-muted text-muted-foreground font-normal">
                            {item.badge}
                          </span>
                        )}
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

          {/* Custom Model Direct Input */}
          <div className="pt-2 border-t border-border flex items-center gap-1.5">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              placeholder="Outro ID (ex: claude-3-7-sonnet-20250219)"
              className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyCustom();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyCustom}
              disabled={!customInput.trim()}
              className="text-xs px-2.5 py-1.5 h-auto cursor-pointer"
            >
              Usar
            </Button>
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

  // Available models from settings / context & curated list
  const [apiModels, setApiModels] = useState([]);
  const [participants, setParticipants] = useState([
    { id: 'p1', name: 'Debatedor A (Claude 3.7)', model: 'anthropic/claude-3.7-sonnet', provider: 'anthropic', role: 'Proponente (Abordagem A)' },
    { id: 'p2', name: 'Debatedor B (GPT-4o)', model: 'gpt-4o', provider: 'openai', role: 'Crítico / Refutador (Abordagem B)' }
  ]);
  const [judgeModel, setJudgeModel] = useState({ name: 'Juiz e Sintetizador', model: 'deepseek-reasoner', provider: 'deepseek' });

  const [currentProgress, setCurrentProgress] = useState(null);
  const [roundsData, setRoundsData] = useState([]);
  const [synthesis, setSynthesis] = useState(null);
  const [consensusResults, setConsensusResults] = useState(null);

  const eventListenerRef = useRef(null);

  // Combine curated models with live API models fetched from electron
  useEffect(() => {
    const loadModels = async () => {
      if (window.electron?.getModelConfigs) {
        try {
          const configs = await window.electron.getModelConfigs();
          if (configs) {
            const list = Object.entries(configs)
              .filter(([k]) => k !== 'default')
              .map(([id, cfg]) => ({
                id: cfg.rawModelId || id,
                name: cfg.displayName || id,
                provider: cfg.provider || 'groq',
                badge: cfg.provider ? `${cfg.provider}` : undefined
              }));
            if (list.length > 0) {
              setApiModels(list);
            }
          }
        } catch (e) {
          console.warn('Could not fetch model configs for arena:', e);
        }
      }
    };
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  // Unified all model options
  const allModelOptions = useMemo(() => {
    const map = new Map();
    // 1. Add curated models first
    CURATED_MODELS_CATALOG.forEach(m => map.set(`${m.provider}::${m.id}`, m));
    // 2. Merge API models
    apiModels.forEach(m => {
      const key = `${m.provider}::${m.id}`;
      if (!map.has(key)) {
        map.set(key, m);
      }
    });
    return Array.from(map.values());
  }, [apiModels]);

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
  }, [isOpen, isRunning, topic, mode, rounds, participants, judgeModel]);

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
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Coloque os modelos mais avançados de 2025/2026 para debater premissas e obter a síntese perfeita
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Battle Presets Carousel / Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                Duelos Recomendados (Frontier SOTA 2025/2026):
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
              {BATTLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  disabled={isRunning}
                  className="px-3 py-2 bg-muted/40 hover:bg-muted border border-border/80 hover:border-primary/40 rounded-xl text-left shrink-0 transition-all cursor-pointer shadow-2xs group"
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
                placeholder="Ex: Qual a melhor arquitetura para estado global em React 19: Signals, Zustand ou Context? Defenda e aponte trade-offs."
                rows={2}
                disabled={isRunning}
                className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y min-h-[72px]"
              />
            </div>

            {/* Participants Grid */}
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

                  {/* Interactive Model Selector Dropdown */}
                  <ModelPickerPopover
                    value={p.model}
                    provider={p.provider}
                    modelOptions={allModelOptions}
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
                disabled={isRunning || !topic.trim()}
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
                <ModelPickerPopover
                  value={judgeModel.model}
                  provider={judgeModel.provider}
                  modelOptions={allModelOptions}
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
                        onSendToChat(`### Síntese do Debate Multi-Modelos: ${topic}\n\n${synthesis.content}`);
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

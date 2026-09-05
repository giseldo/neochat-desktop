import React, { useState, useEffect, useRef } from 'react';
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
  Bot
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

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

  // Available models from settings / context
  const [modelOptions, setModelOptions] = useState([]);
  const [participants, setParticipants] = useState([
    { id: 'p1', name: 'Debatedor A (Llama 3.3)', model: 'llama-3.3-70b-versatile', provider: 'groq', role: 'Proponente (Abordagem A)' },
    { id: 'p2', name: 'Debatedor B (DeepSeek R1)', model: 'deepseek-r1-distill-llama-70b', provider: 'groq', role: 'Crítico / Refutador (Abordagem B)' }
  ]);
  const [judgeModel, setJudgeModel] = useState({ name: 'Juiz e Sintetizador', model: 'llama-3.3-70b-versatile', provider: 'groq' });

  const [currentProgress, setCurrentProgress] = useState(null);
  const [roundsData, setRoundsData] = useState([]);
  const [synthesis, setSynthesis] = useState(null);
  const [consensusResults, setConsensusResults] = useState(null);

  const eventListenerRef = useRef(null);

  useEffect(() => {
    // Load model configs from electron if available
    const loadModels = async () => {
      if (window.electron?.getModelConfigs) {
        try {
          const configs = await window.electron.getModelConfigs();
          if (configs) {
            const list = Object.entries(configs)
              .filter(([k]) => k !== 'default')
              .map(([id, cfg]) => ({
                id,
                name: cfg.displayName || id,
                provider: cfg.provider || 'groq'
              }));
            if (list.length > 0) {
              setModelOptions(list);
            }
          }
        } catch (e) {}
      }
    };
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

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

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Hidden datalist for model autocomplete */}
      <datalist id="arena-model-options">
        {modelOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name} ({opt.provider})
          </option>
        ))}
      </datalist>

      <div 
        className="bg-card border border-border text-card-foreground rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
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
                Coloque diferentes modelos de IA para debater premissas e obter a síntese perfeita
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participants.map((p, idx) => (
                <div key={p.id} className="p-4 bg-background border border-border/80 rounded-xl space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                      Debatedor {idx === 0 ? 'A (Proponente)' : 'B (Crítico)'}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted border-border">
                      {p.provider}
                    </Badge>
                  </div>
                  <input
                    type="text"
                    list="arena-model-options"
                    value={p.model}
                    onChange={e => {
                      const updated = [...participants];
                      updated[idx].model = e.target.value;
                      // Update provider if recognized from modelOptions
                      const matched = modelOptions.find(m => m.id === e.target.value);
                      if (matched) {
                        updated[idx].provider = matched.provider;
                      }
                      setParticipants(updated);
                    }}
                    placeholder="ID do modelo (ex: llama-3.3-70b-versatile)"
                    className="w-full px-3 py-2 bg-muted/30 border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono transition-all"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Rodadas de Debate:</span>
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
                  Veredito & Síntese Otimizada do Juiz ({synthesis.judgeName})
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

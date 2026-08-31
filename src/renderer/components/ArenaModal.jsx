import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Swords,
  X,
  Play,
  Square,
  Sparkles,
  Award,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  Send,
  FileText,
  Zap,
  Cpu,
  Layers,
  ChevronDown
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
    if (!topic.trim()) return;
    setIsRunning(true);
    setRoundsData([]);
    setSynthesis(null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">AI Arena & Debate Multi-Modelos</h2>
                <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
                  {mode === 'debate' ? 'Debate em Rodadas' : 'Votação por Consenso'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Coloque diferentes modelos de IA para debater premissas e obter a síntese perfeita
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex text-xs">
              <button
                onClick={() => setMode('debate')}
                className={cn('px-2.5 py-1 rounded-md transition-colors', mode === 'debate' ? 'bg-orange-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200')}
              >
                Debate
              </button>
              <button
                onClick={() => setMode('consensus')}
                className={cn('px-2.5 py-1 rounded-md transition-colors', mode === 'consensus' ? 'bg-orange-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200')}
              >
                Consenso
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Configuration Card */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Tema do Debate / Pergunta Técnica para os Modelos:
              </label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Ex: Qual a melhor arquitetura para estado global em React 19: Signals, Zustand ou Context? Defenda e aponte trade-offs."
                rows={2}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participants.map((p, idx) => (
                <div key={p.id} className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Debatedor {idx === 0 ? 'A (Proponente)' : 'B (Crítico)'}</span>
                    <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800">{p.provider}</Badge>
                  </div>
                  <input
                    type="text"
                    value={p.model}
                    onChange={e => {
                      const updated = [...participants];
                      updated[idx].model = e.target.value;
                      setParticipants(updated);
                    }}
                    placeholder="ID do modelo (ex: llama-3.3-70b-versatile)"
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>Rodadas de Debate:</span>
                <select
                  value={rounds}
                  onChange={e => setRounds(Number(e.target.value))}
                  disabled={isRunning}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-xs"
                >
                  <option value={1}>1 Rodada (Apresentação Direta)</option>
                  <option value={2}>2 Rodadas (Apresentação + Réplica/Crítica)</option>
                  <option value={3}>3 Rodadas (Debate Aprofundado)</option>
                </select>
              </div>

              <Button
                onClick={handleStartDebate}
                disabled={isRunning || !topic.trim()}
                className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs px-5 py-2 rounded-lg flex items-center gap-2"
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
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-center gap-2 animate-pulse">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{currentProgress}</span>
            </div>
          )}

          {/* Rounds Display */}
          {roundsData.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-400" />
                Histórico das Rodadas de Argumentação
              </h3>

              {roundsData.map((round) => (
                <div key={round.round} className="border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-900/70 border-b border-zinc-800/80 text-xs font-semibold text-zinc-300">
                    Rodada {round.round}
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {round.turns.map((turn, tIdx) => (
                      <div key={tIdx} className="p-3 bg-zinc-950/80 border border-zinc-800/60 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-orange-400">{turn.participantName}</span>
                          <span className="text-[10px] text-zinc-500">{turn.latencyMs}ms</span>
                        </div>
                        <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">
                          {turn.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Final Synthesis & Judge Verdict */}
          {synthesis && (
            <div className="border border-orange-500/30 bg-orange-950/10 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-orange-400">
                  <Award className="w-5 h-5 text-amber-400" />
                  Veredito & Síntese Otimizada do Juiz ({synthesis.judgeName})
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(synthesis.content)}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  {onSendToChat && (
                    <button
                      onClick={() => {
                        onClose();
                        onSendToChat(`### Síntese do Debate Multi-Modelos: ${topic}\n\n${synthesis.content}`);
                      }}
                      className="p-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs flex items-center gap-1.5 font-medium"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar ao Chat
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-lg text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
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

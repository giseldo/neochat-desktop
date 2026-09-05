import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Mic,
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  User,
  Users,
  Copy,
  Check,
  Download,
  Share2,
  FastForward,
  Rewind,
  Music
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function PodcastStudioModal({
  isOpen,
  onClose,
  initialText = '',
  initialTopic = ''
}) {
  const [topic, setTopic] = useState(initialTopic || 'Visão Geral e Inovações do NeoChat Desktop');
  const [sourceText, setSourceText] = useState(initialText || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcastData, setPodcastData] = useState(null);

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [copied, setCopied] = useState(false);

  const synthRef = useRef(window.speechSynthesis || null);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (!isOpen && synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
    }
  }, [isOpen]);

  const handleGenerateScript = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
    setCurrentTurnIdx(0);

    try {
      if (window.electron?.podcast?.generateScript) {
        const res = await window.electron.podcast.generateScript({
          topic,
          sourceText,
          durationMinutes: 3
        });
        setPodcastData(res);
      } else {
        // Fallback demo script
        setPodcastData({
          title: topic,
          summary: 'Discussão detalhada sobre os principais avanços tecnológicos.',
          estimatedDuration: '3 min',
          dialogue: [
            { speaker: 'Alex', voice: 'host_a', text: `Olá a todos e bem-vindos a este episódio especial sobre ${topic}!` },
            { speaker: 'Sam', voice: 'host_b', text: 'Com certeza, Alex! Hoje temos detalhes muito interessantes sobre a arquitetura e novos módulos.' },
            { speaker: 'Alex', voice: 'host_a', text: 'O que mais me impressiona é como o sistema mantém velocidade máxima usando carregamento sob demanda.' },
            { speaker: 'Sam', voice: 'host_b', text: 'Exato. Zero desperdício de memória e execução instantânea quando você precisa.' }
          ]
        });
      }
    } catch (err) {
      console.error('Failed to generate podcast:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const playTurn = (idx) => {
    if (!podcastData || !podcastData.dialogue || !podcastData.dialogue[idx]) {
      setIsPlaying(false);
      return;
    }

    const turn = podcastData.dialogue[idx];
    setCurrentTurnIdx(idx);
    setIsPlaying(true);

    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(turn.text);
      utterance.rate = playbackSpeed;
      // Host A (Alex) has slightly higher pitch, Host B (Sam) lower pitch
      utterance.pitch = turn.speaker === 'Alex' ? 1.15 : 0.9;
      utterance.lang = 'pt-BR';

      utterance.onend = () => {
        if (idx + 1 < podcastData.dialogue.length) {
          playTurn(idx + 1);
        } else {
          setIsPlaying(false);
          setCurrentTurnIdx(0);
        }
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (synthRef.current) synthRef.current.cancel();
      setIsPlaying(false);
    } else {
      playTurn(currentTurnIdx);
    }
  };

  const handleCopyScript = () => {
    if (!podcastData) return;
    const text = `# ${podcastData.title}\n\n${podcastData.summary}\n\n` +
      podcastData.dialogue.map(d => `**[${d.speaker}]:** ${d.text}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (synthRef.current) synthRef.current.cancel();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border text-card-foreground rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-2xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">Podcast & Audio Studio</h2>
                <Badge variant="outline" className="text-[11px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                  NotebookLM Style
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transforme documentos, notas e chats em conversas dinâmicas com 2 apresentadores via TTS
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (synthRef.current) synthRef.current.cancel();
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Generation Setup */}
          <div className="p-5 bg-muted/30 border border-border rounded-xl space-y-3.5 shadow-2xs">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Tema do Episódio:</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Ex: Arquitetura Modular e Novas Funcionalidades do NeoChat"
                className="w-full px-3.5 py-2 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Texto Base / Notas (Opcional):</label>
              <textarea
                value={sourceText}
                onChange={e => setSourceText(e.target.value)}
                rows={2}
                placeholder="Cole notas ou trechos de documentos para os apresentadores discutirem..."
                className="w-full px-3.5 py-2 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleGenerateScript}
                disabled={isGenerating || !topic.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ring-2 ring-primary/30 shadow-xs disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Gerando Podcast...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Gerar Roteiro do Podcast
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Podcast Player & Transcript */}
          {podcastData && (
            <div className="space-y-4">
              
              {/* Audio Waveform Player Bar */}
              <div className="p-4 bg-muted/40 border border-border rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ring-2 ring-primary/30"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <div>
                    <h3 className="text-sm font-bold text-foreground">{podcastData.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>Alex & Sam</span>
                      <span>•</span>
                      <span>{podcastData.estimatedDuration}</span>
                    </div>
                  </div>
                </div>

                {/* Animated Soundwave */}
                <div className="flex items-center gap-1.5 h-8 px-4">
                  {[40, 70, 30, 90, 50, 80, 25, 65, 95, 45, 75, 35].map((height, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'w-1 rounded-full transition-all duration-300',
                        isPlaying ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'
                      )}
                      style={{
                        height: isPlaying ? `${Math.max(15, (height * Math.random()).toFixed(0))}%` : '25%'
                      }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={playbackSpeed}
                    onChange={e => setPlaybackSpeed(Number(e.target.value))}
                    className="bg-background border border-input rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all"
                  >
                    <option value={0.8}>0.8x</option>
                    <option value={1.0}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                  </select>

                  <button
                    onClick={handleCopyScript}
                    className="p-2 bg-background hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Copiar Roteiro"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Dialogue Transcript */}
              <div className="space-y-3">
                {podcastData.dialogue?.map((turn, idx) => {
                  const isCurrent = isPlaying && currentTurnIdx === idx;
                  const isAlex = turn.speaker === 'Alex';

                  return (
                    <div
                      key={idx}
                      onClick={() => playTurn(idx)}
                      className={cn(
                        'p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5',
                        isCurrent
                          ? 'bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20'
                          : 'bg-card border-border hover:border-border/80 hover:bg-muted/30 shadow-2xs'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold border',
                        isAlex
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      )}>
                        {isAlex ? 'A' : 'S'}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={cn('text-xs font-bold', isAlex ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400')}>
                            {turn.speaker} {isAlex ? '(Apresentador A)' : '(Especialista B)'}
                          </span>
                          {isCurrent && (
                            <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30 animate-pulse">
                              Tocando agora
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {turn.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}

export default PodcastStudioModal;

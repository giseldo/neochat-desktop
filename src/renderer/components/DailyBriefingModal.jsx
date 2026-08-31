import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sun,
  X,
  Calendar,
  GitBranch,
  CheckCircle2,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Send,
  Clock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function DailyBriefingModal({
  isOpen,
  onClose,
  onSendToChat
}) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBriefing = async () => {
    setLoading(true);
    try {
      if (window.electron?.dailyBriefing?.get) {
        const data = await window.electron.dailyBriefing.get({});
        setBriefing(data);
      } else {
        // Fallback briefing
        setBriefing({
          date: 'Segunda-feira, 31 de Agosto de 2026',
          greeting: 'Bom dia!',
          quote: '“O foco não é fazer mais coisas, mas fazer as coisas certas com excelência.”',
          agenda: [
            { time: '09:00', title: 'Planejamento e Prioridades do Dia', type: 'focus' },
            { time: '14:30', title: 'Desenvolvimento e Revisão de Módulos NeoChat', type: 'dev' },
            { time: '17:30', title: 'Fechamento e Testes', type: 'wrapup' }
          ],
          gitActivity: [
            { repo: 'neochat-desktop', branch: 'main', message: 'feat(plugins): modular micro-kernel runtime', author: 'You' }
          ],
          pendingTasks: [
            { id: 't1', title: 'Verificar status dos plugins modulares com zero overhead', priority: 'high' }
          ],
          quickInsights: [
            'Todos os novos módulos estão operando em modo Lazy-Loading (0MB de consumo em repouso).'
          ]
        });
      }
    } catch (err) {
      console.error('Failed to get daily briefing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBriefing();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReadAloud = () => {
    if (!briefing || !window.speechSynthesis) return;

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    } else {
      const speechText = `${briefing.greeting}. Aqui está seu briefing para ${briefing.date}. ` +
        `Você tem ${briefing.agenda.length} compromissos agendados. ` +
        briefing.agenda.map(a => `Às ${a.time}, ${a.title}`).join('. ') +
        `. Destaque do dia: ${briefing.quote}`;

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setIsReading(true);
    }
  };

  const handleCopy = () => {
    if (!briefing) return;
    const text = `# Briefing Diário • ${briefing.date}\n\n` +
      `> ${briefing.quote}\n\n` +
      `### Agenda\n` + briefing.agenda.map(a => `- **${a.time}**: ${a.title}`).join('\n') + `\n\n` +
      `### Tarefas & Prioridades\n` + briefing.pendingTasks.map(t => `- [ ] ${t.title}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Proactive Daily Briefing</h2>
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                  Resumo Matinal
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Visão consolidada de compromissos, código recente, prioridades e notícias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReadAloud}
              className={cn(
                'text-xs border-zinc-700 flex items-center gap-1.5',
                isReading ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'text-zinc-300'
              )}
            >
              {isReading ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isReading ? 'Parar Áudio' : 'Ouvir Briefing'}
            </Button>

            <button
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                onClose();
              }}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3 text-zinc-500">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <p className="text-xs">Sintetizando briefing do dia...</p>
            </div>
          ) : briefing ? (
            <>
              {/* Hero Greeting Card */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/10 via-zinc-900/40 to-zinc-900/80 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{briefing.date}</span>
                  <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800">
                    Neo Intelligence
                  </Badge>
                </div>
                <h3 className="text-xl font-bold text-zinc-100">{briefing.greeting}</h3>
                <p className="text-xs text-zinc-400 italic">
                  {briefing.quote}
                </p>
              </div>

              {/* Agenda & Tasks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Agenda */}
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Agenda & Compromissos
                  </h4>
                  <div className="space-y-2">
                    {briefing.agenda?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/40 text-xs">
                        <span className="font-mono text-indigo-400 text-[11px] shrink-0">{item.time}</span>
                        <span className="text-zinc-200 font-medium truncate">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Git Activity */}
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                    Atividade Recente no Repositório
                  </h4>
                  <div className="space-y-2">
                    {briefing.gitActivity?.map((item, idx) => (
                      <div key={idx} className="p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/40 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span className="font-mono text-emerald-400">{item.repo}:{item.branch}</span>
                          <span>{item.author}</span>
                        </div>
                        <p className="text-zinc-300 truncate text-[11px]">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Priorities and Insights */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Insights e Recomendações do Sistema
                </h4>
                <div className="space-y-1.5">
                  {briefing.quickInsights?.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar Briefing'}
          </button>

          {onSendToChat && briefing && (
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onSendToChat(`### Briefing Diário • ${briefing.date}\n${briefing.greeting}\n\n**Agenda:**\n${briefing.agenda.map(a => `- ${a.time}: ${a.title}`).join('\n')}`);
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar para o Chat
            </Button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

export default DailyBriefingModal;

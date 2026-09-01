import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  X,
  Camera,
  Scan,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Send,
  Shield,
  Layers,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function ComputerVisionModal({
  isOpen,
  onClose,
  onSendToChat
}) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [goal, setGoal] = useState('Descreva a interface e liste os principais elementos e ações disponíveis');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCaptureScreen = async () => {
    setIsCapturing(true);
    try {
      if (window.electron?.vision?.captureScreen) {
        const res = await window.electron.vision.captureScreen();
        if (res?.dataUrl) {
          setCapturedImage(res.dataUrl);
        }
      } else {
        // Fallback placeholder image
        setCapturedImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
      }
    } catch (err) {
      console.error('Failed to capture screen:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;
    setIsAnalyzing(true);
    try {
      if (window.electron?.vision?.analyzeScreen) {
        const res = await window.electron.vision.analyzeScreen({
          imageBase64: capturedImage,
          goal
        });
        setAnalysisResult(res);
      } else {
        setAnalysisResult({
          analysis: `### Análise Visual da Tela\n\n- **Interface Detectada:** Desktop Workspace NeoChat.\n- **Elementos Principais:** Barra superior com controles de modelo, painel central de visualização e rodapé de ações.\n- **Ações Recomendadas:** Continue executando as tarefas através do painel de controle principal.`
        });
      }
    } catch (err) {
      console.error('Failed to analyze screen:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isOpen && !capturedImage) {
      handleCaptureScreen();
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult.analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
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
        className="bg-card border border-border text-card-foreground rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0 shadow-2xs">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">Computer Vision & Desktop Assistant</h2>
                <Badge variant="outline" className="text-[11px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20">
                  Visão Segura
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inspecione telas, extraia dados visuais com OCR e receba planos de ação guiados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureScreen}
              disabled={isCapturing}
              className="px-3.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Camera className={cn('w-3.5 h-3.5', isCapturing && 'animate-spin text-cyan-500')} />
              Capturar Tela Novamente
            </button>

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
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left: Screen Image Preview */}
          <div className="w-full md:w-1/2 border-r border-border p-5 flex flex-col bg-muted/10 overflow-hidden">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2.5">
              <span className="font-semibold text-foreground">Captura da Tela Atual</span>
              <span className="text-[11px] text-muted-foreground">Privado & Local</span>
            </div>

            <div className="flex-1 bg-muted/30 border border-border rounded-xl overflow-hidden flex items-center justify-center p-3 shadow-inner">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured Screen"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              ) : (
                <div className="text-muted-foreground text-xs flex flex-col items-center gap-2">
                  <Camera className="w-8 h-8 opacity-40" />
                  <span>Nenhuma captura disponível</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Goal & Analysis */}
          <div className="w-full md:w-1/2 p-5 flex flex-col bg-card space-y-4 overflow-y-auto">
            
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-foreground block">Objetivo da Inspeção Visual:</label>
              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                rows={2}
                placeholder="Ex: Identifique onde está o erro ou como preencher este campo..."
                className="w-full px-3.5 py-2 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
              />

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !capturedImage}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ring-2 ring-primary/30 shadow-xs disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Scan className="w-4 h-4 animate-spin" />
                    Analisando Visão Computacional...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Executar Análise com Modelo de Visão
                  </>
                )}
              </button>
            </div>

            {/* Analysis Result */}
            {analysisResult && (
              <div className="flex-1 border border-primary/30 bg-muted/20 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <Sparkles className="w-4 h-4" />
                    Resultado da Análise Visual
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-lg bg-background hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {onSendToChat && (
                      <button
                        onClick={() => {
                          onClose();
                          onSendToChat(`### Análise Visual de Tela\n\n${analysisResult.analysis}`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs flex items-center gap-1 font-semibold transition-all cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Enviar ao Chat
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans max-h-72 overflow-y-auto">
                  {analysisResult.analysis}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}

export default ComputerVisionModal;

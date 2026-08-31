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

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult.analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Computer Vision & Desktop Assistant</h2>
                <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                  Visão Segura
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Inspecione telas, extraia dados visuais com OCR e receba planos de ação guiados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCaptureScreen}
              disabled={isCapturing}
              className="text-xs border-zinc-700 flex items-center gap-1.5 text-zinc-300"
            >
              <Camera className={cn('w-3.5 h-3.5', isCapturing && 'animate-spin')} />
              Capturar Tela Novamente
            </Button>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left: Screen Image Preview */}
          <div className="w-full md:w-1/2 border-r border-zinc-800 p-4 flex flex-col bg-zinc-950/60 overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="font-semibold text-zinc-300">Captura da Tela Atual</span>
              <span className="text-[10px] text-zinc-500">Privado & Local</span>
            </div>

            <div className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center p-2">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured Screen"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              ) : (
                <div className="text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <Camera className="w-8 h-8 opacity-40" />
                  <span>Nenhuma captura disponível</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Goal & Analysis */}
          <div className="w-full md:w-1/2 p-5 flex flex-col bg-zinc-900/40 space-y-4 overflow-y-auto">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 block">Objetivo da Inspeção Visual:</label>
              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                rows={2}
                placeholder="Ex: Identifique onde está o erro ou como preencher este campo..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
              />

              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !capturedImage}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-2"
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
              </Button>
            </div>

            {/* Analysis Result */}
            {analysisResult && (
              <div className="flex-1 border border-cyan-500/30 bg-zinc-950/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    Resultado da Análise Visual
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {onSendToChat && (
                      <button
                        onClick={() => {
                          onClose();
                          onSendToChat(`### Análise Visual de Tela\n\n${analysisResult.analysis}`);
                        }}
                        className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs flex items-center gap-1 font-medium"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Enviar ao Chat
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans max-h-72 overflow-y-auto">
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

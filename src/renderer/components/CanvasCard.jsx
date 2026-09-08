import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  History, 
  FileCode, 
  ArrowRight,
  Pencil,
  Volume2,
  Square
} from 'lucide-react';
import { useCanvas } from '../context/CanvasContext';
import { useLanguage } from '../context/LanguageContext';
import { playSpeech, stopSpeech } from '../lib/ttsUtils';
import { cn } from '../lib/utils';

export function CanvasCard({ canvasData, document: propDoc, className }) {
  const { openCanvas, restoreOrOpenVersion } = useCanvas();
  const { t, language: appLanguage } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const doc = propDoc || canvasData?.document;
  const title = canvasData?.title || doc?.title || 'Documento Canvas';
  const language = (canvasData?.language || doc?.language || 'markdown').toLowerCase();
  const version = canvasData?.version || doc?.version || 1;
  const words = canvasData?.stats?.words || doc?.stats?.words || 0;
  const summary = canvasData?.summary || (version > 1 ? `Versão ${version} gerada` : 'Documento criado no Canvas');
  const action = canvasData?.action || (version > 1 ? 'updated' : 'created');
  const previewContent = (doc?.content || canvasData?.content || '').slice(0, 160).trim();

  useEffect(() => {
    return () => {
      if (isSpeaking) stopSpeech();
    };
  }, [isSpeaking]);

  const handleToggleSpeech = (e) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      const textToSpeak = doc?.content || canvasData?.content || summary;
      if (!textToSpeak) return;

      playSpeech({
        text: textToSpeak,
        language: appLanguage === 'pt' ? 'pt' : 'en',
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    }
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      const textToCopy = doc?.content || canvasData?.content || '';
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy canvas content:', err);
    }
  };

  const handleOpen = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (restoreOrOpenVersion) {
      restoreOrOpenVersion({
        version,
        title,
        content: doc?.content || canvasData?.content || '',
        language,
        summary,
        docId: doc?.id || canvasData?.docId
      });
    } else if (doc) {
      openCanvas(doc);
    } else {
      openCanvas();
    }
  };

  const isCode = ['javascript', 'js', 'typescript', 'ts', 'python', 'py', 'html', 'react', 'css', 'json', 'sql'].includes(language);

  return (
    <div 
      onClick={handleOpen}
      className={cn(
        "my-3 group relative cursor-pointer overflow-hidden rounded-xl border border-primary/20 bg-card hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md",
        className
      )}
    >
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none group-hover:bg-primary/20 transition-all" />

      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 border-b border-border/50 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
            {isCode ? <FileCode className="w-4 h-4 text-cyan-500" /> : <FileText className="w-4 h-4 text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                Canvas
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                v{version}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground uppercase font-mono">
                {language}
              </span>
            </div>
            <h4 className="font-medium text-xs text-foreground truncate mt-0.5">
              {title}
            </h4>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleToggleSpeech}
            className={cn(
              "p-1.5 rounded-lg hover:bg-muted transition-colors",
              isSpeaking
                ? "text-primary bg-primary/10 animate-pulse ring-1 ring-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={isSpeaking ? (t('canvas.ttsStop') || 'Parar Leitura') : (t('canvas.ttsPlay') || 'Ouvir')}
          >
            {isSpeaking ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t('common.copy')}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-medium transition-all group-hover:bg-primary group-hover:text-primary-foreground shadow-2xs"
          >
            <span>{t('canvas.openInCanvas') || 'Abrir Canvas'}</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Summary and preview body */}
      <div className="px-3.5 py-2.5 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="truncate italic">
            {summary}
          </span>
        </div>

        {previewContent && (
          <div className="p-2 rounded-md bg-muted/30 border border-border/40 font-mono text-[11px] text-muted-foreground/90 line-clamp-2 leading-relaxed">
            {previewContent}...
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
          <span>{words} {t('canvas.words') || 'palavras'}</span>
          <span className="text-primary/80 group-hover:text-primary font-medium flex items-center gap-1">
            <Pencil className="w-2.5 h-2.5" />
            {t('canvas.clickToEdit') || 'Clique para editar no Canvas'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default CanvasCard;

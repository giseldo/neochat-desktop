import { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  FileCode, 
  Terminal, 
  Globe, 
  Image as ImageIcon, 
  Workflow 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatBytes, LANGUAGE_LABEL_MAP } from '../lib/artifactUtils';
import { cn } from '../lib/utils';
import CodeBlock from './CodeBlock';

export function ArtifactCard({
  identifier,
  title,
  type,
  language,
  code,
  onPreviewArtifact,
  className
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const cleanCode = String(code || '').trim();
  const rawType = (type || language || 'html').toLowerCase().trim();
  const lines = cleanCode ? cleanCode.split('\n').length : 0;
  const sizeBytes = new Blob([cleanCode]).size;

  const isHtml = rawType === 'html' || rawType === 'htm';
  const isReact = ['jsx', 'tsx', 'react'].includes(rawType);
  const isSvg = rawType === 'svg';
  const isMermaid = rawType === 'mermaid';
  const isExecutable = ['py', 'python', 'js', 'javascript', 'ts', 'typescript'].includes(rawType);

  const displayType = LANGUAGE_LABEL_MAP[rawType] || rawType.toUpperCase();
  const displayTitle = title || t('artifacts.defaultTitle', { type: displayType }) || `Artefato (${displayType})`;

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy artifact code:', err);
    }
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    if (onPreviewArtifact) {
      onPreviewArtifact({
        id: identifier,
        identifier,
        title: displayTitle,
        type: rawType,
        language: language || rawType,
        code: cleanCode
      });
    }
  };

  const handleRun = (e) => {
    e.stopPropagation();
    if (onPreviewArtifact) {
      onPreviewArtifact({
        id: identifier,
        identifier,
        title: displayTitle,
        type: rawType,
        language: language || rawType,
        code: cleanCode,
        autoRun: true
      });
    }
  };

  // Icon based on type
  const renderIcon = () => {
    if (isReact) return <FileCode className="w-4 h-4 text-cyan-500" />;
    if (isHtml) return <Globe className="w-4 h-4 text-orange-500" />;
    if (isSvg) return <ImageIcon className="w-4 h-4 text-pink-500" />;
    if (isMermaid) return <Workflow className="w-4 h-4 text-teal-500" />;
    if (isExecutable) return <Terminal className="w-4 h-4 text-emerald-500" />;
    return <Sparkles className="w-4 h-4 text-primary" />;
  };

  return (
    <div className={cn(
      "my-3.5 rounded-xl border border-border/80 bg-card/90 shadow-sm hover:shadow-md transition-all overflow-hidden group",
      className
    )}>
      {/* Top Banner / Header */}
      <div 
        onClick={handleOpen}
        className="flex items-center justify-between p-3 cursor-pointer bg-gradient-to-r from-muted/60 via-muted/30 to-transparent hover:bg-muted/70 transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-background border border-border/60 flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
            {renderIcon()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">{displayTitle}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
                {displayType}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 font-mono">
              <span>{lines} {lines === 1 ? 'linha' : 'linhas'}</span>
              <span>•</span>
              <span>{formatBytes(sizeBytes)}</span>
              {identifier && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[120px] text-[10px] opacity-75">{identifier}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          {/* Run button */}
          {isExecutable && (
            <button
              type="button"
              onClick={handleRun}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-2xs"
              title={t('artifacts.runCodeTooltip') || 'Executar código'}
            >
              <Play className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">{t('artifacts.runCode') || 'Executar'}</span>
            </button>
          )}

          {/* Open in Panel button */}
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-2xs active:scale-95"
            title={t('artifacts.openInPanel') || 'Abrir no painel de visualização'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('artifacts.openArtifact') || 'Abrir Artefato'}</span>
          </button>

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={t('artifacts.copyTooltip') || 'Copiar código'}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Toggle Code Accordion */}
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={showCode ? (t('artifacts.hideCode') || 'Ocultar código') : (t('artifacts.viewCode') || 'Ver código')}
          >
            {showCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Code Preview */}
      {showCode && (
        <div className="border-t border-border/80 bg-background/50 p-2 animate-in fade-in-0 duration-150">
          <CodeBlock
            language={rawType}
            code={cleanCode}
            onPreviewArtifact={onPreviewArtifact}
            className="my-0 border-0 shadow-none bg-transparent"
          />
        </div>
      )}
    </div>
  );
}

export default ArtifactCard;

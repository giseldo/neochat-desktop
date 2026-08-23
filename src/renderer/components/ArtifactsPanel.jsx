import React, { useState, useEffect } from 'react';
import { X, Code2, Eye, Download, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export function ArtifactsPanel({ artifact, onClose, className }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'code'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // If the artifact type is not visual, default to code view
    if (artifact && !['html', 'svg', 'mermaid', 'markdown', 'md'].includes((artifact.type || '').toLowerCase())) {
      setActiveTab('code');
    } else {
      setActiveTab('preview');
    }
  }, [artifact]);

  if (!artifact) return null;

  const type = (artifact.type || 'html').toLowerCase();
  const code = artifact.code || '';
  const title = artifact.title || t('artifacts.defaultTitle', { type: type.toUpperCase() });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownload = () => {
    const ext = type === 'html' ? 'html' : (type === 'svg' ? 'svg' : (type === 'mermaid' ? 'mmd' : 'txt'));
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artifact-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("flex flex-col h-full bg-background border-l border-border shadow-2xl z-40 animate-in slide-in-from-right duration-200", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs text-foreground truncate">{title}</h3>
            <span className="text-[10px] text-muted-foreground uppercase font-mono">{type}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Tabs */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                activeTab === 'preview' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="w-3 h-3" />
              <span>{t('common.preview')}</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                activeTab === 'code' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code2 className="w-3 h-3" />
              <span>{t('common.code')}</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t('artifacts.copyTooltip')}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t('artifacts.downloadTooltip')}
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-1"
            title={t('artifacts.closeTooltip')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-card">
        {activeTab === 'preview' ? (
          type === 'html' ? (
            <iframe
              title="Artifact Preview"
              srcDoc={code}
              sandbox="allow-scripts allow-modals"
              className="w-full h-full border-none bg-white"
            />
          ) : type === 'svg' ? (
            <div className="w-full h-full flex items-center justify-center p-6 overflow-auto bg-white/5">
              <div 
                className="max-w-full max-h-full" 
                dangerouslySetInnerHTML={{ __html: code }} 
              />
            </div>
          ) : (
            <div className="p-4 overflow-auto h-full text-xs font-mono whitespace-pre-wrap text-foreground">
              {code}
            </div>
          )
        ) : (
          <pre className="p-4 m-0 overflow-auto h-full text-xs font-mono text-foreground bg-muted/20 leading-relaxed">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

export default ArtifactsPanel;

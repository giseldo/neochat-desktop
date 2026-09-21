import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, Code2, Eye, Play, PenSquare, Workflow, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useCanvas } from '../context/CanvasContext';
import { MermaidViewer } from './MermaidViewer';
import { SvgViewer } from './SvgViewer';
import { cn } from '../lib/utils';

// Helper to format language name for display
const formatLanguage = (lang) => {
  if (!lang) return 'Texto';
  const map = {
    js: 'JavaScript',
    jsx: 'React JSX',
    ts: 'TypeScript',
    tsx: 'React TSX',
    py: 'Python',
    python: 'Python',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    bash: 'Bash',
    sh: 'Shell',
    shell: 'Shell',
    powershell: 'PowerShell',
    ps1: 'PowerShell',
    rust: 'Rust',
    rs: 'Rust',
    go: 'Go',
    sql: 'SQL',
    yaml: 'YAML',
    yml: 'YAML',
    md: 'Markdown',
    markdown: 'Markdown',
    c: 'C',
    cpp: 'C++',
    java: 'Java',
    kotlin: 'Kotlin',
    swift: 'Swift',
    ruby: 'Ruby',
    php: 'PHP',
    dockerfile: 'Dockerfile',
    mermaid: 'Mermaid Diagram',
    svg: 'SVG Image',
    latex: 'LaTeX',
    tex: 'TeX',
    bibtex: 'BibTeX'
  };
  return map[lang.toLowerCase()] || lang.toUpperCase();
};

// Clean theme so neither pre nor code has an unwanted background
const cleanTheme = (theme) => {
  if (!theme) return theme;
  const newTheme = { ...theme };
  if (newTheme['code[class*="language-"]']) {
    newTheme['code[class*="language-"]'] = {
      ...newTheme['code[class*="language-"]'],
      background: 'transparent',
      backgroundColor: 'transparent',
    };
  }
  if (newTheme['pre[class*="language-"]']) {
    newTheme['pre[class*="language-"]'] = {
      ...newTheme['pre[class*="language-"]'],
      background: 'transparent',
      backgroundColor: 'transparent',
    };
  }
  return newTheme;
};

const customOneDark = cleanTheme(oneDark);
const customOneLight = cleanTheme(oneLight);

export function CodeBlock({ language, code, onPreviewArtifact, className }) {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { createNewDocument } = useCanvas();
  const [copied, setCopied] = useState(false);
  const [canvasSent, setCanvasSent] = useState(false);

  const cleanCode = String(code || '').replace(/\n$/, '');
  const lang = (language || '').toLowerCase().trim();

  const hasInlinePreview = ['mermaid', 'svg'].includes(lang);
  const [activeTab, setActiveTab] = useState(hasInlinePreview ? 'preview' : 'code');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleSendToCanvas = () => {
    try {
      const defaultTitle = `${formatLanguage(lang)} Snippet`;
      createNewDocument({
        title: defaultTitle,
        language: lang || 'text',
        content: cleanCode,
        summary: t('canvas.importedFromChat') || 'Importado da conversa',
        source: 'user'
      });
      setCanvasSent(true);
      setTimeout(() => setCanvasSent(false), 2000);
    } catch (err) {
      console.error('Failed to send code to canvas:', err);
    }
  };

  const isExecutable = ['js', 'javascript', 'ts', 'typescript', 'py', 'python'].includes(lang);

  return (
    <div className={cn("my-3 rounded-lg overflow-hidden border border-border bg-card shadow-xs group/code", className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 border-b border-border text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-2">
          {hasInlinePreview ? (
            <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-md border border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  activeTab === 'preview'
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={lang === 'mermaid' ? "Visualizar diagrama renderizado" : "Visualizar imagem"}
              >
                {lang === 'mermaid' ? (
                  <Workflow className="w-3.5 h-3.5" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                <span>{lang === 'mermaid' ? 'Diagrama' : 'Visualizar'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  activeTab === 'code'
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Ver código fonte"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{t('common.code') || 'Código'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-mono font-medium">
              <Code2 className="w-3.5 h-3.5 text-primary" />
              <span>{formatLanguage(lang)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Run button for executable languages (Python / JS / TS) */}
          {isExecutable && onPreviewArtifact && (
            <button
              type="button"
              onClick={() => onPreviewArtifact({ type: lang, code: cleanCode, autoRun: true })}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-primary font-medium hover:bg-primary/10 transition-colors"
              title={t('artifacts.runInArtifact')}
            >
              <Play className="w-3 h-3 fill-current text-primary" />
              <span>{t('artifacts.runCode')}</span>
            </button>
          )}

          {/* Open in side panel Artifacts drawer */}
          {onPreviewArtifact && (
            <button
              type="button"
              onClick={() => onPreviewArtifact({ type: lang, code: cleanCode })}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
              title="Abrir no painel lateral de Artefatos"
            >
              <ExternalLink className="w-3 h-3 text-primary" />
              <span className="hidden sm:inline">Painel</span>
            </button>
          )}

          {/* Send to Canvas button */}
          <button
            type="button"
            onClick={handleSendToCanvas}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
            title={t('canvas.sendToCanvas') || 'Enviar para o Canvas'}
          >
            {canvasSent ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-green-500 font-medium">Canvas</span>
              </>
            ) : (
              <>
                <PenSquare className="w-3 h-3 text-primary" />
                <span>Canvas</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
            title="Copiar código"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-green-500 font-medium">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body content: Preview Tab or Code Tab */}
      {hasInlinePreview && activeTab === 'preview' ? (
        lang === 'mermaid' ? (
          <MermaidViewer 
            code={cleanCode} 
            onSwitchToCode={() => setActiveTab('code')} 
          />
        ) : (
          <SvgViewer 
            code={cleanCode} 
            onSwitchToCode={() => setActiveTab('code')} 
          />
        )
      ) : (
        <div className="overflow-x-auto text-xs md:text-sm font-mono">
          {lang ? (
            <SyntaxHighlighter
              language={lang}
              style={isDark ? customOneDark : customOneLight}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: 'transparent',
                backgroundColor: 'transparent',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}
              codeTagProps={{
                className: "code-block-content",
                style: {
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  background: 'transparent',
                  backgroundColor: 'transparent',
                  padding: 0,
                  display: 'block',
                }
              }}
            >
              {cleanCode}
            </SyntaxHighlighter>
          ) : (
            <pre className="p-4 m-0 text-foreground bg-transparent whitespace-pre overflow-x-auto leading-relaxed">
              <code className="code-block-content" style={{ background: 'transparent', backgroundColor: 'transparent', padding: 0, display: 'block' }}>
                {cleanCode}
              </code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default CodeBlock;

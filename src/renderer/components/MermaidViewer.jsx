import React, { useState, useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Download, 
  AlertCircle, 
  Code2, 
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { sanitizeMermaid } from '../lib/mermaidSanitizer';

// Keep track of unique diagram IDs
let mermaidCounter = 0;

export function MermaidViewer({ code, className, onSwitchToCode }) {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  
  const [svgHtml, setSvgHtml] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [copiedPng, setCopiedPng] = useState(false);

  const containerRef = useRef(null);
  const diagramWrapperRef = useRef(null);

  // Initialize and re-render Mermaid diagram
  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      const rawCode = (code || '').trim();
      if (!rawCode) {
        if (isMounted) {
          setSvgHtml('');
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      // Proactively sanitize and auto-repair common syntax issues (unquoted parens, etc.)
      const cleanCode = sanitizeMermaid(rawCode);

      // Unique element id for mermaid render
      mermaidCounter += 1;
      let id = `mermaid-chart-${Date.now()}-${mermaidCounter}`;

      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          themeVariables: isDark ? {
            darkMode: true,
            background: 'transparent',
            mainBkg: '#1e293b',
            primaryColor: '#3b82f6',
            primaryTextColor: '#f8fafc',
            primaryBorderColor: '#60a5fa',
            lineColor: '#94a3b8',
            secondaryColor: '#334155',
            tertiaryColor: '#0f172a',
            nodeBorder: '#60a5fa',
            clusterBkg: '#0f172a',
            clusterBorder: '#334155',
            defaultLinkColor: '#94a3b8',
            titleColor: '#f8fafc',
            edgeLabelBackground: '#1e293b',
            actorBkg: '#1e293b',
            actorBorder: '#60a5fa',
            actorTextColor: '#f8fafc',
            actorLineColor: '#94a3b8',
            signalColor: '#f8fafc',
            signalTextColor: '#f8fafc',
          } : {
            darkMode: false,
            background: 'transparent',
            mainBkg: '#ffffff',
            primaryColor: '#2563eb',
            primaryTextColor: '#0f172a',
            primaryBorderColor: '#3b82f6',
            lineColor: '#64748b',
            secondaryColor: '#f1f5f9',
            tertiaryColor: '#f8fafc',
            nodeBorder: '#3b82f6',
            clusterBkg: '#f8fafc',
            clusterBorder: '#e2e8f0',
            defaultLinkColor: '#64748b',
            titleColor: '#0f172a',
            edgeLabelBackground: '#ffffff',
            actorBkg: '#ffffff',
            actorBorder: '#3b82f6',
            actorTextColor: '#0f172a',
            actorLineColor: '#64748b',
            signalColor: '#0f172a',
            signalTextColor: '#0f172a',
          },
          securityLevel: 'loose',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          suppressErrorRendering: true,
        });

        let renderResult;
        try {
          renderResult = await mermaid.render(id, cleanCode);
        } catch (firstErr) {
          // If cleanCode differed from rawCode, retry with rawCode as fallback, or vice versa
          if (cleanCode !== rawCode) {
            const stray1 = document.getElementById(`d${id}`);
            if (stray1) stray1.remove();
            document.querySelectorAll('[id^="dmermaid-chart-"]').forEach(el => el.remove());

            mermaidCounter += 1;
            id = `mermaid-chart-${Date.now()}-${mermaidCounter}`;
            renderResult = await mermaid.render(id, rawCode);
          } else {
            throw firstErr;
          }
        }

        const { svg, bindFunctions } = renderResult;

        // Remove any stray error DOM nodes injected by mermaid
        const strayError = document.getElementById(`d${id}`);
        if (strayError) strayError.remove();
        document.querySelectorAll('[id^="dmermaid-chart-"]').forEach(el => el.remove());

        if (isMounted) {
          setSvgHtml(svg);
          setError(null);
          setLoading(false);

          // Execute interaction handlers if present
          if (bindFunctions && diagramWrapperRef.current) {
            try {
              bindFunctions(diagramWrapperRef.current);
            } catch (e) {
              console.debug('Mermaid bindFunctions error:', e);
            }
          }
        }
      } catch (err) {
        // Clean up any stray error elements
        const stray = document.getElementById(`d${id}`);
        if (stray) stray.remove();
        document.querySelectorAll('[id^="dmermaid-chart-"]').forEach(el => el.remove());

        if (isMounted) {
          setError(err.message || 'Erro de sintaxe no diagrama Mermaid');
          setLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [code, isDark]);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Drag & Pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Copy SVG markup to clipboard
  const handleCopySvg = async () => {
    try {
      if (!svgHtml) return;
      await navigator.clipboard.writeText(svgHtml);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch (err) {
      console.error('Failed to copy SVG:', err);
    }
  };

  // Export & Copy as PNG
  const handleCopyPng = async () => {
    try {
      if (!svgHtml) return;
      const svgBlob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // 2x resolution
        canvas.width = (image.naturalWidth || 800) * scale;
        canvas.height = (image.naturalHeight || 600) * scale;
        
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = isDark ? '#0f172a' : '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob })
                ]);
                setCopiedPng(true);
                setTimeout(() => setCopiedPng(false), 2000);
              } catch (e) {
                console.error('Clipboard write error:', e);
              }
            }
          }, 'image/png');
        }
        URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      console.error('Failed to export PNG:', err);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full rounded-b-lg overflow-hidden bg-background/50 border-t border-border/60 transition-colors",
        isFullscreen && "fixed inset-0 z-50 rounded-none bg-background/95 backdrop-blur-md flex flex-col p-6",
        className
      )}
    >
      {/* Floating Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/40 text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors"
            title="Reduzir zoom (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-1.5 py-0.5 rounded text-[11px] font-mono hover:bg-muted hover:text-foreground transition-colors"
            title="Restaurar zoom (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors"
            title="Aumentar zoom (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors ml-0.5"
            title="Centralizar diagrama"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Copy SVG */}
          <button
            type="button"
            onClick={handleCopySvg}
            disabled={!svgHtml}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-foreground transition-colors text-[11px]"
            title="Copiar código SVG"
          >
            {copiedSvg ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-green-500">SVG!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>SVG</span>
              </>
            )}
          </button>

          {/* Copy PNG */}
          <button
            type="button"
            onClick={handleCopyPng}
            disabled={!svgHtml}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-foreground transition-colors text-[11px]"
            title="Copiar imagem PNG"
          >
            {copiedPng ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-green-500">PNG!</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3 h-3" />
                <span>PNG</span>
              </>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors ml-1"
            title={isFullscreen ? "Sair da tela cheia" : "Expandir em tela cheia"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Diagram Canvas Area */}
      <div 
        className={cn(
          "relative flex items-center justify-center p-4 overflow-hidden select-none",
          isFullscreen ? "flex-1 min-h-0" : "min-h-[160px] max-h-[520px]",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Renderizando diagrama Mermaid...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center gap-2.5 p-4 text-center max-w-md bg-destructive/10 border border-destructive/20 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>Não foi possível renderizar o diagrama</span>
            </div>
            <p className="text-muted-foreground font-mono text-[11px] leading-tight line-clamp-3">
              {error}
            </p>
            <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-md p-2 text-left border border-border/50 w-full mt-1">
              <span className="font-semibold text-foreground">Dica:</span> Se o rótulo tiver parênteses, colchetes ou pontuação, envolva-o em aspas duplas: <code className="font-mono text-primary text-[10.5px]">A["Texto (detalhes)"]</code>.
            </div>
            {onSwitchToCode && (
              <button
                type="button"
                onClick={onSwitchToCode}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-background border border-border text-foreground hover:bg-muted transition-colors text-xs font-medium mt-1"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Ver código fonte</span>
              </button>
            )}
          </div>
        )}

        {!loading && !error && svgHtml && (
          <div 
            ref={diagramWrapperRef}
            className="w-full h-full flex items-center justify-center transition-transform duration-75 origin-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:drop-shadow-xs"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        )}
      </div>
    </div>
  );
}

export default MermaidViewer;

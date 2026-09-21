import React, { useState, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Code2, 
  AlertCircle 
} from 'lucide-react';
import { cn } from '../lib/utils';

export function SvgViewer({ code, className, onSwitchToCode }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef(null);

  const cleanSvg = (code || '').trim();

  // Basic check if it is SVG
  const isValidSvg = cleanSvg.toLowerCase().includes('<svg');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanSvg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy SVG:', err);
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
            title="Centralizar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-foreground transition-colors text-[11px]"
            title="Copiar SVG"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-green-500">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar SVG</span>
              </>
            )}
          </button>

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

      {/* SVG Canvas Area */}
      <div 
        className={cn(
          "relative flex items-center justify-center p-4 overflow-hidden select-none",
          isFullscreen ? "flex-1 min-h-0" : "min-h-[140px] max-h-[500px]",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {!isValidSvg ? (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center max-w-md bg-destructive/10 border border-destructive/20 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>SVG inválido</span>
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
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center transition-transform duration-75 origin-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:drop-shadow-xs"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
            dangerouslySetInnerHTML={{ __html: cleanSvg }}
          />
        )}
      </div>
    </div>
  );
}

export default SvgViewer;

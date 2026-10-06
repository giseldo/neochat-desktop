import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
  BarChart2, 
  Download, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  AlertCircle, 
  Code2, 
  Image as ImageIcon 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

/**
 * Safely parse ECharts JSON specification.
 * Supports:
 * 1. Standard format: { version: 1, renderer: 'echarts', spec: { ... } }
 * 2. Nested spec: { spec: { ... } }
 * 3. Direct ECharts option: { title: { ... }, series: [ ... ] }
 */
export function parseChartSpec(rawCode) {
  let cleaned = String(rawCode || '').trim();
  // Strip code fences if present
  cleaned = cleaned.replace(/^```(?:json|chart|echarts)?\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    // Attempt to fix common LLM JSON flaws (e.g. trailing commas)
    try {
      const fixed = cleaned.replace(/,\s*([\]}])/g, '$1');
      parsed = JSON.parse(fixed);
    } catch {
      throw new Error(`JSON inválido: ${err.message}`);
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('A especificação do gráfico deve ser um objeto JSON.');
  }

  // Extract inner spec if wrapped
  let spec = parsed.spec && typeof parsed.spec === 'object' ? parsed.spec : parsed;
  return spec;
}

export function ChartViewer({ code, className, onSwitchToCode }) {
  const { isDark } = useTheme();

  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const containerRef = useRef(null);
  const chartDomRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Initialize or re-render ECharts instance
  useEffect(() => {
    let chartInstance = null;
    const dom = chartDomRef.current;
    if (!dom) return;

    setError(null);

    try {
      const spec = parseChartSpec(code);

      // Clean up previous instance before creating a new one (especially on theme change)
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }

      chartInstance = echarts.init(dom, isDark ? 'dark' : undefined, {
        renderer: 'canvas'
      });
      chartInstanceRef.current = chartInstance;

      const chartOption = {
        backgroundColor: 'transparent',
        ...spec
      };

      // Ensure tooltip has nice default styling if not fully configured
      if (!chartOption.tooltip) {
        chartOption.tooltip = { trigger: 'item' };
      }

      chartInstance.setOption(chartOption, true);
    } catch (err) {
      console.error('Failed to render ECharts diagram:', err);
      setError(err?.message || 'Erro ao renderizar gráfico');
    }

    // Auto-resize on container dimensions change
    const resizeObserver = new ResizeObserver(() => {
      if (chartInstance && !chartInstance.isDisposed()) {
        chartInstance.resize();
      }
    });

    resizeObserver.observe(dom);

    return () => {
      resizeObserver.disconnect();
      if (chartInstance && !chartInstance.isDisposed()) {
        chartInstance.dispose();
      }
      chartInstanceRef.current = null;
    };
  }, [code, isDark, isFullscreen]);

  // Handle window resize as extra safeguard
  useEffect(() => {
    const handleResize = () => {
      if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
        chartInstanceRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Copy raw JSON spec
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(String(code || '').trim());
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy chart code:', err);
    }
  };

  // Copy rendered image as PNG to clipboard
  const handleCopyImage = async () => {
    try {
      const chart = chartInstanceRef.current;
      if (!chart || chart.isDisposed()) return;

      const dataUrl = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: isDark ? '#0f172a' : '#ffffff'
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (err) {
      console.error('Failed to copy chart image to clipboard:', err);
    }
  };

  // Download chart image as PNG
  const handleDownload = () => {
    try {
      const chart = chartInstanceRef.current;
      if (!chart || chart.isDisposed()) return;

      const dataUrl = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: isDark ? '#0f172a' : '#ffffff'
      });

      let filename = 'chart';
      try {
        const spec = parseChartSpec(code);
        if (spec?.title?.text) {
          filename = spec.title.text.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        }
      } catch {
        // use default filename
      }

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download chart image:', err);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full rounded-b-lg overflow-hidden bg-background/50 border-t border-border/60 transition-colors flex flex-col",
        isFullscreen && "fixed inset-0 z-50 rounded-none bg-background/95 backdrop-blur-md flex flex-col p-4",
        className
      )}
    >
      {/* Floating Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/40 text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
            <BarChart2 className="w-3.5 h-3.5 text-primary" />
            <span>ECharts</span>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-1">
          {/* Copy PNG image */}
          <button
            type="button"
            onClick={handleCopyImage}
            disabled={Boolean(error)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
            title="Copiar gráfico como imagem PNG"
          >
            {copiedImage ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-green-500 font-medium">Copiado</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3 h-3 text-primary" />
                <span>Copiar Imagem</span>
              </>
            )}
          </button>

          {/* Download PNG */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={Boolean(error)}
            className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
            title="Baixar imagem PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Copy Spec JSON */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors"
            title="Copiar especificação JSON"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors"
            title={isFullscreen ? "Sair da tela cheia (Esc)" : "Expandir para tela cheia"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Switch to Code view */}
          {onSwitchToCode && (
            <button
              type="button"
              onClick={onSwitchToCode}
              className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors ml-1"
              title="Ver código fonte JSON"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Chart Area */}
      {error ? (
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
          <div className="p-2.5 rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">Falha ao processar gráfico ECharts</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md font-mono bg-muted/60 p-2 rounded border border-border/50 text-left overflow-x-auto">
              {error}
            </p>
          </div>
          {onSwitchToCode && (
            <button
              type="button"
              onClick={onSwitchToCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Ver código JSON para corrigir</span>
            </button>
          )}
        </div>
      ) : (
        <div className={cn(
          "relative w-full flex items-center justify-center p-3",
          isFullscreen ? "flex-1 min-h-0" : "h-[380px] min-h-[300px]"
        )}>
          <div 
            ref={chartDomRef} 
            className="w-full h-full min-w-0 min-h-0"
          />
        </div>
      )}
    </div>
  );
}

export default ChartViewer;

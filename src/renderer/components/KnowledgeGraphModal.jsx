import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Share2,
  X,
  RefreshCw,
  BarChart3,
  Network,
  Maximize2,
  Filter,
  FileText,
  Folder,
  Tag,
  Sparkles,
  PieChart,
  LineChart,
  BarChart,
  Table as TableIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const DEFAULT_SAMPLE_CSV = `Mês,Usuários Ativos,Requisições LLM,Custo Estimado ($)
Janeiro,1200,45000,12.50
Fevereiro,1850,72000,19.80
Março,2400,98000,27.30
Abril,3100,135000,38.20
Maio,4200,190000,52.40
Junho,5600,260000,71.90`;

export function KnowledgeGraphModal({
  isOpen,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('graph'); // 'graph' or 'data'
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);

  // Data Studio State
  const [rawTableText, setRawTableText] = useState(DEFAULT_SAMPLE_CSV);
  const [parsedData, setParsedData] = useState(null);
  const [chartType, setChartType] = useState('bar'); // 'bar', 'line', 'table'

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      if (window.electron?.knowledgeGraph?.getData) {
        const res = await window.electron.knowledgeGraph.getData({});
        setGraphData(res);
      } else {
        // Fallback sample data
        setGraphData({
          nodes: [
            { id: 'workspace_root', label: 'Neo Workspace', type: 'root', val: 5, metadata: { color: '#6366f1' } },
            { id: 'c_agent', label: 'Neo Agent Loop', type: 'module', val: 4, metadata: { color: '#8b5cf6' } },
            { id: 'c_rag', label: 'RAG Knowledge', type: 'module', val: 3, metadata: { color: '#f59e0b' } },
            { id: 'c_mcp', label: 'MCP Ecosystem', type: 'module', val: 3, metadata: { color: '#10b981' } },
            { id: 'c_models', label: 'Multi-Provider', type: 'feature', val: 3, metadata: { color: '#ec4899' } }
          ],
          links: [
            { source: 'workspace_root', target: 'c_agent' },
            { source: 'workspace_root', target: 'c_rag' },
            { source: 'c_agent', target: 'c_mcp' },
            { source: 'c_agent', target: 'c_models' }
          ]
        });
      }
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleParseTable = async (text) => {
    try {
      if (window.electron?.knowledgeGraph?.parseTable) {
        const res = await window.electron.knowledgeGraph.parseTable(text);
        setParsedData(res);
        if (res.recommendedChart) {
          setChartType(res.recommendedChart);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchGraphData();
      handleParseTable(rawTableText);
    }
  }, [isOpen]);

  // 2D Canvas rendering for Knowledge Graph
  useEffect(() => {
    if (!isOpen || activeTab !== 'graph' || !graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth;
    const height = canvas.height = canvas.parentElement.clientHeight;

    // Assign positions on a circular/force layout
    const nodes = graphData.nodes.map((n, i) => {
      const angle = (i / graphData.nodes.length) * 2 * Math.PI;
      const radius = n.type === 'root' ? 0 : 160 + (i % 2) * 50;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw links
      ctx.lineWidth = 1.5;
      graphData.links.forEach(l => {
        const sourceNode = nodes.find(n => n.id === l.source);
        const targetNode = nodes.find(n => n.id === l.target);
        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.strokeStyle = 'rgba(113, 113, 122, 0.35)';
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(n => {
        const radius = Math.max(10, (n.val || 1) * 7);
        const color = n.metadata?.color || '#6366f1';

        // Glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = color + '33';
        ctx.fill();

        // Node Body
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff33';
        ctx.stroke();

        // Node Label
        ctx.fillStyle = '#f4f4f5';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + radius + 14);
      });
    };

    draw();

    // Simple canvas click handler for node inspection
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const clicked = nodes.find(n => {
        const dist = Math.hypot(n.x - clickX, n.y - clickY);
        return dist <= Math.max(12, (n.val || 1) * 8);
      });

      if (clicked) {
        setSelectedNode(clicked);
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [isOpen, activeTab, graphData]);

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
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">Knowledge Graph & Data Studio</h2>
                <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20">
                  Visual Inteligente
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visualização 2D de nós e conexões do RAG + análise automática de planilhas e gráficos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-xl border border-border flex text-xs gap-1">
              <button
                onClick={() => setActiveTab('graph')}
                className={cn(
                  'px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-medium cursor-pointer',
                  activeTab === 'graph' 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <Network className="w-3.5 h-3.5" />
                Grafo de Conhecimento
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={cn(
                  'px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-medium cursor-pointer',
                  activeTab === 'data' 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Data Studio
              </button>
            </div>

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
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {activeTab === 'graph' ? (
            <div className="flex-1 relative flex flex-col bg-background/50">
              {/* Canvas Viewport */}
              <div className="flex-1 relative overflow-hidden">
                <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />

                {/* Node Inspector Overlay */}
                {selectedNode && (
                  <div className="absolute top-4 right-4 w-72 bg-card/90 border border-border backdrop-blur-md p-4 rounded-xl shadow-xl text-xs space-y-2 text-card-foreground">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{selectedNode.label}</span>
                      <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-muted-foreground">Tipo: <span className="text-foreground font-mono font-medium">{selectedNode.type}</span></div>
                    {selectedNode.metadata?.path && (
                      <div className="text-muted-foreground truncate">Caminho: <span className="text-foreground font-mono">{selectedNode.metadata.path}</span></div>
                    )}
                    <Badge variant="outline" className="text-[10px] text-primary bg-primary/10 border-primary/30">
                      Relevância: {selectedNode.val || 1} conexões
                    </Badge>
                  </div>
                )}

                {/* Bottom Legend */}
                <div className="absolute bottom-4 left-4 bg-card/90 border border-border backdrop-blur-md px-3.5 py-2 rounded-xl text-[11px] text-muted-foreground flex items-center gap-4 shadow-sm">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Raiz</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Pasta</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Arquivo</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tag</div>
                </div>
              </div>
            </div>
          ) : (
            /* Data Studio Tab */
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Input */}
              <div className="w-full md:w-5/12 border-r border-border p-4 flex flex-col space-y-3 bg-card">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Entrada de Dados (CSV / TSV / Markdown Table)</span>
                </div>
                <textarea
                  value={rawTableText}
                  onChange={e => {
                    setRawTableText(e.target.value);
                    handleParseTable(e.target.value);
                  }}
                  className="flex-1 p-3.5 bg-background border border-input rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none leading-relaxed transition-all"
                  placeholder="Cole sua tabela aqui..."
                />
              </div>

              {/* Right Chart Visualization */}
              <div className="w-full md:w-7/12 p-6 flex flex-col bg-muted/10 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Gráfico Interativo Gerado
                  </h3>

                  <div className="bg-muted p-1 rounded-xl border border-border flex text-xs gap-1">
                    <button
                      onClick={() => setChartType('bar')}
                      className={cn(
                        'p-1.5 rounded-lg transition-all cursor-pointer',
                        chartType === 'bar' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      )}
                      title="Barras"
                    >
                      <BarChart className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setChartType('line')}
                      className={cn(
                        'p-1.5 rounded-lg transition-all cursor-pointer',
                        chartType === 'line' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      )}
                      title="Linhas"
                    >
                      <LineChart className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setChartType('table')}
                      className={cn(
                        'p-1.5 rounded-lg transition-all cursor-pointer',
                        chartType === 'table' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      )}
                      title="Tabela"
                    >
                      <TableIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {parsedData && parsedData.rows?.length > 0 ? (
                  <div className="flex-1 bg-card border border-border rounded-xl p-5 flex flex-col justify-center space-y-4 shadow-2xs">
                    {/* SVG Chart Rendering */}
                    <div className="h-64 w-full flex items-end justify-between gap-3 pt-6 px-4 border-b border-border">
                      {parsedData.rows.map((row, rIdx) => {
                        const firstCol = parsedData.columns[0]?.key;
                        const label = row[firstCol] || `Item ${rIdx + 1}`;
                        // Find first numeric column
                        const numCol = parsedData.columns.find(c => c.isNumeric)?.key;
                        const val = numCol ? Number(row[numCol]) || 0 : 50;
                        const maxVal = Math.max(...parsedData.rows.map(r => Number(r[numCol]) || 1));
                        const heightPct = Math.max(10, Math.min(100, (val / maxVal) * 100));

                        return (
                          <div key={rIdx} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                              {val}
                            </div>
                            <div
                              className={cn(
                                'w-full rounded-t-lg transition-all duration-300',
                                chartType === 'line' ? 'bg-primary/70 hover:bg-primary' : 'bg-primary hover:bg-primary/90'
                              )}
                              style={{ height: `${heightPct}%` }}
                            />
                            <span className="text-[10px] text-muted-foreground truncate max-w-[60px] text-center">{label}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center justify-between pt-2">
                      <span>Total: {parsedData.totalRows} linhas processadas</span>
                      <Badge variant="outline" className="text-muted-foreground border-border bg-muted">
                        {parsedData.columns.length} colunas identificadas
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs italic">
                    Insira dados válidos à esquerda para gerar o gráfico.
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}

export default KnowledgeGraphModal;

import { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  FileCode, 
  Terminal, 
  Globe, 
  Image as ImageIcon, 
  Workflow, 
  Download, 
  Copy, 
  Check, 
  Play, 
  ExternalLink,
  Code2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useArtifacts } from '../context/ArtifactsContext';
import { formatBytes, LANGUAGE_LABEL_MAP } from '../lib/artifactUtils';
import { cn } from '../lib/utils';

export function ArtifactsGalleryModal({ isOpen, onClose }) {
  const { t } = useLanguage();
  const { 
    artifacts, 
    openArtifact, 
    downloadArtifact, 
    downloadAllArtifacts 
  } = useArtifacts();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  // Filter tabs count
  const filterCounts = useMemo(() => {
    const counts = { all: artifacts.length, visual: 0, code: 0, diagram: 0, doc: 0 };
    artifacts.forEach(art => {
      const type = (art.type || '').toLowerCase();
      if (['html', 'htm', 'jsx', 'tsx', 'react', 'svg'].includes(type)) counts.visual++;
      else if (['py', 'python', 'js', 'javascript', 'ts', 'typescript', 'sh', 'bash', 'sql'].includes(type)) counts.code++;
      else if (type === 'mermaid') counts.diagram++;
      else if (['md', 'markdown'].includes(type)) counts.doc++;
      else counts.code++;
    });
    return counts;
  }, [artifacts]);

  // Filtered artifacts
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter(art => {
      const type = (art.type || '').toLowerCase();
      
      // Category filter
      if (selectedFilter === 'visual' && !['html', 'htm', 'jsx', 'tsx', 'react', 'svg'].includes(type)) {
        return false;
      }
      if (selectedFilter === 'code' && !['py', 'python', 'js', 'javascript', 'ts', 'typescript', 'sh', 'bash', 'sql', 'json', 'yaml', 'css'].includes(type)) {
        return false;
      }
      if (selectedFilter === 'diagram' && type !== 'mermaid') {
        return false;
      }
      if (selectedFilter === 'doc' && !['md', 'markdown'].includes(type)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (art.title || '').toLowerCase().includes(q);
        const matchesType = type.includes(q);
        const matchesCode = (art.code || '').toLowerCase().includes(q);
        return matchesTitle || matchesType || matchesCode;
      }

      return true;
    });
  }, [artifacts, selectedFilter, searchQuery]);

  const handleCopy = async (art) => {
    try {
      await navigator.clipboard.writeText(art.code || '');
      setCopiedId(art.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleOpenArtifact = (art) => {
    openArtifact(art);
    onClose();
  };

  const handleRunArtifact = (art) => {
    openArtifact({ ...art, autoRun: true });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div 
        className="relative flex flex-col w-full max-w-5xl h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  {t('artifacts.galleryTitle') || 'Galeria de Artefatos Criados'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                  {artifacts.length} {artifacts.length === 1 ? 'artefato' : 'artefatos'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('artifacts.gallerySubtitle') || 'Todos os artefatos de código, previews visuais e componentes gerados nesta conversa.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {artifacts.length > 0 && (
              <button
                type="button"
                onClick={downloadAllArtifacts}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border/60 shadow-2xs"
                title={t('artifacts.downloadAll') || 'Baixar todos os artefatos'}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('artifacts.downloadAll') || 'Baixar Todos'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t('common.close') || 'Fechar'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Category Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 border-b border-border bg-muted/10">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('artifacts.searchPlaceholder') || 'Buscar artefatos por título ou código...'}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap",
                selectedFilter === 'all'
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t('artifacts.filterAll') || 'Todos'} ({filterCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('visual')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap",
                selectedFilter === 'visual'
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t('artifacts.filterVisual') || 'Visuais (UI / SVG)'} ({filterCounts.visual})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('code')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap",
                selectedFilter === 'code'
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t('artifacts.filterCode') || 'Scripts & Código'} ({filterCounts.code})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('diagram')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap",
                selectedFilter === 'diagram'
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t('artifacts.filterDiagram') || 'Diagramas'} ({filterCounts.diagram})
            </button>
          </div>
        </div>

        {/* Content Area: Grid of Artifacts */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-background/50">
          {filteredArtifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-4">
                <Code2 className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                {searchQuery ? 'Nenhum artefato encontrado com esta busca' : (t('artifacts.emptyGallery') || 'Nenhum artefato criado ainda')}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
                {searchQuery 
                  ? 'Tente buscar por outro termo ou limpe os filtros para ver todos os artefatos.'
                  : (t('artifacts.emptyGalleryDesc') || 'Peça à IA para gerar um componente React, uma página HTML, um script Python ou um diagrama Mermaid para que eles apareçam aqui.')}
              </p>
              {!searchQuery && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-lg w-full">
                  <div className="p-3 rounded-xl border border-border/60 bg-card/60 text-xs">
                    <span className="font-semibold text-primary block mb-0.5">🎨 Componente React</span>
                    <span className="text-muted-foreground text-[11px]">&quot;Crie um componente React de dashboard financeiro&quot;</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-card/60 text-xs">
                    <span className="font-semibold text-emerald-500 block mb-0.5">🐍 Script Python</span>
                    <span className="text-muted-foreground text-[11px]">&quot;Escreva um script Python para análise de dados&quot;</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-card/60 text-xs">
                    <span className="font-semibold text-orange-500 block mb-0.5">🌐 Página HTML/CSS</span>
                    <span className="text-muted-foreground text-[11px]">&quot;Desenvolva uma landing page com animações&quot;</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-card/60 text-xs">
                    <span className="font-semibold text-teal-500 block mb-0.5">📊 Diagrama Mermaid</span>
                    <span className="text-muted-foreground text-[11px]">&quot;Crie um diagrama de arquitetura de microserviços&quot;</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredArtifacts.map((art, idx) => {
                const type = (art.type || art.language || 'text').toLowerCase();
                const isReact = ['jsx', 'tsx', 'react'].includes(type);
                const isHtml = type === 'html' || type === 'htm';
                const isSvg = type === 'svg';
                const isMermaid = type === 'mermaid';
                const isExecutable = ['py', 'python', 'js', 'javascript', 'ts', 'typescript'].includes(type);
                const isCopied = copiedId === art.id;

                const lines = art.lines || (art.code ? art.code.split('\n').length : 0);
                const displayType = LANGUAGE_LABEL_MAP[type] || type.toUpperCase();
                const snippet = (art.code || '').split('\n').slice(0, 6).join('\n');

                return (
                  <div
                    key={art.id || idx}
                    className="flex flex-col rounded-xl border border-border/70 bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden group"
                  >
                    {/* Card Top */}
                    <div className="p-3.5 border-b border-border/60 bg-muted/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-background border border-border/60 flex items-center justify-center shrink-0">
                            {isReact ? <FileCode className="w-4 h-4 text-cyan-500" /> :
                             isHtml ? <Globe className="w-4 h-4 text-orange-500" /> :
                             isSvg ? <ImageIcon className="w-4 h-4 text-pink-500" /> :
                             isMermaid ? <Workflow className="w-4 h-4 text-teal-500" /> :
                             isExecutable ? <Terminal className="w-4 h-4 text-emerald-500" /> :
                             <Sparkles className="w-4 h-4 text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-xs text-foreground truncate" title={art.title}>
                              {art.title || `Artefato #${idx + 1}`}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                                {displayType}
                              </span>
                              {art.version && art.version > 1 && (
                                <span className="text-[9px] font-mono px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  v{art.version}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                          {lines} lin • {formatBytes(art.sizeBytes)}
                        </span>
                      </div>
                    </div>

                    {/* Code Snippet Preview */}
                    <div 
                      onClick={() => handleOpenArtifact(art)}
                      className="p-3 bg-muted/40 cursor-pointer flex-1 font-mono text-[11px] text-muted-foreground overflow-hidden select-none hover:bg-muted/60 transition-colors group-hover:text-foreground/90"
                    >
                      <pre className="line-clamp-6 leading-relaxed whitespace-pre-wrap break-all">
                        {snippet}
                      </pre>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="flex items-center justify-between p-2.5 border-t border-border/60 bg-muted/10 text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(art)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title={t('artifacts.copyTooltip') || 'Copiar código'}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadArtifact(art)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title={t('artifacts.downloadTooltip') || 'Baixar arquivo'}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isExecutable && (
                          <button
                            type="button"
                            onClick={() => handleRunArtifact(art)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title={t('artifacts.runCode') || 'Executar'}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{t('artifacts.runCode') || 'Executar'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenArtifact(art)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-2xs"
                          title={t('artifacts.openInPanel') || 'Abrir no painel lateral'}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{t('artifacts.openInPanel') || 'Abrir'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ArtifactsGalleryModal;

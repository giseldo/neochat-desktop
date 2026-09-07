import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  FileCode, 
  FileJson, 
  FileText, 
  Terminal, 
  Settings2, 
  Image as ImageIcon, 
  Palette, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw, 
  Search, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  FolderSearch,
  MessageSquarePlus,
  PenSquare,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderTree
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

// Format file size nicely
function formatFileSize(bytes) {
  if (bytes === 0 || bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Get appropriate icon based on file extension
function getFileIcon(extension, filename) {
  const ext = (extension || '').toLowerCase();
  const name = (filename || '').toLowerCase();

  if (['.js', '.cjs', '.mjs'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-amber-400 shrink-0" />;
  }
  if (ext === '.jsx') {
    return <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />;
  }
  if (['.ts'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-blue-500 shrink-0" />;
  }
  if (['.tsx'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
  }
  if (['.py'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  if (['.json'].includes(ext) || name.endsWith('rc') || name.endsWith('lock')) {
    return <FileJson className="w-4 h-4 text-amber-500 shrink-0" />;
  }
  if (['.html', '.htm', '.xml', '.svg'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-orange-500 shrink-0" />;
  }
  if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
    return <Palette className="w-4 h-4 text-pink-400 shrink-0" />;
  }
  if (['.md', '.markdown', '.txt', '.rtf'].includes(ext)) {
    return <FileText className="w-4 h-4 text-sky-300 shrink-0" />;
  }
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />;
  }
  if (['.sh', '.bash', '.cmd', '.bat', '.ps1'].includes(ext)) {
    return <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  if (['.yml', '.yaml', '.toml', '.ini', '.env'].includes(ext) || name.startsWith('.env')) {
    return <Settings2 className="w-4 h-4 text-neutral-400 shrink-0" />;
  }

  return <File className="w-4 h-4 text-muted-foreground shrink-0" />;
}

// Highlight matched search query
function highlightMatchedText(text, query) {
  if (!query || !text) return text;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.substring(0, idx)}
      <mark className="bg-primary/30 text-foreground font-semibold px-0.5 rounded">
        {text.substring(idx, idx + query.length)}
      </mark>
      {text.substring(idx + query.length)}
    </>
  );
}

export default function WorkspaceFileTree({
  workspacePath,
  workspaceInfo,
  onSelectWorkspace,
  onOpenFileInCanvas,
  onInsertPrompt,
  className,
  compact = false
}) {
  const { t } = useLanguage();
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(['.']));
  const [filterText, setFilterText] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [copiedPath, setCopiedPath] = useState(null);
  const filterInputRef = useRef(null);

  // Load directory tree from electron
  const loadTree = useCallback(async () => {
    if (!workspacePath) {
      setTreeData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (window.electron?.agent?.getWorkspaceTree) {
        const res = await window.electron.agent.getWorkspaceTree(workspacePath, { maxDepth: 5 });
        if (res?.success) {
          setTreeData(res);
          // Auto expand root and first level folders
          setExpandedPaths(prev => {
            const next = new Set(prev);
            next.add('.');
            if (res.tree?.children) {
              for (const child of res.tree.children) {
                if (child.isDirectory && next.size < 6) {
                  next.add(child.relativePath);
                }
              }
            }
            return next;
          });
        } else {
          setError(res?.error || 'Não foi possível ler a estrutura do workspace.');
        }
      }
    } catch (err) {
      console.error('Error fetching workspace tree:', err);
      setError(err?.message || 'Erro ao carregar estrutura de arquivos.');
    } finally {
      setLoading(false);
    }
  }, [workspacePath]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Toggle folder expansion
  const toggleFolder = useCallback((relativePath) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(relativePath)) {
        next.delete(relativePath);
      } else {
        next.add(relativePath);
      }
      return next;
    });
  }, []);

  // Expand all folders
  const handleExpandAll = useCallback(() => {
    if (!treeData?.tree) return;
    const allDirs = new Set();
    const collectDirs = (node) => {
      if (node.isDirectory) {
        allDirs.add(node.relativePath);
        if (node.children) {
          node.children.forEach(collectDirs);
        }
      }
    };
    collectDirs(treeData.tree);
    setExpandedPaths(allDirs);
  }, [treeData]);

  // Collapse all folders
  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set(['.']));
  }, []);

  // Copy path to clipboard
  const handleCopyPath = useCallback((relPath, e) => {
    e?.stopPropagation();
    if (!relPath) return;
    navigator.clipboard.writeText(relPath).then(() => {
      setCopiedPath(relPath);
      setTimeout(() => setCopiedPath(null), 2000);
    });
  }, []);

  // Reveal file in OS file explorer
  const handleReveal = useCallback((fullPath, e) => {
    e?.stopPropagation();
    if (fullPath && window.electron?.agent?.revealInExplorer) {
      window.electron.agent.revealInExplorer(fullPath);
    }
  }, []);

  // Open workspace root in explorer
  const handleOpenWorkspaceFolder = useCallback(() => {
    if (workspacePath && window.electron?.agent?.openPath) {
      window.electron.agent.openPath(workspacePath);
    }
  }, [workspacePath]);

  // Focus filter input when opened
  useEffect(() => {
    if (isFilterOpen && filterInputRef.current) {
      filterInputRef.current.focus();
    }
  }, [isFilterOpen]);

  // Filter tree nodes based on search query
  const filteredTree = useMemo(() => {
    if (!treeData?.tree) return null;
    const query = filterText.trim().toLowerCase();
    if (!query) return treeData.tree;

    const filterNode = (node) => {
      const nameMatches = node.name.toLowerCase().includes(query);

      if (node.isDirectory) {
        const filteredChildren = (node.children || [])
          .map(child => filterNode(child))
          .filter(Boolean);

        if (nameMatches || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren
          };
        }
        return null;
      }

      return nameMatches ? node : null;
    };

    return filterNode(treeData.tree);
  }, [treeData, filterText]);

  // When filtering, ensure matching folders are expanded
  useEffect(() => {
    if (!filterText.trim() || !filteredTree) return;
    const matchedDirs = new Set(['.']);
    const collectMatchingDirs = (node) => {
      if (node.isDirectory) {
        matchedDirs.add(node.relativePath);
        if (node.children) {
          node.children.forEach(collectMatchingDirs);
        }
      }
    };
    collectMatchingDirs(filteredTree);
    setExpandedPaths(matchedDirs);
  }, [filterText, filteredTree]);

  // Render individual tree item
  const renderTreeItem = (item, depth = 0) => {
    const isExpanded = expandedPaths.has(item.relativePath);
    const isFolder = item.isDirectory;
    const paddingLeft = `${depth * 14 + 8}px`;

    if (isFolder) {
      return (
        <div key={item.relativePath || item.path} className="select-none">
          <div 
            onClick={() => toggleFolder(item.relativePath)}
            style={{ paddingLeft }}
            className={cn(
              "group flex items-center gap-1.5 py-1 pr-2 rounded-lg cursor-pointer transition-colors text-xs hover:bg-muted/70 text-foreground/90 font-medium"
            )}
            title={item.path}
          >
            <button
              type="button"
              className="p-0.5 rounded text-muted-foreground group-hover:text-foreground transition-transform shrink-0"
            >
              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-150", isExpanded && "rotate-90")} />
            </button>

            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500/90 shrink-0" />
            )}

            <span className="truncate flex-1 font-mono text-xs">
              {highlightMatchedText(item.name, filterText)}
            </span>

            {/* Item count in folder */}
            {Array.isArray(item.children) && item.children.length > 0 && (
              <span className="text-[10px] text-muted-foreground/70 group-hover:text-muted-foreground font-mono px-1">
                {item.children.length}
              </span>
            )}
          </div>

          {/* Children nodes */}
          {isExpanded && item.children && item.children.length > 0 && (
            <div className="space-y-0.5 relative before:absolute before:left-[15px] before:top-0 before:bottom-0 before:w-[1px] before:bg-border/30">
              {item.children.map(child => renderTreeItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File Node
    const isCopied = copiedPath === item.relativePath;

    return (
      <div
        key={item.relativePath || item.path}
        style={{ paddingLeft: `${depth * 14 + 16}px` }}
        className={cn(
          "group flex items-center justify-between py-1 pr-1.5 rounded-lg cursor-pointer transition-colors text-xs hover:bg-muted text-foreground/80 hover:text-foreground"
        )}
        onClick={() => onOpenFileInCanvas && onOpenFileInCanvas(item.relativePath, item)}
        title={`${item.relativePath} (${formatFileSize(item.size)})`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {getFileIcon(item.extension, item.name)}
          <span className="truncate font-mono text-xs">
            {highlightMatchedText(item.name, filterText)}
          </span>
        </div>

        {/* Hover Action Buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
          {/* Open in Canvas */}
          {onOpenFileInCanvas && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFileInCanvas(item.relativePath, item);
              }}
              className="p-1 rounded hover:bg-primary/20 hover:text-primary text-muted-foreground transition-colors"
              title={t('sidebar.openInCanvas') || 'Abrir no Canvas'}
            >
              <PenSquare className="w-3 h-3" />
            </button>
          )}

          {/* Insert in Chat prompt */}
          {onInsertPrompt && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInsertPrompt(item.relativePath, item);
              }}
              className="p-1 rounded hover:bg-amber-500/20 hover:text-amber-500 text-muted-foreground transition-colors"
              title={t('sidebar.insertInPrompt') || 'Inserir no Chat'}
            >
              <MessageSquarePlus className="w-3 h-3" />
            </button>
          )}

          {/* Copy relative path */}
          <button
            type="button"
            onClick={(e) => handleCopyPath(item.relativePath, e)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={isCopied ? (t('sidebar.pathCopied') || 'Copiado!') : (t('sidebar.copyRelativePath') || 'Copiar caminho relativo')}
          >
            {isCopied ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>

          {/* Reveal in OS Explorer */}
          <button
            type="button"
            onClick={(e) => handleReveal(item.path, e)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t('sidebar.revealInExplorer') || 'Mostrar na Pasta'}
          >
            <FolderSearch className="w-3 h-3" />
          </button>
        </div>

        {/* File Size Indicator (when not hovering) */}
        {item.size > 0 && (
          <span className="text-[10px] text-muted-foreground/60 font-mono group-hover:hidden shrink-0 ml-1">
            {formatFileSize(item.size)}
          </span>
        )}
      </div>
    );
  };

  // If no workspace is selected, show empty state
  if (!workspacePath) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 text-center h-full", className)}>
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 shadow-inner">
          <FolderTree className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="text-xs font-semibold text-foreground mb-1">
          {t('sidebar.selectFolderTitle') || 'Estrutura de Pastas do Código'}
        </h3>
        <p className="text-[11px] text-muted-foreground mb-4 max-w-[220px] leading-relaxed">
          {t('sidebar.selectFolderDesc') || 'Selecione a pasta raiz do seu projeto para visualizar a estrutura de arquivos e diretórios enquanto programa.'}
        </p>
        <Button
          type="button"
          onClick={onSelectWorkspace}
          size="sm"
          className="h-8 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-amber-950 font-medium rounded-lg shadow-sm gap-1.5 cursor-pointer transition-all"
        >
          <Folder className="w-3.5 h-3.5 fill-current" />
          <span>{t('chat.selectWorkspace') || 'Selecionar Pasta do Workspace'}</span>
        </Button>
      </div>
    );
  }

  const workspaceName = workspaceInfo?.name || workspacePath.split(/[/\\]/).pop() || 'Workspace';

  return (
    <div className={cn("flex flex-col h-full overflow-hidden text-xs", className)}>
      {/* Header Bar */}
      <div className="px-3 py-2 border-b border-border/40 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Folder className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-foreground truncate font-mono text-xs" title={workspacePath}>
              {workspaceName}
            </div>
            {treeData && (
              <div className="text-[10px] text-muted-foreground truncate">
                {t('sidebar.filesCountLabel', {
                  files: treeData.totalFiles || 0,
                  dirs: treeData.totalDirectories || 0
                }) || `${treeData.totalFiles || 0} arquivos, ${treeData.totalDirectories || 0} pastas`}
              </div>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Search/Filter Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsFilterOpen(!isFilterOpen);
              if (isFilterOpen) setFilterText('');
            }}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer",
              isFilterOpen && "bg-muted text-foreground"
            )}
            title={t('sidebar.filterFiles') || 'Filtrar arquivos...'}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Expand All */}
          <button
            type="button"
            onClick={handleExpandAll}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title={t('sidebar.expandAll') || 'Expandir Tudo'}
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Collapse All */}
          <button
            type="button"
            onClick={handleCollapseAll}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title={t('sidebar.collapseAll') || 'Recolher Tudo'}
          >
            <ChevronsDownUp className="w-3.5 h-3.5" />
          </button>

          {/* Refresh Tree */}
          <button
            type="button"
            onClick={loadTree}
            disabled={loading}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer",
              loading && "animate-spin text-primary"
            )}
            title={t('sidebar.refreshFiles') || 'Recarregar Estrutura'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Open OS Explorer */}
          <button
            type="button"
            onClick={handleOpenWorkspaceFolder}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title={t('sidebar.revealInExplorer') || 'Abrir na Pasta do Sistema'}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Change workspace folder */}
          {onSelectWorkspace && (
            <button
              type="button"
              onClick={onSelectWorkspace}
              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
              title={t('chat.selectWorkspace') || 'Trocar Pasta do Workspace'}
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Input Box */}
      {isFilterOpen && (
        <div className="px-2.5 py-1.5 border-b border-border/40 bg-muted/10 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={filterInputRef}
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={t('sidebar.filterFiles') || 'Filtrar arquivos por nome...'}
              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-background border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tree Content Area */}
      <div className="flex-1 overflow-y-auto px-1.5 py-2 custom-scrollbar space-y-0.5">
        {loading && !treeData ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
            <span className="text-[11px]">{t('common.loading') || 'Carregando estrutura...'}</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">
            <p className="text-xs font-semibold mb-1">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadTree}
              className="h-7 text-xs mt-2"
            >
              {t('common.reload') || 'Tentar novamente'}
            </Button>
          </div>
        ) : filteredTree && filteredTree.children && filteredTree.children.length > 0 ? (
          filteredTree.children.map(child => renderTreeItem(child, 0))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4 text-muted-foreground">
            <p className="text-xs font-medium">
              {filterText ? (t('sidebar.noFilesMatching') || 'Nenhum arquivo encontrado com este filtro') : (t('sidebar.emptyWorkspace') || 'Nenhum arquivo neste diretório')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  BookOpen, 
  FolderPlus, 
  Folder, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Search, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2,
  FileText
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useProjects } from '../context/ProjectContext';

export default function KnowledgeBaseModal({ isOpen, onClose, projectId = null, projectName = null }) {
  const { t } = useLanguage();
  const { activeProjectId, activeProject, updateProject } = useProjects();

  const currentProjectId = projectId || activeProjectId || 'global';
  const currentProjectName = projectName || activeProject?.name || 'Projeto Atual';

  const [stats, setStats] = useState({ hasIndex: false, totalFiles: 0, totalChunks: 0, folders: [] });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Test search states
  const [testQuery, setTestQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // Load project stats
  const loadStats = useCallback(async () => {
    if (!window.electron?.rag?.getProjectStats) return;
    try {
      setIsLoadingStats(true);
      const res = await window.electron.rag.getProjectStats(currentProjectId);
      setStats(res || { hasIndex: false, totalFiles: 0, totalChunks: 0, folders: [] });
    } catch (err) {
      console.error('[KnowledgeBaseModal] Error loading stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      setStatusMessage(null);
      setSearchResults(null);
      setTestQuery('');
    }
  }, [isOpen, loadStats]);

  // Listen to indexing progress events
  useEffect(() => {
    if (!window.electron?.rag?.onIndexingProgress) return;
    const unsubscribe = window.electron.rag.onIndexingProgress((progress) => {
      setIndexingProgress(progress);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  // Add folder handler
  const handleAddFolder = async () => {
    if (!window.electron?.rag?.selectFolder || !window.electron?.rag?.indexFolder) return;

    try {
      const selectResult = await window.electron.rag.selectFolder();
      if (selectResult.canceled || !selectResult.folderPath) return;

      setIsIndexing(true);
      setIndexingProgress({ scannedFiles: 0, currentFile: selectResult.folderName });
      setStatusMessage(null);

      const indexResult = await window.electron.rag.indexFolder(selectResult.folderPath, currentProjectId);

      if (indexResult.success) {
        setStatusMessage({
          type: 'success',
          text: t('rag.indexSuccess', { files: indexResult.fileCount, chunks: indexResult.chunkCount })
        });
        await loadStats();

        // If in an active project, sync folders into project object
        if (activeProjectId && updateProject) {
          const existingFolders = activeProject?.folders || [];
          const updatedFolders = [
            ...existingFolders.filter(f => f.path !== selectResult.folderPath),
            {
              path: selectResult.folderPath,
              name: selectResult.folderName,
              fileCount: indexResult.fileCount,
              chunkCount: indexResult.chunkCount,
              lastIndexed: new Date().toISOString()
            }
          ];
          await updateProject(activeProjectId, { folders: updatedFolders });
        }
      }
    } catch (err) {
      console.error('[KnowledgeBaseModal] Indexing error:', err);
      setStatusMessage({
        type: 'error',
        text: t('rag.indexError', { error: err.message })
      });
    } finally {
      setIsIndexing(false);
      setIndexingProgress(null);
    }
  };

  // Re-index specific folder
  const handleReindex = async (folderPath) => {
    if (!window.electron?.rag?.indexFolder) return;
    try {
      setIsIndexing(true);
      setIndexingProgress({ scannedFiles: 0, currentFile: folderPath });
      setStatusMessage(null);

      const res = await window.electron.rag.indexFolder(folderPath, currentProjectId);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: t('rag.indexSuccess', { files: res.fileCount, chunks: res.chunkCount })
        });
        await loadStats();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: t('rag.indexError', { error: err.message })
      });
    } finally {
      setIsIndexing(false);
      setIndexingProgress(null);
    }
  };

  // Remove folder from index
  const handleRemoveFolder = async (folderPath) => {
    if (!window.confirm(t('rag.removeConfirm'))) return;
    if (!window.electron?.rag?.removeFolder) return;

    try {
      await window.electron.rag.removeFolder(currentProjectId, folderPath);
      await loadStats();

      if (activeProjectId && updateProject && activeProject?.folders) {
        const updated = (activeProject.folders || []).filter(f => f.path !== folderPath);
        await updateProject(activeProjectId, { folders: updated });
      }
    } catch (err) {
      console.error('Error removing folder:', err);
    }
  };

  // Open folder in OS explorer
  const handleOpenFolder = (folderPath) => {
    if (window.electron?.rag?.openFolder) {
      window.electron.rag.openFolder(folderPath);
    }
  };

  // Execute test search
  const handleTestSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!testQuery || !testQuery.trim() || !window.electron?.rag?.queryKnowledge) return;

    setIsSearching(true);
    try {
      const res = await window.electron.rag.queryKnowledge(testQuery.trim(), {
        projectId: currentProjectId,
        maxResults: 5
      });
      setSearchResults(res);
    } catch (err) {
      console.error('[KnowledgeBaseModal] Search error:', err);
      setSearchResults({ results: [], totalMatches: 0 });
    } finally {
      setIsSearching(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t('rag.knowledgeBase')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {currentProjectName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Status Message */}
          {statusMessage && (
            <div className={cn(
              "p-3 rounded-xl text-xs border flex items-start gap-2.5 animate-in fade-in duration-200",
              statusMessage.type === 'success' 
                ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
            )}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{statusMessage.text}</div>
            </div>
          )}

          {/* Indexing Progress Indicator */}
          {isIndexing && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('rag.indexingProgress', { file: indexingProgress?.currentFile || '...' })}</span>
                </div>
                <span>{indexingProgress?.scannedFiles || 0} arquivos</span>
              </div>
              <div className="w-full bg-indigo-500/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-2/3 animate-indeterminate" />
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/50 text-center">
            <div>
              <div className="text-lg font-bold text-foreground">
                {stats.folders?.length || 0}
              </div>
              <div className="text-[11px] text-muted-foreground">Pastas Conectadas</div>
            </div>
            <div className="border-x border-border/60">
              <div className="text-lg font-bold text-foreground">
                {stats.totalFiles || 0}
              </div>
              <div className="text-[11px] text-muted-foreground">Arquivos Indexados</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">
                {stats.totalChunks || 0}
              </div>
              <div className="text-[11px] text-muted-foreground">Chunks BM25</div>
            </div>
          </div>

          {/* Folders List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('rag.foldersTitle')}
              </h3>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFolder}
                disabled={isIndexing}
                className="flex items-center gap-1.5 text-xs h-8 rounded-lg"
              >
                <FolderPlus className="w-3.5 h-3.5 text-primary" />
                <span>{t('rag.addFolder')}</span>
              </Button>
            </div>

            {stats.folders && stats.folders.length > 0 ? (
              <div className="space-y-2.5">
                {stats.folders.map((folder, index) => (
                  <div
                    key={folder.folderPath || index}
                    className="p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground truncate" title={folder.folderPath}>
                          {folder.folderName}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate" title={folder.folderPath}>
                          {folder.folderPath}
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                          {t('rag.folderStats', { files: folder.fileCount || 0, chunks: folder.chunkCount || 0 })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReindex(folder.folderPath)}
                        disabled={isIndexing}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={t('rag.reindex')}
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isIndexing && "animate-spin")} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenFolder(folder.folderPath)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={t('rag.openFolder')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveFolder(folder.folderPath)}
                        disabled={isIndexing}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title={t('rag.remove')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-border/80 text-center space-y-2 bg-muted/10">
                <Folder className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                <div className="text-xs font-medium text-foreground">
                  {t('rag.noFolders')}
                </div>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  {t('rag.noFoldersDesc')}
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddFolder}
                    disabled={isIndexing}
                    className="text-xs rounded-lg"
                  >
                    <FolderPlus className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    {t('rag.selectFolder')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Test Search Section */}
          {stats.folders && stats.folders.length > 0 && (
            <div className="pt-3 border-t border-border/60 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Testar Busca RAG (BM25)
              </h3>

              <form onSubmit={handleTestSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder={t('rag.testQueryPlaceholder')}
                    className="pl-8 text-xs h-9 rounded-lg"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSearching || !testQuery.trim()}
                  className="h-9 px-3.5 text-xs rounded-lg flex items-center gap-1.5"
                >
                  {isSearching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>{t('rag.testSearch')}</span>
                </Button>
              </form>

              {/* Test Results */}
              {searchResults && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {searchResults.totalMatches > 0
                      ? t('rag.testResultsCount', { count: searchResults.totalMatches })
                      : t('rag.noTestResults')}
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                    {searchResults.results.map((res, idx) => (
                      <div
                        key={res.id || idx}
                        className="p-2.5 rounded-lg border border-border/50 bg-muted/20 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] text-foreground">
                          <span className="font-semibold text-primary truncate" title={res.filePath}>
                            📄 {res.relativePath}
                          </span>
                          <span className="text-muted-foreground shrink-0 text-[10px]">
                            L{res.startLine}-{res.endLine} (Score: {(res.score * 10).toFixed(1)})
                          </span>
                        </div>
                        <pre className="p-2 rounded bg-background/80 text-[10.5px] font-mono text-muted-foreground overflow-x-auto max-h-24">
                          <code>{res.content}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/70 bg-muted/20 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs rounded-lg"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

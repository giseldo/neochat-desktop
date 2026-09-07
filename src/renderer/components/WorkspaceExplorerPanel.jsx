import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FolderTree, 
  X, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import WorkspaceFileTree from './WorkspaceFileTree';

const EXPLORER_WIDTH_KEY = 'neochat_explorer_panel_width';
const DEFAULT_EXPLORER_WIDTH = 360;
const MIN_EXPLORER_WIDTH = 260;

export default function WorkspaceExplorerPanel({
  onClose,
  isMaximized,
  onToggleMaximize,
  workspacePath,
  workspaceInfo,
  onSelectWorkspace,
  onOpenFileInCanvas,
  onInsertPrompt,
  className
}) {
  const { t } = useLanguage();

  // Width & Resize state
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(EXPLORER_WIDTH_KEY);
      return saved ? Math.max(MIN_EXPLORER_WIDTH, parseInt(saved, 10)) : DEFAULT_EXPLORER_WIDTH;
    } catch (e) {
      return DEFAULT_EXPLORER_WIDTH;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(panelWidth);
  widthRef.current = panelWidth;

  // Resize Drag Handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const maxWidth = Math.max(MIN_EXPLORER_WIDTH, window.innerWidth - 320);
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, MIN_EXPLORER_WIDTH), maxWidth);
      widthRef.current = newWidth;
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem(EXPLORER_WIDTH_KEY, String(widthRef.current));
      } catch (e) {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      style={isMaximized ? { width: '100%' } : { width: `${panelWidth}px` }}
      className={cn(
        "relative flex flex-col h-full bg-background border-l border-border/60 z-30 transition-all duration-75 shrink-0 shadow-xl",
        isMaximized && "absolute inset-0 w-full z-40 border-l-0",
        className
      )}
    >
      {/* Left Resize Handle (when not maximized) */}
      {!isMaximized && (
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-500/50 transition-colors z-40",
            isResizing && "bg-amber-500 w-2"
          )}
          title={t('sidebar.dragToResize') || 'Arraste para redimensionar'}
        />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-muted/30 select-none shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-500">
            <FolderTree className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-foreground">
            {t('sidebar.workspaceExplorer') || 'Explorador de Arquivos'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onToggleMaximize && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMaximize}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              title={isMaximized ? (t('common.minimize') || 'Restaurar tamanho') : (t('common.maximize') || 'Maximizar painel')}
            >
              {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          )}

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              title={t('common.close') || 'Fechar'}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* File Tree Body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <WorkspaceFileTree
          workspacePath={workspacePath}
          workspaceInfo={workspaceInfo}
          onSelectWorkspace={onSelectWorkspace}
          onOpenFileInCanvas={onOpenFileInCanvas}
          onInsertPrompt={onInsertPrompt}
        />
      </div>
    </div>
  );
}

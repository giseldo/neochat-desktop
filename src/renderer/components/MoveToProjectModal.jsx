import React from 'react';
import { createPortal } from 'react-dom';
import { useProjects } from '../context/ProjectContext';
import { useChat } from '../context/ChatContext';
import { useLanguage } from '../context/LanguageContext';
import { FolderKanban, Check, X, Layers, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export function MoveToProjectModal() {
  const { 
    projects, 
    isMoveModalOpen, 
    closeMoveModal, 
    chatToMove, 
    openCreateProjectModal 
  } = useProjects();
  const { updateChatProject } = useChat();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isMoveModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMoveModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMoveModalOpen, closeMoveModal]);

  if (!isMoveModalOpen || !chatToMove) return null;

  const currentProjectId = chatToMove.projectId || null;

  const handleSelectProject = async (projectId) => {
    try {
      await updateChatProject(chatToMove.id, projectId);
      closeMoveModal();
    } catch (error) {
      console.error('Error assigning chat to project:', error);
    }
  };

  const handleCreateNewAndMove = () => {
    closeMoveModal();
    openCreateProjectModal();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeMoveModal();
      }}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-4 shadow-2xl animate-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
          <div className="min-w-0 pr-2">
            <h3 className="font-semibold text-xs text-foreground flex items-center gap-1.5 truncate">
              <FolderKanban className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{t('projects.moveToProject')}</span>
            </h3>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              &ldquo;{chatToMove.title || t('sidebar.conversationDefault')}&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={closeMoveModal}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project Options List */}
        <div className="space-y-1 my-1">
          {/* No Project / General */}
          <button
            type="button"
            onClick={() => handleSelectProject(null)}
            className={cn(
              "w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors text-xs",
              currentProjectId === null
                ? "bg-primary/10 border-primary/40 text-primary font-medium"
                : "border-border hover:bg-muted text-foreground"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs">
                💬
              </span>
              <span>{t('projects.noProjectAssigned')}</span>
            </div>
            {currentProjectId === null && <Check className="w-4 h-4 text-primary" />}
          </button>

          {/* Project Items */}
          {projects.map((p) => {
            const isSelected = currentProjectId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectProject(p.id)}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors text-xs",
                  isSelected
                    ? "bg-primary/10 border-primary/40 text-primary font-medium"
                    : "border-border hover:bg-muted text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span 
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                    style={{ backgroundColor: `${p.color || '#f55036'}20`, color: p.color || '#f55036' }}
                  >
                    {p.icon || '📁'}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    {p.description && (
                      <div className="text-[10px] text-muted-foreground truncate">{p.description}</div>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer / Create New Project Shortcut */}
        <div className="pt-3 border-t border-border mt-3">
          <button
            type="button"
            onClick={handleCreateNewAndMove}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('projects.newProject')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MoveToProjectModal;

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProjects } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { FolderKanban, X, Trash2, Sparkles, Check, AlertCircle, BookOpen, FolderPlus } from 'lucide-react';
import { cn } from '../lib/utils';

export const PROJECT_COLORS = [
  { name: 'Groq Orange', value: '#f55036' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Indigo', value: '#6366f1' },
];

export const PROJECT_ICONS = [
  '🎓', '📁', '📂', '🚀', '💻', '💡', '📊', '🎨', '🔬', '📝', 
  '⚡', '🤖', '🌐', '🔒', '🎯', '📚', '🛠️', '💼', '📌', '🏷️', '📦', '🔍', '⚙️', '⭐'
];

export function ProjectModal() {
  const { 
    isProjectModalOpen, 
    setIsProjectModalOpen, 
    projectModalMode, 
    editingProject, 
    createProject, 
    updateProject, 
    deleteProject,
    openKnowledgeBaseModal
  } = useProjects();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#f55036',
    icon: '📁',
    customPrompt: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (editingProject && projectModalMode === 'edit') {
      setFormData({
        name: editingProject.name || '',
        description: editingProject.description || '',
        color: editingProject.color || '#f55036',
        icon: editingProject.icon || '📁',
        customPrompt: editingProject.customPrompt || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#f55036',
        icon: '📁',
        customPrompt: '',
      });
    }
    setShowDeleteConfirm(false);
    setErrorMessage('');
    setIsSaving(false);
  }, [editingProject, projectModalMode, isProjectModalOpen]);

  useEffect(() => {
    if (!isProjectModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsProjectModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProjectModalOpen, setIsProjectModalOpen]);

  if (!isProjectModalOpen) return null;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!formData.name || !formData.name.trim()) {
      setErrorMessage(t('common.required'));
      return;
    }

    setErrorMessage('');
    setIsSaving(true);

    try {
      if (projectModalMode === 'edit' && editingProject?.id) {
        await updateProject(editingProject.id, formData);
      } else {
        await createProject(formData);
      }
      setIsProjectModalOpen(false);
    } catch (error) {
      console.error('Error saving project:', error);
      setErrorMessage(error.message || 'Erro ao salvar projeto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingProject?.id) return;
    try {
      setIsDeleting(true);
      await deleteProject(editingProject.id);
      setIsProjectModalOpen(false);
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) setIsProjectModalOpen(false);
      }}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 shadow-2xl animate-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <span className="text-base">{formData.icon}</span>
            <span>{projectModalMode === 'edit' ? t('projects.editProject') : t('projects.createProject')}</span>
          </h3>
          <button
            type="button"
            onClick={() => setIsProjectModalOpen(false)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-3 p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Delete Confirmation View */}
        {showDeleteConfirm ? (
          <div className="space-y-4 py-2">
            <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs leading-relaxed">
              <p className="font-medium mb-1">{t('projects.deleteProject')}?</p>
              <p>{t('projects.deleteConfirm', { name: editingProject?.name || '' })}</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('projects.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs"
              >
                {isDeleting ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                {t('projects.nameLabel')} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t('projects.namePlaceholder')}
                value={formData.name}
                onChange={e => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                {t('projects.descLabel')}
              </label>
              <input
                type="text"
                placeholder={t('projects.descPlaceholder')}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Icon / Emoji Selection */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                {t('projects.iconLabel')}
              </label>
              <div className="grid grid-cols-8 gap-1.5 p-2 bg-muted/40 border border-border rounded-xl">
                {PROJECT_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={cn(
                      "h-8 flex items-center justify-center text-sm rounded-lg hover:bg-muted transition-transform active:scale-95",
                      formData.icon === emoji && "bg-primary/20 ring-2 ring-primary scale-105"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                {t('projects.colorLabel')}
              </label>
              <div className="flex items-center gap-2 flex-wrap p-2 bg-muted/40 border border-border rounded-xl">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    className={cn(
                      "w-6 h-6 rounded-full transition-transform flex items-center justify-center hover:scale-110",
                      formData.color === c.value && "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {formData.color === c.value && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Project System Instructions */}
            <div>
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5 block mb-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                {t('projects.promptLabel')}
              </label>
              <textarea
                rows={3}
                placeholder={t('projects.promptPlaceholder')}
                value={formData.customPrompt}
                onChange={e => setFormData({ ...formData, customPrompt: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
              />
            </div>

            {/* Knowledge Base / RAG Section */}
            {projectModalMode === 'edit' && editingProject?.id && (
              <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-semibold text-foreground">
                      {t('rag.knowledgeBase')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectModalOpen(false);
                      openKnowledgeBaseModal();
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 font-medium flex items-center gap-1.5 transition-colors border border-indigo-500/30"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>{t('rag.viewKnowledge')}</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {(editingProject.folders?.length || 0) > 0 
                    ? `${editingProject.folders.length} pasta(s) vinculada(s) à base de conhecimento.` 
                    : t('rag.noFoldersDesc')}
                </p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-border mt-4">
              <div>
                {projectModalMode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSaving}
                    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1 text-xs"
                    title={t('projects.deleteProject')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('common.delete')}</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  {t('projects.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <span>{t('common.loading')}</span>
                  ) : (
                    <span>{projectModalMode === 'edit' ? t('projects.saveChanges') : t('projects.saveProject')}</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ProjectModal;

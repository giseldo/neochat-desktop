import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Terminal, 
  RotateCcw,
  FileText,
  Code2,
  BookOpen,
  Wrench,
  CheckCircle2,
  Languages,
  GitBranch,
  Database,
  FlaskConical,
  FileCode,
  Zap,
  Bot
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { 
  BUILT_IN_SLASH_COMMANDS, 
  PROMPT_TEMPLATES_STORAGE_KEY,
  getAllPromptCommands 
} from '../lib/defaultPromptCommands';

const AVAILABLE_ICONS = [
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Terminal', icon: Terminal },
  { name: 'Code2', icon: Code2 },
  { name: 'FileText', icon: FileText },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Wrench', icon: Wrench },
  { name: 'CheckCircle2', icon: CheckCircle2 },
  { name: 'Languages', icon: Languages },
  { name: 'GitBranch', icon: GitBranch },
  { name: 'Database', icon: Database },
  { name: 'FlaskConical', icon: FlaskConical },
  { name: 'FileCode', icon: FileCode },
  { name: 'Zap', icon: Zap },
  { name: 'Bot', icon: Bot },
];

export function PromptTemplatesModal({ isOpen, onClose, onTemplatesUpdated }) {
  const { t, language } = useLanguage();
  const [customTemplates, setCustomTemplates] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    command: '',
    title: '',
    description: '',
    icon: 'Sparkles',
    template: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Load custom templates on open
  useEffect(() => {
    if (!isOpen) return;

    const loadCustom = async () => {
      try {
        if (window.electron?.getSettings) {
          const settings = await window.electron.getSettings();
          if (Array.isArray(settings?.customPromptTemplates)) {
            setCustomTemplates(settings.customPromptTemplates);
            return;
          }
        }
        const saved = localStorage.getItem(PROMPT_TEMPLATES_STORAGE_KEY);
        if (saved) {
          setCustomTemplates(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Error loading custom prompt templates:', err);
      }
    };

    loadCustom();
    setIsEditing(false);
    setEditingId(null);
    setErrorMessage('');
    setSuccessMessage('');
  }, [isOpen]);

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

  const persistTemplates = async (updatedList) => {
    setCustomTemplates(updatedList);
    try {
      localStorage.setItem(PROMPT_TEMPLATES_STORAGE_KEY, JSON.stringify(updatedList));
      if (window.electron?.getSettings && window.electron?.saveSettings) {
        const settings = await window.electron.getSettings();
        await window.electron.saveSettings({
          ...settings,
          customPromptTemplates: updatedList
        });
      }
      onTemplatesUpdated?.(updatedList);
    } catch (err) {
      console.error('Failed to persist custom prompt templates:', err);
    }
  };

  const handleStartCreate = () => {
    setFormData({
      command: '',
      title: '',
      description: '',
      icon: 'Sparkles',
      template: '{{input}}',
    });
    setEditingId(null);
    setIsEditing(true);
    setErrorMessage('');
  };

  const handleStartEdit = (tmpl) => {
    setFormData({
      command: tmpl.command,
      title: tmpl.title,
      description: tmpl.description || '',
      icon: tmpl.icon || 'Sparkles',
      template: tmpl.template || '',
    });
    setEditingId(tmpl.id);
    setIsEditing(true);
    setErrorMessage('');
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    const cleanCmd = formData.command.replace(/^\//, '').toLowerCase().trim();

    if (!cleanCmd) {
      setErrorMessage(t('promptTemplates.commandRequired'));
      return;
    }

    if (!/^[a-z0-9-_]+$/.test(cleanCmd)) {
      setErrorMessage(t('promptTemplates.commandInvalid'));
      return;
    }

    if (!formData.title.trim()) {
      setErrorMessage(t('promptTemplates.titleRequired'));
      return;
    }

    if (!formData.template.trim()) {
      setErrorMessage(t('promptTemplates.templateRequired'));
      return;
    }

    let updatedList;
    if (editingId) {
      updatedList = customTemplates.map(item => 
        item.id === editingId 
          ? { ...item, ...formData, command: cleanCmd }
          : item
      );
    } else {
      const newTemplate = {
        id: `custom-${Date.now()}`,
        command: cleanCmd,
        title: formData.title.trim(),
        description: formData.description.trim(),
        icon: formData.icon || 'Sparkles',
        template: formData.template.trim(),
        createdAt: new Date().toISOString()
      };
      updatedList = [...customTemplates, newTemplate];
    }

    await persistTemplates(updatedList);
    setIsEditing(false);
    setEditingId(null);
    setSuccessMessage(t('promptTemplates.saveSuccess'));
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const handleDelete = async (id) => {
    const updatedList = customTemplates.filter(item => item.id !== id);
    await persistTemplates(updatedList);
    setDeletingId(null);
    setSuccessMessage(t('promptTemplates.deleteSuccess'));
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  const allCommands = getAllPromptCommands(customTemplates, t, language);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t('promptTemplates.modalTitle')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('promptTemplates.modalSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-green-600 bg-green-500/10 border border-green-500/20 rounded-xl">
              <Check className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {isEditing ? (
            /* Create / Edit Form */
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  {editingId ? t('promptTemplates.editTemplate') : t('promptTemplates.newTemplate')}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t('common.cancel')}
                </button>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Command Name */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    {t('promptTemplates.commandLabel')} *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">/</span>
                    <input
                      type="text"
                      value={formData.command}
                      onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                      placeholder={t('promptTemplates.commandPlaceholder')}
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    {t('promptTemplates.titleLabel')} *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('promptTemplates.titlePlaceholder')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {t('promptTemplates.descriptionLabel')}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('promptTemplates.descriptionPlaceholder')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  {t('promptTemplates.iconLabel')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ICONS.map(({ name, icon: IconComp }) => {
                    const isSelected = formData.icon === name;
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => setFormData({ ...formData, icon: name })}
                        className={cn(
                          "p-2 rounded-xl border transition-all flex items-center justify-center",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                            : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                        title={name}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Template Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-foreground">
                    {t('promptTemplates.templateLabel')} *
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {t('promptTemplates.templateHint')}
                  </span>
                </div>
                <textarea
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  placeholder={t('promptTemplates.templatePlaceholder')}
                  rows={5}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted text-foreground transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          ) : (
            /* Commands List View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {allCommands.length} {t('slashCommands.title')}
                </span>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('promptTemplates.newTemplate')}</span>
                </button>
              </div>

              <div className="space-y-2">
                {allCommands.map((cmd) => {
                  const IconComp = AVAILABLE_ICONS.find(i => i.name === cmd.icon)?.icon || Sparkles;
                  const isBuiltIn = cmd.isBuiltIn;

                  return (
                    <div
                      key={cmd.id || cmd.command}
                      className="flex items-start justify-between p-3.5 rounded-xl border border-border bg-background/50 hover:bg-muted/30 transition-colors gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-foreground shrink-0 mt-0.5">
                          <IconComp className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-primary">
                              /{cmd.command}
                            </span>
                            <span className="font-medium text-xs text-foreground">
                              {cmd.title}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold",
                                isBuiltIn
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {isBuiltIn ? t('promptTemplates.defaultBadge') : t('promptTemplates.customBadge')}
                            </span>
                          </div>
                          {cmd.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {cmd.description}
                            </p>
                          )}
                          <div className="mt-2 p-2 rounded-lg bg-muted/40 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap max-h-20 overflow-y-auto border border-border/40">
                            {cmd.template}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons for custom templates */}
                      {!isBuiltIn && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cmd)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={t('common.edit')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {deletingId === cmd.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(cmd.id)}
                                className="px-2 py-1 text-[10px] rounded-lg bg-destructive text-destructive-foreground font-medium"
                              >
                                {t('common.delete')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="p-1 text-[10px] text-muted-foreground hover:text-foreground"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingId(cmd.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted text-foreground transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
export default PromptTemplatesModal;

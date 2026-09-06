import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Search,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit3,
  Check,
  CheckCircle2,
  Code2,
  GitBranch,
  Database,
  BookOpen,
  Layers,
  Globe,
  FileText,
  Zap,
  Terminal,
  Cpu,
  Wrench,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Sliders,
  FolderDown,
  FileCode,
  Flame,
  Bot
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import Switch from './ui/Switch';
import { useLanguage } from '../context/LanguageContext';

const ICON_COMPONENTS = {
  Search,
  Code2,
  GitBranch,
  Database,
  BookOpen,
  Layers,
  Globe,
  Sparkles,
  CheckCircle2,
  FileText,
  Zap,
  Terminal,
  Cpu,
  Wrench,
  Bot,
  FileCode,
  Flame
};

const CATEGORIES = [
  { id: 'all', labelKey: 'skills.allCategories', icon: Layers },
  { id: 'coding', labelKey: 'skills.catCoding', icon: Code2 },
  { id: 'research', labelKey: 'skills.catResearch', icon: Search },
  { id: 'analysis', labelKey: 'skills.catAnalysis', icon: Database },
  { id: 'writing', labelKey: 'skills.catWriting', icon: BookOpen },
  { id: 'devops', labelKey: 'skills.catDevops', icon: Layers },
  { id: 'design', labelKey: 'skills.catDesign', icon: Sparkles },
  { id: 'general', labelKey: 'skills.catGeneral', icon: Wrench }
];

export function SkillsModal({
  isOpen,
  onClose,
  onInvokeSkill = null,
  initialTab = 'installed'
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab); // 'installed' | 'catalog' | 'create' | 'import'
  const [skills, setSkills] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [installingId, setInstallingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [expandedSkillId, setExpandedSkillId] = useState(null);

  // Create / Edit state
  const [editingSkill, setEditingSkill] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    displayName: '',
    slashCommand: '',
    category: 'coding',
    icon: 'Code2',
    tags: '',
    description: '',
    instructions: ''
  });
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'installed');
      loadSkillsData();
    }
  }, [isOpen, initialTab]);

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

  const loadSkillsData = async () => {
    if (!window.electron?.skills) return;
    try {
      setLoading(true);
      const [installedList, catalogList] = await Promise.all([
        window.electron.skills.list(),
        window.electron.skills.getCatalog()
      ]);
      setSkills(installedList || []);
      setCatalog(catalogList || []);
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setActionMessage({ text: msg, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleToggle = async (skillId, currentEnabled) => {
    if (!window.electron?.skills?.toggle) return;
    try {
      await window.electron.skills.toggle(skillId, !currentEnabled);
      setSkills(prev => prev.map(s => s.id === skillId ? { ...s, enabled: !currentEnabled } : s));
    } catch (err) {
      console.error('Failed to toggle skill:', err);
      showToast(err.message, 'error');
    }
  };

  const handleInstallFromCatalog = async (catalogId) => {
    if (!window.electron?.skills?.installFromCatalog) return;
    setInstallingId(catalogId);
    try {
      const res = await window.electron.skills.installFromCatalog(catalogId);
      if (res && res.success) {
        showToast(t('skills.importSuccess') || 'Skill instalada com sucesso!');
        await loadSkillsData();
      }
    } catch (err) {
      console.error('Failed to install skill from catalog:', err);
      showToast(err.message, 'error');
    } finally {
      setInstallingId(null);
    }
  };

  const handleDelete = async (skill) => {
    if (!window.electron?.skills?.delete) return;
    const confirmMsg = t('skills.uninstallConfirm', { name: skill.displayName || skill.name }) || `Desinstalar a skill ${skill.name}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await window.electron.skills.delete(skill.id);
      if (res && res.success) {
        showToast(t('skills.deleteSuccess') || 'Skill removida com sucesso!');
        await loadSkillsData();
      }
    } catch (err) {
      console.error('Failed to delete skill:', err);
      showToast(err.message, 'error');
    }
  };

  const handleExport = async (skillId, format = 'md') => {
    if (!window.electron?.skills?.export) return;
    try {
      const res = await window.electron.skills.export(skillId, format);
      if (res && res.success) {
        showToast(`Exportado para ${res.savedPath || res.filename}`);
      }
    } catch (err) {
      console.error('Failed to export skill:', err);
      showToast(err.message, 'error');
    }
  };

  const handleImportFile = async () => {
    if (!window.electron?.skills?.importFile) return;
    try {
      setIsImporting(true);
      const res = await window.electron.skills.importFile();
      if (res && res.success) {
        showToast(t('skills.importSuccess') || 'Skill importada com sucesso!');
        await loadSkillsData();
        setActiveTab('installed');
      } else if (res && res.error) {
        showToast(res.error, 'error');
      }
    } catch (err) {
      console.error('Failed to import file:', err);
      showToast(err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl || !importUrl.trim() || !window.electron?.skills?.importUrl) return;
    try {
      setIsImporting(true);
      const res = await window.electron.skills.importUrl(importUrl.trim());
      if (res && res.success) {
        showToast(t('skills.importSuccess') || 'Skill importada com sucesso!');
        setImportUrl('');
        await loadSkillsData();
        setActiveTab('installed');
      } else if (res && res.error) {
        showToast(res.error, 'error');
      }
    } catch (err) {
      console.error('Failed to import from URL:', err);
      showToast(err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleStartCreate = () => {
    setEditingSkill(null);
    setFormData({
      id: '',
      name: '',
      displayName: '',
      slashCommand: '',
      category: 'coding',
      icon: 'Code2',
      tags: '',
      description: '',
      instructions: '# Instruções da Skill\n\nDescreva como o assistente deve responder e quais etapas deve seguir...'
    });
    setActiveTab('create');
  };

  const handleStartEdit = (skill) => {
    setEditingSkill(skill);
    setFormData({
      id: skill.id,
      name: skill.name || '',
      displayName: skill.displayName || skill.name || '',
      slashCommand: skill.slashCommand || '',
      category: skill.category || 'coding',
      icon: skill.icon || 'Code2',
      tags: Array.isArray(skill.tags) ? skill.tags.join(', ') : (skill.tags || ''),
      description: skill.description || '',
      instructions: skill.instructions || ''
    });
    setActiveTab('create');
  };

  const handleSaveSkill = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      id: editingSkill ? editingSkill.id : (formData.id.trim() || undefined),
      name: formData.name.trim(),
      displayName: formData.displayName.trim() || formData.name.trim(),
      slashCommand: formData.slashCommand.trim().replace(/^\//, ''),
      category: formData.category,
      icon: formData.icon,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      description: formData.description.trim(),
      instructions: formData.instructions.trim()
    };

    try {
      setLoading(true);
      const res = await window.electron.skills.create(payload);
      if (res && res.success) {
        showToast(editingSkill ? t('skills.updateSuccess') : t('skills.createSuccess'));
        await loadSkillsData();
        setActiveTab('installed');
      }
    } catch (err) {
      console.error('Failed to save skill:', err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoke = (skill) => {
    if (onInvokeSkill && typeof onInvokeSkill === 'function') {
      onInvokeSkill(skill);
      onClose();
    }
  };

  const renderIcon = (iconName, className = 'w-5 h-5') => {
    const Component = ICON_COMPONENTS[iconName] || Sparkles;
    return <Component className={className} />;
  };

  const activeSkillsCount = useMemo(() => {
    return skills.filter(s => s.enabled !== false).length;
  }, [skills]);

  const filteredInstalled = useMemo(() => {
    return skills.filter(s => {
      const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQ = !q ||
        s.name?.toLowerCase().includes(q) ||
        s.displayName?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.slashCommand?.toLowerCase().includes(q) ||
        (Array.isArray(s.tags) && s.tags.some(t => t.toLowerCase().includes(q)));
      return matchCat && matchQ;
    });
  }, [skills, selectedCategory, searchQuery]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter(s => {
      const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQ = !q ||
        s.name?.toLowerCase().includes(q) ||
        s.displayName?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.slashCommand?.toLowerCase().includes(q) ||
        (Array.isArray(s.tags) && s.tags.some(t => t.toLowerCase().includes(q)));
      return matchCat && matchQ;
    });
  }, [catalog, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border text-card-foreground rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {t('skills.title')}
                </h2>
                <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20">
                  {t('skills.activeBadge', { count: activeSkillsCount })}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('skills.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.electron?.openExternal) {
                  window.electron.openExternal('https://skillsmp.com/');
                } else {
                  window.open('https://skillsmp.com/', '_blank');
                }
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary hover:border-primary/40 transition-colors shadow-2xs"
              title="Explorar SkillsMP.com - Marketplace de AI Skills"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              <span>SkillsMP.com</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleStartCreate}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('skills.createTab')}</span>
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toast Alert */}
        {actionMessage && (
          <div className={cn(
            "px-6 py-2 text-xs font-medium flex items-center justify-between border-b transition-all",
            actionMessage.type === 'error'
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          )}>
            <div className="flex items-center gap-2">
              {actionMessage.type === 'error' ? <HelpCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              <span>{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="px-6 py-2.5 border-b border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('installed')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'installed'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('skills.installedTab')}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                activeTab === 'installed' ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {skills.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'catalog'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('skills.catalogTab')}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                activeTab === 'catalog' ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {catalog.length}
              </span>
            </button>

            <button
              onClick={handleStartCreate}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'create'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingSkill ? t('skills.editTitle') : t('skills.createTab')}</span>
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'import'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>{t('skills.importTab')}</span>
            </button>
          </div>

          {/* Search bar (visible in installed & catalog tabs) */}
          {(activeTab === 'installed' || activeTab === 'catalog') && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('skills.searchPlaceholder')}
                className="w-full pl-8.5 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Category Filter Pills (in installed & catalog tabs) */}
        {(activeTab === 'installed' || activeTab === 'catalog') && (
          <div className="px-6 py-2 border-b border-border/60 bg-muted/5 flex items-center gap-1.5 overflow-x-auto">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                    selectedCategory === cat.id
                      ? 'bg-foreground text-background font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="w-3 h-3" />
                  <span>{t(cat.labelKey)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: INSTALLED SKILLS */}
          {activeTab === 'installed' && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-xs gap-2">
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Carregando skills...</span>
                </div>
              ) : filteredInstalled.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mx-auto mb-3">
                    <Sparkles className="w-6 h-6 opacity-40" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {skills.length === 0 ? t('skills.noInstalled') : t('common.noResults')}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                    {skills.length === 0 ? t('skills.noInstalledDesc') : 'Tente alterar os termos de busca ou filtro de categoria.'}
                  </p>
                  {skills.length === 0 && (
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" onClick={() => setActiveTab('catalog')}>
                        <Flame className="w-3.5 h-3.5 mr-1.5" />
                        {t('skills.catalogTab')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleStartCreate}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        {t('skills.createTab')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredInstalled.map((skill) => {
                    const isExpanded = expandedSkillId === skill.id;
                    return (
                      <div
                        key={skill.id}
                        className={cn(
                          "rounded-xl border transition-all duration-150 flex flex-col p-4 bg-background",
                          skill.enabled !== false
                            ? "border-primary/30 shadow-xs hover:border-primary/50"
                            : "border-border/70 opacity-75 hover:opacity-100"
                        )}
                      >
                        {/* Header card */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                              skill.enabled !== false
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-muted text-muted-foreground border-border"
                            )}>
                              {renderIcon(skill.icon)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                                  {skill.displayName || skill.name}
                                </h4>
                                {skill.slashCommand && (
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-primary font-semibold">
                                    /{skill.slashCommand}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground capitalize">
                                {skill.category} • v{skill.version || '1.0.0'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              id={`skill-switch-${skill.id}`}
                              checked={skill.enabled !== false}
                              onChange={() => handleToggle(skill.id, skill.enabled !== false)}
                              onCheckedChange={() => handleToggle(skill.id, skill.enabled !== false)}
                              aria-label={`Toggle ${skill.name}`}
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {skill.description || 'Sem descrição cadastrada.'}
                        </p>

                        {/* Tags */}
                        {Array.isArray(skill.tags) && skill.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {skill.tags.map((tag, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted/60 text-muted-foreground">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Expandable Instructions Preview */}
                        {isExpanded && (
                          <div className="mt-2 mb-3 p-3 rounded-lg bg-muted/40 border border-border/80 text-xs font-mono text-foreground/90 overflow-x-auto max-h-48 whitespace-pre-wrap">
                            {skill.instructions}
                          </div>
                        )}

                        {/* Actions Footer */}
                        <div className="mt-auto pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => setExpandedSkillId(isExpanded ? null : skill.id)}
                            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Ocultar Instruções' : 'Ver Instruções'}</span>
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>

                          <div className="flex items-center gap-1">
                            {onInvokeSkill && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => handleInvoke(skill)}
                                title={t('skills.invokeInChat')}
                              >
                                <Terminal className="w-3 h-3 mr-1" />
                                <span>{t('skills.invokeInChat')}</span>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => handleStartEdit(skill)}
                              title={t('skills.edit')}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => handleExport(skill.id, 'md')}
                              title={t('skills.exportMd')}
                            >
                              <Download className="w-3 h-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(skill)}
                              title={t('skills.uninstall')}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SKILLS CATALOG & HUB */}
          {activeTab === 'catalog' && (
            <div>
              {/* SkillsMP.com Banner */}
              <div className="mb-4 p-4 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-background to-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <span>SkillsMP • Marketplace Global de AI Skills</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-primary/20 text-primary font-mono font-semibold">
                        skillsmp.com
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Descubra milhares de skills criadas pela comunidade para Claude, OpenAI, Antigravity e importe diretamente via URL ou arquivo.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (window.electron?.openExternal) window.electron.openExternal('https://skillsmp.com/');
                    else window.open('https://skillsmp.com/', '_blank');
                  }}
                  className="shrink-0 text-xs font-semibold flex items-center gap-1.5 hover:text-primary hover:border-primary/40 bg-background"
                >
                  <span>Explorar SkillsMP</span>
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                </Button>
              </div>

              {filteredCatalog.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-xs">
                  <Flame className="w-8 h-8 opacity-40 mx-auto mb-2 text-amber-500" />
                  <p>{t('skills.noCatalogResults')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCatalog.map((item) => {
                    const isInstalled = skills.some(s => s.id === item.id);
                    const isInstalling = installingId === item.id;
                    const isExpanded = expandedSkillId === `catalog-${item.id}`;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-xl border p-4.5 bg-background transition-all flex flex-col justify-between",
                          isInstalled ? "border-emerald-500/30 bg-emerald-500/5" : "border-border hover:border-primary/40 shadow-xs"
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                {renderIcon(item.icon)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                                    {item.displayName || item.name}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-primary font-semibold">
                                    /{item.slashCommand}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {item.category}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div>
                              {isInstalled ? (
                                <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>{t('skills.installed')}</span>
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleInstallFromCatalog(item.id)}
                                  disabled={isInstalling}
                                  className="h-8 text-xs font-semibold"
                                >
                                  {isInstalling ? (
                                    <>
                                      <RotateCcw className="w-3 h-3 mr-1.5 animate-spin" />
                                      <span>{t('skills.installing')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-3.5 h-3.5 mr-1.5" />
                                      <span>{t('skills.install')}</span>
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                            {item.description}
                          </p>

                          {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {item.tags.map((tag, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted/60 text-muted-foreground">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {isExpanded && (
                            <div className="mt-2 mb-3 p-3 rounded-lg bg-muted/40 border border-border/80 text-xs font-mono text-foreground/90 overflow-x-auto max-h-48 whitespace-pre-wrap">
                              {item.instructions}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => setExpandedSkillId(isExpanded ? null : `catalog-${item.id}`)}
                            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Ocultar Regras' : 'Prévia das Instruções'}</span>
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>

                          <span className="text-[10px]">
                            {item.author || 'NeoChat Core'} • v{item.version || '1.0.0'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE / EDIT SKILL */}
          {activeTab === 'create' && (
            <form onSubmit={handleSaveSkill} className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>{editingSkill ? t('skills.editTitle') : t('skills.createTitle')}</span>
                </h3>
                {editingSkill && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleStartCreate}
                    className="text-xs"
                  >
                    Cancelar Edição
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {t('skills.nameLabel')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        name: val,
                        slashCommand: prev.slashCommand ? prev.slashCommand : val.toLowerCase().replace(/[^a-z0-9]/g, '-')
                      }));
                    }}
                    placeholder={t('skills.namePlaceholder')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {t('skills.commandLabel')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">/</span>
                    <input
                      type="text"
                      value={formData.slashCommand}
                      onChange={(e) => setFormData({ ...formData, slashCommand: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                      placeholder={t('skills.commandPlaceholder')}
                      className="w-full pl-6 pr-3 py-2 bg-background border border-border rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary text-foreground"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    {t('skills.commandHint', { command: formData.slashCommand || 'comando' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {t('skills.categoryLabel')}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary text-foreground"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{t(c.labelKey)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {t('skills.iconLabel')}
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary text-foreground"
                  >
                    {Object.keys(ICON_COMPONENTS).map(iconName => (
                      <option key={iconName} value={iconName}>{iconName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {t('skills.tagsLabel')}
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder={t('skills.tagsPlaceholder')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {t('skills.descriptionLabel')}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('skills.descriptionPlaceholder')}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {t('skills.instructionsLabel')} *
                </label>
                <textarea
                  rows={8}
                  required
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder={t('skills.instructionsPlaceholder')}
                  className="w-full p-3 bg-background border border-border rounded-lg text-xs font-mono leading-relaxed focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('installed')}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || !formData.name.trim()}
                  className="font-semibold"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  <span>{t('skills.save')}</span>
                </Button>
              </div>
            </form>
          )}

          {/* TAB 4: IMPORT SKILL */}
          {activeTab === 'import' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Option 1: File upload */}
              <div className="p-5 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground">
                      {t('skills.importFileTitle')}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {t('skills.importFileDesc')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleImportFile}
                    disabled={isImporting}
                    size="sm"
                    className="font-semibold"
                  >
                    <FolderDown className="w-3.5 h-3.5 mr-1.5" />
                    <span>{t('skills.selectFile')}</span>
                  </Button>
                </div>
              </div>

              {/* Option 2: Remote URL import */}
              <div className="p-5 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground">
                      {t('skills.importUrlTitle')}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {t('skills.importUrlDesc')}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder={t('skills.importUrlPlaceholder')}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary text-foreground"
                  />
                  <Button
                    onClick={handleImportFromUrl}
                    disabled={isImporting || !importUrl.trim()}
                    size="sm"
                    className="font-semibold"
                  >
                    {isImporting ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    <span>{t('skills.importButton')}</span>
                  </Button>
                </div>
              </div>

              {/* Option 3: SkillsMP Directory */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ExternalLink className="w-4 h-4 text-primary shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-foreground">Procurando mais skills? </span>
                    <span className="text-muted-foreground">Acesse o </span>
                    <span className="font-semibold text-primary">skillsmp.com</span>
                    <span className="text-muted-foreground"> para explorar e copiar URLs de skills da comunidade.</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (window.electron?.openExternal) window.electron.openExternal('https://skillsmp.com/');
                    else window.open('https://skillsmp.com/', '_blank');
                  }}
                  className="shrink-0 text-xs font-semibold flex items-center gap-1.5 bg-background"
                >
                  <span>Abrir skillsmp.com</span>
                  <ExternalLink className="w-3 h-3 text-primary" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SkillsModal;

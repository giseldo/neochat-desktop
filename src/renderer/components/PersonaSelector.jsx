import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Check, Plus, Edit2, Trash2, Sparkles, Code2, ShieldAlert, Languages, Database, Feather, X, Sliders } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export const DEFAULT_PERSONAS = [
  {
    id: 'default',
    name: 'Assistente Geral',
    icon: 'Bot',
    description: 'Assistente versátil para todas as tarefas',
    systemPrompt: '',
    temperature: 0.7,
  },
  {
    id: 'developer',
    name: 'Dev & Arquiteto',
    icon: 'Code2',
    description: 'Especialista em código limpo, TypeScript, React, Python e arquitetura',
    systemPrompt: 'Você é um Engenheiro de Software Principal e Arquiteto de Sistemas experiente. Forneça respostas técnicas precisas, código limpo, boas práticas de segurança, performance e arquitetura modular. Explique brevemente o raciocínio das decisões tomadas.',
    temperature: 0.2,
  },
  {
    id: 'reviewer',
    name: 'Revisor de Código',
    icon: 'ShieldAlert',
    description: 'Auditoria de bugs, vulnerabilidades de segurança e otimizações',
    systemPrompt: 'Você é um Auditor de Código e Segurança sênior. Analise cuidadosamente o código fornecido em busca de: 1. Bugs e edge-cases; 2. Vulnerabilidades de segurança; 3. Problemas de performance; 4. Legibilidade. Destaque os pontos críticos e forneça as correções diretamente com código.',
    temperature: 0.1,
  },
  {
    id: 'translator',
    name: 'Tradutor Técnico',
    icon: 'Languages',
    description: 'Tradução precisa preservando terminologia técnica',
    systemPrompt: 'Você é um Tradutor Técnico especializado em tecnologia e ciência. Traduza com naturalidade mantendo termos técnicos consagrados da indústria, blocos de código e formatação markdown intactos.',
    temperature: 0.3,
  },
  {
    id: 'database',
    name: 'Especialista SQL & DB',
    icon: 'Database',
    description: 'Modelagem de dados, queries SQL complexas e tuning de performance',
    systemPrompt: 'Você é um Administrador de Banco de Dados (DBA) e Especialista em SQL. Escreva consultas SQL otimizadas, índices adequados, schemas relacionais elegantes e forneça planos de execução e dicas de escalabilidade.',
    temperature: 0.2,
  },
  {
    id: 'writer',
    name: 'Redator & Copywriter',
    icon: 'Feather',
    description: 'Redação clara, artigos técnicos, resumos e e-mails profissionais',
    systemPrompt: 'Você é um Redator e Copywriter profissional de alto nível. Crie textos claros, persuasivos, bem pontuados e cativantes, adaptados ao público-alvo com fluidez e elegância.',
    temperature: 0.7,
  },
];

export const getDefaultPersonas = (t) => [
  {
    id: 'default',
    name: t('personas.pDefaultName'),
    icon: 'Bot',
    description: t('personas.pDefaultDesc'),
    systemPrompt: '',
    temperature: 0.7,
  },
  {
    id: 'developer',
    name: t('personas.pDevName'),
    icon: 'Code2',
    description: t('personas.pDevDesc'),
    systemPrompt: t('personas.pDevPrompt'),
    temperature: 0.2,
  },
  {
    id: 'reviewer',
    name: t('personas.pReviewerName'),
    icon: 'ShieldAlert',
    description: t('personas.pReviewerDesc'),
    systemPrompt: t('personas.pReviewerPrompt'),
    temperature: 0.1,
  },
  {
    id: 'translator',
    name: t('personas.pTranslatorName'),
    icon: 'Languages',
    description: t('personas.pTranslatorDesc'),
    systemPrompt: t('personas.pTranslatorPrompt'),
    temperature: 0.3,
  },
  {
    id: 'database',
    name: t('personas.pDatabaseName'),
    icon: 'Database',
    description: t('personas.pDatabaseDesc'),
    systemPrompt: t('personas.pDatabasePrompt'),
    temperature: 0.2,
  },
  {
    id: 'writer',
    name: t('personas.pWriterName'),
    icon: 'Feather',
    description: t('personas.pWriterDesc'),
    systemPrompt: t('personas.pWriterPrompt'),
    temperature: 0.7,
  },
];

const PERSONAS_STORAGE_KEY = 'neochat_custom_personas';

export function getStoredCustomPersonas() {
  try {
    const saved = localStorage.getItem(PERSONAS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading personas:', e);
  }
  return [];
}

export function getStoredPersonas() {
  const custom = getStoredCustomPersonas();
  return [...DEFAULT_PERSONAS, ...custom];
}

export function PersonaSelector({ activePersona, onSelectPersona, className }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [customPersonas, setCustomPersonas] = useState(getStoredCustomPersonas);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    temperature: 0.7,
  });
  const dropdownRef = useRef(null);

  const defaultPersonas = useMemo(() => getDefaultPersonas(t), [t]);
  const personas = useMemo(() => [...defaultPersonas, ...customPersonas], [defaultPersonas, customPersonas]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentPersona = personas.find(p => p.id === activePersona?.id) || personas[0];

  const handleOpenCreate = () => {
    setEditingPersona(null);
    setFormData({
      name: '',
      description: '',
      systemPrompt: '',
      temperature: 0.7,
    });
    setIsOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e, p) => {
    e.stopPropagation();
    setEditingPersona(p);
    setFormData({
      name: p.name,
      description: p.description || '',
      systemPrompt: p.systemPrompt || '',
      temperature: p.temperature ?? 0.7,
    });
    setIsOpen(false);
    setIsModalOpen(true);
  };

  const handleSavePersona = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingPersona && editingPersona.isCustom) {
      // Update existing custom persona
      const updatedCustom = customPersonas.map((p) => {
        if (p.id === editingPersona.id) {
          return {
            ...p,
            name: formData.name.trim(),
            description: formData.description.trim() || t('personas.defaultPersonaDesc'),
            systemPrompt: formData.systemPrompt.trim(),
            temperature: Number(formData.temperature) || 0.7,
          };
        }
        return p;
      });

      setCustomPersonas(updatedCustom);
      try {
        localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(updatedCustom));
      } catch (err) {
        console.error('Failed to save persona:', err);
      }

      const updated = updatedCustom.find((p) => p.id === editingPersona.id);
      if (activePersona?.id === editingPersona.id && updated) {
        onSelectPersona(updated);
      }
    } else {
      // Create new custom persona (or customize a default preset)
      const created = {
        id: `custom_${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim() || t('personas.defaultPersonaDesc'),
        systemPrompt: formData.systemPrompt.trim(),
        temperature: Number(formData.temperature) || 0.7,
        icon: editingPersona?.icon || 'Bot',
        isCustom: true,
      };

      const updatedCustom = [...customPersonas, created];
      setCustomPersonas(updatedCustom);

      try {
        localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(updatedCustom));
      } catch (err) {
        console.error('Failed to save persona:', err);
      }

      onSelectPersona(created);
    }

    setIsModalOpen(false);
  };

  const handleDeletePersona = (e, id) => {
    e.stopPropagation();
    const updatedCustom = customPersonas.filter(p => p.id !== id);
    setCustomPersonas(updatedCustom);
    try {
      localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(updatedCustom));
    } catch (err) {}
    if (activePersona?.id === id) {
      onSelectPersona(defaultPersonas[0]);
    }
  };

  const getPersonaIcon = (iconName) => {
    switch (iconName) {
      case 'Code2': return Code2;
      case 'ShieldAlert': return ShieldAlert;
      case 'Languages': return Languages;
      case 'Database': return Database;
      case 'Feather': return Feather;
      default: return Bot;
    }
  };

  const IconComponent = getPersonaIcon(currentPersona.icon);

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors text-xs font-medium shadow-xs"
        title={t('personas.buttonTitle')}
      >
        <IconComponent className="w-3.5 h-3.5 text-primary" />
        <span className="max-w-[110px] truncate">{currentPersona.name}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-68 rounded-xl border border-border bg-popover p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-b border-border mb-1 flex items-center justify-between">
            <span>{t('personas.dropdownTitle')}</span>
            <button
              onClick={handleOpenCreate}
              className="text-primary hover:underline flex items-center gap-0.5 font-medium"
            >
              <Plus className="w-3 h-3" /> {t('personas.createButton')}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {personas.map((p) => {
              const ItemIcon = getPersonaIcon(p.icon);
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPersona(p);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-left group",
                    currentPersona.id === p.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-popover-foreground"
                  )}
                >
                  <div className="flex items-start gap-2 min-w-0 pr-2">
                    <ItemIcon className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{p.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(e, p)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background/80 hover:text-primary transition-opacity text-muted-foreground"
                      title={p.isCustom ? t('personas.editTitle') : t('personas.customizeTitle')}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {p.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeletePersona(e, p.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background/80 hover:text-destructive transition-opacity text-muted-foreground"
                        title={t('personas.deleteTitle')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {currentPersona.id === p.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-0.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal to create / edit custom persona rendered in document.body via Portal to prevent container constraints */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 shadow-2xl animate-in zoom-in-95 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                {editingPersona?.isCustom ? (
                  <>
                    <Edit2 className="w-4 h-4 text-primary" /> {t('personas.editModalTitle')}
                  </>
                ) : editingPersona ? (
                  <>
                    <Edit2 className="w-4 h-4 text-primary" /> {t('personas.customizeModalTitle')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-primary" /> {t('personas.modalTitle')}
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePersona} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">{t('personas.nameLabel')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('personas.namePlaceholder')}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">{t('personas.descLabel')}</label>
                <input
                  type="text"
                  placeholder={t('personas.descPlaceholder')}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">{t('personas.promptLabel')}</label>
                <textarea
                  rows={5}
                  placeholder={t('personas.promptPlaceholder')}
                  value={formData.systemPrompt}
                  onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>

              {/* Temperature Slider */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="font-medium text-foreground flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    {t('personas.tempLabel')}
                  </label>
                  <span className="font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                    {Number(formData.temperature).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formData.temperature}
                  onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
                  <span>{t('personas.tempPrecise')}</span>
                  <span>{t('personas.tempBalanced')}</span>
                  <span>{t('personas.tempCreative')}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  {t('personas.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                >
                  {editingPersona?.isCustom ? t('personas.saveChanges') : t('personas.save')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PersonaSelector;

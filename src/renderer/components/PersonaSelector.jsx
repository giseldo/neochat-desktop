import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bot, BotOff, Check, Plus, Edit2, Trash2, Sparkles, Code2, ShieldAlert, 
  Languages, Database, Feather, X, Sliders, CheckCircle2, Droplets, 
  Compass, Inbox, Terminal, Cpu, Zap, Copy, Store
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import AssistantMarketModal from './AssistantMarketModal';

const IMPORTED_ASSISTANTS = [
  {
    id: 'taxbot', name: 'TaxBot', icon: 'CheckCircle2', color: '#16a34a',
    description: 'Orientação geral sobre impostos e organização fiscal',
    systemPrompt: 'Você é o TaxBot, um assistente cuidadoso de educação fiscal. Explique conceitos tributários de forma simples, peça país e contexto quando necessário, diferencie informação geral de aconselhamento profissional e nunca invente alíquotas, prazos ou regras. Recomende confirmar decisões relevantes com um contador ou advogado tributarista.',
    temperature: 0.2,
  },
  {
    id: 'soccer', name: 'Soccer Guru AI', icon: 'Zap', color: '#16a34a',
    description: 'Especialista em futebol, tática, história e análise de partidas',
    systemPrompt: 'Você é o Soccer Guru AI, especialista em futebol mundial. Responda com conhecimento tático e histórico, separe fatos de opinião e deixe claro quando dados atuais, escalações ou resultados precisarem de verificação ao vivo.',
    temperature: 0.6,
  },
  {
    id: 'review', name: 'Colleague Review Helper', icon: 'Feather', color: '#7c3aed',
    description: 'Ajuda a escrever feedback profissional, específico e construtivo',
    systemPrompt: 'Você ajuda a redigir avaliações de colegas. Transforme observações em feedback respeitoso, específico, acionável e equilibrado, preservando a voz do usuário. Evite inferências sobre características pessoais e peça exemplos concretos quando faltarem evidências.',
    temperature: 0.5,
  },
  {
    id: 'cloze', name: 'Cloze Test Generator', icon: 'Languages', color: '#ea580c',
    description: 'Cria exercícios de preenchimento de lacunas com gabarito',
    systemPrompt: 'Você cria testes cloze claros e adequados ao nível informado. Preserve contexto suficiente para cada lacuna, varie vocabulário e gramática, numere as questões e forneça um gabarito separado com explicações breves quando útil.',
    temperature: 0.4,
  },
];

export const DEFAULT_PERSONAS = [
  {
    id: 'default',
    name: 'Assistente Geral',
    icon: 'Bot',
    color: '#64748b',
    colorClass: 'bg-slate-500 text-white',
    description: 'Assistente versátil para todas as tarefas',
    systemPrompt: '',
    temperature: 0.7,
  },
  {
    id: 'developer',
    name: 'Developer',
    icon: 'Code2',
    color: '#8b5cf6',
    colorClass: 'bg-purple-600 text-white',
    description: 'Especialista em código limpo, TypeScript, React, Python e arquitetura',
    systemPrompt: 'Você é um Engenheiro de Software Principal e Arquiteto de Sistemas experiente. Forneça respostas técnicas precisas, código limpo, boas práticas de segurança, performance e arquitetura modular. Explique brevemente o raciocínio das decisões tomadas.',
    temperature: 0.2,
  },
  {
    id: 'mr_tester',
    name: 'Mr Tester',
    icon: 'Droplets',
    color: '#0ea5e9',
    colorClass: 'bg-sky-500 text-white',
    description: 'Especialista em testes automatizados, TDD, edge cases e depuração sistemática',
    systemPrompt: 'Você é o Mr Tester, especialista dedicado a testes automatizados, TDD, debugging sistemático, cobertura de edge cases e validação rigorosa de código. Analise cenários críticos, forneça suites de teste completas e aponte bugs potenciais.',
    temperature: 0.1,
  },
  {
    id: 'chief',
    name: 'Chief',
    icon: 'Compass',
    color: '#10b981',
    colorClass: 'bg-teal-500 text-white',
    description: 'Coordenação estratégica, planejamento de metas e decisões de produto',
    systemPrompt: 'Você é o Chief, copiloto estratégico e coordenador geral. Ajude a estruturar prioridades, definir planos de ação executáveis, balancear trade-offs de negócio e arquitetura, e direcionar o trabalho com clareza.',
    temperature: 0.5,
  },
  {
    id: 'inbox_manager',
    name: 'Inbox Manager',
    icon: 'Inbox',
    color: '#6366f1',
    colorClass: 'bg-indigo-600 text-white',
    description: 'Triagem de mensagens, redação de e-mails, outbound e fluxos operacionais',
    systemPrompt: 'Você é o Inbox & Ops Manager. Sua especialidade é triagem de comunicações, redação de e-mails profissionais com tom persuasivo e direto, organização de contatos e síntese rápida de pendências.',
    temperature: 0.5,
  },
  {
    id: 'reviewer',
    name: 'Revisor de Código',
    icon: 'ShieldAlert',
    color: '#f43f5e',
    colorClass: 'bg-rose-500 text-white',
    description: 'Auditoria de bugs, vulnerabilidades de segurança e otimizações',
    systemPrompt: 'Você é um Auditor de Código e Segurança sênior. Analise cuidadosamente o código fornecido em busca de: 1. Bugs e edge-cases; 2. Vulnerabilidades de segurança; 3. Problemas de performance; 4. Legibilidade. Destaque os pontos críticos e forneça as correções diretamente com código.',
    temperature: 0.1,
  },
  {
    id: 'writer',
    name: 'Redator & Copy',
    icon: 'Feather',
    color: '#f59e0b',
    colorClass: 'bg-amber-500 text-white',
    description: 'Redação persuasiva, documentação clara e e-mails de impacto',
    systemPrompt: 'Você é um Redator e Copywriter profissional de alto nível. Crie textos claros, persuasivos, bem pontuados e cativantes, adaptados ao público-alvo com fluidez e elegância.',
    temperature: 0.7,
  },
  {
    id: 'database',
    name: 'Especialista SQL & DB',
    icon: 'Database',
    color: '#059669',
    colorClass: 'bg-emerald-600 text-white',
    description: 'Modelagem de dados, queries SQL complexas e tuning de performance',
    systemPrompt: 'Você é um Administrador de Banco de Dados (DBA) e Especialista em SQL. Escreva consultas SQL otimizadas, índices adequados, schemas relacionais elegantes e forneça planos de execução e dicas de escalabilidade.',
    temperature: 0.2,
  },
  ...IMPORTED_ASSISTANTS,
];

export const getDefaultPersonas = (t) => [
  {
    id: 'default',
    name: t ? (t('personas.pDefaultName') || 'Assistente Geral') : 'Assistente Geral',
    icon: 'Bot',
    color: '#64748b',
    colorClass: 'bg-slate-500 text-white',
    description: t ? (t('personas.pDefaultDesc') || 'Assistente versátil para todas as tarefas') : 'Assistente versátil para todas as tarefas',
    systemPrompt: '',
    temperature: 0.7,
  },
  {
    id: 'developer',
    name: t ? (t('personas.pDevName') || 'Developer') : 'Developer',
    icon: 'Code2',
    color: '#8b5cf6',
    colorClass: 'bg-purple-600 text-white',
    description: t ? (t('personas.pDevDesc') || 'Especialista em código limpo, TypeScript, React, Python e arquitetura') : 'Especialista em código limpo, TypeScript, React, Python e arquitetura',
    systemPrompt: t ? (t('personas.pDevPrompt') || 'Você é um Engenheiro de Software Principal...') : 'Você é um Engenheiro de Software Principal...',
    temperature: 0.2,
  },
  {
    id: 'mr_tester',
    name: 'Mr Tester',
    icon: 'Droplets',
    color: '#0ea5e9',
    colorClass: 'bg-sky-500 text-white',
    description: 'Especialista em testes automatizados, TDD, edge cases e depuração',
    systemPrompt: 'Você é o Mr Tester, especialista dedicado a testes automatizados, TDD, debugging sistemático, cobertura de edge cases e validação rigorosa de código.',
    temperature: 0.1,
  },
  {
    id: 'chief',
    name: 'Chief',
    icon: 'Compass',
    color: '#10b981',
    colorClass: 'bg-teal-500 text-white',
    description: 'Coordenação estratégica, planejamento de metas e decisões de produto',
    systemPrompt: 'Você é o Chief, copiloto estratégico e coordenador geral. Ajude a estruturar prioridades, definir planos de ação executáveis e direcionar o trabalho.',
    temperature: 0.5,
  },
  {
    id: 'inbox_manager',
    name: 'Inbox Manager',
    icon: 'Inbox',
    color: '#6366f1',
    colorClass: 'bg-indigo-600 text-white',
    description: 'Triagem de mensagens, redação de e-mails, outbound e operações',
    systemPrompt: 'Você é o Inbox & Ops Manager. Sua especialidade é triagem de comunicações, redação de e-mails profissionais e organização de pipelines.',
    temperature: 0.5,
  },
  {
    id: 'reviewer',
    name: t ? (t('personas.pReviewerName') || 'Revisor de Código') : 'Revisor de Código',
    icon: 'ShieldAlert',
    color: '#f43f5e',
    colorClass: 'bg-rose-500 text-white',
    description: t ? (t('personas.pReviewerDesc') || 'Auditoria de bugs, vulnerabilidades de segurança e otimizações') : 'Auditoria de bugs, vulnerabilidades de segurança e otimizações',
    systemPrompt: t ? (t('personas.pReviewerPrompt') || 'Você é um Auditor de Código e Segurança sênior...') : 'Você é um Auditor de Código e Segurança sênior...',
    temperature: 0.1,
  },
  {
    id: 'writer',
    name: t ? (t('personas.pWriterName') || 'Redator & Copy') : 'Redator & Copy',
    icon: 'Feather',
    color: '#f59e0b',
    colorClass: 'bg-amber-500 text-white',
    description: t ? (t('personas.pWriterDesc') || 'Redação clara, artigos técnicos, resumos e e-mails profissionais') : 'Redação clara, artigos técnicos, resumos e e-mails profissionais',
    systemPrompt: t ? (t('personas.pWriterPrompt') || 'Você é um Redator e Copywriter profissional...') : 'Você é um Redator e Copywriter profissional...',
    temperature: 0.7,
  },
  {
    id: 'database',
    name: t ? (t('personas.pDatabaseName') || 'Especialista SQL & DB') : 'Especialista SQL & DB',
    icon: 'Database',
    color: '#059669',
    colorClass: 'bg-emerald-600 text-white',
    description: t ? (t('personas.pDatabaseDesc') || 'Modelagem de dados, queries SQL complexas e tuning') : 'Modelagem de dados, queries SQL complexas e tuning',
    systemPrompt: t ? (t('personas.pDatabasePrompt') || 'Você é um Administrador de Banco de Dados...') : 'Você é um Administrador de Banco de Dados...',
    temperature: 0.2,
  },
  ...IMPORTED_ASSISTANTS,
];

export const PERSONAS_STORAGE_KEY = 'neochat_custom_personas';
export const PERSONAS_OVERRIDES_STORAGE_KEY = 'neochat_persona_overrides';
export const ACTIVE_PERSONA_STORAGE_KEY = 'neochat_active_persona_id';

export function getStoredPersonaOverrides() {
  try {
    const saved = localStorage.getItem(PERSONAS_OVERRIDES_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading persona overrides:', e);
  }
  return {};
}

export function getStoredCustomPersonas() {
  try {
    const saved = localStorage.getItem(PERSONAS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading custom personas:', e);
  }
  return [];
}

export function getStoredPersonas(t) {
  const baseDefaults = t ? getDefaultPersonas(t) : DEFAULT_PERSONAS;
  const overrides = getStoredPersonaOverrides();
  const customizedDefaults = baseDefaults.map((p) => {
    if (overrides[p.id]) {
      return {
        ...p,
        ...overrides[p.id],
        isDefaultOverridden: true,
      };
    }
    return p;
  });
  const custom = getStoredCustomPersonas();
  return [...customizedDefaults, ...custom];
}

export function getStoredActivePersona(t) {
  try {
    const activeId = localStorage.getItem(ACTIVE_PERSONA_STORAGE_KEY);
    if (activeId === 'none' || activeId === 'disabled') {
      return null;
    }
    const all = getStoredPersonas(t);
    if (activeId) {
      const found = all.find((p) => p.id === activeId);
      if (found) return found;
    }
    return all[0];
  } catch (e) {
    console.error('Error getting stored active persona:', e);
    return DEFAULT_PERSONAS[0];
  }
}

export const getPersonaIcon = (iconName) => {
  switch (iconName) {
    case 'Code2': return Code2;
    case 'ShieldAlert': return ShieldAlert;
    case 'Languages': return Languages;
    case 'Database': return Database;
    case 'Feather': return Feather;
    case 'Droplets': return Droplets;
    case 'Compass': return Compass;
    case 'Inbox': return Inbox;
    case 'Terminal': return Terminal;
    case 'Cpu': return Cpu;
    case 'CheckCircle2': return CheckCircle2;
    case 'Zap': return Zap;
    case 'Sparkles': return Sparkles;
    default: return Bot;
  }
};

export function BotAvatar({ persona, className = "w-8 h-8", iconClassName = "w-4 h-4" }) {
  if (!persona || persona.id === 'none' || persona.id === 'disabled') {
    return (
      <div className={cn("rounded-xl flex items-center justify-center bg-muted text-muted-foreground shrink-0 border border-border/60", className)}>
        <BotOff className={iconClassName} />
      </div>
    );
  }

  const [imageError, setImageError] = useState(false);
  const IconComp = getPersonaIcon(persona.icon);
  const color = persona.color || (
    persona.id === 'developer' ? '#8b5cf6' :
    persona.id === 'mr_tester' ? '#0ea5e9' :
    persona.id === 'chief' ? '#10b981' :
    persona.id === 'inbox_manager' ? '#6366f1' :
    persona.id === 'reviewer' ? '#f43f5e' :
    persona.id === 'writer' ? '#f59e0b' :
    persona.id === 'database' ? '#059669' :
    persona.id === 'default' ? '#64748b' : '#f97316'
  );

  const avatar = persona.avatar;
  const isUrl = typeof avatar === 'string' && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:image/'));

  if (avatar) {
    if (isUrl && !imageError) {
      return (
        <div 
          className={cn("rounded-xl flex items-center justify-center shrink-0 shadow-2xs overflow-hidden select-none bg-primary/10", className)}
          title={persona.name}
        >
          <img 
            src={avatar} 
            alt={persona.name || ''} 
            className="w-full h-full object-cover" 
            onError={() => setImageError(true)} 
          />
        </div>
      );
    }
    if (!isUrl) {
      return (
        <div 
          className={cn("rounded-xl flex items-center justify-center shrink-0 shadow-2xs select-none", className)}
          style={{ backgroundColor: color }}
          title={persona.name}
        >
          <span className="leading-none text-base select-none">{avatar}</span>
        </div>
      );
    }
  }

  return (
    <div 
      className={cn("rounded-xl flex items-center justify-center shrink-0 shadow-2xs text-white transition-transform select-none", className)}
      style={{ backgroundColor: color }}
      title={persona.name}
    >
      <IconComp className={iconClassName} />
    </div>
  );
}

export function saveCustomPersona(personaData) {
  const currentCustom = getStoredCustomPersonas();
  let updated;
  if (personaData.id && currentCustom.some(p => p.id === personaData.id)) {
    updated = currentCustom.map(p => p.id === personaData.id ? { ...p, ...personaData } : p);
  } else {
    const created = {
      ...personaData,
      id: personaData.id || `custom_${Date.now()}`,
      name: personaData.name?.trim() || 'New agent',
      description: personaData.description?.trim() || 'Custom bot',
      systemPrompt: personaData.systemPrompt?.trim() || '',
      temperature: Number(personaData.temperature) || 0.7,
      icon: personaData.icon || 'Bot',
      color: personaData.color || '#f97316',
      isCustom: true,
    };
    updated = [...currentCustom, created];
  }
  try {
    localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to persist custom persona:', err);
  }
  return updated;
}

export function deleteCustomPersona(id) {
  const currentCustom = getStoredCustomPersonas();
  const updated = currentCustom.filter(p => p.id !== id);
  try {
    localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete custom persona:', err);
  }
  return updated;
}

export function PersonaSelector({ activePersona, onSelectPersona, className }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [customPersonas, setCustomPersonas] = useState(getStoredCustomPersonas);
  const [personaOverrides, setPersonaOverrides] = useState(getStoredPersonaOverrides);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    temperature: 0.7,
  });
  const dropdownRef = useRef(null);

  const defaultPersonas = useMemo(() => {
    const base = getDefaultPersonas(t);
    return base.map(p => {
      if (personaOverrides[p.id]) {
        return {
          ...p,
          ...personaOverrides[p.id],
          isDefaultOverridden: true,
        };
      }
      return p;
    });
  }, [t, personaOverrides]);

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

  const isDeactivated = !activePersona || activePersona.id === 'none' || activePersona.id === 'disabled';
  const currentPersona = isDeactivated ? null : (personas.find(p => p.id === activePersona?.id) || personas[0]);

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

  const handleInstallAssistant = async (assistant) => {
    const persona = {
      id: `market_${assistant.identifier}`,
      name: assistant.meta.title,
      description: assistant.meta.description || 'Assistant comunitário',
      systemPrompt: assistant.meta.systemRole || '',
      temperature: 0.7,
      icon: 'Bot',
      color: '#2563eb',
      avatar: assistant.meta.avatar,
      tags: assistant.meta.tags,
      category: assistant.meta.category,
      author: assistant.author,
      homepage: assistant.homepage,
      profile: assistant.profile,
      marketIdentifier: assistant.identifier,
      isCustom: true,
      isMarketAssistant: true,
    };
    const updated = saveCustomPersona(persona);
    setCustomPersonas(updated);
    onSelectPersona(persona);
    localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, persona.id);
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

  const handleResetDefault = () => {
    if (!editingPersona || editingPersona.isCustom) return;
    const updatedOverrides = { ...personaOverrides };
    delete updatedOverrides[editingPersona.id];
    setPersonaOverrides(updatedOverrides);
    try {
      localStorage.setItem(PERSONAS_OVERRIDES_STORAGE_KEY, JSON.stringify(updatedOverrides));
    } catch (err) {
      console.error('Failed to save persona overrides:', err);
    }

    const base = getDefaultPersonas(t).find(p => p.id === editingPersona.id) || DEFAULT_PERSONAS.find(p => p.id === editingPersona.id);
    if (base) {
      setFormData({
        name: base.name,
        description: base.description || '',
        systemPrompt: base.systemPrompt || '',
        temperature: base.temperature ?? 0.7,
      });
      if (activePersona?.id === base.id) {
        onSelectPersona(base);
      }
    }
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
      if (updated) {
        onSelectPersona(updated);
        try {
          localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, updated.id);
        } catch (err) {}
      }
    } else if (editingPersona && !editingPersona.isCustom) {
      // Update / customize a default preset
      const updatedOverrides = {
        ...personaOverrides,
        [editingPersona.id]: {
          name: formData.name.trim(),
          description: formData.description.trim() || editingPersona.description,
          systemPrompt: formData.systemPrompt.trim(),
          temperature: Number(formData.temperature) || 0.7,
        },
      };

      setPersonaOverrides(updatedOverrides);
      try {
        localStorage.setItem(PERSONAS_OVERRIDES_STORAGE_KEY, JSON.stringify(updatedOverrides));
      } catch (err) {
        console.error('Failed to save persona overrides:', err);
      }

      const updated = {
        ...editingPersona,
        ...updatedOverrides[editingPersona.id],
        isDefaultOverridden: true,
      };

      onSelectPersona(updated);
      try {
        localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, updated.id);
      } catch (err) {}
    } else {
      // Create new custom persona
      const created = {
        id: `custom_${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim() || t('personas.defaultPersonaDesc'),
        systemPrompt: formData.systemPrompt.trim(),
        temperature: Number(formData.temperature) || 0.7,
        icon: 'Bot',
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
      try {
        localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, created.id);
      } catch (err) {}
    }

    setIsModalOpen(false);
  };

  const handleDeactivate = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onSelectPersona(null);
    try {
      localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, 'none');
    } catch (err) {}
    setIsOpen(false);
  };

  const handleSelectPersona = (p) => {
    // If clicking on the currently active persona, toggle/deactivate it
    if (!isDeactivated && currentPersona?.id === p.id) {
      handleDeactivate();
      return;
    }
    onSelectPersona(p);
    try {
      localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, p.id);
    } catch (err) {}
    setIsOpen(false);
  };

  const handleDeletePersona = (e, id) => {
    e.stopPropagation();
    const updatedCustom = customPersonas.filter(p => p.id !== id);
    setCustomPersonas(updatedCustom);
    try {
      localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(updatedCustom));
    } catch (err) {}
    if (activePersona?.id === id) {
      handleDeactivate();
    }
  };

  const IconComponent = isDeactivated ? BotOff : getPersonaIcon(currentPersona?.icon);

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-7 flex items-center gap-1.5 px-2.5 rounded-lg text-xs transition-all group/btn cursor-pointer border shadow-2xs",
          !isDeactivated
            ? "bg-background/80 hover:bg-muted/70 border-border/60 text-foreground font-medium"
            : "bg-muted/30 hover:bg-muted/60 border-border/40 text-muted-foreground font-medium"
        )}
        title={!isDeactivated ? `${currentPersona?.name} • ${t('personas.clickToDeactivate') || 'Clique para desativar'}` : t('personas.buttonTitle')}
      >
        {!isDeactivated && currentPersona?.avatar ? (
          typeof currentPersona.avatar === 'string' && (currentPersona.avatar.startsWith('http://') || currentPersona.avatar.startsWith('https://') || currentPersona.avatar.startsWith('data:image/')) ? (
            <img src={currentPersona.avatar} alt="" className="w-3.5 h-3.5 rounded object-cover shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <span className="text-xs leading-none shrink-0 select-none">{currentPersona.avatar}</span>
          )
        ) : (
          <IconComponent className={cn("w-3.5 h-3.5 shrink-0", !isDeactivated ? "text-primary" : "text-muted-foreground")} />
        )}
        <span className="max-w-[120px] truncate">
          {!isDeactivated ? currentPersona?.name : (t('personas.deactivated') || 'Desativado')}
        </span>
        {!isDeactivated && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleDeactivate}
            className="ml-0.5 -mr-1 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            title={t('personas.deactivateTitle')}
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-68 rounded-xl border border-border bg-popover p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-b border-border mb-1 flex items-center justify-between">
            <span>{t('personas.dropdownTitle')}</span>
            <div className="flex items-center gap-2">
              {!isDeactivated && (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="text-muted-foreground hover:text-destructive flex items-center gap-0.5 font-medium transition-colors cursor-pointer"
                  title={t('personas.deactivateTitle')}
                >
                  <X className="w-3 h-3" /> {t('personas.deactivateButton')}
                </button>
              )}
              <button
                type="button"
                onClick={() => { setIsOpen(false); setIsMarketOpen(true); }}
                className="text-primary hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
              >
                <Store className="w-3 h-3" /> Assistants
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="text-primary hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
              >
                <Plus className="w-3 h-3" /> {t('personas.createButton')}
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {/* Option: Desativado */}
            <div
              onClick={handleDeactivate}
              title={isDeactivated ? undefined : t('personas.deactivateTitle')}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-left group",
                isDeactivated ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-popover-foreground"
              )}
            >
              <div className="flex items-start gap-2 min-w-0 pr-2">
                <BotOff className={cn("w-4 h-4 mt-0.5 flex-shrink-0", isDeactivated ? "text-primary" : "text-muted-foreground")} />
                <div className="min-w-0">
                  <div className="text-xs truncate">{t('personas.deactivated') || 'Desativado'}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{t('personas.deactivatedDesc') || 'Sem persona especializada ativa (conversação padrão)'}</div>
                </div>
              </div>
              {isDeactivated && (
                <span className="flex items-center">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-0.5" />
                </span>
              )}
            </div>

            {/* Configured Personas */}
            {personas.map((p) => {
              const ItemIcon = getPersonaIcon(p.icon);
              const isSelected = !isDeactivated && currentPersona?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPersona(p)}
                  title={isSelected ? t('personas.clickToDeactivate') : undefined}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-left group",
                    isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-popover-foreground"
                  )}
                >
                  <div className="flex items-start gap-2 min-w-0 pr-2">
                    {p.avatar ? (
                      typeof p.avatar === 'string' && (p.avatar.startsWith('http://') || p.avatar.startsWith('https://') || p.avatar.startsWith('data:image/')) ? (
                        <img src={p.avatar} alt="" className="w-4 h-4 mt-0.5 rounded object-cover flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <span className="w-4 h-4 mt-0.5 flex-shrink-0 text-center text-xs leading-none select-none">{p.avatar}</span>
                      )
                    ) : (
                      <ItemIcon className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{p.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(e, p)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background/80 hover:text-primary transition-opacity text-muted-foreground cursor-pointer"
                      title={p.isCustom ? t('personas.editTitle') : t('personas.customizeTitle')}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {p.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeletePersona(e, p.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background/80 hover:text-destructive transition-opacity text-muted-foreground cursor-pointer"
                        title={t('personas.deleteTitle')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {isSelected && (
                      <span
                        className="flex items-center"
                        title={t('personas.clickToDeactivate')}
                      >
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-0.5" />
                      </span>
                    )}
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

              <div className="flex items-center justify-between pt-3 border-t border-border mt-4">
                <div>
                  {editingPersona && !editingPersona.isCustom && personaOverrides[editingPersona.id] && (
                    <button
                      type="button"
                      onClick={handleResetDefault}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {t('personas.resetDefault')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
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
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <AssistantMarketModal
        isOpen={isMarketOpen}
        onClose={() => setIsMarketOpen(false)}
        onInstall={handleInstallAssistant}
        installedIds={customPersonas.map(persona => persona.id)}
      />
    </div>
  );
}

export default PersonaSelector;

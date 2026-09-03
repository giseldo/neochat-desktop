import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  X,
  Play,
  Square,
  Sparkles,
  Shield,
  Code,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Layers,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Search,
  Megaphone,
  Scale,
  Briefcase,
  DollarSign,
  TrendingUp,
  PenTool,
  Share2,
  Compass,
  Palette,
  BookOpen,
  Cpu,
  HelpCircle,
  CopyPlus
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCanvas } from '../context/CanvasContext';
import { cn } from '../lib/utils';

// Icon Map for easy dynamic rendering
const ICON_MAP = {
  Layers,
  Code,
  FileCheck,
  Shield,
  CheckCircle2,
  Cpu,
  TrendingUp,
  Megaphone,
  PenTool,
  Search,
  Share2,
  Scale,
  Briefcase,
  DollarSign,
  Compass,
  Palette,
  BookOpen,
  Sparkles
};

const COLOR_MAP = {
  indigo: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  blue: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  rose: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  amber: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  purple: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  violet: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  orange: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  pink: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
  yellow: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  teal: 'text-teal-400 border-teal-500/30 bg-teal-500/10'
};

const PRESET_ROLES = [
  // Engenharia & TI
  {
    id: 'architect',
    name: 'Lead Architect',
    category: 'engineering',
    description: 'Design de alto nível, modularidade e padrões de projeto',
    iconName: 'Layers',
    colorKey: 'indigo',
    systemPrompt: 'Você é o Arquiteto de Software Líder. Sua missão é analisar requisitos, definir arquitetura escalável e avaliar trade-offs técnicos com máxima clareza.'
  },
  {
    id: 'coder',
    name: 'Senior Dev',
    category: 'engineering',
    description: 'Implementação de código robusto, limpo e performático',
    iconName: 'Code',
    colorKey: 'emerald',
    systemPrompt: 'Você é um Engenheiro de Software Sênior. Produza código modular, sem bugs, bem documentado e pronto para produção.'
  },
  {
    id: 'reviewer',
    name: 'Code Reviewer',
    category: 'engineering',
    description: 'Revisão de qualidade, boas práticas, segurança e edge cases',
    iconName: 'FileCheck',
    colorKey: 'blue',
    systemPrompt: 'Você é o Revisor de Código Principal. Aponte gargalos de performance, falhas sutis, edge cases e melhorias de legibilidade.'
  },
  {
    id: 'security',
    name: 'Security Auditor',
    category: 'engineering',
    description: 'Auditoria de segurança, vulnerabilidades OWASP e blindagem',
    iconName: 'Shield',
    colorKey: 'rose',
    systemPrompt: 'Você é um Auditor de Segurança e OWASP. Identifique riscos de injeção, vazamento de dados, falhas de autenticação e recomende defesas.'
  },
  {
    id: 'tester',
    name: 'QA & Tester',
    category: 'engineering',
    description: 'Casos de teste unitários/integração e cobertura',
    iconName: 'CheckCircle2',
    colorKey: 'amber',
    systemPrompt: 'Você é um Especialista em QA & Testes. Projete planos de teste completos, cenários de borda e testes automatizados.'
  },
  {
    id: 'devops',
    name: 'DevOps & SRE',
    category: 'engineering',
    description: 'Infraestrutura cloud, CI/CD, Docker, Kubernetes e observabilidade',
    iconName: 'Cpu',
    colorKey: 'cyan',
    systemPrompt: 'Você é o Engenheiro de DevOps e SRE. Estruture pipelines de CI/CD, esteiras de deploy, automação de contêineres e resiliência de infra.'
  },
  {
    id: 'data_scientist',
    name: 'Data Scientist & AI',
    category: 'engineering',
    description: 'Análise de dados, modelagem preditiva, ML e estatística',
    iconName: 'TrendingUp',
    colorKey: 'purple',
    systemPrompt: 'Você é um Cientista de Dados e Especialista em IA. Analise pipelines de dados, sugira algoritmos de ML e métricas analíticas acionáveis.'
  },

  // Marketing & Conteúdo
  {
    id: 'marketing_editor',
    name: 'Editor de Marketing',
    category: 'marketing',
    description: 'Estratégia de marketing digital, branding, funil de conversão e campanhas',
    iconName: 'Megaphone',
    colorKey: 'violet',
    systemPrompt: 'Você é o Editor-Chefe e Estrategista de Marketing. Desenvolva planos de atração, posicionamento de marca, funis de vendas, aquisição de leads e métricas de conversão.'
  },
  {
    id: 'copywriter',
    name: 'Copywriter Persuasivo',
    category: 'marketing',
    description: 'Copywriting de alta conversão, storytelling, headlines de impacto e CTAs',
    iconName: 'PenTool',
    colorKey: 'orange',
    systemPrompt: 'Você é um Copywriter de alta performance. Crie narrativas persuasivas, ganchos magnéticos, chamadas para ação (CTAs) irresistíveis e gatilhos mentais éticos.'
  },
  {
    id: 'seo_specialist',
    name: 'Especialista em SEO',
    category: 'marketing',
    description: 'Otimização de palavras-chave, arquitetura de conteúdo e tráfego orgânico',
    iconName: 'Search',
    colorKey: 'emerald',
    systemPrompt: 'Você é o Especialista em SEO e Tráfego Orgânico. Mapeie palavras-chave de alto valor, intenção de busca, SEO técnico on-page/off-page e link building.'
  },
  {
    id: 'social_media',
    name: 'Social Media & Viral',
    category: 'marketing',
    description: 'Estratégias de conteúdo viral, calendário editorial e engajamento',
    iconName: 'Share2',
    colorKey: 'pink',
    systemPrompt: 'Você é o Estrategista de Redes Sociais. Crie calendários editoriais envolventes, ganchos visuais para posts, formatos virais e crescimento de comunidade.'
  },

  // Jurídico & Negócios
  {
    id: 'lawyer',
    name: 'Advogado & Jurídico',
    category: 'business_legal',
    description: 'Conformidade legal, análise de riscos, termos de serviço e LGPD/GDPR',
    iconName: 'Scale',
    colorKey: 'yellow',
    systemPrompt: 'Você é um Consultor Jurídico e Advogado Sênior. Analise conformidade regulatória, contratos, riscos legais, termos de uso e privacidade (LGPD/GDPR).'
  },
  {
    id: 'finance',
    name: 'Especialista Financeiro / CFO',
    category: 'business_legal',
    description: 'Modelagem financeira, projeção de custos, ROI, precificação e valuation',
    iconName: 'DollarSign',
    colorKey: 'emerald',
    systemPrompt: 'Você é o Diretor Financeiro (CFO) e Especialista em Finanças. Avalie viabilidade econômica, projeções de receita, fluxo de caixa, precificação e ROI.'
  },
  {
    id: 'product_manager',
    name: 'Product Manager (PM)',
    category: 'business_legal',
    description: 'Visão de produto, priorização RICE, descoberta de produto e roadmap',
    iconName: 'Compass',
    colorKey: 'blue',
    systemPrompt: 'Você é o Principal Product Manager. Alinhe necessidades dos usuários aos objetivos do negócio, priorize funcionalidades por impacto e trace o roadmap.'
  },
  {
    id: 'ux_designer',
    name: 'UX / UI Designer',
    category: 'business_legal',
    description: 'Experiência do usuário, jornadas, usabilidade e design intuitivo',
    iconName: 'Palette',
    colorKey: 'purple',
    systemPrompt: 'Você é o Lead UX/UI Designer. Projete jornadas intuitivas, elimine fricções de usabilidade e estruture interfaces acessíveis e elegantes.'
  },
  {
    id: 'researcher',
    name: 'Pesquisador Científico',
    category: 'business_legal',
    description: 'Investigação aprofundada, síntese de literatura e embasamento crítico',
    iconName: 'BookOpen',
    colorKey: 'teal',
    systemPrompt: 'Você é um Pesquisador Científico e Analista Acadêmico. Conduza investigações aprofundadas, verifique evidências e fundamente conclusões.'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'marketing', label: 'Marketing & Conteúdo' },
  { id: 'business_legal', label: 'Jurídico & Negócios' },
  { id: 'engineering', label: 'Engenharia & TI' },
  { id: 'custom', label: 'Personalizados' }
];

export function SwarmTeamModal({
  isOpen,
  onClose,
  currentModel,
  onSendToChat
}) {
  const { t } = useLanguage();
  const { openCanvas, createNewDocument } = useCanvas();

  const [prompt, setPrompt] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(['architect', 'coder', 'reviewer']);
  const [mode, setMode] = useState('parallel'); // parallel, pipeline, debate
  const [isRunning, setIsRunning] = useState(false);
  const [currentSwarmId, setCurrentSwarmId] = useState(null);

  const [agentProgress, setAgentProgress] = useState({});
  const [synthesis, setSynthesis] = useState('');
  const [copiedSynthesis, setCopiedSynthesis] = useState(false);
  const [activeTab, setActiveTab] = useState('synthesis');

  // Categories and search
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom roles state
  const [customRoles, setCustomRoles] = useState(() => {
    try {
      const saved = localStorage.getItem('neochat_swarm_custom_roles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Editor modal state for creating/editing specialist
  const [editingRole, setEditingRole] = useState(null); // null or role object
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [formCategory, setFormCategory] = useState('marketing');
  const [formIcon, setFormIcon] = useState('Sparkles');
  const [formColor, setFormColor] = useState('indigo');

  const abortListenerRef = useRef(null);

  // Save custom roles to localStorage
  const saveCustomRoles = (rolesToSave) => {
    setCustomRoles(rolesToSave);
    try {
      localStorage.setItem('neochat_swarm_custom_roles', JSON.stringify(rolesToSave));
    } catch (e) {
      console.error('Failed to save custom roles to localStorage', e);
    }
  };

  // Combine presets and custom roles
  const allRoles = useMemo(() => {
    return [
      ...PRESET_ROLES,
      ...customRoles.map(cr => ({
        ...cr,
        isCustom: true
      }))
    ];
  }, [customRoles]);

  // Filtered roles based on category and search
  const filteredRoles = useMemo(() => {
    return allRoles.filter(role => {
      // Category filter
      if (activeCategory === 'custom' && !role.isCustom) return false;
      if (activeCategory !== 'all' && activeCategory !== 'custom' && role.category !== activeCategory) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          role.name.toLowerCase().includes(q) ||
          role.description.toLowerCase().includes(q) ||
          (role.systemPrompt && role.systemPrompt.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allRoles, activeCategory, searchQuery]);

  // Setup swarm event listeners
  useEffect(() => {
    if (window.electron?.agent?.swarm?.onEvent) {
      abortListenerRef.current = window.electron.agent.swarm.onEvent((data) => {
        const { event, role, chunk, output, error, synthesis: masterSynth } = data;

        if (event === 'swarm:agent_started') {
          setAgentProgress(prev => ({
            ...prev,
            [role]: { ...(prev[role] || {}), status: 'running', output: prev[role]?.output || '' }
          }));
        } else if (event === 'swarm:agent_chunk') {
          setAgentProgress(prev => ({
            ...prev,
            [role]: {
              ...(prev[role] || {}),
              status: 'running',
              output: (prev[role]?.output || '') + chunk
            }
          }));
        } else if (event === 'swarm:agent_completed') {
          setAgentProgress(prev => ({
            ...prev,
            [role]: { ...(prev[role] || {}), status: 'completed', output: output || prev[role]?.output || '' }
          }));
        } else if (event === 'swarm:synthesis_chunk') {
          setSynthesis(prev => prev + (chunk || ''));
        } else if (event === 'swarm:completed') {
          setIsRunning(false);
          if (masterSynth) setSynthesis(masterSynth);
        } else if (event === 'swarm:cancelled' || event === 'swarm:error') {
          setIsRunning(false);
        }
      });
    }

    return () => {
      if (abortListenerRef.current) abortListenerRef.current();
    };
  }, []);

  const toggleRole = (roleId) => {
    if (isRunning) return;
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? (prev.length > 1 ? prev.filter(r => r !== roleId) : prev)
        : [...prev, roleId]
    );
  };

  const handleSelectAllFiltered = () => {
    if (isRunning) return;
    const filteredIds = filteredRoles.map(r => r.id);
    setSelectedRoles(prev => {
      const combined = Array.from(new Set([...prev, ...filteredIds]));
      return combined;
    });
  };

  const handleClearSelection = () => {
    if (isRunning) return;
    // Keep at least the first role in presets to avoid empty array
    setSelectedRoles([PRESET_ROLES[0].id]);
  };

  const handleOpenCreateModal = (presetToDuplicate = null) => {
    if (presetToDuplicate) {
      setEditingRole(null);
      setFormName(`${presetToDuplicate.name} (Cópia)`);
      setFormDescription(presetToDuplicate.description);
      setFormSystemPrompt(presetToDuplicate.systemPrompt || '');
      setFormCategory(presetToDuplicate.category || 'marketing');
      setFormIcon(presetToDuplicate.iconName || 'Sparkles');
      setFormColor(presetToDuplicate.colorKey || 'indigo');
    } else {
      setEditingRole(null);
      setFormName('');
      setFormDescription('');
      setFormSystemPrompt('');
      setFormCategory(activeCategory !== 'all' && activeCategory !== 'custom' ? activeCategory : 'marketing');
      setFormIcon('Sparkles');
      setFormColor('indigo');
    }
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (role, e) => {
    e?.stopPropagation();
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description);
    setFormSystemPrompt(role.systemPrompt || '');
    setFormCategory(role.category || 'marketing');
    setFormIcon(role.iconName || 'Sparkles');
    setFormColor(role.colorKey || 'indigo');
    setIsEditorOpen(true);
  };

  const handleDeleteCustomRole = (roleId, e) => {
    e?.stopPropagation();
    const updated = customRoles.filter(r => r.id !== roleId);
    saveCustomRoles(updated);
    setSelectedRoles(prev => prev.filter(id => id !== roleId));
  };

  const handleSaveCustomRole = (e) => {
    e?.preventDefault();
    if (!formName.trim()) return;

    if (editingRole) {
      // Update existing
      const updated = customRoles.map(r => {
        if (r.id === editingRole.id) {
          return {
            ...r,
            name: formName.trim(),
            description: formDescription.trim(),
            systemPrompt: formSystemPrompt.trim(),
            category: formCategory,
            iconName: formIcon,
            colorKey: formColor
          };
        }
        return r;
      });
      saveCustomRoles(updated);
    } else {
      // Create new
      const newId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newRole = {
        id: newId,
        name: formName.trim(),
        description: formDescription.trim() || 'Especialista personalizado',
        systemPrompt: formSystemPrompt.trim() || `Você é um especialista em ${formName.trim()}.`,
        category: formCategory,
        iconName: formIcon,
        colorKey: formColor,
        isCustom: true
      };
      const updated = [...customRoles, newRole];
      saveCustomRoles(updated);
      setSelectedRoles(prev => [...prev, newId]);
    }

    setIsEditorOpen(false);
  };

  const handleRunSwarm = async () => {
    if (!prompt.trim() || selectedRoles.length === 0 || isRunning) return;

    const swarmId = `swarm_${Date.now()}`;
    setCurrentSwarmId(swarmId);
    setIsRunning(true);
    setSynthesis('');
    setActiveTab('synthesis');

    // Initialize progress map
    const initialProgress = {};
    selectedRoles.forEach(r => {
      initialProgress[r] = { status: 'pending', output: '' };
    });
    setAgentProgress(initialProgress);

    // Prepare custom roles array with prompts to pass to backend
    const fullCustomRolesPayload = allRoles
      .filter(r => selectedRoles.includes(r.id))
      .map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        systemPrompt: r.systemPrompt
      }));

    try {
      if (window.electron?.agent?.swarm?.run) {
        await window.electron.agent.swarm.run({
          swarmId,
          prompt,
          roles: selectedRoles,
          customRoles: fullCustomRolesPayload,
          mode,
          model: currentModel
        });
      } else {
        // Fallback simulation for testing without electron
        setTimeout(() => {
          setIsRunning(false);
          setSynthesis(`[Simulação Multi-Agente Swarm]\n\nPlano consolidado com sucesso com a contribuição de ${selectedRoles.length} especialistas.`);
        }, 1500);
      }
    } catch (err) {
      console.error('Swarm run error:', err);
      setIsRunning(false);
    }
  };

  const handleCancelSwarm = async () => {
    if (currentSwarmId && window.electron?.agent?.swarm?.cancel) {
      await window.electron.agent.swarm.cancel(currentSwarmId);
    }
    setIsRunning(false);
  };

  const handleCopySynthesis = () => {
    if (!synthesis) return;
    navigator.clipboard.writeText(synthesis);
    setCopiedSynthesis(true);
    setTimeout(() => setCopiedSynthesis(false), 2000);
  };

  const handleOpenInCanvas = () => {
    if (!synthesis) return;
    createNewDocument?.({
      title: `Swarm Synthesis - ${prompt.slice(0, 30)}...`,
      content: synthesis,
      language: 'markdown'
    });
    openCanvas?.();
    onClose();
  };

  const handleSendToChatView = () => {
    if (!synthesis) return;
    onSendToChat?.(synthesis);
    onClose();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Multi-Agent Swarm Team
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Neo Runtime
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Orquestre subagentes especialistas de Marketing, Jurídico, Engenharia e crie seus próprios agentes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              title="Criar novo especialista sob medida"
            >
              <Plus className="w-3.5 h-3.5" /> Criar Especialista
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 px-6 space-y-5">
          {/* Objective input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <span>Objetivo / Tarefa para a Equipe</span>
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">Ctrl+Enter para iniciar</span>
            </div>
            <textarea
              className="w-full h-24 p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none font-sans"
              placeholder="Ex: Lançar um novo aplicativo SaaS: Desenvolver a estratégia de marketing de lançamento, analisar riscos jurídicos de termos e LGPD, planejar a arquitetura técnica e estimar o ROI..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isRunning) {
                  e.preventDefault();
                  handleRunSwarm();
                }
              }}
              disabled={isRunning}
            />
          </div>

          {/* Orchestration Mode & Role Selection Header */}
          <div className="space-y-4">
            {/* Mode selection row */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Modo de Orquestração
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: 'parallel', label: 'Paralelo + Síntese', desc: 'Todos analisam simultaneamente e sintetizam' },
                  { id: 'pipeline', label: 'Pipeline Sequencial', desc: 'Passagem em cadeia cumulativa de contexto' },
                  { id: 'debate', label: 'Debate Multi-Round', desc: 'Crítica cruzada entre especialistas e consenso' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    disabled={isRunning}
                    className={cn(
                      'text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-center',
                      mode === m.id
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-zinc-100 shadow-sm ring-1 ring-indigo-500/20'
                        : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    )}
                  >
                    <div className="font-semibold text-zinc-200">{m.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Specialist selection area */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Especialistas da Equipe
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {selectedRoles.length} selecionados
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllFiltered}
                    disabled={isRunning}
                    className="text-[11px] text-zinc-400 hover:text-indigo-300 px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
                  >
                    Selecionar Filtrados
                  </button>
                  <button
                    onClick={handleClearSelection}
                    disabled={isRunning}
                    className="text-[11px] text-zinc-400 hover:text-rose-300 px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {CATEGORIES.map(cat => {
                    const count = cat.id === 'all'
                      ? allRoles.length
                      : cat.id === 'custom'
                        ? customRoles.length
                        : allRoles.filter(r => r.category === cat.id).length;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                          activeCategory === cat.id
                            ? 'bg-zinc-800 text-indigo-300 border border-indigo-500/40 shadow-sm'
                            : 'bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60'
                        )}
                      >
                        <span>{cat.label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-900/80 text-zinc-400">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar especialista..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/40"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Specialists Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredRoles.map(role => {
                  const Icon = ICON_MAP[role.iconName] || Sparkles;
                  const colorClass = COLOR_MAP[role.colorKey] || COLOR_MAP.indigo;
                  const isSelected = selectedRoles.includes(role.id);

                  return (
                    <div
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={cn(
                        'group relative flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer select-none text-xs',
                        isSelected
                          ? 'bg-zinc-800/90 border-indigo-500/40 text-zinc-100 shadow-sm'
                          : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700/80'
                      )}
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 transition-transform group-hover:scale-105',
                          isSelected ? colorClass : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-zinc-200 flex items-center justify-between gap-1">
                          <span className="truncate">{role.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                          {role.description}
                        </div>
                      </div>

                      {/* Action buttons on card hover */}
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity bg-zinc-900/90 rounded-md p-0.5 border border-zinc-700/60">
                        {role.isCustom ? (
                          <>
                            <button
                              onClick={(e) => handleOpenEditModal(role, e)}
                              className="p-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100"
                              title="Editar especialista"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteCustomRole(role.id, e)}
                              className="p-1 rounded hover:bg-rose-900/50 text-rose-400 hover:text-rose-200"
                              title="Excluir especialista"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCreateModal(role);
                            }}
                            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                            title="Duplicar e personalizar este especialista"
                          >
                            <CopyPlus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Card to create new specialist */}
                <div
                  onClick={() => handleOpenCreateModal()}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-zinc-700/80 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-zinc-400 hover:text-indigo-300 transition-all cursor-pointer text-xs min-h-[64px]"
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">+ Criar Especialista</span>
                </div>
              </div>
            </div>
          </div>

          {/* Execution Output & Progress */}
          {(isRunning || synthesis || Object.keys(agentProgress).length > 0) && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none max-w-[70%]">
                  <button
                    onClick={() => setActiveTab('synthesis')}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0',
                      activeTab === 'synthesis'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Síntese Master
                  </button>
                  {selectedRoles.map(roleId => {
                    const info = allRoles.find(r => r.id === roleId);
                    const prog = agentProgress[roleId];
                    return (
                      <button
                        key={roleId}
                        onClick={() => setActiveTab(roleId)}
                        className={cn(
                          'px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0',
                          activeTab === roleId
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                            : 'text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        {info?.name || roleId}
                        {prog?.status === 'running' && (
                          <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                        )}
                        {prog?.status === 'completed' && (
                          <Check className="w-3 h-3 text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {synthesis && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopySynthesis}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1.5 border border-zinc-700 transition-colors"
                    >
                      {copiedSynthesis ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedSynthesis ? 'Copiado' : 'Copiar'}
                    </button>
                    <button
                      onClick={handleOpenInCanvas}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1.5 border border-zinc-700 transition-colors"
                      title="Abrir síntese no Canvas para edição"
                    >
                      <ExternalLink className="w-3 h-3" /> Canvas
                    </button>
                    <button
                      onClick={handleSendToChatView}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs flex items-center gap-1.5 border border-indigo-500/30 transition-colors"
                      title="Enviar síntese para a conversa do chat"
                    >
                      Enviar ao Chat
                    </button>
                  </div>
                )}
              </div>

              {/* Display Active Tab Output */}
              <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl max-h-72 overflow-y-auto font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {activeTab === 'synthesis' ? (
                  synthesis ? (
                    synthesis
                  ) : isRunning ? (
                    <span className="text-indigo-400 animate-pulse flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Especialistas executando... aguardando síntese master...
                    </span>
                  ) : (
                    <span className="text-zinc-500">Nenhuma síntese gerada ainda.</span>
                  )
                ) : (
                  agentProgress[activeTab]?.output || (
                    <span className="text-zinc-500">Aguardando contribuição do especialista...</span>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-500">
            {isRunning ? (
              <span className="text-indigo-400 animate-pulse flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Swarm em execução ativa ({selectedRoles.length} especialistas)...
              </span>
            ) : (
              `${selectedRoles.length} especialistas prontos para trabalhar`
            )}
          </div>

          <div className="flex items-center gap-3">
            {isRunning ? (
              <button
                onClick={handleCancelSwarm}
                className="px-4 py-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Cancelar
              </button>
            ) : (
              <button
                onClick={handleRunSwarm}
                disabled={!prompt.trim() || selectedRoles.length === 0}
                className={cn(
                  'px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 transition-all',
                  !prompt.trim() || selectedRoles.length === 0
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                )}
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Iniciar Equipe Swarm
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Specialist Creator / Editor Modal */}
      {isEditorOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setIsEditorOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                {editingRole ? 'Editar Especialista' : 'Criar Novo Especialista'}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomRole} className="space-y-3.5 text-xs">
              {/* Name */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Nome do Especialista *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Consultor Tributário / Estrategista de Vendas B2B / Redator Médico"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Descrição Curta</label>
                <input
                  type="text"
                  placeholder="Ex: Otimização fiscal, tributação corporativa e planejamento"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 text-xs"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Categoria</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-indigo-500/50 text-xs"
                >
                  <option value="marketing">Marketing & Conteúdo</option>
                  <option value="business_legal">Jurídico & Negócios</option>
                  <option value="engineering">Engenharia & TI</option>
                  <option value="other">Outros / Geral</option>
                </select>
              </div>

              {/* System Prompt / Instructions */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Instruções / Prompt do Especialista</label>
                <textarea
                  rows={3}
                  placeholder="Você é um especialista em planejamento tributário e legislação fiscal. Analise a estrutura do negócio, aponte regimes tributários ideais e minimize riscos de passivo fiscal..."
                  value={formSystemPrompt}
                  onChange={e => setFormSystemPrompt(e.target.value)}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none text-xs leading-relaxed"
                />
              </div>

              {/* Icon & Color Selection */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Ícone</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-950 border border-zinc-800 rounded-xl max-h-24 overflow-y-auto">
                    {Object.keys(ICON_MAP).map(iconKey => {
                      const IconComp = ICON_MAP[iconKey];
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setFormIcon(iconKey)}
                          className={cn(
                            'p-1.5 rounded-lg border transition-all',
                            formIcon === iconKey
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                              : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                          )}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Cor do Tema</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-950 border border-zinc-800 rounded-xl max-h-24 overflow-y-auto">
                    {Object.keys(COLOR_MAP).map(colorKey => (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setFormColor(colorKey)}
                        className={cn(
                          'w-6 h-6 rounded-lg border transition-all flex items-center justify-center text-[10px]',
                          COLOR_MAP[colorKey],
                          formColor === colorKey ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-zinc-900' : ''
                        )}
                      >
                        {formColor === colorKey && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  Salvar Especialista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

export default SwarmTeamModal;


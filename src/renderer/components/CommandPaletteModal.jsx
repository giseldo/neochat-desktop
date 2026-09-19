import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Settings,
  Bot,
  Sparkles,
  Terminal,
  FolderKanban,
  BookOpen,
  Scale,
  Columns2,
  Globe,
  Clock,
  Plus,
  Trash2,
  GitBranch,
  Edit3,
  Download,
  Users,
  Wand2,
  Mic,
  Camera,
  Layers,
  FileCode,
  Check,
  Command,
  ArrowRight,
  X,
  BotOff,
  Swords,
  Blocks,
  Zap,
  Sun,
  Store,
  Compass,
  LayoutGrid,
  MessageSquare,
  FolderTree,
  ExternalLink,
  Activity,
  Brain,
  SlidersHorizontal
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useChat } from '../context/ChatContext';
import { useCanvas } from '../context/CanvasContext';
import { useProjects } from '../context/ProjectContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export const KeyBadge = ({ children, className }) => (
  <kbd
    className={cn(
      'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 py-0.5',
      'text-[10px] font-mono font-semibold rounded-md',
      'bg-muted/80 text-foreground border border-border shadow-2xs select-none whitespace-nowrap',
      className
    )}
  >
    {children}
  </kbd>
);

const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export function CommandPaletteModal({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenKnowledgeBase,
  onOpenWorkflows,
  onOpenProjects,
  onOpenMcpCatalog,
  onOpenUserMemory,
  onOpenShortcuts,
  onOpenModelParameters,
  onToggleCompareMode,
  onToggleTrajectory,
  onToggleTerminal,
  onToggleExplorer,
  onOpenInOsExplorer,
  onToggleBackgroundTasks,
  onToggleBrowser,
  onOpenSwarmModal,
  onOpenPluginsManager,
  onOpenSkills,
  onOpenArenaModal,
  onOpenLiveSandbox,
  onOpenPodcastStudio,
  onOpenKnowledgeGraph,
  onOpenDailyBriefing,
  onOpenMcpHub,
  onOpenComputerVision,
  onTriggerSnip,
  onTriggerVoice,
  availableModels = [],
  currentModel,
  onSelectModel,
  personas = [],
  activePersona,
  onSelectPersona,
  onClearChat,
  onNewChat,
  onExportChat
}) {
  const { t } = useLanguage();
  const { currentChatId, chatList, createNewChat, loadChat } = useChat();
  const { openCanvas, createNewDocument } = useCanvas();
  const { projects } = useProjects();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, nav, actions, models, personas, chats
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const isMac = useMemo(() => {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform);
  }, []);

  const modKey = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setCategoryFilter('all');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build the list of all command items
  const allItems = useMemo(() => {
    const items = [];

    // --- Category: Navigation & Views ---
    items.push(
      {
        id: 'nav_memory',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Memória Persistente & Perfil (User Memory)',
        subtitle: 'Gerenciar preferências do usuário, fatos e regras lembradas pela IA',
        icon: Brain,
        keywords: ['memoria', 'memória', 'memory', 'lembrancas', 'lembranças', 'fatos', 'preferencias', 'preferências', 'perfil', 'regras', 'aprendizado', 'long-term', 'persistente', 'personalizacao', 'personalização'],
        action: () => { onClose(); onOpenUserMemory?.(); }
      },
      {
        id: 'nav_shortcuts',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Atalhos de Teclado (Shortcuts)',
        subtitle: 'Ver mapa completo de comandos rápidos e teclas de atalho globais',
        icon: Command,
        shortcut: `${modKey}+/`,
        keywords: ['atalhos', 'shortcuts', 'teclado', 'keyboard', 'hotkeys', 'comandos', 'ajuda', 'teclas'],
        action: () => { onClose(); onOpenShortcuts?.(); }
      },
      {
        id: 'nav_model_params',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Parâmetros de Inferência do Modelo',
        subtitle: 'Ajustar Temperature, Top-P, Janela de Contexto e Max Tokens',
        icon: SlidersHorizontal,
        keywords: ['parametros', 'parâmetros', 'temperatura', 'temperature', 'top-p', 'tokens', 'hiperparametros', 'configuracao modelo'],
        action: () => { onClose(); onOpenModelParameters?.(); }
      },
      {
        id: 'nav_plugins',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Módulos & Extensões (Plugins Hub)',
        subtitle: 'Ativar/desativar módulos com zero overhead em repouso',
        icon: Blocks,
        keywords: ['plugins', 'modulos', 'módulos', 'extensoes', 'extensões', 'hub', 'addons'],
        action: () => { onClose(); onOpenPluginsManager?.(); }
      },
      {
        id: 'nav_arena',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'AI Arena & Debate Multi-Modelos',
        subtitle: 'Debate em rodadas entre modelos e votação por consenso',
        icon: Swords,
        keywords: ['arena', 'debate', 'batalha', 'comparação', 'comparar', 'votação', 'modelos'],
        action: () => { onClose(); onOpenArenaModal?.(); }
      },
      {
        id: 'nav_sandbox',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Web Sandbox & Live Dev Preview',
        subtitle: 'Preview interativo de HTML, Tailwind, React e JS com console',
        icon: FileCode,
        keywords: ['sandbox', 'preview', 'html', 'tailwind', 'react', 'js', 'live dev', 'codigo', 'executar'],
        action: () => { onClose(); onOpenLiveSandbox?.(); }
      },
      {
        id: 'nav_podcast',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Podcast & Audio Studio',
        subtitle: 'Gerar conversa de 2 apresentadores via TTS (NotebookLM style)',
        icon: Mic,
        keywords: ['podcast', 'audio', 'áudio', 'voz', 'tts', 'notebooklm', 'apresentadores', 'estudio'],
        action: () => { onClose(); onOpenPodcastStudio?.(); }
      },
      {
        id: 'nav_graph',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Knowledge Graph & Data Studio',
        subtitle: 'Visualizador 2D do RAG e gráficos dinâmicos para tabelas',
        icon: Layers,
        keywords: ['graph', 'grafo', 'conhecimento', 'data studio', 'rag', 'visualizador', '2d', 'graficos'],
        action: () => { onClose(); onOpenKnowledgeGraph?.(); }
      },
      {
        id: 'nav_briefing',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Proactive Daily Briefing',
        subtitle: 'Painel matinal inteligente com agenda, commits e áudio',
        icon: Sun,
        keywords: ['briefing', 'matinal', 'resumo', 'agenda', 'commits', 'noticias', 'notícias'],
        action: () => { onClose(); onOpenDailyBriefing?.(); }
      },
      {
        id: 'nav_mcp_hub',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Community MCP Hub & Store',
        subtitle: 'Instalação 1-click de servidores MCP e receitas prontas',
        icon: Store,
        keywords: ['mcp hub', 'store', 'loja', 'comunidade', 'servidores', 'receitas', 'tools'],
        action: () => { onClose(); onOpenMcpHub?.(); }
      },
      {
        id: 'nav_vision',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Computer Vision & Desktop Assistant',
        subtitle: 'Inspeção de tela, OCR e automação visual guiada',
        icon: Camera,
        keywords: ['vision', 'visão', 'visao', 'ocr', 'tela', 'camera', 'câmera', 'captura', 'desktop', 'screen'],
        action: () => { onClose(); onOpenComputerVision?.(); }
      },
      {
        id: 'nav_settings',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Abrir Configurações (Settings)',
        subtitle: 'Provedores, chaves de API, interface, observabilidade, memória',
        icon: Settings,
        shortcut: `${modKey}+,`,
        keywords: ['configurações', 'configuracoes', 'settings', 'provedores', 'api keys', 'chaves', 'interface', 'opções', 'ajustes', 'memoria', 'memória', 'preferencias'],
        action: () => { onClose(); onOpenSettings?.(); }
      },
      {
        id: 'nav_canvas',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Abrir Canvas / Artifacts Panel',
        subtitle: 'Editor de código, diff e sandbox interativo',
        icon: Columns2,
        shortcut: `${modKey}+Shift+C`,
        keywords: ['canvas', 'artifacts', 'artefatos', 'editor', 'diff', 'sandbox', 'painel', 'codigo'],
        action: () => { onClose(); openCanvas?.(); }
      },
      {
        id: 'nav_terminal',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Abrir Terminal Integrado',
        subtitle: 'Sessão interativa de terminal shell multi-abas',
        icon: Terminal,
        shortcut: `${modKey}+\``,
        keywords: ['terminal', 'shell', 'bash', 'powershell', 'cmd', 'console', 'linha de comando'],
        action: () => { onClose(); onToggleTerminal?.(); }
      },
      {
        id: 'nav_explorer',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Explorador de Arquivos (Workspace Tree)',
        subtitle: 'Visualizar pastas, arquivos e navegar pelo código do projeto',
        icon: FolderTree,
        shortcut: `${modKey}+Shift+E`,
        keywords: ['explorer', 'arquivos', 'pastas', 'workspace', 'tree', 'codigo', 'navegar', 'files'],
        action: () => { onClose(); onToggleExplorer?.(); }
      },
      {
        id: 'nav_os_explorer',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Abrir no Explorador de Arquivos do Sistema',
        subtitle: 'Abre a pasta do workspace atual no Windows Explorer / Finder',
        icon: ExternalLink,
        keywords: ['abrir pasta', 'explorer', 'windows explorer', 'finder', 'sistema', 'pasta do projeto'],
        action: () => { onClose(); onOpenInOsExplorer?.(); }
      },
      {
        id: 'nav_swarm',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Multi-Agent Swarm (Equipe de Agentes)',
        subtitle: 'Orquestração de subagentes concorrentes e síntese',
        icon: Users,
        keywords: ['swarm', 'multi-agent', 'equipe', 'agentes', 'subagentes', 'orquestracao', 'orquestração'],
        action: () => { onClose(); onOpenSwarmModal?.(); }
      },
      {
        id: 'nav_kb',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Base de Conhecimento (RAG Local)',
        subtitle: 'Indexar pastas, PDFs, código e documentos',
        icon: BookOpen,
        keywords: ['base de conhecimento', 'rag', 'conhecimento', 'pdf', 'documentos', 'indexar', 'arquivos', 'knowledge base'],
        action: () => { onClose(); onOpenKnowledgeBase?.(); }
      },
      {
        id: 'nav_skills',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Hub de Skills & Habilidades de IA',
        subtitle: 'Catálogo de skills, criação, importação de SKILL.md e regras',
        icon: Sparkles,
        keywords: ['skills', 'habilidades', 'ferramentas', 'skill.md', 'regras', 'comandos de barra'],
        action: () => { onClose(); onOpenSkills?.(); }
      },
      {
        id: 'nav_skills_create',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Criar Nova Skill Personalizada',
        subtitle: 'Definir novo comando de barra e instruções especializadas',
        icon: Plus,
        keywords: ['criar skill', 'nova skill', 'comando barra', 'personalizada', 'instrucoes'],
        action: () => { onClose(); onOpenSkills?.('create'); }
      },
      {
        id: 'nav_workflows',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Workflows & Automações',
        subtitle: 'Criar e executar fluxos em sequência e webhooks',
        icon: Wand2,
        keywords: ['workflows', 'fluxos', 'automações', 'automacoes', 'sequencia', 'webhooks', 'pipeline'],
        action: () => { onClose(); onOpenWorkflows?.(); }
      },
      {
        id: 'nav_projects',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Gerenciador de Projetos',
        subtitle: 'Organizar conversas e pastas de trabalho',
        icon: FolderKanban,
        keywords: ['projetos', 'projects', 'pastas', 'gerenciador de projetos', 'workspace'],
        action: () => { onClose(); onOpenProjects?.(); }
      },
      {
        id: 'nav_mcp',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Catálogo de Ferramentas MCP',
        subtitle: 'Servidores e ferramentas locais/remotas MCP',
        icon: Sparkles,
        keywords: ['mcp', 'catalogo', 'ferramentas', 'tools', 'servidores'],
        action: () => { onClose(); onOpenMcpCatalog?.(); }
      },
      {
        id: 'nav_compare',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Modo Comparação de Modelos (Side-by-Side)',
        subtitle: 'Comparar respostas entre 2 modelos simultâneos',
        icon: Scale,
        keywords: ['comparar', 'side-by-side', 'comparacao', 'comparação', 'dois modelos'],
        action: () => { onClose(); onToggleCompareMode?.(); }
      },
      {
        id: 'nav_trajectory',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Trajetória & Timeline de Execução',
        subtitle: 'Inspecionar turnos, chamadas de ferramentas e eventos detalhados',
        icon: Activity,
        shortcut: `${modKey}+T`,
        keywords: ['trajetoria', 'trajetória', 'timeline', 'execucao', 'execução', 'turnos', 'ferramentas', 'eventos'],
        action: () => { onClose(); onToggleTrajectory?.(); }
      },
      {
        id: 'nav_browser',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Browser & Web Research',
        subtitle: 'Pesquisa web e visualizador de páginas',
        icon: Globe,
        shortcut: `${modKey}+Shift+B`,
        keywords: ['browser', 'navegador', 'web', 'pesquisa', 'internet', 'site'],
        action: () => { onClose(); onToggleBrowser?.(); }
      },
      {
        id: 'nav_tasks',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Tarefas em Segundo Plano',
        subtitle: 'Monitorar comandos e agentes em background',
        icon: Clock,
        shortcut: `${modKey}+Shift+T`,
        keywords: ['tarefas', 'segundo plano', 'background', 'tasks', 'processos', 'monitorar'],
        action: () => { onClose(); onToggleBackgroundTasks?.(); }
      }
    );

    // --- Category: Chat Actions ---
    items.push(
      {
        id: 'action_new_chat',
        category: 'actions',
        categoryLabel: 'Ações',
        title: 'Criar Nova Conversa',
        subtitle: 'Iniciar uma conversa limpa',
        icon: Plus,
        shortcut: `${modKey}+N`,
        keywords: ['novo chat', 'nova conversa', 'limpar', 'iniciar', 'conversa'],
        action: () => { onClose(); (onNewChat || createNewChat)?.(); }
      },
      {
        id: 'action_new_canvas_doc',
        category: 'actions',
        categoryLabel: 'Ações',
        title: 'Criar Novo Documento no Canvas',
        subtitle: 'Abrir documento vazio no editor interativo',
        icon: FileCode,
        keywords: ['novo documento', 'canvas', 'novo arquivo', 'documento', 'editor'],
        action: () => { onClose(); createNewDocument?.(); openCanvas?.(); }
      },
      {
        id: 'action_clear_chat',
        category: 'actions',
        categoryLabel: 'Ações',
        title: 'Limpar Mensagens da Conversa Atual',
        subtitle: 'Resetar o histórico da conversa ativa',
        icon: Trash2,
        keywords: ['limpar mensagens', 'limpar conversa', 'resetar', 'apagar historico', 'apagar histórico'],
        action: () => { onClose(); onClearChat?.(); }
      },
      {
        id: 'action_export_chat',
        category: 'actions',
        categoryLabel: 'Ações',
        title: 'Exportar Conversa',
        subtitle: 'Salvar conversa como Markdown, HTML, JSON ou PDF',
        icon: Download,
        keywords: ['exportar', 'salvar', 'markdown', 'pdf', 'html', 'json', 'download'],
        action: () => { onClose(); onExportChat?.(); }
      },
      {
        id: 'action_snip',
        category: 'actions',
        categoryLabel: 'Ações',
        title: 'Capturar Tela (Snip & Ask)',
        subtitle: 'Enviar recorte visual para o modelo',
        icon: Camera,
        keywords: ['snip', 'captura de tela', 'print', 'screenshot', 'recorte', 'imagem', 'foto'],
        action: () => { onClose(); onTriggerSnip?.(); }
      },
      {
        id: 'action_voice',
        category: 'actions',
        categoryLabel: 'Ações',
        title: 'Ditado por Voz / Transcrição',
        subtitle: 'Falar diretamente com o chat',
        icon: Mic,
        shortcut: `${modKey}+Alt`,
        keywords: ['voz', 'ditado', 'falar', 'microfone', 'transcrição', 'transcricao', 'audio', 'áudio'],
        action: () => { onClose(); onTriggerVoice?.(); }
      }
    );

    // --- Category: Models ---
    if (availableModels?.length > 0) {
      availableModels.slice(0, 30).forEach(m => {
        const modelId = typeof m === 'string' ? m : (m.id || m.name);
        const modelName = typeof m === 'string' ? m : (m.name || m.id);
        const isSelected = currentModel === modelId;
        items.push({
          id: `model_${modelId}`,
          category: 'models',
          categoryLabel: 'Modelos',
          title: modelName,
          subtitle: isSelected ? 'Modelo atualmente em uso' : `Alternar para ${modelId}`,
          icon: Bot,
          active: isSelected,
          keywords: ['modelo', 'model', 'llm', 'ia', modelId, modelName],
          action: () => { onClose(); onSelectModel?.(modelId); }
        });
      });
    }

    // --- Category: Personas ---
    if (personas?.length > 0) {
      const isDeactivated = !activePersona || activePersona.id === 'none' || activePersona.id === 'disabled';

      if (!isDeactivated) {
        items.push({
          id: 'persona_deactivate',
          category: 'personas',
          categoryLabel: 'Personas',
          title: t('personas.deactivateCommand') || 'Desativar Persona Ativa',
          subtitle: `${t('personas.deactivateCommandDesc') || 'Desativar instruções especializadas'} (${activePersona.name || activePersona.id})`,
          icon: X,
          active: false,
          keywords: ['desativar persona', 'persona padrao', 'remover persona'],
          action: () => {
            onClose();
            onSelectPersona?.(null);
          }
        });
      }

      items.push({
        id: 'persona_disabled_state',
        category: 'personas',
        categoryLabel: 'Personas',
        title: t('personas.deactivated') || 'Desativado',
        subtitle: t('personas.deactivatedDesc') || 'Sem persona especializada ativa (conversação padrão)',
        icon: BotOff,
        active: isDeactivated,
        keywords: ['desativado', 'sem persona', 'conversacao padrao'],
        action: () => {
          onClose();
          onSelectPersona?.(null);
        }
      });

      personas.forEach(p => {
        const isSelected = !isDeactivated && activePersona?.id === p.id;
        items.push({
          id: `persona_${p.id}`,
          category: 'personas',
          categoryLabel: 'Personas',
          title: p.name,
          subtitle: isSelected
            ? `${p.description || ''} • (${t('personas.clickToDeactivate') || 'Clique para desativar'})`
            : (p.description || 'Persona de IA personalizada'),
          icon: Sparkles,
          active: isSelected,
          keywords: ['persona', 'personagem', 'especialista', p.name, p.description || ''],
          action: () => {
            onClose();
            if (isSelected) {
              onSelectPersona?.(null);
            } else {
              onSelectPersona?.(p);
            }
          }
        });
      });
    }

    // --- Category: Recent Chats ---
    if (chatList?.length > 0) {
      chatList.slice(0, 15).forEach(c => {
        const isCurrent = c.id === currentChatId;
        items.push({
          id: `chat_${c.id}`,
          category: 'chats',
          categoryLabel: 'Conversas',
          title: c.title || 'Conversa sem título',
          subtitle: new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleString(),
          icon: GitBranch,
          active: isCurrent,
          keywords: ['chat', 'conversa', 'historico', c.title || ''],
          action: () => { onClose(); loadChat?.(c.id); }
        });
      });
    }

    return items;
  }, [
    availableModels,
    currentModel,
    personas,
    activePersona,
    chatList,
    currentChatId,
    modKey,
    t,
    onClose,
    onOpenSettings,
    onOpenKnowledgeBase,
    onOpenWorkflows,
    onOpenProjects,
    onOpenMcpCatalog,
    onOpenUserMemory,
    onOpenShortcuts,
    onOpenModelParameters,
    onToggleCompareMode,
    onToggleTrajectory,
    onToggleTerminal,
    onToggleBackgroundTasks,
    onToggleBrowser,
    onOpenSwarmModal,
    onOpenPluginsManager,
    onOpenArenaModal,
    onOpenLiveSandbox,
    onOpenPodcastStudio,
    onOpenKnowledgeGraph,
    onOpenDailyBriefing,
    onOpenMcpHub,
    onOpenComputerVision,
    onTriggerSnip,
    onTriggerVoice,
    onSelectModel,
    onSelectPersona,
    onClearChat,
    onExportChat,
    createNewChat,
    loadChat,
    openCanvas,
    createNewDocument
  ]);

  // Categories list with icons and counts
  const categories = useMemo(() => [
    { id: 'all', label: 'Tudo', icon: LayoutGrid },
    { id: 'nav', label: 'Navegação', icon: Compass },
    { id: 'actions', label: 'Ações', icon: Zap },
    { id: 'models', label: 'Modelos', icon: Bot },
    { id: 'personas', label: 'Personas', icon: Sparkles },
    { id: 'chats', label: 'Conversas', icon: MessageSquare },
  ], []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: allItems.length };
    categories.forEach(cat => {
      if (cat.id !== 'all') {
        counts[cat.id] = allItems.filter(item => item.category === cat.id).length;
      }
    });
    return counts;
  }, [allItems, categories]);

  // Filter items by query and category
  const filteredItems = useMemo(() => {
    let result = allItems;
    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter);
    }
    const cleanQuery = normalizeText(query);
    if (cleanQuery) {
      const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
      result = result.filter(item => {
        const titleNorm = normalizeText(item.title);
        const subtitleNorm = normalizeText(item.subtitle);
        const catNorm = normalizeText(item.categoryLabel);
        const keywordsNorm = Array.isArray(item.keywords)
          ? item.keywords.map(normalizeText).join(' ')
          : normalizeText(item.keywords);
        const combined = `${titleNorm} ${subtitleNorm} ${catNorm} ${keywordsNorm}`;
        return queryWords.every(word => combined.includes(word));
      });
    }
    return result;
  }, [allItems, query, categoryFilter]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Keyboard navigation inside list
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-start justify-center pt-[10vh] sm:pt-[12vh] px-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[78vh] ring-1 ring-border/50 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="relative flex items-center w-full border-b border-border bg-muted/20">
          <Search className="w-5 h-5 text-muted-foreground shrink-0 ml-4 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm sm:text-base outline-none font-medium py-3.5 pr-2"
            placeholder={`Digite um comando, modelo, persona ou navegação... (${modKey}+Shift+P)`}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2 pr-4 shrink-0">
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
            <KeyBadge className="hidden sm:inline-flex text-[11px] h-6 px-2 text-muted-foreground">ESC fechar</KeyBadge>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-muted/30 border-b border-border overflow-x-auto scrollbar-none text-xs">
          {categories.map(tab => {
            const Icon = tab.icon;
            const count = categoryCounts[tab.id] || 0;
            const isActive = categoryFilter === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer border',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/80 border-border/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List of Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground flex flex-col items-center justify-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground">
                <Search className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhum resultado encontrado</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Não encontramos comandos para &ldquo;<span className="text-foreground font-medium">{query}</span>&rdquo; nesta categoria.
              </p>
              {(query || categoryFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setQuery(''); setCategoryFilter('all'); }}
                  className="mt-2 text-xs h-8 cursor-pointer"
                >
                  Limpar busca e filtros
                </Button>
              )}
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon || Command;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 border',
                    isSelected
                      ? 'bg-primary/10 text-foreground border-primary/30 shadow-2xs ring-1 ring-primary/20'
                      : 'text-foreground border-transparent hover:bg-muted/40 hover:border-border/40'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-150',
                        isSelected
                          ? 'bg-primary/15 text-primary border-primary/30 shadow-2xs scale-105'
                          : 'bg-muted/70 text-muted-foreground border-border/70 group-hover:bg-muted group-hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">{item.title}</span>
                        {item.active && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 py-0 px-1.5 flex items-center gap-1 font-medium">
                            <Check className="w-2.5 h-2.5" /> Ativo
                          </Badge>
                        )}
                        <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/60">
                          {item.categoryLabel}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 ml-2">
                    {item.shortcut && (
                      <KeyBadge className="text-[10px] font-mono">{item.shortcut}</KeyBadge>
                    )}
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center animate-in fade-in slide-in-from-left-1 duration-150">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 opacity-0 group-hover:opacity-60 transition-opacity flex items-center justify-center text-muted-foreground">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <KeyBadge>↑</KeyBadge>
              <KeyBadge>↓</KeyBadge>
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1.5">
              <KeyBadge>Enter</KeyBadge>
              <span>Executar</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <KeyBadge>Esc</KeyBadge>
              <span>Fechar</span>
            </span>
          </div>
          <Badge variant="secondary" className="text-[11px] font-normal px-2 py-0.5">
            {filteredItems.length} {filteredItems.length === 1 ? 'resultado' : 'resultados'}
          </Badge>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CommandPaletteModal;

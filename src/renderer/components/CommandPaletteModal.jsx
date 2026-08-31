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
  X
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useChat } from '../context/ChatContext';
import { useCanvas } from '../context/CanvasContext';
import { useProjects } from '../context/ProjectContext';
import { cn } from '../lib/utils';

export function CommandPaletteModal({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenKnowledgeBase,
  onOpenWorkflows,
  onOpenProjects,
  onOpenMcpCatalog,
  onToggleCompareMode,
  onToggleTerminal,
  onToggleBackgroundTasks,
  onToggleBrowser,
  onOpenSwarmModal,
  onTriggerSnip,
  onTriggerVoice,
  availableModels = [],
  currentModel,
  onSelectModel,
  personas = [],
  activePersona,
  onSelectPersona,
  onClearChat,
  onExportChat
}) {
  const { t } = useLanguage();
  const { currentChatId, chatList, createNewChat, loadChat, renameChat } = useChat();
  const { openCanvas, createNewDocument } = useCanvas();
  const { projects } = useProjects();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, nav, models, personas, actions, chats
  const inputRef = useRef(null);
  const listRef = useRef(null);

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
        id: 'nav_settings',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Abrir Configurações (Settings)',
        subtitle: 'Provedores, chaves de API, interface, observabilidade',
        icon: Settings,
        action: () => { onClose(); onOpenSettings?.(); }
      },
      {
        id: 'nav_canvas',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Abrir Canvas / Artifacts Panel',
        subtitle: 'Editor de código, diff e sandbox interativo',
        icon: Columns2,
        action: () => { onClose(); openCanvas?.(); }
      },
      {
        id: 'nav_terminal',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Abrir Terminal Integrado',
        subtitle: 'Sessão interativa de terminal shell',
        icon: Terminal,
        action: () => { onClose(); onToggleTerminal?.(); }
      },
      {
        id: 'nav_swarm',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Multi-Agent Swarm (Equipe de Agentes)',
        subtitle: 'Orquestração de subagentes concorrentes e síntese',
        icon: Users,
        action: () => { onClose(); onOpenSwarmModal?.(); }
      },
      {
        id: 'nav_kb',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Base de Conhecimento (RAG Local)',
        subtitle: 'Indexar pastas, PDFs, código e documentos',
        icon: BookOpen,
        action: () => { onClose(); onOpenKnowledgeBase?.(); }
      },
      {
        id: 'nav_workflows',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Workflows & Automações',
        subtitle: 'Criar e executar fluxos em sequência e webhooks',
        icon: Wand2,
        action: () => { onClose(); onOpenWorkflows?.(); }
      },
      {
        id: 'nav_projects',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Gerenciador de Projetos',
        subtitle: 'Organizar conversas e pastas de trabalho',
        icon: FolderKanban,
        action: () => { onClose(); onOpenProjects?.(); }
      },
      {
        id: 'nav_mcp',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Catálogo de Ferramentas MCP',
        subtitle: 'Servidores e ferramentas locais/remotas MCP',
        icon: Sparkles,
        action: () => { onClose(); onOpenMcpCatalog?.(); }
      },
      {
        id: 'nav_compare',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Modo Comparação de Modelos (Side-by-Side)',
        subtitle: 'Comparar respostas entre 2 modelos simultâneos',
        icon: Scale,
        action: () => { onClose(); onToggleCompareMode?.(); }
      },
      {
        id: 'nav_browser',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Browser & Web Research',
        subtitle: 'Pesquisa web e visualizador de páginas',
        icon: Globe,
        action: () => { onClose(); onToggleBrowser?.(); }
      },
      {
        id: 'nav_tasks',
        category: 'nav',
        categoryLabel: 'Navegação',
        title: 'Tarefas em Segundo Plano',
        subtitle: 'Monitorar comandos e agentes em background',
        icon: Clock,
        action: () => { onClose(); onToggleBackgroundTasks?.(); }
      }
    );

    // --- Category: Chat Actions ---
    items.push(
      {
        id: 'action_new_chat',
        category: 'actions',
        categoryLabel: 'Ações de Chat',
        title: 'Criar Nova Conversa',
        subtitle: 'Iniciar uma conversa limpa',
        icon: Plus,
        shortcut: 'Ctrl+N',
        action: () => { onClose(); createNewChat?.(); }
      },
      {
        id: 'action_new_canvas_doc',
        category: 'actions',
        categoryLabel: 'Ações de Chat',
        title: 'Criar Novo Documento no Canvas',
        subtitle: 'Abrir documento vazio no editor interativo',
        icon: FileCode,
        action: () => { onClose(); createNewDocument?.(); openCanvas?.(); }
      },
      {
        id: 'action_clear_chat',
        category: 'actions',
        categoryLabel: 'Ações de Chat',
        title: 'Limpar Mensagens da Conversa Atual',
        subtitle: 'Resetar o histórico da conversa ativa',
        icon: Trash2,
        action: () => { onClose(); onClearChat?.(); }
      },
      {
        id: 'action_export_chat',
        category: 'actions',
        categoryLabel: 'Ações de Chat',
        title: 'Exportar Conversa',
        subtitle: 'Salvar conversa como Markdown, HTML, JSON ou PDF',
        icon: Download,
        action: () => { onClose(); onExportChat?.(); }
      },
      {
        id: 'action_snip',
        category: 'actions',
        categoryLabel: 'Ações de Chat',
        title: 'Capturar Tela (Snip & Ask)',
        subtitle: 'Enviar recorte visual para o modelo',
        icon: Camera,
        action: () => { onClose(); onTriggerSnip?.(); }
      },
      {
        id: 'action_voice',
        category: 'actions',
        categoryLabel: 'Ações de Chat',
        title: 'Ditado por Voz / Transcrição',
        subtitle: 'Falar diretamente com o chat',
        icon: Mic,
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
          categoryLabel: 'Trocar Modelo',
          title: modelName,
          subtitle: isSelected ? 'Modelo atual selecionado' : `Alternar para ${modelId}`,
          icon: Bot,
          active: isSelected,
          action: () => { onClose(); onSelectModel?.(modelId); }
        });
      });
    }

    // --- Category: Personas ---
    if (personas?.length > 0) {
      if (activePersona?.id && activePersona.id !== 'default') {
        items.push({
          id: 'persona_deactivate',
          category: 'personas',
          categoryLabel: t('personas.dropdownTitle') || 'Personas',
          title: t('personas.deactivateCommand') || 'Desativar Persona Ativa',
          subtitle: `${t('personas.deactivateCommandDesc') || 'Voltar para o Assistente Geral'} (${activePersona.name || activePersona.id})`,
          icon: X,
          active: false,
          action: () => {
            onClose();
            const defaultP = personas.find(x => x.id === 'default') || personas[0];
            onSelectPersona?.(defaultP);
          }
        });
      }

      personas.forEach(p => {
        const isSelected = activePersona?.id === p.id;
        items.push({
          id: `persona_${p.id}`,
          category: 'personas',
          categoryLabel: t('personas.dropdownTitle') || 'Personas',
          title: p.name,
          subtitle: isSelected && p.id !== 'default'
            ? `${p.description || ''} • (${t('personas.clickToDeactivate') || 'Clique para desativar'})`
            : (p.description || 'Persona de IA personalizada'),
          icon: Sparkles,
          active: isSelected,
          action: () => {
            onClose();
            if (isSelected && p.id !== 'default') {
              const defaultP = personas.find(x => x.id === 'default') || personas[0];
              onSelectPersona?.(defaultP);
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
          categoryLabel: 'Conversas Recentes',
          title: c.title || 'Conversa sem título',
          subtitle: new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleString(),
          icon: GitBranch,
          active: isCurrent,
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
    onClose,
    onOpenSettings,
    onOpenKnowledgeBase,
    onOpenWorkflows,
    onOpenProjects,
    onOpenMcpCatalog,
    onToggleCompareMode,
    onToggleTerminal,
    onToggleBackgroundTasks,
    onToggleBrowser,
    onOpenSwarmModal,
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

  // Filter items by query and category
  const filteredItems = useMemo(() => {
    let result = allItems;
    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(item =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.categoryLabel.toLowerCase().includes(q)
      );
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/90">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-base outline-none font-medium"
            placeholder="Digite um comando, modelo, persona ou navegação... (Ctrl+K)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              Limpar
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            ESC para fechar
          </kbd>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950/40 border-b border-zinc-800/60 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'all', label: 'Tudo' },
            { id: 'nav', label: 'Navegação' },
            { id: 'actions', label: 'Ações' },
            { id: 'models', label: 'Modelos' },
            { id: 'personas', label: 'Personas' },
            { id: 'chats', label: 'Conversas' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0',
                categoryFilter === tab.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List of Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-800/30 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Nenhum comando ou resultado encontrado para &ldquo;<span className="text-zinc-400">{query}</span>&rdquo;
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
                    'group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all',
                    isSelected
                      ? 'bg-blue-600/15 text-zinc-100 border border-blue-500/30'
                      : 'text-zinc-300 hover:bg-zinc-800/50'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors',
                        isSelected
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700/60 group-hover:text-zinc-200'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-zinc-100 truncate">{item.title}</span>
                        {item.active && (
                          <span className="px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Ativo
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/40">
                          {item.categoryLabel}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <ArrowRight className="w-4 h-4 text-blue-400 animate-in fade-in slide-in-from-left-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">↑</kbd>
              <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">↓</kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">Enter</kbd>
              Executar
            </span>
          </div>
          <span className="text-zinc-400">
            {filteredItems.length} {filteredItems.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CommandPaletteModal;

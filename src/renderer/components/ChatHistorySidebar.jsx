import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useChat } from '../context/ChatContext';
import { useProjects } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { 
  MessageSquare, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Trash2, 
  MoreVertical,
  Clock,
  Search,
  FileText,
  Code,
  FileJson,
  X,
  FolderKanban,
  FolderPlus,
  Settings2,
  FolderOpen,
  Folder,
  Pencil,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';

// LocalStorage keys
const SIDEBAR_WIDTH_KEY = 'chat_sidebar_width';
const EXPANDED_PROJECTS_KEY = 'neochat_expanded_projects';
const MIN_SIDEBAR_WIDTH = 230;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 280;

// Format relative time for chat items
function formatRelativeTime(dateString, t, language) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('sidebar.justNow');
  if (diffMins < 60) return t('sidebar.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('sidebar.hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('sidebar.daysAgo', { count: diffDays });
  
  return date.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'short', day: 'numeric' });
}

// Highlight occurrences of query in text
function highlightMatch(text, query) {
  if (!query || !text) return text;
  const trimmed = query.trim();
  if (!trimmed) return text;

  const parts = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery);

  while (index !== -1) {
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index));
    }
    parts.push(
      <mark key={index} className="bg-primary/30 text-foreground font-semibold px-0.5 rounded">
        {text.substring(index, index + trimmed.length)}
      </mark>
    );
    lastIndex = index + trimmed.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

// Group chats by time period
function groupChatsByDate(chats) {
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: []
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart - 86400000);
  const weekStart = new Date(todayStart - 6 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  chats.forEach(chat => {
    const chatDate = new Date(chat.updatedAt || chat.createdAt || 0);
    
    if (chatDate >= todayStart) {
      groups.today.push(chat);
    } else if (chatDate >= yesterdayStart) {
      groups.yesterday.push(chat);
    } else if (chatDate >= weekStart) {
      groups.thisWeek.push(chat);
    } else if (chatDate >= monthStart) {
      groups.thisMonth.push(chat);
    } else {
      groups.older.push(chat);
    }
  });

  return groups;
}

function formatChatToMarkdown(chat, t, language, project) {
  let md = `# ${chat.title || t('sidebar.conversationDefault')}\n\n`;
  if (project) {
    md += `**${t('sidebar.projectLabel')}:** ${project.icon || ''} ${project.name}\n`;
  }
  md += `**${t('sidebar.dateLabel')}:** ${new Date(chat.createdAt || chat.updatedAt).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')}\n`;
  md += `**${t('sidebar.modelLabel')}:** ${chat.model || 'Groq'}\n\n---\n\n`;
  (chat.messages || []).forEach(msg => {
    const roleName = msg.role === 'user' ? t('sidebar.userLabel') : t('sidebar.assistantLabel');
    const content = typeof msg.content === 'string' 
      ? msg.content 
      : (Array.isArray(msg.content) ? msg.content.map(c => c.text || '').join('\n') : JSON.stringify(msg.content));
    md += `### ${roleName}\n\n${content}\n\n---\n\n`;
  });
  return md;
}

function formatChatToHTML(chat, t, language, project) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${chat.title || t('sidebar.conversationDefault')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 850px; margin: 40px auto; padding: 0 20px; color: #1e293b; background: #ffffff; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-size: 24px; color: #0f172a; }
    .meta { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    .msg { margin-bottom: 20px; padding: 16px 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .user { background: #f8fafc; }
    .assistant { background: #ffffff; }
    .role { font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #334155; }
    .content { white-space: pre-wrap; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${chat.title || t('sidebar.conversationDefault')}</h1>
  <div class="meta">
    ${project ? `<strong>${t('sidebar.projectLabel')}:</strong> ${project.icon || ''} ${project.name} | ` : ''}
    <strong>${t('sidebar.dateLabel')}:</strong> ${new Date(chat.createdAt || chat.updatedAt).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')} | 
    <strong>${t('sidebar.modelLabel')}:</strong> ${chat.model || 'Groq'}
  </div>
  ${(chat.messages || []).map(msg => `
    <div class="msg ${msg.role}">
      <div class="role">${msg.role === 'user' ? t('sidebar.userLabel') : t('sidebar.assistantLabel')}</div>
      <div class="content">${(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))}</div>
    </div>
  `).join('')}
</body>
</html>`;
}

function ChatHistorySidebar({ onNewChat, onChatLoaded, loading }) {
  const { 
    chatList, 
    currentChatId, 
    loadChat, 
    deleteChat, 
    deleteAllChats,
    renameChat,
    isSidebarCollapsed, 
    toggleSidebar,
    isLoadingChats 
  } = useChat();

  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    openCreateProjectModal,
    openEditProjectModal,
    openMoveModal,
  } = useProjects();

  const { t, language } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deepSearchResults, setDeepSearchResults] = useState([]);
  const [isSearchingDeep, setIsSearchingDeep] = useState(false);
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [hoveredProjectId, setHoveredProjectId] = useState(null);
  const [menuOpenChatId, setMenuOpenChatId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [isDeletingAllModalOpen, setIsDeletingAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRefs = useRef({});
  const editInputRef = useRef(null);

  // Expanded project IDs set (persisted in localStorage)
  const [expandedProjects, setExpandedProjects] = useState(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_PROJECTS_KEY);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading expanded projects:', e);
    }
    return new Set();
  });

  // Track "Mostrar mais" state for projects with many chats
  const [showAllInProject, setShowAllInProject] = useState({});

  // Section collapses
  const [isProjectsSectionOpen, setIsProjectsSectionOpen] = useState(true);
  const [isChatsSectionOpen, setIsChatsSectionOpen] = useState(true);

  // Resize state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return savedWidth ? parseInt(savedWidth, 10) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);

  // Map of project IDs to project objects for fast lookup
  const projectMap = useMemo(() => {
    const map = new Map();
    (projects || []).forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  // Group chats by project and identify unassigned chats
  const { projectChatsMap, unassignedChats } = useMemo(() => {
    const map = new Map();
    const unassigned = [];

    (projects || []).forEach(p => map.set(p.id, []));

    (chatList || []).forEach(chat => {
      if (chat.projectId && map.has(chat.projectId)) {
        map.get(chat.projectId).push(chat);
      } else {
        unassigned.push(chat);
      }
    });

    return { projectChatsMap: map, unassignedChats: unassigned };
  }, [chatList, projects]);

  // Auto-expand project when active chat is in that project
  useEffect(() => {
    if (!currentChatId || !chatList) return;
    const currentChat = chatList.find(c => c.id === currentChatId);
    if (currentChat && currentChat.projectId) {
      setExpandedProjects(prev => {
        if (prev.has(currentChat.projectId)) return prev;
        const next = new Set(prev);
        next.add(currentChat.projectId);
        try {
          localStorage.setItem(EXPANDED_PROJECTS_KEY, JSON.stringify(Array.from(next)));
        } catch (e) {}
        return next;
      });
    }
  }, [currentChatId, chatList]);

  // Toggle project expanded state
  const toggleProject = useCallback((projectId) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      try {
        localStorage.setItem(EXPANDED_PROJECTS_KEY, JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  }, []);

  // Deep Search effect with debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setDeepSearchResults([]);
      setIsSearchingDeep(false);
      return;
    }

    setIsSearchingDeep(true);
    const timer = setTimeout(async () => {
      try {
        if (window.electron?.chatHistory?.searchContent) {
          const results = await window.electron.chatHistory.searchContent(trimmed);
          setDeepSearchResults(Array.isArray(results) ? results : []);
        }
      } catch (err) {
        console.error('Error during deep search in sidebar:', err);
      } finally {
        setIsSearchingDeep(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered search matching projects
  const matchingProjects = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return (projects || []).filter(p => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.description || '').toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    const clampedWidth = Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
    setSidebarWidth(clampedWidth);
  }, [isResizing]);

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
    }
  }, [isResizing, sidebarWidth]);

  // Start resizing
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleChatClick = async (chatId) => {
    if (loading) return;
    if (chatId === currentChatId) return;
    const chat = await loadChat(chatId);
    if (chat) {
      if (chat.projectId) {
        setActiveProjectId(chat.projectId);
      } else {
        setActiveProjectId(null);
      }
      if (onChatLoaded) {
        onChatLoaded(chat);
      }
    }
  };

  const handlePromptDelete = (e, chat) => {
    e.stopPropagation();
    setMenuOpenChatId(null);
    setChatToDelete(chat);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;
    const chatId = chatToDelete.id;
    setDeletingChatId(chatId);
    try {
      await deleteChat(chatId);
    } catch (err) {
      console.error('Error deleting chat:', err);
    } finally {
      setDeletingChatId(null);
      setChatToDelete(null);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAllChats();
    } catch (err) {
      console.error('Error deleting all chats:', err);
    } finally {
      setIsDeletingAll(false);
      setIsDeletingAllModalOpen(false);
    }
  };

  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  const handleStartRename = (e, chat) => {
    if (e) e.stopPropagation();
    setMenuOpenChatId(null);
    setEditingChatId(chat.id);
    setEditingTitle(chat.title || t('sidebar.newChat'));
  };

  const handleSaveRename = async (e, chatId) => {
    if (e) e.stopPropagation();
    const newTitle = editingTitle.trim();
    if (newTitle && chatId) {
      try {
        await renameChat(chatId, newTitle);
      } catch (err) {
        console.error('Error renaming chat:', err);
      }
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleCancelRename = (e) => {
    if (e) e.stopPropagation();
    setEditingChatId(null);
    setEditingTitle('');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (editingChatId) {
          setEditingChatId(null);
          setEditingTitle('');
        }
        if (chatToDelete && !deletingChatId) {
          setChatToDelete(null);
        }
        if (isDeletingAllModalOpen && !isDeletingAll) {
          setIsDeletingAllModalOpen(false);
        }
      }
    };
    if (chatToDelete || isDeletingAllModalOpen || editingChatId) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [chatToDelete, deletingChatId, isDeletingAllModalOpen, isDeletingAll, editingChatId]);

  const handleOpenMoveModal = (e, chat) => {
    e.stopPropagation();
    setMenuOpenChatId(null);
    openMoveModal(chat);
  };

  const handleExportChat = async (e, chatId, format) => {
    e.stopPropagation();
    setMenuOpenChatId(null);
    const chat = await loadChat(chatId);
    if (!chat) return;

    const project = chat.projectId ? projectMap.get(chat.projectId) : null;
    let content = '';
    if (format === 'md') {
      content = formatChatToMarkdown(chat, t, language, project);
    } else if (format === 'html') {
      content = formatChatToHTML(chat, t, language, project);
    } else if (format === 'json') {
      content = JSON.stringify(chat, null, 2);
    }

    if (window.electron?.exportChatFile) {
      await window.electron.exportChatFile({
        format,
        title: chat.title || t('sidebar.conversationDefault').toLowerCase(),
        content
      });
    }
  };

  const handleMenuToggle = (e, chatId) => {
    e.stopPropagation();
    if (menuOpenChatId === chatId) {
      setMenuOpenChatId(null);
    } else {
      const button = menuButtonRefs.current[chatId];
      if (button) {
        const rect = button.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 4,
          left: Math.max(10, rect.right - 175),
        });
      }
      setMenuOpenChatId(chatId);
    }
  };

  // Render individual chat row item
  const renderChatItem = (chat, isIndented = false) => {
    const isCurrent = currentChatId === chat.id;
    const isDeleting = deletingChatId === chat.id;
    const isHovered = hoveredChatId === chat.id;
    const isMenuOpen = menuOpenChatId === chat.id;
    const isEditing = editingChatId === chat.id;

    return (
      <div
        key={chat.id}
        className={cn(
          "group relative flex items-center justify-between rounded-lg cursor-pointer transition-all duration-150 select-none",
          isIndented 
            ? "py-1.5 px-2 text-xs" 
            : "py-2 px-2.5 mx-2 text-xs",
          isCurrent 
            ? "bg-muted text-foreground font-medium shadow-2xs border-l-2 border-primary" 
            : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
          isDeleting && "opacity-50"
        )}
        onClick={() => {
          if (!isEditing) handleChatClick(chat.id);
        }}
        onMouseEnter={() => setHoveredChatId(chat.id)}
        onMouseLeave={() => {
          setHoveredChatId(null);
          if (menuOpenChatId === chat.id) setMenuOpenChatId(null);
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
          <MessageSquare className={cn(
            "flex-shrink-0 transition-colors",
            isIndented ? "h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary" : "h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary",
            isCurrent && "text-primary font-semibold"
          )} />
          {isEditing ? (
            <div className="flex items-center gap-1 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={editInputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveRename(e, chat.id);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancelRename(e);
                  }
                }}
                onBlur={() => {
                  if (editingTitle.trim()) {
                    handleSaveRename(null, chat.id);
                  } else {
                    handleCancelRename();
                  }
                }}
                className="w-full bg-background border border-primary/60 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                placeholder={t('sidebar.renamePlaceholder') || 'Nome da conversa...'}
                autoFocus
              />
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSaveRename(e, chat.id);
                  }}
                  className="p-1 rounded hover:bg-muted text-primary hover:text-primary transition-colors"
                  title={t('common.save')}
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCancelRename(e);
                  }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                  title={t('common.cancel')}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="min-w-0 flex-1"
              onDoubleClick={(e) => handleStartRename(e, chat)}
            >
              <div className="truncate text-xs font-normal" title={chat.title || t('sidebar.newChat')}>
                {chat.title || t('sidebar.newChat')}
              </div>
              {!isIndented && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{formatRelativeTime(chat.updatedAt, t, language)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons on hover */}
        {!isEditing && (isHovered || isMenuOpen || chatToDelete?.id === chat.id) && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-background/90 backdrop-blur-xs px-1 py-0.5 rounded-md border border-border/50 shadow-2xs">
            <button
              type="button"
              onClick={(e) => handleStartRename(e, chat)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t('sidebar.renameChat')}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => handlePromptDelete(e, chat)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
              title={t('sidebar.deleteChat')}
            >
              <Trash2 className="h-3 w-3" />
            </button>
            <button
              ref={(el) => menuButtonRefs.current[chat.id] = el}
              onClick={(e) => handleMenuToggle(e, chat.id)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t('sidebar.chatOptions')}
            >
              <MoreVertical className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Dropdown menu */}
        {isMenuOpen && (
          <div 
            className="fixed py-1 bg-popover border border-border rounded-xl shadow-xl w-48 z-[9999] text-xs animate-in fade-in-0 zoom-in-95"
            style={{ 
              top: menuPosition.top, 
              left: menuPosition.left,
            }}
          >
            {/* Rename */}
            <button
              onClick={(e) => handleStartRename(e, chat)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-foreground transition-colors text-left font-medium"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" />
              <span>{t('sidebar.renameChat')}</span>
            </button>

            {/* Move to Project */}
            <button
              onClick={(e) => handleOpenMoveModal(e, chat)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-foreground transition-colors text-left font-medium"
            >
              <FolderKanban className="h-3.5 w-3.5 text-primary" />
              <span>{t('sidebar.moveToProject')}</span>
            </button>

            <div className="my-1 border-t border-border" />

            <div className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
              {t('sidebar.exportChat')}
            </div>
            <button
              onClick={(e) => handleExportChat(e, chat.id, 'md')}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-foreground transition-colors text-left"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>{t('sidebar.exportMarkdown')}</span>
            </button>
            <button
              onClick={(e) => handleExportChat(e, chat.id, 'html')}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-foreground transition-colors text-left"
            >
              <Code className="h-3.5 w-3.5 text-blue-500" />
              <span>{t('sidebar.exportHtml')}</span>
            </button>
            <button
              onClick={(e) => handleExportChat(e, chat.id, 'json')}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-foreground transition-colors text-left"
            >
              <FileJson className="h-3.5 w-3.5 text-amber-500" />
              <span>{t('sidebar.exportJson')}</span>
            </button>

            <div className="my-1 border-t border-border" />

            <button
              onClick={(e) => handlePromptDelete(e, chat)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors text-left font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t('sidebar.deleteChat')}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render search results view
  const renderSearchResults = () => {
    if (isSearchingDeep && deepSearchResults.length === 0 && matchingProjects.length === 0) {
      return (
        <div className="py-8 px-4 text-center text-xs text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p>{t('sidebar.deepSearching')}</p>
        </div>
      );
    }

    if (deepSearchResults.length === 0 && matchingProjects.length === 0) {
      return (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
          <Search className="h-7 w-7 mx-auto mb-2 opacity-40 text-primary" />
          <p className="font-medium">{t('sidebar.emptySearch')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 px-2 py-1">
        {/* Matching Projects */}
        {matchingProjects.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t('projects.title')} ({matchingProjects.length})
            </div>
            {matchingProjects.map(proj => {
              const chats = projectChatsMap.get(proj.id) || [];
              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    setActiveProjectId(proj.id);
                    toggleProject(proj.id);
                  }}
                  className="p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                      style={{ backgroundColor: `${proj.color || '#f55036'}20`, color: proj.color || '#f55036' }}
                    >
                      {proj.icon || '📁'}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {highlightMatch(proj.name, searchQuery)}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {chats.length} {chats.length === 1 ? 'conversa' : 'conversas'}
                    </span>
                  </div>
                  {proj.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 pl-8">
                      {highlightMatch(proj.description, searchQuery)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Matching Conversations & Snippets */}
        {deepSearchResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>{t('sidebar.matchesCount', { count: deepSearchResults.length })}</span>
              {isSearchingDeep && (
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {deepSearchResults.map((chat) => {
              const project = chat.projectId ? projectMap.get(chat.projectId) : null;
              const hasMessageMatches = Array.isArray(chat.matches) && chat.matches.length > 0;

              return (
                <div
                  key={chat.id}
                  className={cn(
                    "rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors p-2 space-y-1.5 shadow-2xs",
                    currentChatId === chat.id && "border-primary/50 bg-primary/5"
                  )}
                >
                  {/* Chat Header Row */}
                  <div
                    onClick={() => handleChatClick(chat.id)}
                    className="flex items-start justify-between cursor-pointer gap-2 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {highlightMatch(chat.title || t('sidebar.conversationDefault'), searchQuery)}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <div className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{formatRelativeTime(chat.updatedAt, t, language)}</span>
                          </div>
                          {project && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-medium truncate max-w-[100px]"
                              style={{
                                backgroundColor: `${project.color || '#f55036'}18`,
                                color: project.color || '#f55036'
                              }}
                            >
                              <span className="w-3 h-3 flex items-center justify-center text-[9px] leading-none shrink-0 select-none">{project.icon || '📁'}</span>
                              <span className="truncate">{project.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {chat.matchCount > 0 && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold font-mono">
                        {chat.matchCount} {chat.matchCount === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </div>

                  {/* Message match snippets */}
                  {hasMessageMatches && (
                    <div className="space-y-1 pt-1 border-t border-border/30">
                      {chat.matches.slice(0, 3).map((m, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleChatClick(chat.id)}
                          className="p-1.5 rounded-lg bg-background/80 hover:bg-muted cursor-pointer transition-colors text-[11px] border border-border/40 font-mono text-muted-foreground hover:text-foreground leading-relaxed"
                        >
                          <div className="flex items-center gap-1 text-[9px] font-sans font-semibold text-primary mb-0.5">
                            <span>{m.role === 'user' ? t('sidebar.userLabel') : t('sidebar.assistantLabel')}</span>
                          </div>
                          <p className="line-clamp-2">
                            {highlightMatch(m.snippet, searchQuery)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (isSidebarCollapsed) {
    return null;
  }

  const groupedUnassigned = groupChatsByDate(unassignedChats);

  return (
    <div 
      ref={sidebarRef}
      className={cn(
        "flex flex-col h-full bg-background border-r border-border relative select-none",
        isResizing ? "" : "transition-all duration-200 ease-in-out"
      )}
      style={{ 
        width: sidebarWidth,
        minWidth: MIN_SIDEBAR_WIDTH,
        maxWidth: MAX_SIDEBAR_WIDTH
      }}
    >
      {/* Resize handle */}
      <div
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 hover:bg-primary/30 active:bg-primary/50 transition-colors duration-150",
          isResizing ? "bg-primary/50" : "bg-transparent"
        )}
        onMouseDown={handleResizeStart}
        title={t('sidebar.dragToResize')}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/80 bg-background/50">
        <h2 className="font-semibold text-xs text-foreground uppercase tracking-wider">{t('sidebar.title')}</h2>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={openCreateProjectModal}
            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-muted/80 rounded-lg"
            title={t('projects.newProject')}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNewChat()}
            className="h-7 w-7 text-foreground hover:bg-muted/80 rounded-lg hover:text-primary"
            title={t('sidebar.newChat')}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {chatList.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeletingAllModalOpen(true)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-muted/80 rounded-lg"
              title={t('sidebar.deleteAllChats')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
            title={t('header.collapseSidebar')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('sidebar.searchPlaceholder')}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-muted/60 border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-1 py-1 space-y-3">
        {isLoadingChats ? (
          <div className="flex items-center justify-center py-10">
            <div className="loading-spinner" />
          </div>
        ) : searchQuery.trim() ? (
          renderSearchResults()
        ) : (
          <>
            {/* --- SECTION 1: PROJETOS --- */}
            <div className="space-y-1">
              {/* Projects Section Header */}
              <div className="flex items-center justify-between px-2.5 py-1 text-muted-foreground group">
                <button
                  type="button"
                  onClick={() => setIsProjectsSectionOpen(prev => !prev)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", !isProjectsSectionOpen && "-rotate-90")} />
                  <span>{t('projects.title')}</span>
                  {projects.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-normal">
                      {projects.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={openCreateProjectModal}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-all"
                  title={t('projects.newProject')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Projects List */}
              {isProjectsSectionOpen && (
                <div className="space-y-0.5 px-1">
                  {projects.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground/80 flex items-center justify-between">
                      <span>{t('projects.noProjects')}</span>
                      <button
                        type="button"
                        onClick={openCreateProjectModal}
                        className="text-primary hover:underline font-medium flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> {t('projects.createProject')}
                      </button>
                    </div>
                  ) : (
                    projects.map((project) => {
                      const isExpanded = expandedProjects.has(project.id);
                      const projChats = projectChatsMap.get(project.id) || [];
                      const isProjActive = activeProjectId === project.id;
                      const isHovered = hoveredProjectId === project.id;
                      const showAll = showAllInProject[project.id];
                      const displayChats = showAll ? projChats : projChats.slice(0, 5);
                      const hasMore = projChats.length > 5;

                      return (
                        <div key={project.id} className="space-y-0.5">
                          {/* Project Header Row */}
                          <div
                            onMouseEnter={() => setHoveredProjectId(project.id)}
                            onMouseLeave={() => setHoveredProjectId(null)}
                            onClick={() => {
                              setActiveProjectId(project.id);
                              toggleProject(project.id);
                            }}
                            className={cn(
                              "group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 select-none",
                              isProjActive 
                                ? "bg-muted/80 text-foreground font-semibold" 
                                : "hover:bg-muted/50 text-foreground/90 font-medium"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-12">
                              {/* Chevron Indicator */}
                              <ChevronRight className={cn(
                                "w-3 h-3 text-muted-foreground/70 transition-transform duration-200 flex-shrink-0",
                                isExpanded && "rotate-90 text-foreground"
                              )} />

                              {/* Project Icon */}
                              <span 
                                className="w-5 h-5 rounded-md flex items-center justify-center text-xs flex-shrink-0 shadow-2xs leading-none select-none"
                                style={{ backgroundColor: `${project.color || '#f55036'}20`, color: project.color || '#f55036' }}
                              >
                                {project.icon || '📁'}
                              </span>

                              {/* Project Name */}
                              <span className="truncate text-xs font-medium">
                                {project.name}
                              </span>

                              {/* Count badge */}
                              {projChats.length > 0 && (
                                <span className="text-[10px] text-muted-foreground/70 font-normal">
                                  {projChats.length}
                                </span>
                              )}
                            </div>

                            {/* Project Actions on hover */}
                            {isHovered && (
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-background/90 backdrop-blur-xs px-1 py-0.5 rounded-md border border-border/50 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNewChat(project.id);
                                    if (!isExpanded) toggleProject(project.id);
                                  }}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                  title={t('projects.newChatInProject')}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditProjectModal(project);
                                  }}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title={t('projects.editProject')}
                                >
                                  <Settings2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Expanded Chats within Project */}
                          {isExpanded && (
                            <div className="ml-4 pl-2.5 border-l border-border/60 my-0.5 space-y-0.5">
                              {projChats.length === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => onNewChat(project.id)}
                                  className="w-full text-left py-1.5 px-2 text-[11px] text-muted-foreground/70 hover:text-primary hover:bg-muted/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3 text-primary" />
                                  <span>{t('sidebar.newChat') || 'Nova conversa'}</span>
                                </button>
                              ) : (
                                <>
                                  {displayChats.map((chat) => renderChatItem(chat, true))}

                                  {/* Mostrar mais / Mostrar menos toggle */}
                                  {hasMore && (
                                    <button
                                      type="button"
                                      onClick={() => setShowAllInProject(prev => ({
                                        ...prev,
                                        [project.id]: !prev[project.id]
                                      }))}
                                      className="w-full text-left py-1 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                    >
                                      {showAll ? (
                                        <>
                                          <ChevronUp className="w-3 h-3" />
                                          <span>{t('projects.showLess')}</span>
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-3 h-3" />
                                          <span>{t('projects.showMore')} ({projChats.length - 5})</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* --- SECTION 2: CHATS (Gerais / Sem Projeto) --- */}
            <div className="space-y-1 pt-2">
              {/* Chats Section Header */}
              <div className="flex items-center justify-between px-2.5 py-1 text-muted-foreground group">
                <button
                  type="button"
                  onClick={() => setIsChatsSectionOpen(prev => !prev)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", !isChatsSectionOpen && "-rotate-90")} />
                  <span>{t('sidebar.chatsSection')}</span>
                  {unassignedChats.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-normal">
                      {unassignedChats.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onNewChat(null)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-all"
                  title={t('sidebar.newChat')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Unassigned Chats List */}
              {isChatsSectionOpen && (
                <div>
                  {unassignedChats.length === 0 && projects.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      <MessageSquare className="h-7 w-7 mx-auto mb-2 opacity-40 text-primary" />
                      <p className="text-xs font-medium">{t('sidebar.emptyTitle')}</p>
                      <p className="text-[11px] mt-1 text-muted-foreground/80">{t('sidebar.emptySubtitle')}</p>
                      <button
                        type="button"
                        onClick={() => onNewChat(null)}
                        className="mt-3 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('sidebar.newChat')}</span>
                      </button>
                    </div>
                  ) : unassignedChats.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground/70">
                      {t('sidebar.emptySubtitle')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupedUnassigned.today.length > 0 && (
                        <div>
                          <div className="px-3 py-0.5 text-[10px] font-semibold text-muted-foreground/80 uppercase">
                            {t('sidebar.today')}
                          </div>
                          {groupedUnassigned.today.map(c => renderChatItem(c))}
                        </div>
                      )}
                      {groupedUnassigned.yesterday.length > 0 && (
                        <div>
                          <div className="px-3 py-0.5 text-[10px] font-semibold text-muted-foreground/80 uppercase">
                            {t('sidebar.yesterday')}
                          </div>
                          {groupedUnassigned.yesterday.map(c => renderChatItem(c))}
                        </div>
                      )}
                      {groupedUnassigned.thisWeek.length > 0 && (
                        <div>
                          <div className="px-3 py-0.5 text-[10px] font-semibold text-muted-foreground/80 uppercase">
                            {t('sidebar.thisWeek')}
                          </div>
                          {groupedUnassigned.thisWeek.map(c => renderChatItem(c))}
                        </div>
                      )}
                      {groupedUnassigned.thisMonth.length > 0 && (
                        <div>
                          <div className="px-3 py-0.5 text-[10px] font-semibold text-muted-foreground/80 uppercase">
                            {t('sidebar.thisMonth')}
                          </div>
                          {groupedUnassigned.thisMonth.map(c => renderChatItem(c))}
                        </div>
                      )}
                      {groupedUnassigned.older.length > 0 && (
                        <div>
                          <div className="px-3 py-0.5 text-[10px] font-semibold text-muted-foreground/80 uppercase">
                            {t('sidebar.older')}
                          </div>
                          {groupedUnassigned.older.map(c => renderChatItem(c))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete Chat Confirmation Modal */}
      {chatToDelete && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletingChatId) {
              setChatToDelete(null);
            }
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-4 shadow-2xl animate-in zoom-in-95 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  {t('sidebar.deleteChatConfirmTitle')}
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5" title={chatToDelete.title || t('sidebar.conversationDefault')}>
                  &ldquo;{chatToDelete.title || t('sidebar.conversationDefault')}&rdquo;
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('sidebar.deleteChatConfirmMessage')}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setChatToDelete(null)}
                disabled={Boolean(deletingChatId)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingChatId)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {deletingChatId ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('common.delete')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete All Chats Confirmation Modal */}
      {isDeletingAllModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingAll) {
              setIsDeletingAllModalOpen(false);
            }
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-4 shadow-2xl animate-in zoom-in-95 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  {t('sidebar.deleteAllConfirmTitle')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {chatList.length} {chatList.length === 1 ? 'conversa salva' : 'conversas salvas'}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('sidebar.deleteAllConfirmMessage')}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDeletingAllModalOpen(false)}
                disabled={isDeletingAll}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeletingAll}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingAll ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('sidebar.deleteAllConfirmButton')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default ChatHistorySidebar;

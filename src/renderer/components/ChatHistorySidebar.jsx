import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { useProjects } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { 
  MessageSquare, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  MoreVertical,
  Clock,
  Search,
  Download,
  FileText,
  Code,
  FileJson,
  X,
  FolderKanban,
  FolderPlus,
  Layers,
  Settings2,
  Folder,
  Tag
} from 'lucide-react';
import { cn } from '../lib/utils';

// LocalStorage key for sidebar width
const SIDEBAR_WIDTH_KEY = 'chat_sidebar_width';
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_WIDTH = 270;
const COLLAPSED_WIDTH = 64;

// Format relative time for chat items
function formatRelativeTime(dateString, t, language) {
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
    const chatDate = new Date(chat.updatedAt);
    
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
    isSidebarCollapsed, 
    toggleSidebar,
    isLoadingChats 
  } = useChat();

  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    openCreateProjectModal,
    openEditProjectModal,
    openMoveModal,
  } = useProjects();

  const { t, language } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'projects'
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [menuOpenChatId, setMenuOpenChatId] = useState(null);
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRefs = useRef({});

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

  // Filter chats by project and search query
  const filteredChats = useMemo(() => {
    let list = chatList;
    
    // Filter by active project if one is selected
    if (activeProjectId) {
      list = list.filter(c => c.projectId === activeProjectId);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => (c.title || '').toLowerCase().includes(q));
    }
    
    return list;
  }, [chatList, activeProjectId, searchQuery]);

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
      if (onChatLoaded) {
        onChatLoaded(chat);
      }
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    setDeletingChatId(chatId);
    await deleteChat(chatId);
    setDeletingChatId(null);
    setMenuOpenChatId(null);
  };

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
      const res = await window.electron.exportChatFile({
        format,
        title: chat.title || t('sidebar.conversationDefault').toLowerCase(),
        content
      });
      if (res && res.success) {
        // Success feedback
      }
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
          left: Math.max(10, rect.right - 170),
        });
      }
      setMenuOpenChatId(chatId);
    }
  };

  const groupedChats = groupChatsByDate(filteredChats);

  const renderChatGroup = (title, chats) => {
    if (chats.length === 0) return null;

    return (
      <div className="mb-3">
        {!isSidebarCollapsed && (
          <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </div>
        )}
        <div className="space-y-0.5">
          {chats.map(chat => {
            const project = chat.projectId ? projectMap.get(chat.projectId) : null;
            return (
              <div
                key={chat.id}
                className={cn(
                  "relative group flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg mx-2 transition-colors duration-150",
                  currentChatId === chat.id 
                    ? "bg-muted text-foreground font-medium shadow-xs" 
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                  deletingChatId === chat.id && "opacity-50"
                )}
                onClick={() => handleChatClick(chat.id)}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => {
                  setHoveredChatId(null);
                  if (menuOpenChatId === chat.id) setMenuOpenChatId(null);
                }}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0 text-primary/80" />
                
                {!isSidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 pr-5">
                      <div className="truncate text-xs font-medium">
                        {chat.title || t('sidebar.newChat')}
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 mt-0.5">
                        <div className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{formatRelativeTime(chat.updatedAt, t, language)}</span>
                        </div>

                        {/* Project Pill (shown when in "All Chats" view) */}
                        {!activeProjectId && project && (
                          <span 
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-medium truncate max-w-[100px]"
                            style={{ 
                              backgroundColor: `${project.color || '#f55036'}18`, 
                              color: project.color || '#f55036' 
                            }}
                            title={`${t('sidebar.projectLabel')}: ${project.name}`}
                          >
                            <span>{project.icon || '📁'}</span>
                            <span className="truncate">{project.name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action menu button */}
                    {(hoveredChatId === chat.id || menuOpenChatId === chat.id) && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button
                          ref={(el) => menuButtonRefs.current[chat.id] = el}
                          onClick={(e) => handleMenuToggle(e, chat.id)}
                          className="p-1 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                          title={t('sidebar.chatOptions')}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    
                    {/* Dropdown menu */}
                    {menuOpenChatId === chat.id && (
                      <div 
                        className="fixed py-1 bg-popover border border-border rounded-lg shadow-xl w-48 z-[9999] text-xs"
                        style={{ 
                          top: menuPosition.top, 
                          left: menuPosition.left,
                        }}
                      >
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
                          onClick={(e) => handleDeleteChat(e, chat.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors text-left"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{t('sidebar.deleteChat')}</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isSidebarCollapsed) {
    return null;
  }

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
      {!isSidebarCollapsed && (
        <div
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 hover:bg-primary/30 active:bg-primary/50 transition-colors duration-150",
            isResizing ? "bg-primary/50" : "bg-transparent"
          )}
          onMouseDown={handleResizeStart}
          title={t('sidebar.dragToResize')}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        {!isSidebarCollapsed && (
          <h2 className="font-semibold text-sm text-foreground">{t('sidebar.title')}</h2>
        )}
        <div className={cn("flex items-center gap-1", isSidebarCollapsed && "w-full justify-center")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="h-8 w-8 text-foreground hover:bg-muted"
            title={t('sidebar.newChat')}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-foreground hover:bg-muted"
            title={isSidebarCollapsed ? t('header.expandSidebar') : t('header.collapseSidebar')}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation View Switcher (Todas vs Projetos) */}
      {!isSidebarCollapsed && (
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setActiveProjectId(null);
              }}
              className={cn(
                "flex-1 py-1 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5",
                activeTab === 'all' && !activeProjectId
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('projects.allTab')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={cn(
                "flex-1 py-1 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5",
                activeTab === 'projects' || activeProjectId
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              <span>{t('projects.projectsTab')}</span>
              {projects.length > 0 && (
                <span className="text-[10px] px-1 bg-muted rounded-full text-muted-foreground">
                  {projects.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active Project Filter Banner */}
      {!isSidebarCollapsed && activeProject && (
        <div className="mx-3 mt-2 p-2 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span 
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
              style={{ backgroundColor: `${activeProject.color || '#f55036'}25`, color: activeProject.color || '#f55036' }}
            >
              {activeProject.icon || '📁'}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                <span className="truncate">{activeProject.name}</span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {filteredChats.length} {filteredChats.length === 1 ? 'conversa' : 'conversas'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => openEditProjectModal(activeProject)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t('projects.editProject')}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveProjectId(null);
                setActiveTab('all');
              }}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t('projects.backToAll')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Projects List View (when projects tab is open and no specific project is active) */}
      {!isSidebarCollapsed && activeTab === 'projects' && !activeProjectId && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t('projects.title')}
            </span>
            <button
              type="button"
              onClick={openCreateProjectModal}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> {t('projects.newProject')}
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="py-8 px-2 text-center text-muted-foreground">
              <FolderPlus className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
              <p className="text-xs font-medium text-foreground">{t('projects.noProjects')}</p>
              <p className="text-[11px] mt-1 text-muted-foreground/80">{t('projects.noProjectsSubtitle')}</p>
              <button
                type="button"
                onClick={openCreateProjectModal}
                className="mt-3 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('projects.createProject')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {projects.map((p) => {
                const count = chatList.filter(c => c.projectId === p.id).length;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveProjectId(p.id)}
                    className="group flex items-center justify-between p-2.5 rounded-xl border border-border bg-card hover:bg-muted/70 cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span 
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: `${p.color || '#f55036'}20`, color: p.color || '#f55036' }}
                      >
                        {p.icon || '📁'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {count} {count === 1 ? 'conversa' : 'conversas'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditProjectModal(p);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-opacity"
                        title={t('projects.editProject')}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={openCreateProjectModal}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors text-xs flex items-center justify-center gap-1.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('projects.newProject')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search Input (when viewing chats) */}
      {!isSidebarCollapsed && (activeTab === 'all' || activeProjectId) && (
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('sidebar.searchPlaceholder')}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chat list (when viewing chats) */}
      {(!isSidebarCollapsed && (activeTab === 'all' || activeProjectId)) && (
        <div className="flex-1 overflow-y-auto py-2">
          {isLoadingChats ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {isSidebarCollapsed ? (
                <MessageSquare className="h-6 w-6 mx-auto opacity-50" />
              ) : (
                <>
                  <MessageSquare className="h-7 w-7 mx-auto mb-2 opacity-40 text-primary" />
                  <p className="text-xs font-medium">{searchQuery ? t('sidebar.emptySearch') : t('sidebar.emptyTitle')}</p>
                  <p className="text-[11px] mt-1 text-muted-foreground/80">
                    {activeProject ? `Nenhuma conversa neste projeto. Clique em '+' para iniciar.` : t('sidebar.emptySubtitle')}
                  </p>
                  {activeProject && (
                    <button
                      type="button"
                      onClick={onNewChat}
                      className="mt-3 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('sidebar.newChat')}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {renderChatGroup(t('sidebar.today'), groupedChats.today)}
              {renderChatGroup(t('sidebar.yesterday'), groupedChats.yesterday)}
              {renderChatGroup(t('sidebar.thisWeek'), groupedChats.thisWeek)}
              {renderChatGroup(t('sidebar.thisMonth'), groupedChats.thisMonth)}
              {renderChatGroup(t('sidebar.older'), groupedChats.older)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatHistorySidebar;

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
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
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

// LocalStorage key for sidebar width
const SIDEBAR_WIDTH_KEY = 'chat_sidebar_width';
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_WIDTH = 260;
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

function formatChatToMarkdown(chat, t, language) {
  let md = `# ${chat.title || t('sidebar.conversationDefault')}\n\n`;
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

function formatChatToHTML(chat, t, language) {
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
  <div class="meta"><strong>${t('sidebar.dateLabel')}:</strong> ${new Date(chat.createdAt || chat.updatedAt).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')} | <strong>${t('sidebar.modelLabel')}:</strong> ${chat.model || 'Groq'}</div>
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
  const { t, language } = useLanguage();
  
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

  // Filter chats by search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chatList;
    const q = searchQuery.toLowerCase();
    return chatList.filter(c => (c.title || '').toLowerCase().includes(q));
  }, [chatList, searchQuery]);

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

  const handleExportChat = async (e, chatId, format) => {
    e.stopPropagation();
    setMenuOpenChatId(null);
    const chat = await loadChat(chatId);
    if (!chat) return;

    let content = '';
    if (format === 'md') {
      content = formatChatToMarkdown(chat, t, language);
    } else if (format === 'html') {
      content = formatChatToHTML(chat, t, language);
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
        // Success notification or feedback
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
          left: Math.max(10, rect.right - 160),
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
          {chats.map(chat => (
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
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{formatRelativeTime(chat.updatedAt, t, language)}</span>
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
                      className="fixed py-1 bg-popover border border-border rounded-lg shadow-xl w-44 z-[9999] text-xs"
                      style={{ 
                        top: menuPosition.top, 
                        left: menuPosition.left,
                      }}
                    >
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-b border-border">
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
          ))}
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

      {/* Search Input (when expanded) */}
      {!isSidebarCollapsed && (
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

      {/* Chat list */}
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
                <p className="text-[11px] mt-1 text-muted-foreground/80">{t('sidebar.emptySubtitle')}</p>
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
    </div>
  );
}

export default ChatHistorySidebar;

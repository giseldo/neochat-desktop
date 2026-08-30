import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';

// Create the context
export const ChatContext = createContext();

// Create a provider component
export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  
  // Use a ref to track current chat ID for immediate access (state updates are async)
  const currentChatIdRef = useRef(null);
  
  // Track if we need to generate a title after first user message
  const needsTitleGeneration = useRef(false);
  const titleGenerationInProgress = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  // Load chat list on mount
  useEffect(() => {
    loadChatList();
  }, []);

  // Load the list of chats
  const loadChatList = useCallback(async () => {
    try {
      setIsLoadingChats(true);
      const chats = await window.electron.chatHistory.list();
      setChatList(chats || []);
    } catch (error) {
      console.error('Error loading chat list:', error);
      setChatList([]);
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  // Generate and update chat title automatically based on user message without prompting
  const generateAndUpdateTitle = useCallback(async (chatId, userMessage) => {
    if (!chatId || titleGenerationInProgress.current) return;
    
    titleGenerationInProgress.current = true;
    needsTitleGeneration.current = false;
    
    try {
      // Extract text content if structured message
      let textContent = userMessage;
      if (Array.isArray(userMessage)) {
        textContent = userMessage
          .filter(part => part && (part.type === 'text' || typeof part === 'string'))
          .map(part => (typeof part === 'string' ? part : part.text || ''))
          .join(' ');
      } else if (userMessage && typeof userMessage === 'object') {
        textContent = userMessage.text || JSON.stringify(userMessage);
      }

      const rawText = (typeof textContent === 'string' ? textContent : String(textContent || '')).trim();
      if (!rawText) return;

      // Optimistically set a fast, clean excerpt title immediately while the AI title is generating
      const words = rawText.replace(/[\r\n\t]+/g, ' ').split(/\s+/).filter(Boolean);
      const instantExcerpt = words.slice(0, 6).join(' ').slice(0, 45);
      if (instantExcerpt) {
        setChatList(prev => prev.map(chat =>
          chat.id === chatId && (!chat.title || chat.title === 'New Chat' || chat.title === 'Nova Conversa')
            ? { ...chat, title: instantExcerpt }
            : chat
        ));
      }
      
      const title = await window.electron.chatHistory.generateTitle(rawText);
      
      if (title && title !== 'New Chat') {
        await window.electron.chatHistory.updateTitle(chatId, title);
        setChatList(prev => prev.map(chat =>
          chat.id === chatId ? { ...chat, title: title } : chat
        ));
      }
    } catch (error) {
      console.error('Error generating chat title:', error);
    } finally {
      titleGenerationInProgress.current = false;
      needsTitleGeneration.current = false;
    }
  }, []);

  // Create a new chat
  const createNewChat = useCallback(async (model, useResponsesApi = false, projectId = null) => {
    try {
      const chat = await window.electron.chatHistory.create(model, useResponsesApi, projectId);
      if (chat) {
        // Update both state and ref immediately
        currentChatIdRef.current = chat.id;
        setCurrentChatId(chat.id);
        setMessages([]);
        needsTitleGeneration.current = true;
        // Refresh the chat list
        await loadChatList();
        console.log('[ChatContext] Created new chat:', chat.id, 'useResponsesApi:', useResponsesApi, 'projectId:', projectId);
        return chat;
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
    return null;
  }, [loadChatList]);

  // Load a specific chat
  const loadChat = useCallback(async (chatId) => {
    try {
      const chat = await window.electron.chatHistory.load(chatId);
      if (chat) {
        currentChatIdRef.current = chat.id;
        setCurrentChatId(chat.id);
        setMessages(chat.messages || []);
        // Don't need title generation for existing chats
        needsTitleGeneration.current = false;
        return chat;
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    }
    return null;
  }, []);

  // Update the timestamp of a chat locally without reloading the entire list
  const updateChatTimestampLocally = useCallback((chatId) => {
    setChatList(prev => {
      const updatedList = prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, updatedAt: new Date().toISOString() }
          : chat
      );
      // Re-sort by updatedAt (most recent first)
      return updatedList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });
  }, []);

  // Save current chat messages
  const saveCurrentChat = useCallback(async (updatedMessages) => {
    const chatId = currentChatIdRef.current;
    if (!chatId) return;
    
    try {
      await window.electron.chatHistory.updateMessages(chatId, updatedMessages || messages);
      // Update timestamp locally instead of reloading the entire list
      updateChatTimestampLocally(chatId);
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  }, [messages, updateChatTimestampLocally]);

  // Delete a chat
  const deleteChat = useCallback(async (chatId) => {
    try {
      const result = await window.electron.chatHistory.delete(chatId);
      if (result.success) {
        // If we deleted the current chat, clear the state
        if (chatId === currentChatIdRef.current) {
          currentChatIdRef.current = null;
          setCurrentChatId(null);
          setMessages([]);
        }
        // Refresh chat list
        await loadChatList();
        return true;
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
    return false;
  }, [loadChatList]);

  // Delete all chats
  const deleteAllChats = useCallback(async () => {
    try {
      const result = await window.electron.chatHistory.deleteAll();
      if (result && result.success) {
        currentChatIdRef.current = null;
        setCurrentChatId(null);
        setMessages([]);
        needsTitleGeneration.current = false;
        await loadChatList();
        return true;
      }
    } catch (error) {
      console.error('Error deleting all chats:', error);
    }
    return false;
  }, [loadChatList]);

  // Clear messages in the current chat
  const clearCurrentChat = useCallback(async () => {
    const chatId = currentChatIdRef.current;
    if (chatId) {
      try {
        await window.electron.chatHistory.clearMessages(chatId);
      } catch (error) {
        console.error('Error clearing chat messages:', error);
      }
    }
    setMessages([]);
    needsTitleGeneration.current = false;
    await loadChatList();
  }, [loadChatList]);

  // Start a fresh chat (clear current without creating new)
  const startFreshChat = useCallback(() => {
    currentChatIdRef.current = null;
    setCurrentChatId(null);
    setMessages([]);
    needsTitleGeneration.current = false;
  }, []);

  // Toggle sidebar collapsed state
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  // Wrapper for setMessages that also handles saving and title generation
  const setMessagesWithSave = useCallback((updater) => {
    setMessages(prev => {
      const newMessages = typeof updater === 'function' ? updater(prev) : updater;
      
      // Use ref for immediate access to current chat ID
      const chatId = currentChatIdRef.current;
      
      // If we have a current chat, save the messages
      if (chatId && newMessages.length > 0) {
        // Save asynchronously without blocking
        window.electron.chatHistory.updateMessages(chatId, newMessages)
          .then(() => {
            // Update timestamp locally instead of reloading entire list
            updateChatTimestampLocally(chatId);
          })
          .catch(err => console.error('Error auto-saving chat:', err));
      }
      
      // Check if we need to generate a title automatically (first user message added)
      if (chatId) {
        const userMessages = newMessages.filter(m => m.role === 'user');
        if (userMessages.length === 1 && (needsTitleGeneration.current || !chatList.find(c => c.id === chatId) || ['New Chat', 'Nova Conversa'].includes(chatList.find(c => c.id === chatId)?.title))) {
          needsTitleGeneration.current = false;
          generateAndUpdateTitle(chatId, userMessages[0].content);
        }
      }
      
      return newMessages;
    });
  }, [generateAndUpdateTitle, updateChatTimestampLocally, chatList]);

  // Update the project associated with a chat
  const updateChatProject = useCallback(async (chatId, projectId) => {
    try {
      const result = await window.electron.chatHistory.updateProject(chatId, projectId);
      if (result) {
        setChatList(prev => prev.map(chat => 
          chat.id === chatId ? { ...chat, projectId: projectId || null } : chat
        ));
        return result;
      }
    } catch (error) {
      console.error('Error updating chat project:', error);
    }
    return null;
  }, []);

  // Rename a chat title
  const renameChat = useCallback(async (chatId, newTitle) => {
    if (!chatId) return null;
    const cleanTitle = (typeof newTitle === 'string' ? newTitle.trim() : '') || 'New Chat';
    try {
      // Optimistically update list
      setChatList(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, title: cleanTitle, updatedAt: new Date().toISOString() } : chat
      ));
      const result = await window.electron.chatHistory.updateTitle(chatId, cleanTitle);
      return result;
    } catch (error) {
      console.error('Error renaming chat:', error);
      await loadChatList();
    }
    return null;
  }, [loadChatList]);

  // Provide the state and methods to children
  const value = {
    messages,
    setMessages: setMessagesWithSave,
    currentChatId,
    chatList,
    isLoadingChats,
    isSidebarCollapsed,
    loadChatList,
    createNewChat,
    loadChat,
    saveCurrentChat,
    deleteChat,
    deleteAllChats,
    clearCurrentChat,
    updateChatProject,
    renameChat,
    startFreshChat,
    toggleSidebar,
    needsTitleGeneration,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Create a custom hook for easy context consumption
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

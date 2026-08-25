const { ipcRenderer, contextBridge, webFrame } = require('electron');

// Chat stream channel names - centralized for consistency
const CHAT_STREAM_CHANNELS = [
  'chat-stream-start',
  'chat-stream-content',
  'chat-stream-tool-calls',
  'chat-stream-reasoning',
  'chat-stream-reasoning-summary',
  'chat-stream-tool-execution',
  'chat-stream-mcp-approval-request',
  'chat-stream-complete',
  'chat-stream-error',
  'chat-stream-cancelled',
  'chat-stream-retry'
];

// Clean up all chat stream listeners - call this before setting up new ones
// This prevents duplicate listeners from accumulating during HMR
function cleanupChatStreamListeners() {
  CHAT_STREAM_CHANNELS.forEach(channel => {
    ipcRenderer.removeAllListeners(channel);
  });
}

contextBridge.exposeInMainWorld('electron', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getSettingsPath: () => ipcRenderer.invoke('get-settings-path'),
  reloadSettings: () => ipcRenderer.invoke('reload-settings'),
  // Chat API - streaming only
  executeToolCall: (toolCall) => ipcRenderer.invoke('execute-tool-call', toolCall),
  testWebSearch: (query, options) => ipcRenderer.invoke('test-web-search', query, options),
  
  // NOTE: sendMcpApprovalResponse removed - Groq does not yet support mcp_approval_response
  
  // Streaming API events
  startChatStream: (messages, model) => {
    // CRITICAL: Clean up any existing listeners BEFORE setting up new ones
    // This prevents duplicate responses when HMR reloads the renderer
    cleanupChatStreamListeners();
    
    // Start a new chat stream
    ipcRenderer.send('chat-stream', messages, model);
    
    // Track registered listeners so we can properly clean them up
    const registeredListeners = new Map();
    
    // Helper to create a listener that properly tracks the wrapper function
    const createListener = (channel) => (callback) => {
      // Create the wrapper function
      const wrapper = (_, data) => callback(data);
      // Store the wrapper so we can remove the exact function later
      if (!registeredListeners.has(channel)) {
        registeredListeners.set(channel, []);
      }
      registeredListeners.get(channel).push(wrapper);
      // Register the listener
      ipcRenderer.on(channel, wrapper);
      // Return cleanup function that removes this specific listener
      return () => {
        ipcRenderer.removeListener(channel, wrapper);
        const listeners = registeredListeners.get(channel);
        if (listeners) {
          const idx = listeners.indexOf(wrapper);
          if (idx !== -1) listeners.splice(idx, 1);
        }
      };
    };
    
    // Setup event listeners for streaming responses
    return {
      onStart: createListener('chat-stream-start'),
      onContent: createListener('chat-stream-content'),
      onToolCalls: createListener('chat-stream-tool-calls'),
      onReasoning: createListener('chat-stream-reasoning'),
      onReasoningSummary: createListener('chat-stream-reasoning-summary'),
      onToolExecution: createListener('chat-stream-tool-execution'),
      onMcpApprovalRequest: createListener('chat-stream-mcp-approval-request'),
      onComplete: createListener('chat-stream-complete'),
      onError: createListener('chat-stream-error'),
      onCancelled: createListener('chat-stream-cancelled'),
      onRetry: createListener('chat-stream-retry'),
      cleanup: () => {
        // Remove all listeners registered through this stream handler
        registeredListeners.forEach((listeners, channel) => {
          listeners.forEach(wrapper => {
            ipcRenderer.removeListener(channel, wrapper);
          });
        });
        registeredListeners.clear();
        // Also do a full cleanup to catch any stragglers
        cleanupChatStreamListeners();
      }
    };
  },
  
  // Stop chat stream
  stopChatStream: () => {
    ipcRenderer.send('stop-chat-stream');
  },
  
  // Clean up all chat stream listeners (useful for HMR and component unmount)
  cleanupChatStreamListeners: () => {
    cleanupChatStreamListeners();
  },

  // Start Multi-Model Comparison Stream
  startCompareChatStream: (messages, modelA, modelB) => {
    ipcRenderer.send('compare-chat-stream', messages, modelA, modelB);
    const createListener = (channel) => (callback) => {
      const wrapper = (_, data) => callback(data);
      ipcRenderer.on(channel, wrapper);
      return () => ipcRenderer.removeListener(channel, wrapper);
    };

    return {
      // Model A
      onStartA: createListener('compare-stream-start-a'),
      onContentA: createListener('compare-stream-content-a'),
      onReasoningA: createListener('compare-stream-reasoning-a'),
      onCompleteA: createListener('compare-stream-complete-a'),
      onErrorA: createListener('compare-stream-error-a'),
      // Model B
      onStartB: createListener('compare-stream-start-b'),
      onContentB: createListener('compare-stream-content-b'),
      onReasoningB: createListener('compare-stream-reasoning-b'),
      onCompleteB: createListener('compare-stream-complete-b'),
      onErrorB: createListener('compare-stream-error-b'),
    };
  },
  
  // MCP related functions
  connectMcpServer: (serverConfig) => ipcRenderer.invoke('connect-mcp-server', serverConfig),
  disconnectMcpServer: (serverId) => ipcRenderer.invoke('disconnect-mcp-server', serverId),
  getMcpTools: () => ipcRenderer.invoke('get-mcp-tools'),
  // Function to get model configurations
  getModelConfigs: () => ipcRenderer.invoke('get-model-configs'),
  // List of supported providers (for the settings UI)
  getProviders: () => ipcRenderer.invoke('get-providers'),
  
  // Add event listener for MCP server status changes
  onMcpServerStatusChanged: (callback) => {
    const listener = (event, status) => callback(status);
    ipcRenderer.on('mcp-server-status-changed', listener);
    // Return a function to remove the listener
    return () => ipcRenderer.removeListener('mcp-server-status-changed', listener);
  },
  
  // MCP Log Handling
  getMcpServerLogs: (serverId) => ipcRenderer.invoke('get-mcp-server-logs', serverId),
  onMcpLogUpdate: (callback) => {
    const listener = (event, { serverId, logChunk }) => callback(serverId, logChunk);
    ipcRenderer.on('mcp-log-update', listener);
    // Return a function to remove the listener
    return () => ipcRenderer.removeListener('mcp-log-update', listener);
  },

  // Auth
  startMcpAuthFlow: (authParams) => ipcRenderer.invoke('start-mcp-auth-flow', authParams),
  onMcpAuthReconnectComplete: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('mcp-auth-reconnect-complete', listener);
    return () => ipcRenderer.removeListener('mcp-auth-reconnect-complete', listener);
  },

  // Google OAuth
  googleOAuth: {
    refresh: () => ipcRenderer.invoke('google-oauth-refresh'),
    getStatus: () => ipcRenderer.invoke('google-oauth-status'),
    validate: () => ipcRenderer.invoke('google-oauth-validate'),
  },

  // --- Context Sharing Functions (Legacy - for URL/CLI context) ---
  getPendingContext: () => ipcRenderer.invoke('get-pending-context'),
  clearContext: () => ipcRenderer.invoke('clear-context'),
  onExternalContext: (callback) => {
    const listener = (event, context) => callback(context);
    ipcRenderer.on('external-context', listener);
    // Return a function to remove the listener
    return () => ipcRenderer.removeListener('external-context', listener);
  },

  // --- Context Capture Functions (New - for global hotkey context) ---
  getCapturedContext: () => ipcRenderer.invoke('get-captured-context'),
  clearCapturedContext: () => ipcRenderer.invoke('clear-captured-context'),
  triggerContextCapture: () => ipcRenderer.invoke('trigger-context-capture'),
  captureManualContext: (text, title, source) => ipcRenderer.invoke('capture-manual-context', text, title, source),
  
  // Event listener for context captured via global hotkey
  onContextCaptured: (callback) => {
    const listener = (event, context) => callback(context);
    ipcRenderer.on('context-captured', listener);
    // Return a function to remove the listener
    return () => ipcRenderer.removeListener('context-captured', listener);
  },

  // --- Popup Window Functions ---
  closePopup: () => ipcRenderer.invoke('close-popup'),
  isPopupOpen: () => ipcRenderer.invoke('is-popup-open'),
  
  // Event listener for popup context (sent when popup opens with context)
  onPopupContext: (callback) => {
    const listener = (event, context) => callback(context);
    ipcRenderer.on('popup-context', listener);
    // Return a function to remove the listener
    return () => ipcRenderer.removeListener('popup-context', listener);
  },

  // Other?
  sendToMain: (channel, data) => ipcRenderer.send(channel, data),
  
  // Custom context menu
  showContextMenu: (items) => ipcRenderer.send('show-context-menu', items),

  // Popup window management
  resizePopup: (width, height, resizable) => ipcRenderer.invoke('resize-popup', { width, height, resizable }),

  // Tool-related IPC
  onToolCall: (callback) => {
    ipcRenderer.on('tool-call', (event, ...args) => callback(...args));
  },

  // Autocomplete
  getAutocompleteSuggestion: (options) => ipcRenderer.invoke('autocomplete:get-suggestion', options),

  // --- Chat History Functions ---
  chatHistory: {
    list: () => ipcRenderer.invoke('chat-history-list'),
    load: (chatId) => ipcRenderer.invoke('chat-history-load', chatId),
    create: (model, useResponsesApi, projectId) => ipcRenderer.invoke('chat-history-create', model, useResponsesApi, projectId),
    save: (chat) => ipcRenderer.invoke('chat-history-save', chat),
    updateMessages: (chatId, messages) => ipcRenderer.invoke('chat-history-update-messages', chatId, messages),
    updateTitle: (chatId, title) => ipcRenderer.invoke('chat-history-update-title', chatId, title),
    updateProject: (chatId, projectId) => ipcRenderer.invoke('chat-history-update-project', chatId, projectId),
    delete: (chatId) => ipcRenderer.invoke('chat-history-delete', chatId),
    deleteAll: () => ipcRenderer.invoke('chat-history-delete-all'),
    clearMessages: (chatId) => ipcRenderer.invoke('chat-history-clear-messages', chatId),
    generateTitle: (userMessage) => ipcRenderer.invoke('chat-history-generate-title', userMessage),
    searchContent: (query) => ipcRenderer.invoke('chat-history-search-content', query),
  },

  // --- Projects Functions ---
  projects: {
    list: () => ipcRenderer.invoke('projects-list'),
    get: (projectId) => ipcRenderer.invoke('projects-get', projectId),
    create: (projectData) => ipcRenderer.invoke('projects-create', projectData),
    update: (projectId, updates) => ipcRenderer.invoke('projects-update', projectId, updates),
    delete: (projectId) => ipcRenderer.invoke('projects-delete', projectId),
  },

  // Audio Transcription (Whisper)
  transcribeAudio: (data) => ipcRenderer.invoke('transcribe-audio', data),

  // Chat Export
  exportChatFile: (data) => ipcRenderer.invoke('export-chat-file', data),

  // Code Runner
  codeRunner: {
    checkRuntimes: () => ipcRenderer.invoke('code-runner-check-runtimes'),
    executeCode: (params) => ipcRenderer.invoke('code-runner-execute', params),
  },

  // --- Local RAG / Knowledge Base Functions ---
  rag: {
    selectFolder: () => ipcRenderer.invoke('rag-select-folder'),
    indexFolder: (folderPath, projectId) => ipcRenderer.invoke('rag-index-folder', folderPath, projectId),
    queryKnowledge: (query, options) => ipcRenderer.invoke('rag-query-knowledge', query, options),
    getProjectStats: (projectId) => ipcRenderer.invoke('rag-get-project-stats', projectId),
    removeFolder: (projectId, folderPath) => ipcRenderer.invoke('rag-remove-folder', projectId, folderPath),
    readFile: (filePath, startLine, endLine) => ipcRenderer.invoke('rag-read-file', filePath, startLine, endLine),
    openFolder: (folderPath) => ipcRenderer.invoke('rag-open-folder', folderPath),
    onIndexingProgress: (callback) => {
      const listener = (_, progress) => callback(progress);
      ipcRenderer.on('rag-indexing-progress', listener);
      return () => ipcRenderer.removeListener('rag-indexing-progress', listener);
    }
  },

  // --- Local AI Providers Auto-Detection ---
  localAi: {
    detect: () => ipcRenderer.invoke('local-ai-detect'),
  },

  // --- Screen Capture (Snip & Ask) ---
  screenCapture: {
    getSources: () => ipcRenderer.invoke('screen-capture-get-sources'),
    captureFullscreen: () => ipcRenderer.invoke('screen-capture-fullscreen'),
  },

  // Generic IPC renderer access (kept for backward compatibility)
  ipcRenderer: {
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  },

  // --- Zoom Controls ---
  zoom: {
    zoomIn: () => {
      const current = webFrame.getZoomLevel();
      const next = Math.min(5, Number((current + 0.5).toFixed(1)));
      webFrame.setZoomLevel(next);
      try {
        localStorage.setItem('neochat_zoom_level', String(next));
      } catch (_e) {
        // Ignore localStorage error
      }
      return next;
    },
    zoomOut: () => {
      const current = webFrame.getZoomLevel();
      const next = Math.max(-5, Number((current - 0.5).toFixed(1)));
      webFrame.setZoomLevel(next);
      try {
        localStorage.setItem('neochat_zoom_level', String(next));
      } catch (_e) {
        // Ignore localStorage error
      }
      return next;
    },
    resetZoom: () => {
      webFrame.setZoomLevel(0);
      try {
        localStorage.setItem('neochat_zoom_level', '0');
      } catch (_e) {
        // Ignore localStorage error
      }
      return 0;
    },
    getZoomLevel: () => webFrame.getZoomLevel(),
    setZoomLevel: (level) => {
      webFrame.setZoomLevel(level);
      try {
        localStorage.setItem('neochat_zoom_level', String(level));
      } catch (_e) {
        // Ignore localStorage error
      }
    },
    getZoomFactor: () => webFrame.getZoomFactor(),
    setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  },
});

// Restore saved zoom level on startup
try {
  const savedZoom = localStorage.getItem('neochat_zoom_level');
  if (savedZoom !== null) {
    const parsed = parseFloat(savedZoom);
    if (!isNaN(parsed) && parsed >= -5 && parsed <= 5) {
      webFrame.setZoomLevel(parsed);
    }
  }
} catch (_e) {
  // Ignore localStorage access errors during early init
}

// Global keyboard shortcuts for zoom in / zoom out / zoom reset
// Fixes Ctrl/Cmd + Shift + - not zooming out across various keyboard layouts
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    // Zoom In: Ctrl/Cmd + '+' or '=' (with or without Shift) or NumpadAdd
    if (e.key === '+' || e.key === '=' || e.code === 'Equal' || e.code === 'NumpadAdd') {
      e.preventDefault();
      const current = webFrame.getZoomLevel();
      const next = Math.min(5, Number((current + 0.5).toFixed(1)));
      webFrame.setZoomLevel(next);
      try {
        localStorage.setItem('neochat_zoom_level', String(next));
      } catch (_err) {
        // Ignore localStorage error
      }
    }
    // Zoom Out: Ctrl/Cmd + '-' or '_' (with or without Shift) or NumpadSubtract
    else if (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      const current = webFrame.getZoomLevel();
      const next = Math.max(-5, Number((current - 0.5).toFixed(1)));
      webFrame.setZoomLevel(next);
      try {
        localStorage.setItem('neochat_zoom_level', String(next));
      } catch (_err) {
        // Ignore localStorage error
      }
    }
    // Reset Zoom: Ctrl/Cmd + '0', Digit0, or Numpad0
    else if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
      e.preventDefault();
      webFrame.setZoomLevel(0);
      try {
        localStorage.setItem('neochat_zoom_level', '0');
      } catch (_err) {
        // Ignore localStorage error
      }
    }
  }
}); 
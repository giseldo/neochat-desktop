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
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openExternal: (url) => ipcRenderer.invoke('browser:open-external', { url }),
  openHtmlInBrowser: (html, title) => ipcRenderer.invoke('browser:open-html', { html, title }),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getSettingsPath: () => ipcRenderer.invoke('get-settings-path'),
  reloadSettings: () => ipcRenderer.invoke('reload-settings'),
  configDir: {
    getInfo: () => ipcRenderer.invoke('config-dir-get-info'),
    selectFolder: () => ipcRenderer.invoke('config-dir-select-folder'),
    changeFolder: (options) => ipcRenderer.invoke('config-dir-change-folder', options),
    resetFolder: (options) => ipcRenderer.invoke('config-dir-reset-folder', options),
    openFolder: () => ipcRenderer.invoke('config-dir-open-folder'),
  },
  backup: {
    export: () => ipcRenderer.invoke('backup-export'),
    import: () => ipcRenderer.invoke('backup-import')
  },
  workflows: {
    list: () => ipcRenderer.invoke('workflows-list'),
    save: (workflow) => ipcRenderer.invoke('workflows-save', workflow),
    delete: (id) => ipcRenderer.invoke('workflows-delete', id),
    buildPrompt: (id, variables) => ipcRenderer.invoke('workflows-build-prompt', id, variables),
    startWebhook: (port) => ipcRenderer.invoke('workflows-start-webhook', port),
    stopWebhook: () => ipcRenderer.invoke('workflows-stop-webhook')
  },
  schedules: {
    list: () => ipcRenderer.invoke('schedules-list'),
    save: (schedule) => ipcRenderer.invoke('schedules-save', schedule),
    delete: (id) => ipcRenderer.invoke('schedules-delete', id),
    onRun: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('workflow-scheduled-run', listener);
      return () => ipcRenderer.removeListener('workflow-scheduled-run', listener);
    }
  },
  updater: {
    getStatus: () => ipcRenderer.invoke('updater-get-status'),
    check: () => ipcRenderer.invoke('updater-check'),
    download: () => ipcRenderer.invoke('updater-download'),
    install: () => ipcRenderer.invoke('updater-install'),
    onStatus: (callback) => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('updater-status', listener);
      return () => ipcRenderer.removeListener('updater-status', listener);
    }
  },
  observability: {
    getSummary: () => ipcRenderer.invoke('observability-summary'),
    export: format => ipcRenderer.invoke('observability-export', format)
  },
  git: {
    selectRepository: () => ipcRenderer.invoke('git-select-repository'),
    status: repoPath => ipcRenderer.invoke('git-status', repoPath),
    diff: repoPath => ipcRenderer.invoke('git-diff', repoPath),
    commit: (repoPath, message) => ipcRenderer.invoke('git-commit', repoPath, message),
    push: repoPath => ipcRenderer.invoke('git-push', repoPath)
  },
  toolPermissions: {
    get: () => ipcRenderer.invoke('tool-permissions-get'),
    resolve: (toolName, serverLabel) => ipcRenderer.invoke('tool-permissions-resolve', toolName, serverLabel),
    set: (toolName, policy, serverLabel) => ipcRenderer.invoke('tool-permissions-set', { toolName, policy, serverLabel }),
    setGlobal: (updates) => ipcRenderer.invoke('tool-permissions-set-global', updates),
    reset: () => ipcRenderer.invoke('tool-permissions-reset')
  },
  // Modular Plugins & Micro-Kernel System API
  plugins: {
    list: () => ipcRenderer.invoke('plugins:list'),
    toggle: (pluginId, enabled) => ipcRenderer.invoke('plugins:toggle', { pluginId, enabled }),
    installFromUrl: (url) => ipcRenderer.invoke('plugins:install-url', url),
    configure: (pluginId, config) => ipcRenderer.invoke('plugins:configure', { pluginId, config }),
    remove: (pluginId) => ipcRenderer.invoke('plugins:remove', pluginId),
  },
  // AI Skills System API (Catalog, Custom, Import/Export, Execution)
  skills: {
    list: (workspaceRoot) => ipcRenderer.invoke('skills:list', workspaceRoot),
    getCatalog: () => ipcRenderer.invoke('skills:get-catalog'),
    installFromCatalog: (catalogId) => ipcRenderer.invoke('skills:install-from-catalog', catalogId),
    create: (skillData) => ipcRenderer.invoke('skills:create', skillData),
    update: (skillData) => ipcRenderer.invoke('skills:update', skillData),
    delete: (skillId) => ipcRenderer.invoke('skills:delete', skillId),
    toggle: (skillId, enabled) => ipcRenderer.invoke('skills:toggle', { skillId, enabled }),
    importFile: () => ipcRenderer.invoke('skills:import-file'),
    importContent: (content, filename) => ipcRenderer.invoke('skills:import-content', { content, filename }),
    importUrl: (url) => ipcRenderer.invoke('skills:import-url', url),
    export: (skillId, format) => ipcRenderer.invoke('skills:export', { skillId, format }),
    getActive: (workspaceRoot) => ipcRenderer.invoke('skills:get-active', workspaceRoot),
  },
  // Arena & Multi-Model Debate API
  arena: {
    runDebate: (params) => ipcRenderer.invoke('arena:run-debate', params),
    runConsensus: (params) => ipcRenderer.invoke('arena:run-consensus', params),
    onEvent: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('arena:event', handler);
      return () => ipcRenderer.removeListener('arena:event', handler);
    }
  },
  // Web Sandbox & Live Preview API
  livePreview: {
    bundle: (params) => ipcRenderer.invoke('live-preview:bundle', params)
  },
  // Podcast Studio API
  podcast: {
    generateScript: (params) => ipcRenderer.invoke('podcast:generate-script', params)
  },
  // Knowledge Graph & Data Studio API
  knowledgeGraph: {
    getData: (params) => ipcRenderer.invoke('knowledge-graph:get-data', params),
    parseTable: (rawText) => ipcRenderer.invoke('data-studio:parse-table', { rawText })
  },
  // Proactive Daily Briefing API
  dailyBriefing: {
    get: (params) => ipcRenderer.invoke('daily-briefing:get', params)
  },
  // MCP Hub API
  mcpHub: {
    listServers: (options) => ipcRenderer.invoke('mcp-hub:list-servers', options),
    listRecipes: () => ipcRenderer.invoke('mcp-hub:list-recipes'),
    install: (params) => ipcRenderer.invoke('mcp-hub:install', params),
    installCustom: (params) => ipcRenderer.invoke('mcp-hub:install-custom', params)
  },
  assistants: {
    list: (locale, forceRefresh = false) => ipcRenderer.invoke('assistants:list', { locale, forceRefresh }),
    detail: (identifier, locale) => ipcRenderer.invoke('assistants:detail', { identifier, locale }),
  },
  relatedQuestions: {
    generate: (payload) => ipcRenderer.invoke('related-questions:generate', payload),
  },
  // Computer Vision API
  vision: {
    captureScreen: (displayId) => ipcRenderer.invoke('vision:capture-screen', displayId),
    analyzeScreen: (params) => ipcRenderer.invoke('vision:analyze-screen', params)
  },
  // Neo Agent Runtime API
  agent: {
    createSession: (options) => ipcRenderer.invoke('agent:create-session', options),
    prompt: (sessionId, message, options) => ipcRenderer.invoke('agent:prompt', sessionId, message, options),
    approveTool: (sessionId, callId, alwaysAllow) => ipcRenderer.invoke('agent:approve-tool', sessionId, callId, alwaysAllow),
    rejectTool: (sessionId, callId, reason) => ipcRenderer.invoke('agent:reject-tool', sessionId, callId, reason),
    cancel: (sessionId) => ipcRenderer.invoke('agent:cancel', sessionId),
    rollback: (sessionId) => ipcRenderer.invoke('agent:rollback', sessionId),
    getSession: (sessionId) => ipcRenderer.invoke('agent:get-session', sessionId),
    getTrajectory: (sessionId, options) => ipcRenderer.invoke('agent:get-trajectory', sessionId, options),
    getWorkspaceInfo: (workspaceRoot) => ipcRenderer.invoke('agent:get-workspace-info', workspaceRoot),
    getWorkspaceTree: (workspaceRoot, options) => ipcRenderer.invoke('agent:get-workspace-tree', workspaceRoot, options),
    readWorkspaceFile: (workspaceRoot, filePath) => ipcRenderer.invoke('agent:read-workspace-file', workspaceRoot, filePath),
    revealInExplorer: (targetPath) => ipcRenderer.invoke('agent:reveal-in-explorer', targetPath),
    openPath: (folderPath) => ipcRenderer.invoke('agent:open-path', folderPath),
    listHarnesses: () => ipcRenderer.invoke('agent:list-harnesses'),
    selectWorkspace: () => ipcRenderer.invoke('agent:select-workspace'),
    onEvent: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('agent:event', handler);
      return () => ipcRenderer.removeListener('agent:event', handler);
    },
    swarm: {
      getRoles: () => ipcRenderer.invoke('agent:swarm:get-roles'),
      run: (options) => ipcRenderer.invoke('agent:swarm:run', options),
      cancel: (swarmId) => ipcRenderer.invoke('agent:swarm:cancel', swarmId),
      onEvent: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('agent:swarm:event', handler);
        return () => ipcRenderer.removeListener('agent:swarm:event', handler);
      }
    }
  },
  // Chat API - streaming only
  executeToolCall: (toolCall) => ipcRenderer.invoke('execute-tool-call', toolCall),
  testWebSearch: (query, options) => ipcRenderer.invoke('test-web-search', query, options),
  generateImage: (options) => ipcRenderer.invoke('generate-image', options),
  saveImage: (options) => ipcRenderer.invoke('save-image', options),
  
  // NOTE: sendMcpApprovalResponse removed - Groq does not yet support mcp_approval_response
  
  // Streaming API events
  startChatStream: (messages, model, options = {}) => {
    // CRITICAL: Clean up any existing listeners BEFORE setting up new ones
    // This prevents duplicate responses when HMR reloads the renderer
    cleanupChatStreamListeners();
    
    // Start a new chat stream
    ipcRenderer.send('chat-stream', messages, model, options);
    
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
  getModelConfigs: (forceRefresh = false) => ipcRenderer.invoke('get-model-configs', forceRefresh),
  // List of supported providers (for the settings UI)
  getProviders: () => ipcRenderer.invoke('get-providers'),
  // Test connection to a provider
  testProvider: (params) => ipcRenderer.invoke('test-provider', params),
  
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

  // --- Popup Window & Global Shortcut Functions ---
  closePopup: () => ipcRenderer.invoke('close-popup'),
  isPopupOpen: () => ipcRenderer.invoke('is-popup-open'),
  togglePopup: () => ipcRenderer.invoke('toggle-popup'),
  updateGlobalShortcut: (shortcut, enabled) => ipcRenderer.invoke('update-global-shortcut', { shortcut, enabled }),
  getGlobalShortcutStatus: () => ipcRenderer.invoke('get-global-shortcut-status'),
  
  // Event listener for popup context (sent when popup opens with context)
  onPopupContext: (callback) => {
    const listener = (event, context) => callback(context);
    ipcRenderer.on('popup-context', listener);
    // Return a function to remove the listener
    return () => ipcRenderer.removeListener('popup-context', listener);
  },

  // Custom context menu
  showContextMenu: (items) => ipcRenderer.send('show-context-menu', items),

  // Popup window management
  resizePopup: (width, height, resizable) => ipcRenderer.invoke('resize-popup', { width, height, resizable }),

  // Tool-related IPC
  onToolCall: (callback) => {
    ipcRenderer.on('tool-call', (event, ...args) => callback(...args));
  },

  // --- Chat History Functions ---
  chatHistory: {
    list: () => ipcRenderer.invoke('chat-history-list'),
    load: (chatId) => ipcRenderer.invoke('chat-history-load', chatId),
    create: (model, useResponsesApi, projectId, personaId) => ipcRenderer.invoke('chat-history-create', model, useResponsesApi, projectId, personaId),
    branch: (chatId, messageIndex) => ipcRenderer.invoke('chat-history-branch', chatId, messageIndex),
    save: (chat) => ipcRenderer.invoke('chat-history-save', chat),
    updateMessages: (chatId, messages) => ipcRenderer.invoke('chat-history-update-messages', chatId, messages),
    saveMessages: (chatId, messages) => ipcRenderer.invoke('chat-history-update-messages', chatId, messages),
    updateTitle: (chatId, title) => ipcRenderer.invoke('chat-history-update-title', chatId, title),
    updateProject: (chatId, projectId) => ipcRenderer.invoke('chat-history-update-project', chatId, projectId),
    updatePersona: (chatId, personaId) => ipcRenderer.invoke('chat-history-update-persona', chatId, personaId),
    updateCanvas: (chatId, canvasDoc) => ipcRenderer.invoke('chat-history-update-canvas', chatId, canvasDoc),
    delete: (chatId) => ipcRenderer.invoke('chat-history-delete', chatId),
    deleteAll: () => ipcRenderer.invoke('chat-history-delete-all'),
    clearMessages: (chatId) => ipcRenderer.invoke('chat-history-clear-messages', chatId),
    generateTitle: (userMessage, model) => ipcRenderer.invoke('chat-history-generate-title', userMessage, model),
    searchContent: (query) => ipcRenderer.invoke('chat-history-search-content', query),
    togglePin: (chatId, isPinned) => ipcRenderer.invoke('chat-history-toggle-pin', chatId, isPinned),
    toggleArchive: (chatId, isArchived) => ipcRenderer.invoke('chat-history-toggle-archive', chatId, isArchived),
  },

  // --- Canvas Functions ---
  canvas: {
    computeDiff: (oldText, newText) => ipcRenderer.invoke('canvas-compute-diff', { oldText, newText }),
    calculateStats: (content) => ipcRenderer.invoke('canvas-calculate-stats', { content }),
    exportPdf: (data) => ipcRenderer.invoke('canvas-export-pdf', data),
    exportDocx: (data) => ipcRenderer.invoke('canvas-export-docx', data),
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

  // --- User Persistent Long-Term Memory ---
  memory: {
    getAll: () => ipcRenderer.invoke('memory-get-all'),
    getStats: () => ipcRenderer.invoke('memory-get-stats'),
    add: (content, category, source) => ipcRenderer.invoke('memory-add', content, category, source),
    update: (id, updates) => ipcRenderer.invoke('memory-update', id, updates),
    delete: (id) => ipcRenderer.invoke('memory-delete', id),
    clear: () => ipcRenderer.invoke('memory-clear'),
    export: (options) => ipcRenderer.invoke('memory-export', options),
    import: (options) => ipcRenderer.invoke('memory-import', options),
    onMemoryUpdated: (callback) => {
      const listener = (_, data) => callback(data);
      ipcRenderer.on('memory-updated', listener);
      return () => ipcRenderer.removeListener('memory-updated', listener);
    }
  },

  // Generic IPC renderer access (kept for backward compatibility)
  ipcRenderer: {
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  },

  // --- Interactive Terminal ---
  terminal: {
    createSession: (options) => ipcRenderer.invoke('terminal:create', options),
    listSessions: () => ipcRenderer.invoke('terminal:list'),
    exec: (sessionId, command, cwd) => ipcRenderer.invoke('terminal:exec', { sessionId, command, cwd }),
    write: (sessionId, data) => ipcRenderer.invoke('terminal:write', { sessionId, data }),
    kill: (sessionId) => ipcRenderer.invoke('terminal:kill', { sessionId }),
    clear: (sessionId) => ipcRenderer.invoke('terminal:clear', { sessionId }),
    destroySession: (sessionId) => ipcRenderer.invoke('terminal:destroy', { sessionId }),
    getBuffer: (sessionId) => ipcRenderer.invoke('terminal:get-buffer', { sessionId }),
    onData: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('terminal:data', listener);
      return () => ipcRenderer.removeListener('terminal:data', listener);
    }
  },

  // --- Background Tasks ---
  tasks: {
    list: () => ipcRenderer.invoke('tasks:list'),
    run: (options) => ipcRenderer.invoke('tasks:run', options),
    kill: (taskId) => ipcRenderer.invoke('tasks:kill', { taskId }),
    getLogs: (taskId) => ipcRenderer.invoke('tasks:get-logs', { taskId }),
    clear: () => ipcRenderer.invoke('tasks:clear'),
    onUpdate: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('tasks:event', listener);
      return () => ipcRenderer.removeListener('tasks:event', listener);
    }
  },

  // --- AI News & Discovery ---
  news: {
    getFeed: (params) => ipcRenderer.invoke('news:get-feed', params),
    getArticle: (articleId) => ipcRenderer.invoke('news:get-article', { articleId }),
    toggleFavorite: (articleId) => ipcRenderer.invoke('news:toggle-favorite', { articleId }),
    getFavorites: () => ipcRenderer.invoke('news:get-favorites'),
    askFollowUp: (payload) => ipcRenderer.invoke('news:ask-followup', payload),
    refresh: (params) => ipcRenderer.invoke('news:refresh', params)
  },

  // --- Browser Helpers ---
  browser: {
    fetchPage: (url, timeoutMs) => ipcRenderer.invoke('browser:fetch-page', { url, timeoutMs }),
    openPopout: (url) => ipcRenderer.invoke('browser:open-popout', { url }),
    openExternal: (url) => ipcRenderer.invoke('browser:open-external', { url }),
    openHtml: (html, title) => ipcRenderer.invoke('browser:open-html', { html, title })
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

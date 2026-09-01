const { app, safeStorage } = require('electron');
const fs   = require('fs');
const path = require('path');
const { globalShortcut } = require('electron');
const configDirManager = require('./configDirManager');

// Set application name early so default userData path resolves to neochat-desktop
app.name = 'neochat-desktop';
if (typeof app.setName === 'function') {
  app.setName('neochat-desktop');
}

// Check and bootstrap custom userData path before logs or other services initialize
configDirManager.bootstrapUserDataPath(app);

// Create ~/Library/Logs/Groq Desktop if it does not exist
app.setAppLogsPath();
const logFile = path.join(app.getPath('logs'), 'main.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Mirror every console.* call to the file
['log', 'info', 'warn', 'error'].forEach(fn => {
  const orig = console[fn].bind(console);
  console[fn] = (...args) => {
    orig(...args);
    logStream.write(args.map(String).join(' ') + '\n');
  };
});

console.log('NeoChat Desktop started, logging to', logFile);

// Import necessary Electron modules
const { BrowserWindow, ipcMain, screen, shell, dialog, Notification } = require('electron');

// Import shared models
const { MODEL_CONTEXT_SIZES, getModelContextSizes, getModelsFromAPIWithCache } = require('../shared/models.js');
const { PROVIDER_LIST, getAllProviders, getActiveProvider, getActiveApiKey, getProviderBaseUrl, getModelsUrl, getActiveProviders, getConfiguredProviders, getApiKeyForProvider, getBaseUrlForProvider, getModelsUrlForProvider, getProviderById, isProviderConfigured, isProviderEnabled } = require('../shared/providers.js');

// Import handlers
const chatHandler = require('./chatHandler');
const toolHandler = require('./toolHandler');

// Import core manager modules
const { initializeSettingsHandlers, loadSettings, saveSettings } = require('./settingsManager');
const { initializeCommandResolver } = require('./commandResolver');
const mcpManager = require('./mcpManager');
const { initializeWindowManager } = require('./windowManager');
const googleOAuthManager = require('./googleOAuthManager');
const { initializeToolPermissionHandlers } = require('./toolPermissionManager');
const { autoUpdater } = require('electron-updater');
const { initializeUpdateManager } = require('./updateManager');
const { pluginManager } = require('./pluginManager');

// Import context capture system
const ContextCapture = require('./contextCapture');
const PopupWindowManager = require('./popupWindow');

// Import chat history and project managers
const chatHistoryManager = require('./chatHistoryManager');
const projectManager = require('./projectManager');

// Import Neo Agent Runtime
const { neoAgentRuntime } = require('./agent');
const {
  assertCallId,
  assertSessionId,
  validateAgentOptions,
  validateMessage
} = require('./agent/ipcValidation');

// Global variable to hold the main window instance
let mainWindow;

// Variable to hold loaded model context sizes
let modelContextSizes = {};

// --- Context Sharing State ---
let pendingContext = null; // Holds context to be passed to renderer
let contextCapture = null; // Context capture instance
let lastCapturedContext = null; // Store the most recent captured context
let popupWindowManager = null; // Popup window manager instance
const agentSessionOwners = new Map(); // sessionId -> renderer webContents id

function claimAgentSession(event, sessionId) {
  const ownerId = agentSessionOwners.get(sessionId);
  if (ownerId !== undefined && ownerId !== event.sender.id) {
    throw new Error('Agent session belongs to another renderer.');
  }
  agentSessionOwners.set(sessionId, event.sender.id);
}

function requireAgentSessionOwner(event, sessionId) {
  const ownerId = agentSessionOwners.get(sessionId);
  if (ownerId === undefined || ownerId !== event.sender.id) {
    throw new Error('Renderer is not authorized for this agent session.');
  }
}

function handleUrlProtocol(url) {
  // Handle groq://context?text=...&title=... URLs
  if (!url.startsWith('groq://')) return null;
  
  try {
    const urlObj = new URL(url);
    if (urlObj.pathname === '/context') {
      const context = {};
      
      if (urlObj.searchParams.has('text')) {
        context.text = decodeURIComponent(urlObj.searchParams.get('text'));
      }
      if (urlObj.searchParams.has('title')) {
        context.title = decodeURIComponent(urlObj.searchParams.get('title'));
      }
      if (urlObj.searchParams.has('source')) {
        context.source = decodeURIComponent(urlObj.searchParams.get('source'));
      }
      
      return Object.keys(context).length > 0 ? context : null;
    }
  } catch (error) {
    console.error('Error parsing URL protocol:', error);
  }
  
  return null;
}

function setContextForRenderer(context) {
  pendingContext = context;
  
  // If main window is already created, send the context immediately
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('external-context', context);
  }
}

// --- Context Capture Functions ---
function getContextCaptureCallback() {
  return (capturedContext) => {
    console.log('[Main] Context captured via global hotkey:', capturedContext);
    lastCapturedContext = capturedContext;
    
    // Check if popup is enabled in settings
    const settings = loadSettings();
    if (settings.popupEnabled === false) {
      console.log('[Main] Popup is disabled in settings. Focusing main window.');
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        if (mainWindow.webContents) {
          mainWindow.webContents.send('context-captured', capturedContext);
        }
      }
      return;
    }

    // Toggle/Open popup window with captured context
    try {
      const mousePosition = screen.getCursorScreenPoint();
      if (popupWindowManager) {
        popupWindowManager.togglePopup(capturedContext, mousePosition);
        console.log('[Main] Popup window toggled/opened with context');
      }
    } catch (error) {
      console.error('[Main] Error opening popup window:', error);
    }
    
    // Also notify main window if it exists
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('context-captured', capturedContext);
    }
  };
}

function initializeContextCapture() {
  contextCapture = new ContextCapture();
  popupWindowManager = new PopupWindowManager();
  
  const settings = loadSettings();
  const shortcut = settings.popupShortcut || 'CommandOrControl+Shift+Space';
  const enabled = settings.popupEnabled !== false;

  if (!enabled) {
    console.log('[Main] Context capture hotkey disabled in settings.');
    return { success: true, disabled: true };
  }

  const result = contextCapture.registerGlobalHotkey(getContextCaptureCallback(), shortcut);
  return result;
}

function reconfigureGlobalShortcut(shortcut, enabled = true) {
  if (!contextCapture) {
    contextCapture = new ContextCapture();
  }
  if (!popupWindowManager) {
    popupWindowManager = new PopupWindowManager();
  }

  if (enabled === false) {
    contextCapture.unregisterGlobalHotkey();
    return { success: true, disabled: true, accelerator: null };
  }

  const effectiveShortcut = shortcut || 'CommandOrControl+Shift+Space';
  return contextCapture.registerGlobalHotkey(getContextCaptureCallback(), effectiveShortcut);
}

function cleanupContextCapture() {
  if (contextCapture) {
    contextCapture.unregisterGlobalHotkey();
    contextCapture = null;
  }
  
  if (popupWindowManager) {
    popupWindowManager.closePopup();
    popupWindowManager = null;
  }
}

// Register URL protocol handler
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('groq', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('groq');
}

// Handle protocol on Windows/Linux
app.on('second-instance', (event, commandLine) => {
  // Someone tried to run a second instance, focus our window instead
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  
  // Check if there's a protocol URL in the command line
  const protocolUrl = commandLine.find(arg => arg.startsWith('groq://'));
  if (protocolUrl) {
    const context = handleUrlProtocol(protocolUrl);
    if (context) {
      console.log('Received context from protocol URL:', context);
      setContextForRenderer(context);
    }
  }
});

// Handle protocol on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  const context = handleUrlProtocol(url);
  if (context) {
    console.log('Received context from protocol URL:', context);
    setContextForRenderer(context);
  }
});

// App initialization sequence
app.whenReady().then(async () => {
  console.log("App Ready. Initializing...");

  // Initialize command resolver first (might be needed by others)
  initializeCommandResolver(app);

  // Load model context sizes from the active provider's API
  try {
    const currentSettings = loadSettings();
    const apiKey = getActiveApiKey(currentSettings);
    const modelsUrl = getModelsUrl(currentSettings);
    if (apiKey && modelsUrl) {
      console.log(`Fetching models from provider API...`);
      modelContextSizes = await getModelsFromAPIWithCache(apiKey, modelsUrl);
      console.log('Successfully loaded models from API.');
    } else {
      console.warn('No valid API key found, using default model configuration.');
      modelContextSizes = MODEL_CONTEXT_SIZES;
    }
  } catch (error) {
    console.error('Failed to load models from API:', error);
    modelContextSizes = MODEL_CONTEXT_SIZES; // Fallback
  }

  // Helper to fetch and merge all models across active providers with unique keys
  async function getMergedModelConfigs(currentSettings) {
    const activeProviders = getActiveProviders(currentSettings);
    let allApiModels = {};

    for (const provider of activeProviders) {
      const apiKey = getApiKeyForProvider(currentSettings, provider.id);
      const modelsUrl = getModelsUrlForProvider(currentSettings, provider.id);
      
      if (modelsUrl && (apiKey || provider.requiresApiKey === false)) {
        try {
          const providerModels = await getModelsFromAPIWithCache(
            apiKey,
            modelsUrl,
            false,
            { providerId: provider.id, providerName: provider.name }
          );
          if (providerModels) {
            Object.entries(providerModels).forEach(([id, cfg]) => {
              if (id !== 'default') {
                const modelKey = `${provider.id}::${id}`;
                allApiModels[modelKey] = {
                  ...cfg,
                  id: id,
                  rawModelId: id,
                  modelKey: modelKey,
                  provider: provider.id,
                  group: provider.name || provider.id,
                  displayName: cfg.displayName || id
                };
              }
            });
          }
        } catch (error) {
          console.warn(`[get-model-configs] Failed to fetch models for ${provider.name}:`, error.message);
        }
      }
    }

    if (Object.keys(allApiModels).length === 0) {
      allApiModels = modelContextSizes;
    }
    
    return getModelContextSizes(currentSettings.customModels || {}, allApiModels);
  }

  // --- Early IPC Handlers required by popup and renderer before other init --- //
  ipcMain.handle('get-model-configs', async () => {
    // Return a copy to prevent accidental modification with custom models merged in
    const currentSettings = loadSettings();
    const mergedModelContextSizes = await getMergedModelConfigs(currentSettings);
    return JSON.parse(JSON.stringify(mergedModelContextSizes));
  });

  // Return the list of supported and custom providers (for the settings UI)
  ipcMain.handle('get-providers', async () => {
    const currentSettings = loadSettings();
    const allProviders = getAllProviders(currentSettings);
    return JSON.parse(JSON.stringify(allProviders.map(p => ({
      ...p,
      isConfigured: isProviderConfigured(currentSettings, p.id),
      isEnabled: isProviderEnabled(currentSettings, p.id),
      isPrimary: (currentSettings.provider || 'groq') === p.id,
      isFallback: Array.isArray(currentSettings.fallbackProviders) && currentSettings.fallbackProviders.includes(p.id),
      apiKey: getApiKeyForProvider(currentSettings, p.id) || '',
      baseUrl: getBaseUrlForProvider(currentSettings, p.id) || p.baseUrl || ''
    }))));
  });

  // Test connection to a specific provider
  ipcMain.handle('test-provider', async (event, { providerId, apiKey: overrideApiKey, baseUrl: overrideBaseUrl } = {}) => {
    const currentSettings = loadSettings();
    const provider = getProviderById(providerId, currentSettings);
    const apiKey = overrideApiKey !== undefined ? overrideApiKey : getApiKeyForProvider(currentSettings, providerId);
    let modelsUrl = getModelsUrlForProvider(currentSettings, providerId);
    if (overrideBaseUrl && overrideBaseUrl.trim()) {
      modelsUrl = `${overrideBaseUrl.trim().replace(/\/+$/, '')}/models`;
    }

    if (!modelsUrl) {
      return { success: false, error: 'URL do endpoint /models não configurada.' };
    }

    const startTime = Date.now();
    try {
      const { fetchModelsFromAPI } = require('../shared/models.js');
      const response = await fetchModelsFromAPI(apiKey, modelsUrl, { timeout: 8000 });
      const latencyMs = Date.now() - startTime;
      if (response && Array.isArray(response.data)) {
        return { success: true, count: response.data.length, latencyMs };
      }
      return { success: true, count: 0, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      return { success: false, error: err.message || String(err), latencyMs };
    }
  });

  ipcMain.handle('get-captured-context', async () => {
    // Return the most recently captured context
    const context = lastCapturedContext;
    // Don't clear automatically for popup usage
    return context;
  });

  ipcMain.handle('resize-popup', (event, { width, height, resizable }) => {
    if (popupWindowManager) {
      popupWindowManager.resizePopup(width, height, resizable);
    }
  });

  // Initialize window manager and get the main window instance
  mainWindow = initializeWindowManager(app, screen, shell, BrowserWindow);
  if (!mainWindow) {
      console.error("Fatal: Main window could not be created. Exiting.");
      app.quit();
      return;
  }

  // When the main window is closed, deregister its reference
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Send pending context to renderer if available
  if (pendingContext) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('external-context', pendingContext);
    });
  }

  // Initialize context capture system
  const contextCaptureSuccess = initializeContextCapture();
  if (contextCaptureSuccess) {
    console.log('Context capture system initialized successfully');
    console.log('Press Cmd+G (Mac) or Ctrl+G (Windows/Linux) from any app to open popup with context');
  } else {
    console.warn('Context capture system failed to initialize');
  }

  // Initialize settings handlers (needs app)
  initializeSettingsHandlers(ipcMain, app, safeStorage);
  configDirManager.registerHandlers(ipcMain, app, dialog, shell, () => mainWindow, async (newPath, oldPath) => {
    console.log(`[Main] UserData directory changed from ${oldPath} to ${newPath}`);
    const { reinitialize } = require('./settingsManager');
    if (typeof reinitialize === 'function') {
      reinitialize(safeStorage);
    }
  });
  initializeToolPermissionHandlers(ipcMain, loadSettings, saveSettings);
  initializeUpdateManager({ ipcMain, app, autoUpdater, getWindow: () => mainWindow, loadSettings });

  // Initialize chat history manager
  chatHistoryManager.initialize(app, loadSettings);
  chatHistoryManager.initializeChatHistoryHandlers(ipcMain);
  console.log("[Main Init] Chat history manager initialized");

  // Initialize project manager
  projectManager.initialize(app, chatHistoryManager);
  projectManager.initializeProjectHandlers(ipcMain);
  console.log("[Main Init] Project manager initialized");

  // Initialize Google OAuth Manager
  console.log("[Main Init] Initializing Google OAuth Manager...");
  googleOAuthManager.initialize(app, saveSettings);

  // --- Google OAuth IPC Handlers --- //
  ipcMain.handle('google-oauth-refresh', async () => {
    console.log('[Main] Manual Google OAuth token refresh requested');
    return googleOAuthManager.manualRefresh();
  });

  ipcMain.handle('google-oauth-status', async () => {
    const currentSettings = loadSettings();
    return googleOAuthManager.getTokenStatus(currentSettings);
  });

  ipcMain.handle('google-oauth-validate', async () => {
    const currentSettings = loadSettings();
    return googleOAuthManager.validateCredentials(currentSettings);
  });

  // --- Initialize Modular Plugin Subsystem (Micro-Kernel Architecture) --- //
  console.log("[Main Init] Initializing Plugin Manager...");
  await pluginManager.initialize({
    app,
    ipcMain,
    getMainWindow: () => mainWindow,
    dialog,
    shell,
    loadSettings,
    saveSettings
  });

  // --- Register Core App IPC Handlers --- //
  // Chat completion (use module object)
  ipcMain.on('chat-stream', async (event, messages, model, options = {}) => {
    const loadedSettings = loadSettings();
    const currentSettings = {
      ...loadedSettings,
      ...options,
      webSearch: {
        ...(loadedSettings.webSearch || {}),
        enabled: options.webSearchActive !== undefined ? Boolean(options.webSearchActive) : (loadedSettings.webSearch?.enabled === true)
      },
      isCanvasOpen: Boolean(options.isCanvasOpen),
      activeCanvasDoc: options.canvasDoc || null,
      selectedCanvasText: options.selectedCanvasText || '',
      activeProject: options.activeProject || null,
      agentMode: Boolean(options.agentModeActive)
    };
    const { discoveredTools } = mcpManager.getMcpState(); // Use module object
    
    // Load fresh merged models across all active providers
    const mergedModelContextSizes = await getMergedModelConfigs(currentSettings);
    
    chatHandler.handleChatStream(event, messages, model, currentSettings, mergedModelContextSizes, discoveredTools);
  });

  // Compare chat stream for side-by-side multi-model comparison
  ipcMain.on('compare-chat-stream', async (event, messages, modelA, modelB) => {
    const currentSettings = loadSettings();
    const mergedModelContextSizes = await getMergedModelConfigs(currentSettings);
    chatHandler.handleCompareChatStream(event, messages, modelA, modelB, currentSettings, mergedModelContextSizes);
  });

  // Stop chat stream
  ipcMain.on('stop-chat-stream', async (event) => {
    console.log('[Main] Received stop-chat-stream request');
    chatHandler.stopChatStream(); // Stop all active streams
  });

  // Tool execution (use module object)
  console.log("[Main Init] Registering execute-tool-call...");
  ipcMain.handle('execute-tool-call', async (event, toolCall) => {
    const currentSettings = loadSettings();
    const { discoveredTools, mcpClients } = mcpManager.getMcpState(); // Use module object
    return toolHandler.handleExecuteToolCall(event, toolCall, discoveredTools, mcpClients, currentSettings);
  });
  console.log("[Main Init] execute-tool-call registered successfully");

  // Web Search IPC Handler
  ipcMain.handle('test-web-search', async (event, query, options) => {
    const { executeWebSearch } = require('./webSearchService');
    const currentSettings = loadSettings();
    const searchOptions = {
      ...(currentSettings?.webSearch || {}),
      ...(options || {})
    };
    return await executeWebSearch(query, searchOptions);
  });

  // --- Local AI Auto-Detection IPC Handlers ---
  const { detectLocalAiProviders } = require('./localAiService');
  ipcMain.handle('local-ai-detect', async () => {
    return await detectLocalAiProviders();
  });

  // --- Screen Capture IPC Handlers (Snip & Ask) ---
  const screenCaptureService = require('./screenCaptureService');
  ipcMain.handle('screen-capture-get-sources', async () => {
    return await screenCaptureService.getScreenSources();
  });
  ipcMain.handle('screen-capture-fullscreen', async () => {
    return await screenCaptureService.capturePrimaryScreen();
  });

  // --- Neo Agent Runtime IPC Handlers ---
  console.log("[Main Init] Registering Neo Agent Runtime handlers...");
  ipcMain.handle('agent:create-session', async (event, options = {}) => {
    const validatedOptions = validateAgentOptions(options);
    const session = neoAgentRuntime.createSession(validatedOptions);
    claimAgentSession(event, session.sessionId);
    return { sessionId: session.sessionId, workspaceRoot: session.workspaceRoot };
  });

  ipcMain.handle('agent:prompt', async (event, sessionId, userMessage, options = {}) => {
    assertSessionId(sessionId);
    validateMessage(userMessage);
    const validatedOptions = validateAgentOptions(options);
    claimAgentSession(event, sessionId);
    const currentSettings = loadSettings();
    const { discoveredTools, mcpClients } = mcpManager.getMcpState();
    
    // Forward all agent events directly to the caller webContents
    const unsubscribe = neoAgentRuntime.subscribe(sessionId, (data) => {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('agent:event', data);
      }
    });

    try {
      const result = await neoAgentRuntime.prompt(sessionId, userMessage, {
        ...validatedOptions,
        settings: { ...currentSettings, ...(validatedOptions.settings || {}) },
        mcpClients,
        discoveredTools
      });
      return result;
    } finally {
      unsubscribe();
    }
  });

  ipcMain.handle('agent:approve-tool', async (event, sessionId, callId, alwaysAllow) => {
    assertSessionId(sessionId);
    assertCallId(callId);
    requireAgentSessionOwner(event, sessionId);
    return neoAgentRuntime.approveTool(sessionId, callId, alwaysAllow);
  });

  ipcMain.handle('agent:reject-tool', async (event, sessionId, callId, reason) => {
    assertSessionId(sessionId);
    assertCallId(callId);
    requireAgentSessionOwner(event, sessionId);
    return neoAgentRuntime.rejectTool(sessionId, callId, reason);
  });

  ipcMain.handle('agent:cancel', async (event, sessionId) => {
    assertSessionId(sessionId);
    requireAgentSessionOwner(event, sessionId);
    neoAgentRuntime.cancel(sessionId);
    return { success: true };
  });

  ipcMain.handle('agent:rollback', async (event, sessionId) => {
    assertSessionId(sessionId);
    requireAgentSessionOwner(event, sessionId);
    return neoAgentRuntime.rollback(sessionId);
  });

  ipcMain.handle('agent:get-workspace-info', async (_event, workspaceRoot) => {
    return await neoAgentRuntime.getWorkspaceInfo(workspaceRoot);
  });

  ipcMain.handle('agent:select-workspace', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Workspace Directory',
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true };
    }
    const folderPath = result.filePaths[0];
    const info = await neoAgentRuntime.getWorkspaceInfo(folderPath);
    return { success: true, path: folderPath, info };
  });

  // Model configs handler already registered above during early initialization
  console.log("[Main Init] Continuing with remaining handlers...");

  // --- Context Sharing IPC Handlers (Legacy - for URL/CLI context) ---
  console.log("[Main Init] Registering context handlers...");
  ipcMain.handle('get-pending-context', async () => {
    const context = pendingContext;
    pendingContext = null; // Clear after retrieval
    return context;
  });
  console.log("[Main Init] get-pending-context registered");

  ipcMain.handle('clear-context', async () => {
    pendingContext = null;
  });

  // --- Context Capture IPC Handlers (for modal and popup) ---
  // Note: get-captured-context handler is registered earlier in the initialization

  ipcMain.handle('clear-captured-context', async () => {
    lastCapturedContext = null;
  });

  ipcMain.handle('trigger-context-capture', async () => {
    // Manually trigger context capture (useful for testing)
    if (contextCapture) {
      return await contextCapture.captureContext();
    }
    return null;
  });

  ipcMain.handle('capture-manual-context', async (event, text, title, source) => {
    // Allow manual context input
    if (contextCapture) {
      return await contextCapture.captureManualContext(text, title, source);
    }
    return null;
  });

  // --- Popup Window & Global Shortcut IPC Handlers ---
  ipcMain.handle('close-popup', async () => {
    if (popupWindowManager) {
      popupWindowManager.closePopup();
    }
  });

  ipcMain.handle('is-popup-open', async () => {
    return popupWindowManager ? popupWindowManager.isOpen() : false;
  });

  ipcMain.handle('toggle-popup', async () => {
    if (popupWindowManager) {
      const mousePosition = screen.getCursorScreenPoint();
      popupWindowManager.togglePopup(lastCapturedContext, mousePosition);
      return true;
    }
    return false;
  });

  ipcMain.handle('update-global-shortcut', async (event, { shortcut, enabled }) => {
    console.log('[Main] Updating global shortcut:', { shortcut, enabled });
    const result = reconfigureGlobalShortcut(shortcut, enabled);
    return result;
  });

  ipcMain.handle('get-global-shortcut-status', async () => {
    const settings = loadSettings();
    const status = contextCapture ? contextCapture.getStatus() : { isRegistered: false, accelerator: null };
    return {
      ...status,
      configuredShortcut: settings.popupShortcut || 'CommandOrControl+Shift+Space',
      enabled: settings.popupEnabled !== false
    };
  });

  // --- Audio Transcription (Whisper) ---
  ipcMain.handle('transcribe-audio', async (event, { audioBase64, mimeType = 'audio/webm' }) => {
    const currentSettings = loadSettings();
    if (currentSettings.voiceInput && currentSettings.voiceInput.enabled === false) {
      return { success: false, error: 'O recurso de voz está desativado nas configurações.' };
    }
    const voiceApiKey = currentSettings.voiceInput?.apiKey?.trim();
    const fallbackApiKey = currentSettings.GROQ_API_KEY || (currentSettings.apiKeys && currentSettings.apiKeys.groq) || process.env.GROQ_API_KEY;
    const apiKey = (voiceApiKey && voiceApiKey !== '<replace me>') ? voiceApiKey : fallbackApiKey;
    if (!apiKey || apiKey === '<replace me>') {
      return { success: false, error: 'Chave Groq API Key não configurada para a voz. Insira sua chave nas configurações de Voz.' };
    }

    const ext = mimeType.includes('wav') ? 'wav' : (mimeType.includes('mp4') ? 'm4a' : 'webm');
    const tempDir = app.getPath('temp');
    const tempFile = path.join(tempDir, `whisper-${Date.now()}.${ext}`);

    try {
      const base64Data = audioBase64.includes('base64,') ? audioBase64.split('base64,')[1] : audioBase64;
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(tempFile, buffer);

      const Groq = require('groq-sdk');
      const groq = new Groq({ apiKey });

      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: 'whisper-large-v3',
        response_format: 'json',
      });

      return { success: true, text: transcription.text };
    } catch (err) {
      console.error('[Whisper] Transcription error:', err);
      return { success: false, error: err.message };
    } finally {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (error) {
          console.warn('[Whisper] Could not remove temporary audio file:', error.message);
        }
      }
    }
  });

  // --- Export Chat File ---
  ipcMain.handle('export-chat-file', async (event, { format, title, content }) => {
    const { dialog } = require('electron');
    const cleanTitle = (title || 'conversa').replace(/[^\w\s-]/g, '').trim() || 'conversa';
    const defaultFilename = `${cleanTitle}.${format}`;

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: `Exportar Conversa (${format.toUpperCase()})`,
      defaultPath: path.join(app.getPath('downloads'), defaultFilename),
      filters: [
        format === 'md' ? { name: 'Markdown (.md)', extensions: ['md'] } :
        format === 'html' ? { name: 'HTML Document (.html)', extensions: ['html'] } :
        format === 'json' ? { name: 'JSON (.json)', extensions: ['json'] } :
        { name: 'Todos os arquivos', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, filePath };
    } catch (err) {
      console.error('Error saving exported chat:', err);
      return { success: false, error: err.message };
    }
  });

  // --- Post-initialization Tasks --- //
  console.log("Setting up MCP auto-connection timeout...");
  setTimeout(() => {
      console.log("Triggering MCP auto-connection...");
      mcpManager.connectConfiguredMcpServers(); // Use module object
  }, 1000);

  console.log("Initialization complete.");
});

// Make sure we handle single instance properly
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // Continue with app initialization
}

// Clean up context capture on app quit
app.on('before-quit', () => {
  cleanupContextCapture();
});

// Note: App lifecycle events (window-all-closed, activate) are now handled by windowManager.js

// Keep any essential top-level error handling or logging if needed
process.on('uncaughtException', (error) => {
    console.error('Unhandled Exception:', error);
    // Optionally: Log to file, show dialog, etc.
});

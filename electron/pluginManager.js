/**
 * NeoChat Plugin System & Micro-Kernel Architecture
 * 
 * Provides a modular, decoupled plugin orchestrator that handles:
 * - Dynamic plugin registration and lifecycle management (init, activate, deactivate)
 * - Safe IPC handler registration without global namespace collisions
 * - On-demand (lazy) loading of heavy service dependencies
 * - Runtime plugin discovery, status telemetry, and user configuration
 */

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.context = null;
    this.initialized = false;
    this.registeredHandlers = new Set();
  }

  /**
   * Register a plugin definition with the manager.
   * @param {Object} plugin 
   */
  register(plugin) {
    if (!plugin || !plugin.id) {
      throw new Error('Plugin must provide a unique id');
    }
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginManager] Plugin ${plugin.id} is already registered. Overwriting.`);
    }
    
    this.plugins.set(plugin.id, {
      id: plugin.id,
      name: plugin.name || plugin.id,
      description: plugin.description || '',
      version: plugin.version || '1.0.0',
      category: plugin.category || 'general',
      lazy: plugin.lazy !== false,
      enabled: plugin.enabled !== false,
      initialized: false,
      active: false,
      instance: plugin,
      error: null
    });

    console.log(`[PluginManager] Registered plugin: ${plugin.id} (${plugin.name || plugin.id})`);
    return this;
  }

  /**
   * Initialize all registered plugins with application context.
   * @param {Object} context App context (app, ipcMain, mainWindow, etc.)
   */
  async initialize(context) {
    this.context = context;
    this.initialized = true;

    // Load enabled plugins configuration from settings if available
    let enabledPluginsMap = {};
    if (context.loadSettings && typeof context.loadSettings === 'function') {
      try {
        const settings = context.loadSettings();
        if (settings && typeof settings.enabledPlugins === 'object') {
          enabledPluginsMap = settings.enabledPlugins;
        }
      } catch (err) {
        console.warn('[PluginManager] Failed to load enabledPlugins from settings:', err.message);
      }
    }

    // Register built-in plugins if not already registered
    this._registerBuiltinPlugins();

    // Register IPC handlers for plugin management UI
    if (context.ipcMain) {
      this._registerManagementIpcHandlers(context.ipcMain);
    }

    // Initialize/Activate plugins
    for (const [id, entry] of this.plugins.entries()) {
      if (enabledPluginsMap[id] !== undefined) {
        entry.enabled = Boolean(enabledPluginsMap[id]);
      }

      if (entry.enabled) {
        try {
          if (!entry.lazy) {
            // Eagerly activate non-lazy plugins
            await this.activate(id);
          } else {
            // Lazy plugins: register early IPC stubs or initialize lightweight hooks
            if (typeof entry.instance.init === 'function') {
              await entry.instance.init(this._createPluginContext(id));
              entry.initialized = true;
            }
          }
        } catch (err) {
          console.error(`[PluginManager] Error initializing plugin ${id}:`, err);
          entry.error = err.message;
        }
      }
    }

    console.log(`[PluginManager] Initialized ${this.plugins.size} plugins.`);
  }

  /**
   * Activate a specific plugin by ID.
   * @param {string} id 
   */
  async activate(id) {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new Error(`Plugin ${id} not found`);
    }

    if (entry.active) {
      return entry;
    }

    try {
      const pluginCtx = this._createPluginContext(id);
      
      if (!entry.initialized && typeof entry.instance.init === 'function') {
        await entry.instance.init(pluginCtx);
        entry.initialized = true;
      }

      if (typeof entry.instance.activate === 'function') {
        await entry.instance.activate(pluginCtx);
      }

      entry.active = true;
      entry.enabled = true;
      entry.error = null;
      console.log(`[PluginManager] Plugin ${id} activated successfully.`);
      return entry;
    } catch (err) {
      entry.error = err.message;
      console.error(`[PluginManager] Failed to activate plugin ${id}:`, err);
      throw err;
    }
  }

  /**
   * Deactivate a specific plugin by ID.
   * @param {string} id 
   */
  async deactivate(id) {
    const entry = this.plugins.get(id);
    if (!entry || !entry.active) {
      return entry;
    }

    try {
      if (typeof entry.instance.deactivate === 'function') {
        await entry.instance.deactivate(this._createPluginContext(id));
      }
      entry.active = false;
      console.log(`[PluginManager] Plugin ${id} deactivated.`);
      return entry;
    } catch (err) {
      entry.error = err.message;
      console.error(`[PluginManager] Error deactivating plugin ${id}:`, err);
      throw err;
    }
  }

  /**
   * Get a plugin entry by ID.
   * @param {string} id 
   */
  getPlugin(id) {
    return this.plugins.get(id);
  }

  /**
   * Check if a plugin is registered and enabled.
   * @param {string} id 
   */
  isPluginEnabled(id) {
    const entry = this.plugins.get(id);
    return Boolean(entry && entry.enabled);
  }

  /**
   * List all registered plugins and their current status.
   */
  listPlugins() {
    const list = [];
    for (const [id, entry] of this.plugins.entries()) {
      list.push({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        version: entry.version,
        category: entry.category,
        lazy: entry.lazy,
        enabled: entry.enabled,
        active: entry.active,
        initialized: entry.initialized,
        error: entry.error
      });
    }
    return list;
  }

  /**
   * Create an isolated context wrapper for a plugin.
   * @private
   */
  _createPluginContext(pluginId) {
    const baseCtx = this.context || {};
    return {
      ...baseCtx,
      pluginId,
      registerIpcHandler: (channel, handler) => {
        if (baseCtx.ipcMain) {
          if (!this.registeredHandlers.has(channel)) {
            baseCtx.ipcMain.handle(channel, handler);
            this.registeredHandlers.add(channel);
          }
        }
      },
      registerIpcListener: (channel, listener) => {
        if (baseCtx.ipcMain) {
          baseCtx.ipcMain.on(channel, listener);
        }
      }
    };
  }

  /**
   * Register IPC channels for plugins inspection and management.
   * @private
   */
  _registerManagementIpcHandlers(ipcMain) {
    ipcMain.handle('plugins:list', () => {
      return this.listPlugins();
    });

    ipcMain.handle('plugins:toggle', async (_event, { pluginId, enabled }) => {
      const entry = this.plugins.get(pluginId);
      if (!entry) {
        return { success: false, error: `Plugin ${pluginId} not found` };
      }

      try {
        if (enabled) {
          entry.enabled = true;
          await this.activate(pluginId);
        } else {
          entry.enabled = false;
          await this.deactivate(pluginId);
        }

        // Persist enabled status in settings if available
        if (this.context?.saveSettings && this.context?.loadSettings) {
          const settings = this.context.loadSettings();
          const currentPlugins = settings.enabledPlugins || {};
          currentPlugins[pluginId] = entry.enabled;
          this.context.saveSettings({ ...settings, enabledPlugins: currentPlugins });
        }

        return { success: true, plugin: this.getPlugin(pluginId) };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });
  }

  /**
   * Register all built-in core plugins.
   * @private
   */
  _registerBuiltinPlugins() {
    // 1. RAG Knowledge Base Plugin
    if (!this.plugins.has('rag')) {
      this.register({
        id: 'rag',
        name: 'RAG Knowledge Base',
        description: 'Local embeddings, document ingestion (PDF, Word, TXT, MD), and semantic search',
        category: 'intelligence',
        lazy: true,
        init: async (ctx) => {
          const ragService = require('./ragService');
          ragService.initialize(ctx.app);

          ctx.registerIpcHandler('rag-select-folder', async () => {
            return ragService.selectFolderDialog(ctx.getMainWindow ? ctx.getMainWindow() : null);
          });

          ctx.registerIpcHandler('rag-index-folder', async (_event, folderPath, projectId) => {
            const win = ctx.getMainWindow ? ctx.getMainWindow() : null;
            return await ragService.indexFolder(folderPath, projectId, (progress) => {
              if (win && !win.isDestroyed()) {
                win.webContents.send('rag-indexing-progress', progress);
              }
            });
          });

          ctx.registerIpcHandler('rag-query-knowledge', async (_event, query, options) => {
            return ragService.queryKnowledge(query, options);
          });

          ctx.registerIpcHandler('rag-get-project-stats', async (_event, projectId) => {
            return ragService.getProjectKnowledgeStats(projectId);
          });

          ctx.registerIpcHandler('rag-remove-folder', async (_event, projectId, folderPath) => {
            return ragService.removeFolderFromProject(projectId, folderPath);
          });

          ctx.registerIpcHandler('rag-read-file', async (_event, filePath, startLine, endLine) => {
            return ragService.readFileContent(filePath, startLine, endLine);
          });

          ctx.registerIpcHandler('rag-open-folder', async (_event, folderPath) => {
            return ragService.openFolderInExplorer(folderPath);
          });
        }
      });
    }

    // 2. Canvas Document Workspace Plugin
    if (!this.plugins.has('canvas')) {
      this.register({
        id: 'canvas',
        name: 'Canvas Document Workspace',
        description: 'Interactive visual documents, side-by-side editing, diff calculation, and PDF export',
        category: 'productivity',
        lazy: true,
        init: async (ctx) => {
          const canvasManager = require('./canvasManager');

          ctx.registerIpcHandler('canvas-compute-diff', async (_event, { oldText, newText }) => {
            return canvasManager.computeLineDiff(oldText, newText);
          });

          ctx.registerIpcHandler('canvas-calculate-stats', async (_event, { content }) => {
            return canvasManager.calculateDocStats(content);
          });

          ctx.registerIpcHandler('canvas-get-active', async (_event, chatId) => {
            return canvasManager.getActiveCanvasDocument(chatId);
          });

          ctx.registerIpcHandler('canvas-set-active', async (_event, { chatId, doc }) => {
            return canvasManager.setActiveCanvasDocument(chatId, doc);
          });

          ctx.registerIpcHandler('canvas-export-pdf', async (_event, { title, content, language, htmlContent } = {}) => {
            const win = ctx.getMainWindow ? ctx.getMainWindow() : null;
            return canvasManager.exportCanvasToPdf({ title, content, language, htmlContent, parentWindow: win });
          });
        }
      });
    }

    // 3. Interactive Terminal & Background Task Manager Plugin
    if (!this.plugins.has('terminal')) {
      this.register({
        id: 'terminal',
        name: 'Interactive Terminal & Tasks',
        description: 'Embedded pseudo-terminal execution and background command supervision',
        category: 'developer',
        lazy: true,
        init: async (ctx) => {
          const { terminalManager } = require('./terminalManager');
          const { taskManager } = require('./taskManager');
          
          terminalManager.initialize();
          terminalManager.registerIpcHandlers(ctx.ipcMain, ctx.getMainWindow);
          taskManager.registerIpcHandlers(ctx.ipcMain, ctx.getMainWindow);
        }
      });
    }

    // 4. Embedded Browser Panel Plugin
    if (!this.plugins.has('browser')) {
      this.register({
        id: 'browser',
        name: 'Embedded Browser Panel',
        description: 'Built-in secure web browsing and DOM extraction inside workspace',
        category: 'developer',
        lazy: true,
        init: async (ctx) => {
          const { browserManager } = require('./browserManager');
          browserManager.registerIpcHandlers(ctx.ipcMain);
        }
      });
    }

    // 5. MCP Protocol & Tool Servers Plugin
    if (!this.plugins.has('mcp')) {
      this.register({
        id: 'mcp',
        name: 'Model Context Protocol (MCP)',
        description: 'Extensible local and remote MCP server connectors and dynamic tool discovery',
        category: 'tools',
        lazy: false,
        init: async (ctx) => {
          const mcpManager = require('./mcpManager');
          const authManager = require('./authManager');
          const { resolveCommandPath } = require('./commandResolver');

          mcpManager.initializeMcpHandlers(
            ctx.ipcMain,
            ctx.app,
            ctx.getMainWindow ? ctx.getMainWindow() : null,
            ctx.loadSettings,
            resolveCommandPath
          );

          if (mcpManager && typeof mcpManager.retryConnectionAfterAuth === 'function') {
            authManager.initialize(mcpManager.retryConnectionAfterAuth);
          }

          // MCP Auth flow
          ctx.registerIpcHandler('start-mcp-auth-flow', async (_event, { serverId, serverUrl }) => {
            if (!serverId || !serverUrl) {
              throw new Error("Missing serverId or serverUrl for start-mcp-auth-flow");
            }
            return await authManager.initiateAuthFlow(serverId, serverUrl);
          });

          // Trigger MCP auto-connection after startup
          setTimeout(() => {
            try {
              mcpManager.connectConfiguredMcpServers();
            } catch (e) {
              console.warn('[Plugin MCP] Auto-connection warning:', e.message);
            }
          }, 1000);
        }
      });
    }

    // 6. Workflows & Trigger Automations Plugin
    if (!this.plugins.has('workflows')) {
      this.register({
        id: 'workflows',
        name: 'Workflows & Automation',
        description: 'Multi-step autonomous workflows, event triggers, and pipeline chains',
        category: 'automation',
        lazy: true,
        init: async (ctx) => {
          const workflowManager = require('./workflowManager');
          workflowManager.initializeHandlers(ctx.ipcMain, ctx.app);
        }
      });
    }

    // 7. Cron Scheduler Plugin
    if (!this.plugins.has('scheduler')) {
      this.register({
        id: 'scheduler',
        name: 'Task Scheduler & Cron',
        description: 'Recurring cron jobs and automated background notifications',
        category: 'automation',
        lazy: true,
        init: async (ctx) => {
          const schedulerManager = require('./schedulerManager');
          const workflowManager = require('./workflowManager');
          const { Notification } = require('electron');
          schedulerManager.initializeHandlers(ctx.ipcMain, ctx.app, ctx.getMainWindow, workflowManager, Notification);
        }
      });
    }

    // 8. Swarm Multi-Agent Team Plugin
    if (!this.plugins.has('swarm')) {
      this.register({
        id: 'swarm',
        name: 'Swarm Multi-Agent Teams',
        description: 'Collaborative multi-role AI agent orchestration and task execution',
        category: 'intelligence',
        lazy: true,
        init: async (ctx) => {
          const { swarmManager } = require('./agent');

          ctx.registerIpcHandler('agent:swarm:get-roles', async () => {
            return {
              roles: swarmManager.getRoles(),
              modes: swarmManager.getModes()
            };
          });

          ctx.registerIpcHandler('agent:swarm:run', async (event, params = {}) => {
            const currentSettings = ctx.loadSettings ? ctx.loadSettings() : {};
            return await swarmManager.runTeam({
              ...params,
              settings: { ...currentSettings, ...(params.settings || {}) },
              onProgress: (data) => {
                if (event.sender && !event.sender.isDestroyed()) {
                  event.sender.send('agent:swarm:event', data);
                }
              }
            });
          });

          ctx.registerIpcHandler('agent:swarm:cancel', async (_event, swarmId) => {
            return { success: swarmManager.cancel(swarmId) };
          });
        }
      });
    }

    // 9. Sandboxed Code Runner Plugin
    if (!this.plugins.has('coderunner')) {
      this.register({
        id: 'coderunner',
        name: 'Sandboxed Code Runner',
        description: 'Local sandboxed execution for JavaScript, TypeScript, and Python snippets',
        category: 'developer',
        lazy: true,
        init: async (ctx) => {
          const codeRunner = require('./codeRunner');
          codeRunner.initialize(ctx.app);
          codeRunner.initializeCodeRunnerHandlers(ctx.ipcMain);
        }
      });
    }

    // 10. Git Integration Plugin
    if (!this.plugins.has('git')) {
      this.register({
        id: 'git',
        name: 'Git Version Control',
        description: 'Git repository inspection, commit history, and branch status',
        category: 'developer',
        lazy: true,
        init: async (ctx) => {
          const { initializeGitHandlers } = require('./gitManager');
          initializeGitHandlers(ctx.ipcMain, ctx.dialog);
        }
      });
    }

    // 11. Backup & Restore Plugin
    if (!this.plugins.has('backup')) {
      this.register({
        id: 'backup',
        name: 'Data Backup & Restore',
        description: 'Automated and manual snapshots of chats, settings, and workspace data',
        category: 'system',
        lazy: true,
        init: async (ctx) => {
          const { initializeBackupHandlers } = require('./backupManager');
          initializeBackupHandlers(
            ctx.ipcMain,
            ctx.app,
            ctx.dialog,
            ctx.getMainWindow,
            ctx.loadSettings,
            ctx.saveSettings
          );
        }
      });
    }

    // 12. Observability & Telemetry Plugin
    if (!this.plugins.has('observability')) {
      this.register({
        id: 'observability',
        name: 'Prompt Caching & Observability',
        description: 'Real-time telemetry, cache hit tracking, token savings, and latency metrics',
        category: 'analytics',
        lazy: true,
        init: async (ctx) => {
          const { initializeObservabilityHandlers } = require('./observabilityManager');
          initializeObservabilityHandlers(ctx.ipcMain, ctx.app, ctx.dialog, ctx.loadSettings);
        }
      });
    }

    // Dynamic Discovery: Load all plugins from electron/plugins directory
    try {
      const fs = require('fs');
      const path = require('path');
      const pluginsDir = path.join(__dirname, 'plugins');
      if (fs.existsSync(pluginsDir)) {
        const files = fs.readdirSync(pluginsDir);
        for (const file of files) {
          if (file.endsWith('.js')) {
            try {
              const pluginDef = require(path.join(pluginsDir, file));
              if (pluginDef && pluginDef.id && !this.plugins.has(pluginDef.id)) {
                this.register(pluginDef);
              }
            } catch (err) {
              console.warn(`[PluginManager] Failed to load plugin file ${file}:`, err.message);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[PluginManager] Dynamic plugins folder scan failed:', e.message);
    }
  }
}

// Export singleton instance and class
const pluginManager = new PluginManager();
module.exports = {
  PluginManager,
  pluginManager
};


/**
 * NeoAgentRuntime - Central Facade & Session Orchestrator for the Neo Agent Harness.
 */

const { AgentEventBus, AGENT_STATES, AGENT_EVENTS } = require('./eventBus');
const { ToolRegistry } = require('./toolRegistry');
const { PermissionEngine } = require('./permissionEngine');
const { agentLoop } = require('./agentLoop');
const { workspaceManager } = require('./workspaceManager');
const { checkpointsManager } = require('./checkpoints');
const { shellManager } = require('./shellManager');
const { swarmManager } = require('./swarmManager');
const { AgentSessionStore } = require('./sessionStore');

const DURABLE_AGENT_EVENTS = new Set([
  AGENT_EVENTS.STATE_CHANGE,
  AGENT_EVENTS.TOOL_CALL_REQUEST,
  AGENT_EVENTS.TOOL_PERMISSION_REQUIRED,
  AGENT_EVENTS.TOOL_EXECUTING,
  AGENT_EVENTS.TOOL_RESULT,
  AGENT_EVENTS.TRAJECTORY_STEP,
  AGENT_EVENTS.WORKSPACE_UPDATE,
  AGENT_EVENTS.ERROR,
  AGENT_EVENTS.DONE
]);

class AgentSession {
  constructor(sessionId, options = {}) {
    this.sessionId = sessionId;
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.model = options.model || null;
    this.settings = options.settings || {};
    this.messages = options.messages || [];
    this.eventBus = new AgentEventBus(sessionId);
    this.abortController = new AbortController();
    this.active = false;
    this.pendingRuns = 0;
    this.runQueue = Promise.resolve();
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.lastStatus = options.lastStatus || AGENT_STATES.IDLE;
    this.persistenceHandlers = new Map();
  }

  resetAbortController() {
    this.abortController = new AbortController();
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.active = false;
  }

  enqueue(task) {
    this.pendingRuns += 1;
    const execute = async () => {
      try {
        return await task();
      } finally {
        this.pendingRuns -= 1;
      }
    };
    const run = this.runQueue.then(execute, execute);
    this.runQueue = run.catch(() => undefined);
    return run;
  }
}

class NeoAgentRuntime {
  constructor() {
    this.sessions = new Map();
    this.toolRegistry = new ToolRegistry();
    this.permissionEngine = new PermissionEngine();
    this.workspaceManager = workspaceManager;
    this.checkpointsManager = checkpointsManager;
    this.shellManager = shellManager;
    this.swarmManager = swarmManager;
    this.sessionStore = new AgentSessionStore();
  }

  configurePersistence(baseDir) {
    this.sessionStore.configure(baseDir);
    this.checkpointsManager.configureStorage(baseDir);
    for (const session of this.sessions.values()) {
      this._attachPersistence(session);
      this._saveSession(session);
    }
  }

  _snapshotSession(session) {
    return {
      version: 1,
      sessionId: session.sessionId,
      workspaceRoot: session.workspaceRoot,
      model: session.model,
      messages: session.messages,
      active: session.active,
      lastStatus: session.lastStatus,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }

  _saveSession(session) {
    this.sessionStore.saveSnapshot(this._snapshotSession(session));
  }

  _attachPersistence(session) {
    if (!this.sessionStore.isConfigured() || session.persistenceHandlers.size > 0) return;
    for (const eventName of DURABLE_AGENT_EVENTS) {
      const handler = data => {
        try {
          if (eventName === AGENT_EVENTS.STATE_CHANGE) session.lastStatus = data.toState;
          this.sessionStore.appendEvent(session.sessionId, { event: eventName, ...data });
          this._saveSession(session);
        } catch (error) {
          console.warn(`[NeoAgentRuntime] Failed to persist ${eventName}:`, error.message);
        }
      };
      session.persistenceHandlers.set(eventName, handler);
      session.eventBus.on(eventName, handler);
    }
  }

  /**
   * Create or retrieve an agent session.
   * @param {object} options
   * @param {string} [options.sessionId]
   * @param {string} [options.workspaceRoot]
   * @param {string} [options.model]
   * @param {object} [options.settings]
   * @param {Array<object>} [options.messages]
   * @returns {AgentSession}
   */
  createSession(options = {}) {
    const sessionId = options.sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (this.sessions.has(sessionId)) {
      const existing = this.sessions.get(sessionId);
      if (options.workspaceRoot) existing.workspaceRoot = options.workspaceRoot;
      if (options.settings) existing.settings = { ...existing.settings, ...options.settings };
      if (options.model) existing.model = options.model;
      if (Array.isArray(options.messages) && !existing.active && existing.pendingRuns === 0) {
        existing.messages = options.messages;
      }
      existing.updatedAt = Date.now();
      this.workspaceManager.setWorkspace(sessionId, existing.workspaceRoot);
      this._saveSession(existing);
      return existing;
    }

    const persisted = this.sessionStore.loadSnapshot(sessionId);
    const restoredOptions = persisted
      ? { ...persisted, ...options, messages: options.messages || persisted.messages || [], active: false }
      : options;
    const session = new AgentSession(sessionId, restoredOptions);
    if (persisted) {
      session.createdAt = persisted.createdAt || session.createdAt;
      session.updatedAt = persisted.updatedAt || session.updatedAt;
      session.lastStatus = persisted.lastStatus || AGENT_STATES.IDLE;
    }
    this.sessions.set(sessionId, session);
    this.workspaceManager.setWorkspace(sessionId, session.workspaceRoot);
    this._attachPersistence(session);
    this._saveSession(session);
    return session;
  }

  /**
   * Get an existing session by ID.
   * @param {string} sessionId
   * @returns {AgentSession|null}
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Send a prompt message and run the autonomous agent loop.
   * @param {string} sessionId
   * @param {string|object} userMessage
   * @param {object} options
   * @returns {Promise<object>}
   */
  async prompt(sessionId, userMessage, options = {}) {
    const session = this.getSession(sessionId) || this.createSession({ sessionId, ...options });
    return session.enqueue(() => this._executePrompt(session, userMessage, options));
  }

  async _executePrompt(session, userMessage, options = {}) {
    const sessionId = session.sessionId;
    session.active = true;
    session.resetAbortController();
    session.updatedAt = Date.now();

    if (options.settings) {
      session.settings = { ...session.settings, ...options.settings };
      this.permissionEngine.updateSettings(session.settings, sessionId);
    }
    if (options.model) session.model = options.model;
    if (options.workspaceRoot) {
      session.workspaceRoot = options.workspaceRoot;
      this.workspaceManager.setWorkspace(sessionId, options.workspaceRoot);
    }

    // Append user message if provided
    if (userMessage) {
      const formattedUserMsg = typeof userMessage === 'string'
        ? { role: 'user', content: userMessage }
        : userMessage;
      session.messages.push(formattedUserMsg);
    }

    try {
      const result = await agentLoop.run({
        sessionId,
        messages: session.messages,
        model: session.model,
        settings: session.settings,
        toolRegistry: this.toolRegistry,
        permissionEngine: this.permissionEngine,
        eventBus: session.eventBus,
        mcpClients: options.mcpClients || {},
        discoveredTools: options.discoveredTools || [],
        workspaceRoot: session.workspaceRoot,
        abortController: session.abortController,
        maxIterations: options.maxIterations || 25
      });
      if (Array.isArray(result?.messages)) {
        session.messages = result.messages;
      }
      session.updatedAt = Date.now();
      this._saveSession(session);
      return result;
    } finally {
      session.active = false;
      session.updatedAt = Date.now();
      this._saveSession(session);
    }
  }

  /**
   * Approve a tool execution that is waiting for permission.
   * @param {string} sessionId
   * @param {string} callId
   * @param {boolean} [alwaysAllow=false]
   * @returns {boolean}
   */
  approveTool(sessionId, callId, alwaysAllow = false) {
    return this.permissionEngine.approve(sessionId, callId, alwaysAllow);
  }

  /**
   * Reject a tool execution that is waiting for permission.
   * @param {string} sessionId
   * @param {string} callId
   * @param {string} [reason]
   * @returns {boolean}
   */
  rejectTool(sessionId, callId, reason = 'User rejected execution') {
    return this.permissionEngine.reject(sessionId, callId, reason);
  }

  /**
   * Cancel an active agent run.
   * @param {string} sessionId
   */
  cancel(sessionId) {
    const session = this.getSession(sessionId);
    if (session) {
      session.cancel();
      this.permissionEngine.revokeSessionPermissions(sessionId);
      this.shellManager.kill(sessionId);
      session.lastStatus = AGENT_STATES.CANCELLED;
      session.updatedAt = Date.now();
      this._saveSession(session);
    }
  }

  /**
   * Roll back the last file mutation performed in this session.
   * @param {string} sessionId
   * @returns {object}
   */
  rollback(sessionId) {
    return this.checkpointsManager.rollbackLastAction(sessionId);
  }

  /**
   * Subscribe to real-time events for a session.
   * @param {string} sessionId
   * @param {function} listener
   * @returns {function} unsubscribe function
   */
  subscribe(sessionId, listener) {
    const session = this.getSession(sessionId) || this.createSession({ sessionId });
    const bus = session.eventBus;

    const handlers = new Map();
    for (const eventName of Object.values(AGENT_EVENTS)) {
      const handler = (data) => listener({ event: eventName, ...data });
      handlers.set(eventName, handler);
      bus.on(eventName, handler);
    }

    return () => {
      for (const [eventName, handler] of handlers) {
        bus.removeListener(eventName, handler);
      }
      handlers.clear();
    };
  }

  /**
   * Inspect workspace context.
   * @param {string} workspaceRoot
   */
  async getWorkspaceInfo(workspaceRoot) {
    return await this.workspaceManager.inspectWorkspace(workspaceRoot);
  }

  getSessionSnapshot(sessionId) {
    const session = this.getSession(sessionId);
    return session ? this._snapshotSession(session) : this.sessionStore.loadSnapshot(sessionId);
  }

  getTrajectory(sessionId, options = {}) {
    return this.sessionStore.readTrajectory(sessionId, options);
  }
}

// Global runtime singleton
const neoAgentRuntime = new NeoAgentRuntime();

module.exports = {
  NeoAgentRuntime,
  AgentSession,
  neoAgentRuntime,
  AGENT_STATES,
  AGENT_EVENTS
};

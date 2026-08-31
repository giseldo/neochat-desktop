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
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
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
      return existing;
    }

    const session = new AgentSession(sessionId, options);
    this.sessions.set(sessionId, session);
    this.workspaceManager.setWorkspace(sessionId, session.workspaceRoot);
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
    session.active = true;
    session.resetAbortController();
    session.updatedAt = Date.now();

    if (options.settings) {
      session.settings = { ...session.settings, ...options.settings };
      this.permissionEngine.updateSettings(session.settings);
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

    const result = await agentLoop.run({
      sessionId: session.sessionId,
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

    session.active = false;
    return result;
  }

  /**
   * Approve a tool execution that is waiting for permission.
   * @param {string} sessionId
   * @param {string} callId
   * @param {boolean} [alwaysAllow=false]
   * @returns {boolean}
   */
  approveTool(sessionId, callId, alwaysAllow = false) {
    return this.permissionEngine.approve(callId, alwaysAllow);
  }

  /**
   * Reject a tool execution that is waiting for permission.
   * @param {string} sessionId
   * @param {string} callId
   * @param {string} [reason]
   * @returns {boolean}
   */
  rejectTool(sessionId, callId, reason = 'User rejected execution') {
    return this.permissionEngine.reject(callId, reason);
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

    const handler = (event, data) => listener({ event, ...data });

    for (const eventName of Object.values(AGENT_EVENTS)) {
      bus.on(eventName, (data) => handler(eventName, data));
    }

    return () => {
      bus.removeAllListeners();
    };
  }

  /**
   * Inspect workspace context.
   * @param {string} workspaceRoot
   */
  async getWorkspaceInfo(workspaceRoot) {
    return await this.workspaceManager.inspectWorkspace(workspaceRoot);
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

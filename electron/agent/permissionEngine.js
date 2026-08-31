/**
 * PermissionEngine - Centralizes tool authorization and execution policies for the Neo Agent Runtime.
 */

const { getToolPermission } = require('../toolPermissionManager');

const PERMISSION_DECISION = {
  ALLOW: 'allow',
  DENY: 'deny',
  PROMPT: 'prompt'
};

// Tools considered safe by default for automatic execution in coding/agent mode
const DEFAULT_SAFE_TOOLS = new Set([
  'read_file',
  'list_directory',
  'glob_search',
  'grep_search',
  'git_status',
  'git_diff',
  'query_project_knowledge',
  'read_project_file',
  'canvas_get_document'
]);

class PermissionEngine {
  constructor(settings = {}) {
    this.settings = settings;
    // Map of sessionId -> Set of allowed tool names for the current session
    this.sessionPermissions = new Map();
    // Map of pending approval calls: callId -> { resolve, reject, toolCall, timeoutId }
    this.pendingApprovals = new Map();
  }

  updateSettings(settings) {
    this.settings = settings;
  }

  /**
   * Check whether a tool call can proceed immediately or requires user prompt/denial.
   * @param {string} sessionId
   * @param {object} toolCall - { id, function: { name, arguments } }
   * @param {object} toolDef - Tool definition metadata
   * @returns {{ decision: 'allow'|'deny'|'prompt', reason?: string }}
   */
  evaluate(sessionId, toolCall, toolDef = {}) {
    const toolName = toolCall?.function?.name || toolCall?.name;
    if (!toolName) {
      return { decision: PERMISSION_DECISION.DENY, reason: 'Invalid tool name' };
    }

    // 1. Check if tool is allowed for this specific session
    const sessionSet = this.sessionPermissions.get(sessionId);
    if (sessionSet && sessionSet.has(toolName)) {
      return { decision: PERMISSION_DECISION.ALLOW, reason: 'Session approved' };
    }

    // 2. Check global tool permission settings from toolPermissionManager
    try {
      const serverName = toolDef?.serverName || (toolName.startsWith('mcp_') ? 'mcp' : 'native');
      const configuredPermission = getToolPermission(toolName, serverName);
      if (configuredPermission === 'allow') {
        return { decision: PERMISSION_DECISION.ALLOW, reason: 'Configured allow in settings' };
      }
      if (configuredPermission === 'deny') {
        return { decision: PERMISSION_DECISION.DENY, reason: 'Explicitly denied in settings' };
      }
      if (configuredPermission === 'prompt') {
        return { decision: PERMISSION_DECISION.PROMPT, reason: 'Configured prompt in settings' };
      }
    } catch (err) {
      // Fallback if toolPermissionManager is uninitialized
    }

    // 3. Check if agent mode auto-allows safe read-only tools
    const isAgentMode = Boolean(this.settings?.agentMode || this.settings?.agentModeActive);
    if (isAgentMode && DEFAULT_SAFE_TOOLS.has(toolName)) {
      return { decision: PERMISSION_DECISION.ALLOW, reason: 'Safe read-only tool in agent mode' };
    }

    // 4. Default policy: Safe read tools allow, mutating tools (write_file, shell_exec, git_commit) prompt
    if (DEFAULT_SAFE_TOOLS.has(toolName)) {
      return { decision: PERMISSION_DECISION.ALLOW, reason: 'Safe default read tool' };
    }

    // Default for mutating / unknown tools is prompt
    return { decision: PERMISSION_DECISION.PROMPT, reason: 'Tool modifies workspace or executes code' };
  }

  /**
   * Request user approval asynchronously for a tool call.
   * @param {string} sessionId
   * @param {object} toolCall
   * @param {number} timeoutMs
   * @returns {Promise<{ approved: boolean, reason?: string, alwaysAllow?: boolean }>}
   */
  requestApproval(sessionId, toolCall, timeoutMs = 120000) {
    const callId = toolCall.id;
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (this.pendingApprovals.has(callId)) {
          this.pendingApprovals.delete(callId);
          resolve({ approved: false, reason: 'Approval timed out after 2 minutes.' });
        }
      }, timeoutMs);

      this.pendingApprovals.set(callId, {
        sessionId,
        toolCall,
        resolve,
        timeoutId
      });
    });
  }

  /**
   * Approve a pending tool call.
   * @param {string} callId
   * @param {boolean} [alwaysAllow=false] - Whether to allow for all subsequent calls in this session
   */
  approve(callId, alwaysAllow = false) {
    const pending = this.pendingApprovals.get(callId);
    if (!pending) return false;

    clearTimeout(pending.timeoutId);
    this.pendingApprovals.delete(callId);

    if (alwaysAllow && pending.toolCall?.function?.name) {
      this.grantSessionPermission(pending.sessionId, pending.toolCall.function.name);
    }

    pending.resolve({ approved: true, alwaysAllow });
    return true;
  }

  /**
   * Reject a pending tool call.
   * @param {string} callId
   * @param {string} reason
   */
  reject(callId, reason = 'User rejected tool execution') {
    const pending = this.pendingApprovals.get(callId);
    if (!pending) return false;

    clearTimeout(pending.timeoutId);
    this.pendingApprovals.delete(callId);

    pending.resolve({ approved: false, reason });
    return true;
  }

  grantSessionPermission(sessionId, toolName) {
    if (!this.sessionPermissions.has(sessionId)) {
      this.sessionPermissions.set(sessionId, new Set());
    }
    this.sessionPermissions.get(sessionId).add(toolName);
  }

  revokeSessionPermissions(sessionId) {
    this.sessionPermissions.delete(sessionId);
    // Cancel any pending approvals for this session
    for (const [callId, pending] of this.pendingApprovals.entries()) {
      if (pending.sessionId === sessionId) {
        clearTimeout(pending.timeoutId);
        pending.resolve({ approved: false, reason: 'Session cancelled' });
        this.pendingApprovals.delete(callId);
      }
    }
  }
}

const permissionEngine = new PermissionEngine();

module.exports = {
  PermissionEngine,
  permissionEngine,
  PERMISSION_DECISION,
  DEFAULT_SAFE_TOOLS
};

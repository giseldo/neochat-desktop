const { EventEmitter } = require('events');

/**
 * Agent Lifecycle States
 */
const AGENT_STATES = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  TOOL_REQUEST: 'TOOL_REQUEST',
  WAITING_PERMISSION: 'WAITING_PERMISSION',
  TOOL_EXECUTION: 'TOOL_EXECUTION',
  OBSERVING: 'OBSERVING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

/**
 * Event names emitted by the Agent Event Bus
 */
const AGENT_EVENTS = {
  STATE_CHANGE: 'state_change',
  TOKEN_DELTA: 'token_delta',
  REASONING_DELTA: 'reasoning_delta',
  TOOL_CALL_REQUEST: 'tool_call_request',
  TOOL_PERMISSION_REQUIRED: 'tool_permission_required',
  TOOL_EXECUTING: 'tool_executing',
  TOOL_RESULT: 'tool_result',
  TRAJECTORY_STEP: 'trajectory_step',
  WORKSPACE_UPDATE: 'workspace_update',
  ERROR: 'error',
  DONE: 'done'
};

/**
 * Per-session or global Agent Event Bus
 */
class AgentEventBus extends EventEmitter {
  constructor(sessionId = 'default') {
    super();
    this.sessionId = sessionId;
    this.setMaxListeners(50);
  }

  emitStateChange(fromState, toState, metadata = {}) {
    this.emit(AGENT_EVENTS.STATE_CHANGE, {
      sessionId: this.sessionId,
      fromState,
      toState,
      timestamp: Date.now(),
      ...metadata
    });
  }

  emitTokenDelta(content) {
    this.emit(AGENT_EVENTS.TOKEN_DELTA, {
      sessionId: this.sessionId,
      content,
      timestamp: Date.now()
    });
  }

  emitReasoningDelta(reasoning) {
    this.emit(AGENT_EVENTS.REASONING_DELTA, {
      sessionId: this.sessionId,
      reasoning,
      timestamp: Date.now()
    });
  }

  emitToolCallRequest(toolCall) {
    this.emit(AGENT_EVENTS.TOOL_CALL_REQUEST, {
      sessionId: this.sessionId,
      toolCall,
      timestamp: Date.now()
    });
  }

  emitToolPermissionRequired(toolCall, permissionInfo) {
    this.emit(AGENT_EVENTS.TOOL_PERMISSION_REQUIRED, {
      sessionId: this.sessionId,
      toolCall,
      permissionInfo,
      timestamp: Date.now()
    });
  }

  emitToolExecuting(toolCall) {
    this.emit(AGENT_EVENTS.TOOL_EXECUTING, {
      sessionId: this.sessionId,
      toolCall,
      timestamp: Date.now()
    });
  }

  emitToolResult(toolCallId, toolName, result, error = null) {
    this.emit(AGENT_EVENTS.TOOL_RESULT, {
      sessionId: this.sessionId,
      toolCallId,
      toolName,
      result,
      error,
      timestamp: Date.now()
    });
  }

  emitTrajectoryStep(step) {
    this.emit(AGENT_EVENTS.TRAJECTORY_STEP, {
      sessionId: this.sessionId,
      step: {
        id: step.id || `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        ...step
      }
    });
  }

  emitError(error, context = {}) {
    this.emit(AGENT_EVENTS.ERROR, {
      sessionId: this.sessionId,
      error: typeof error === 'string' ? error : error?.message || 'Unknown error',
      context,
      timestamp: Date.now()
    });
  }

  emitDone(finalMessage, stats = {}) {
    this.emit(AGENT_EVENTS.DONE, {
      sessionId: this.sessionId,
      finalMessage,
      stats,
      timestamp: Date.now()
    });
  }
}

module.exports = {
  AgentEventBus,
  AGENT_STATES,
  AGENT_EVENTS
};

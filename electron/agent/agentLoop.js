/**
 * AgentLoop - Deterministic State Machine and Autonomous Execution Loop.
 */

const { AGENT_STATES, AGENT_EVENTS } = require('./eventBus');
const { modelRouter } = require('./modelRouter');
const { toolExecutor } = require('./toolExecutor');
const { workspaceManager } = require('./workspaceManager');
const { compactionManager } = require('./compactionManager');
const { PERMISSION_DECISION } = require('./permissionEngine');

class AgentLoop {
  /**
   * Run the multi-step agent loop for a session.
   * @param {object} params
   * @param {string} params.sessionId
   * @param {Array<object>} params.messages
   * @param {string} params.model
   * @param {object} params.settings
   * @param {object} params.toolRegistry
   * @param {object} params.permissionEngine
   * @param {object} params.eventBus
   * @param {object} [params.mcpClients={}]
   * @param {Array<object>} [params.discoveredTools=[]]
   * @param {string} [params.workspaceRoot]
   * @param {AbortController} [params.abortController]
   * @param {number} [params.maxIterations=25]
   * @returns {Promise<object>} Final execution summary
   */
  async run({
    sessionId,
    messages = [],
    model,
    settings = {},
    toolRegistry,
    permissionEngine,
    eventBus,
    mcpClients = {},
    discoveredTools = [],
    workspaceRoot,
    abortController = new AbortController(),
    maxIterations = 25
  }) {
    let currentState = AGENT_STATES.IDLE;
    const updateState = (newState, meta = {}) => {
      const oldState = currentState;
      currentState = newState;
      eventBus.emitStateChange(oldState, newState, meta);
    };

    const sessionMessages = [...messages];
    const root = workspaceRoot || workspaceManager.getWorkspace(sessionId);
    const mode = settings.agentMode ? 'code' : (settings.mode || 'chat');

    // Build rich workspace context for system prompt
    const workspaceContext = await workspaceManager.buildWorkspaceContextString(root);
    
    // Assemble tools based on mode and settings
    const formattedTools = toolRegistry.getFormattedTools({
      mode,
      agentMode: Boolean(settings.agentMode || settings.agentModeActive),
      isCanvasOpen: Boolean(settings.isCanvasOpen),
      webSearchEnabled: settings.webSearch?.enabled !== false,
      mcpTools: discoveredTools
    });

    let iteration = 0;
    let finalAssistantMessage = null;

    try {
      while (iteration < maxIterations) {
        iteration++;

        if (abortController.signal.aborted) {
          updateState(AGENT_STATES.CANCELLED);
          return { status: 'cancelled', messages: sessionMessages };
        }

        // 1. Compact context if necessary
        const { messages: compacted } = compactionManager.compactHistory({
          messages: sessionMessages,
          systemPrompt: workspaceContext,
          maxContextTokens: settings.maxContextTokens || 32000
        });

        // 2. Transition to THINKING
        updateState(AGENT_STATES.THINKING, { iteration });
        eventBus.emitTrajectoryStep({
          type: 'thinking',
          title: `Turn ${iteration}: Generating next action / reasoning`,
          iteration
        });

        // 3. Stream model completion
        const streamResult = await modelRouter.streamCompletion({
          messages: compacted,
          model,
          settings,
          tools: formattedTools,
          systemPrompt: workspaceContext,
          callbacks: {
            onToken: (token) => eventBus.emitTokenDelta(token),
            onReasoning: (reasoning) => eventBus.emitReasoningDelta(reasoning)
          },
          signal: abortController.signal
        });

        if (streamResult.cancelled || abortController.signal.aborted) {
          updateState(AGENT_STATES.CANCELLED);
          return { status: 'cancelled', messages: sessionMessages };
        }

        if (!streamResult.success) {
          updateState(AGENT_STATES.FAILED, { error: streamResult.error });
          eventBus.emitError(streamResult.error);
          return { status: 'failed', error: streamResult.error, messages: sessionMessages };
        }

        const assistantMsg = streamResult.message;
        sessionMessages.push(assistantMsg);
        finalAssistantMessage = assistantMsg;

        // 4. Check if tools were requested
        const toolCalls = assistantMsg.tool_calls || [];
        if (toolCalls.length === 0) {
          // No more tools -> completed successfully
          updateState(AGENT_STATES.COMPLETED, { iteration });
          eventBus.emitDone(assistantMsg, { iterations: iteration, totalMessages: sessionMessages.length });
          return {
            status: 'completed',
            message: assistantMsg,
            messages: sessionMessages,
            iterations: iteration
          };
        }

        // 5. Tool execution phase
        updateState(AGENT_STATES.TOOL_REQUEST, { toolCallsCount: toolCalls.length });

        for (const toolCall of toolCalls) {
          if (abortController.signal.aborted) {
            updateState(AGENT_STATES.CANCELLED);
            return { status: 'cancelled', messages: sessionMessages };
          }

          const toolName = toolCall.function?.name;
          const toolDef = toolRegistry.getTool(toolName, discoveredTools);

          eventBus.emitToolCallRequest(toolCall);

          // Evaluate permission
          const permission = permissionEngine.evaluate(sessionId, toolCall, toolDef);

          if (permission.decision === PERMISSION_DECISION.DENY) {
            const errorResult = {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify({ error: `Permission denied: ${permission.reason || 'Operation not allowed.'}` })
            };
            sessionMessages.push(errorResult);
            eventBus.emitToolResult(toolCall.id, toolName, null, permission.reason);
            continue;
          }

          if (permission.decision === PERMISSION_DECISION.PROMPT) {
            updateState(AGENT_STATES.WAITING_PERMISSION, { toolName, toolCallId: toolCall.id });
            eventBus.emitToolPermissionRequired(toolCall, permission);

            const approval = await permissionEngine.requestApproval(sessionId, toolCall);
            if (!approval.approved) {
              const rejectionResult = {
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: JSON.stringify({ error: `User denied tool execution: ${approval.reason || 'User rejected'}` })
              };
              sessionMessages.push(rejectionResult);
              eventBus.emitToolResult(toolCall.id, toolName, null, approval.reason);
              continue;
            }
          }

          // Execute tool
          updateState(AGENT_STATES.TOOL_EXECUTION, { toolName, toolCallId: toolCall.id });
          eventBus.emitToolExecuting(toolCall);

          const executionResult = await toolExecutor.execute({
            sessionId,
            toolCall,
            toolDef,
            settings,
            mcpClients,
            discoveredTools,
            workspaceRoot: root
          });

          const toolResponseContent = executionResult.error 
            ? JSON.stringify({ error: executionResult.error })
            : (typeof executionResult.result === 'string' ? executionResult.result : JSON.stringify(executionResult.result));

          sessionMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: toolResponseContent
          });

          eventBus.emitToolResult(toolCall.id, toolName, executionResult.result, executionResult.error);
          eventBus.emitTrajectoryStep({
            type: 'tool_execution',
            title: `Executed ${toolName}`,
            toolName,
            toolCallId: toolCall.id,
            success: !executionResult.error
          });
        }

        // 6. Observing phase
        updateState(AGENT_STATES.OBSERVING, { iteration });
      }

      // Max iterations reached
      updateState(AGENT_STATES.COMPLETED, { iteration, reason: 'limit_reached' });
      eventBus.emitDone(finalAssistantMessage, { iterations: iteration, limitReached: true });
      return {
        status: 'limit_reached',
        message: finalAssistantMessage,
        messages: sessionMessages,
        iterations: iteration
      };
    } catch (err) {
      updateState(AGENT_STATES.FAILED, { error: err.message });
      eventBus.emitError(err);
      return { status: 'error', error: err.message, messages: sessionMessages };
    }
  }
}

const agentLoop = new AgentLoop();

module.exports = {
  AgentLoop,
  agentLoop
};

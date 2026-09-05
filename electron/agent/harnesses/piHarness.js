const { AGENT_STATES } = require('../eventBus');
const { toolExecutor } = require('../toolExecutor');
const { workspaceManager } = require('../workspaceManager');
const { compactionManager } = require('../compactionManager');
const { PERMISSION_DECISION } = require('../permissionEngine');
const {
  getApiKeyForProvider,
  getBaseUrlForProvider,
  getDefaultModel
} = require('../../../shared/providers');

const EMPTY_USAGE = Object.freeze({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
});

function cloneEmptyUsage() {
  return { ...EMPTY_USAGE, cost: { ...EMPTY_USAGE.cost } };
}

function stringifyContent(content) {
  if (typeof content === 'string') return content;
  if (content === undefined || content === null) return '';
  if (Array.isArray(content)) {
    return content.map(block => {
      if (typeof block === 'string') return block;
      if (block?.type === 'text') return block.text || '';
      return JSON.stringify(block);
    }).filter(Boolean).join('\n');
  }
  return JSON.stringify(content);
}

function parseArguments(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
}

function toPiMessage(message, model) {
  if (!message) return null;
  const timestamp = Number(message.timestamp) || Date.now();
  if (message.role === 'system') {
    return { role: 'user', content: `[System context]\n${stringifyContent(message.content)}`, timestamp };
  }
  if (message.role === 'user') {
    return { role: 'user', content: stringifyContent(message.content), timestamp };
  }
  if (message.role === 'tool' || message.role === 'toolResult') {
    const text = stringifyContent(message.content);
    return {
      role: 'toolResult',
      toolCallId: message.tool_call_id || message.toolCallId || message.id || `tool_${timestamp}`,
      toolName: message.name || message.toolName || 'unknown_tool',
      content: [{ type: 'text', text }],
      details: message.details || {},
      isError: Boolean(message.error || message.isError || /"error"\s*:/.test(text)),
      timestamp
    };
  }
  if (message.role !== 'assistant') return null;

  if (Array.isArray(message.content) && message.content.some(block => ['text', 'thinking', 'toolCall'].includes(block?.type))) {
    return {
      ...message,
      api: message.api || model.api,
      provider: message.provider || model.provider,
      model: message.model || model.id,
      usage: message.usage || cloneEmptyUsage(),
      stopReason: message.stopReason || 'stop',
      timestamp
    };
  }

  const content = [];
  if (message.reasoning) content.push({ type: 'thinking', thinking: stringifyContent(message.reasoning) });
  const text = stringifyContent(message.content);
  if (text) content.push({ type: 'text', text });
  for (const call of message.tool_calls || []) {
    content.push({
      type: 'toolCall',
      id: call.id,
      name: call.function?.name || call.name,
      arguments: parseArguments(call.function?.arguments ?? call.arguments)
    });
  }
  return {
    role: 'assistant',
    content,
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: message.usage || cloneEmptyUsage(),
    stopReason: content.some(block => block.type === 'toolCall') ? 'toolUse' : 'stop',
    timestamp
  };
}

function toNeoMessage(message) {
  if (!message) return null;
  if (message.role === 'user') {
    return { role: 'user', content: stringifyContent(message.content), timestamp: message.timestamp };
  }
  if (message.role === 'toolResult') {
    return {
      role: 'tool',
      tool_call_id: message.toolCallId,
      name: message.toolName,
      content: stringifyContent(message.content),
      error: message.isError ? stringifyContent(message.content) : null,
      timestamp: message.timestamp
    };
  }
  if (message.role !== 'assistant') return null;

  const text = (message.content || []).filter(block => block.type === 'text').map(block => block.text || '').join('');
  const reasoning = (message.content || []).filter(block => block.type === 'thinking').map(block => block.thinking || '').join('');
  const toolCalls = (message.content || []).filter(block => block.type === 'toolCall').map(call => ({
    id: call.id,
    type: 'function',
    function: { name: call.name, arguments: JSON.stringify(call.arguments || {}) }
  }));
  const rawUsage = message.usage || {};
  const input = Number(rawUsage.input) || 0;
  const output = Number(rawUsage.output) || 0;
  const cacheRead = Number(rawUsage.cacheRead) || 0;
  const cacheWrite = Number(rawUsage.cacheWrite) || 0;
  const promptTokens = (rawUsage.prompt_tokens !== undefined)
    ? Number(rawUsage.prompt_tokens) || 0
    : (input + cacheRead);
  const completionTokens = (rawUsage.completion_tokens !== undefined)
    ? Number(rawUsage.completion_tokens) || 0
    : output;
  const totalTokens = (rawUsage.total_tokens !== undefined)
    ? Number(rawUsage.total_tokens) || 0
    : (rawUsage.totalTokens !== undefined ? Number(rawUsage.totalTokens) || 0 : (promptTokens + completionTokens));

  const completionTime = Number(rawUsage.completion_time || rawUsage.total_time || rawUsage.client_duration) || (rawUsage.durationMs ? rawUsage.durationMs / 1000 : 0);
  const tokensPerSec = completionTime > 0 && completionTokens > 0
    ? Math.round(completionTokens / completionTime)
    : (rawUsage.tokens_per_sec || 0);

  const usage = message.usage ? {
    ...rawUsage,
    input,
    output,
    cacheRead,
    cacheWrite,
    totalTokens,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    cached_tokens: cacheRead,
    cache_read_input_tokens: cacheRead,
    prompt_cache_hit_tokens: cacheRead,
    prompt_tokens_details: {
      cached_tokens: cacheRead
    },
    completion_time: completionTime || rawUsage.completion_time || 0,
    total_time: completionTime || rawUsage.total_time || 0,
    client_duration: completionTime || rawUsage.client_duration || 0,
    tokens_per_sec: tokensPerSec
  } : message.usage;

  return {
    role: 'assistant',
    content: text,
    reasoning,
    tool_calls: toolCalls,
    usage,
    finish_reason: message.stopReason,
    error: message.errorMessage || null,
    timestamp: message.timestamp
  };
}

function resolvePiModel(requestedModel, settings = {}) {
  let modelId = requestedModel || settings.model;
  let providerId = settings.provider || 'groq';
  if (modelId?.includes('::')) {
    const separator = modelId.indexOf('::');
    providerId = modelId.slice(0, separator) || providerId;
    modelId = modelId.slice(separator + 2);
  }
  modelId = modelId || getDefaultModel({ provider: providerId });
  const providerSettings = { ...settings, provider: providerId, model: modelId };
  const baseUrl = getBaseUrlForProvider(providerSettings, providerId);
  if (!baseUrl) throw new Error(`Pi harness could not resolve a base URL for provider "${providerId}".`);

  const usesNativeAnthropic = providerId === 'anthropic' && /api\.anthropic\.com/i.test(baseUrl);
  const supportsReasoning = /(^|[/_:.-])(o[134]|gpt-5|deepseek-r1|deepseek-reasoner|reasoner|reasoning|thinking)([/_:.-]|$)/i.test(modelId);
  return {
    providerSettings,
    apiKey: getApiKeyForProvider(providerSettings, providerId) || 'none',
    model: {
      id: modelId,
      name: modelId,
      api: usesNativeAnthropic ? 'anthropic-messages' : 'openai-completions',
      provider: providerId,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      reasoning: supportsReasoning && Boolean(settings.reasoning_effort && settings.reasoning_effort !== 'off'),
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: Number(settings.maxContextTokens) || 32000,
      maxTokens: Number(settings.maxTokens) || 8192
    }
  };
}

class PiHarnessAdapter {
  constructor(options = {}) {
    this.id = 'pi';
    this.name = 'Pi';
    this.description = 'Pi Agent Core integrado às ferramentas e permissões do NeoChat.';
    this.moduleLoader = options.moduleLoader || (async () => {
      const [{ Agent }, { streamSimple }] = await Promise.all([
        import('@earendil-works/pi-agent-core'),
        import('@earendil-works/pi-ai/compat')
      ]);
      return { Agent, streamSimple };
    });
    this.executor = options.toolExecutor || toolExecutor;
  }

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
    const { Agent, streamSimple } = await this.moduleLoader();
    const resolved = resolvePiModel(model, settings);
    const root = workspaceRoot || workspaceManager.getWorkspace(sessionId);
    const workspaceContext = [
      await workspaceManager.buildWorkspaceContextString(root),
      typeof settings.agentSystemPrompt === 'string' ? settings.agentSystemPrompt.trim() : ''
    ].filter(Boolean).join('\n\n');
    const formattedTools = toolRegistry.getFormattedTools({
      mode: 'code',
      agentMode: true,
      isCanvasOpen: Boolean(settings.isCanvasOpen),
      webSearchEnabled: settings.webSearch?.enabled !== false,
      mcpTools: discoveredTools
    });

    let currentState = AGENT_STATES.IDLE;
    let iteration = 0;
    let limitReached = false;
    const updateState = (next, metadata = {}) => {
      const previous = currentState;
      currentState = next;
      eventBus.emitStateChange(previous, next, metadata);
    };

    const piTools = formattedTools.map(entry => {
      const definition = entry.function;
      const toolDef = toolRegistry.getTool(definition.name, discoveredTools);
      return {
        name: definition.name,
        label: definition.name,
        description: definition.description || '',
        parameters: definition.parameters || { type: 'object', properties: {} },
        executionMode: 'sequential',
        execute: async (toolCallId, args) => {
          const toolCall = {
            id: toolCallId,
            type: 'function',
            function: { name: definition.name, arguments: JSON.stringify(args || {}) }
          };
          const permission = permissionEngine.evaluate(sessionId, toolCall, toolDef);
          if (permission.decision === PERMISSION_DECISION.DENY) {
            const reason = permission.reason || 'Operation not allowed.';
            eventBus.emitToolResult(toolCallId, definition.name, null, reason);
            throw new Error(`Permission denied: ${reason}`);
          }
          if (permission.decision === PERMISSION_DECISION.PROMPT) {
            updateState(AGENT_STATES.WAITING_PERMISSION, { toolName: definition.name, toolCallId });
            eventBus.emitToolPermissionRequired(toolCall, permission);
            const approval = await permissionEngine.requestApproval(sessionId, toolCall);
            if (!approval.approved) {
              const reason = approval.reason || 'User rejected';
              eventBus.emitToolResult(toolCallId, definition.name, null, reason);
              throw new Error(`User denied tool execution: ${reason}`);
            }
          }

          updateState(AGENT_STATES.TOOL_EXECUTION, { toolName: definition.name, toolCallId });
          eventBus.emitToolExecuting(toolCall);
          const execution = await this.executor.execute({
            sessionId,
            toolCall,
            toolDef,
            settings,
            mcpClients,
            discoveredTools,
            workspaceRoot: root
          });
          const text = execution.error
            ? JSON.stringify({ error: execution.error })
            : (typeof execution.result === 'string' ? execution.result : JSON.stringify(execution.result));
          eventBus.emitToolResult(toolCallId, definition.name, execution.result, execution.error);
          eventBus.emitTrajectoryStep({
            type: 'tool_execution',
            title: `Executed ${definition.name}`,
            toolName: definition.name,
            toolCallId,
            harness: 'pi',
            success: !execution.error
          });
          return { content: [{ type: 'text', text }], details: execution, terminate: false };
        }
      };
    });

    const initialMessages = messages.map(message => toPiMessage(message, resolved.model)).filter(Boolean);
    const agent = new Agent({
      initialState: {
        systemPrompt: workspaceContext,
        model: resolved.model,
        thinkingLevel: resolved.model.reasoning ? (settings.reasoning_effort || 'medium') : 'off',
        tools: piTools,
        messages: initialMessages
      },
      streamFn: streamSimple,
      getApiKey: () => resolved.apiKey,
      toolExecution: 'sequential',
      transformContext: async piMessages => {
        const neoMessages = piMessages.map(toNeoMessage).filter(Boolean);
        const compacted = compactionManager.compactHistory({
          messages: neoMessages,
          systemPrompt: workspaceContext,
          maxContextTokens: resolved.model.contextWindow
        });
        return compacted.messages.map(message => toPiMessage(message, resolved.model)).filter(Boolean);
      },
      shouldStopAfterTurn: context => {
        const hasToolCalls = context.message?.role === 'assistant' && context.message.content?.some(block => block.type === 'toolCall');
        if (iteration >= maxIterations && hasToolCalls) limitReached = true;
        return iteration >= maxIterations;
      },
      sessionId
    });

    let turnStartTime = Date.now();
    const runStartTime = Date.now();
    const turnDurations = new Map();

    const unsubscribe = agent.subscribe(event => {
      if (event.type === 'turn_start') {
        iteration += 1;
        turnStartTime = Date.now();
        updateState(AGENT_STATES.THINKING, { iteration, harness: 'pi' });
        eventBus.emitTrajectoryStep({
          type: 'thinking',
          title: `Turn ${iteration}: Pi generating next action`,
          iteration,
          harness: 'pi'
        });
      } else if (event.type === 'message_update') {
        const delta = event.assistantMessageEvent;
        if (delta.type === 'text_delta') eventBus.emitTokenDelta(delta.delta || '');
        if (delta.type === 'thinking_delta') eventBus.emitReasoningDelta(delta.delta || '');
      } else if (event.type === 'tool_execution_start') {
        const toolCall = {
          id: event.toolCallId,
          type: 'function',
          function: { name: event.toolName, arguments: JSON.stringify(event.args || {}) }
        };
        updateState(AGENT_STATES.TOOL_REQUEST, { toolName: event.toolName, toolCallId: event.toolCallId });
        eventBus.emitToolCallRequest(toolCall);
      } else if (event.type === 'turn_end') {
        const elapsed = Math.max(0.01, (Date.now() - turnStartTime) / 1000);
        turnDurations.set(iteration, elapsed);
        if (event.toolResults?.length) {
          updateState(AGENT_STATES.OBSERVING, { iteration, harness: 'pi' });
        }
      }
    });

    try {
      if (abortController.signal.aborted) {
        updateState(AGENT_STATES.CANCELLED, { harness: 'pi' });
        return { status: 'cancelled', messages };
      }
      const onAbort = () => agent.abort();
      abortController.signal.addEventListener('abort', onAbort, { once: true });
      try {
        await agent.continue();
      } finally {
        abortController.signal.removeEventListener('abort', onAbort);
      }

      const totalElapsed = Math.max(0.01, (Date.now() - runStartTime) / 1000);
      const assistantMsgs = (agent.state.messages || []).filter(message => message?.role === 'assistant');
      assistantMsgs.forEach((msg, idx) => {
        const measuredTime = turnDurations.get(idx + 1) || (totalElapsed / Math.max(1, assistantMsgs.length));
        if (msg.usage) {
          msg.usage.completion_time = msg.usage.completion_time || measuredTime;
          msg.usage.total_time = msg.usage.total_time || measuredTime;
          msg.usage.client_duration = msg.usage.client_duration || measuredTime;
        }
      });

      const neoMessages = agent.state.messages.map(toNeoMessage).filter(Boolean);
      const finalMessage = [...neoMessages].reverse().find(message => message.role === 'assistant') || null;
      if (abortController.signal.aborted || agent.state.errorMessage?.toLowerCase().includes('abort')) {
        updateState(AGENT_STATES.CANCELLED, { harness: 'pi' });
        return { status: 'cancelled', messages: neoMessages, iterations: iteration, harness: 'pi' };
      }
      if (agent.state.errorMessage) {
        updateState(AGENT_STATES.FAILED, { error: agent.state.errorMessage, harness: 'pi' });
        eventBus.emitError(agent.state.errorMessage, { harness: 'pi' });
        return { status: 'failed', error: agent.state.errorMessage, messages: neoMessages, iterations: iteration, harness: 'pi' };
      }

      updateState(AGENT_STATES.COMPLETED, { iteration, harness: 'pi', reason: limitReached ? 'limit_reached' : undefined });
      eventBus.emitDone(finalMessage, { iterations: iteration, totalMessages: neoMessages.length, harness: 'pi', limitReached });
      return {
        status: limitReached ? 'limit_reached' : 'completed',
        message: finalMessage,
        messages: neoMessages,
        iterations: iteration,
        harness: 'pi'
      };
    } catch (error) {
      const cancelled = abortController.signal.aborted || /abort/i.test(error.message || '');
      updateState(cancelled ? AGENT_STATES.CANCELLED : AGENT_STATES.FAILED, { error: error.message, harness: 'pi' });
      if (!cancelled) eventBus.emitError(error, { harness: 'pi' });
      return { status: cancelled ? 'cancelled' : 'error', error: error.message, messages, iterations: iteration, harness: 'pi' };
    } finally {
      unsubscribe();
    }
  }
}

module.exports = {
  PiHarnessAdapter,
  resolvePiModel,
  toNeoMessage,
  toPiMessage
};

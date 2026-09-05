const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { HarnessRegistry, normalizeHarnessId } = require('./electron/agent/harnessRegistry');
const { PiHarnessAdapter, resolvePiModel, toNeoMessage, toPiMessage } = require('./electron/agent/harnesses/piHarness');
const { ToolRegistry } = require('./electron/agent/toolRegistry');
const { PermissionEngine } = require('./electron/agent/permissionEngine');
const { AgentEventBus, AGENT_EVENTS } = require('./electron/agent/eventBus');

async function main() {
  assert.strictEqual(normalizeHarnessId('pi'), 'pi');
  assert.strictEqual(normalizeHarnessId('unknown'), 'native');

  const calls = [];
  const native = { id: 'native', name: 'Native', description: '', run: async value => ({ engine: 'native', value }) };
  const pi = { id: 'pi', name: 'Pi', description: '', run: async value => ({ engine: 'pi', value }) };
  const registry = new HarnessRegistry([native, pi]);
  assert.strictEqual((await registry.run({ settings: { agentHarness: 'pi' } })).engine, 'pi');
  assert.strictEqual((await registry.run({ settings: { agentHarness: 'bad' } })).engine, 'native');
  assert.deepStrictEqual(registry.list().map(item => item.id), ['native', 'pi']);

  const resolved = resolvePiModel('groq::test-model', {
    provider: 'groq',
    GROQ_API_KEY: 'test-key',
    apiKeys: { groq: 'test-key' },
    maxContextTokens: 16000
  });
  assert.strictEqual(resolved.model.id, 'test-model');
  assert.strictEqual(resolved.model.provider, 'groq');
  assert.strictEqual(resolved.model.api, 'openai-completions');
  assert.ok(resolved.model.baseUrl.includes('groq.com'));

  const neoAssistant = {
    role: 'assistant',
    content: 'working',
    reasoning: 'plan',
    tool_calls: [{ id: 'call_1', function: { name: 'read_file', arguments: '{"path":"README.md"}' } }],
    timestamp: 1
  };
  const piAssistant = toPiMessage(neoAssistant, resolved.model);
  assert.strictEqual(piAssistant.content.find(block => block.type === 'toolCall').name, 'read_file');
  const converted = toNeoMessage(piAssistant);
  assert.strictEqual(converted.tool_calls[0].function.name, 'read_file');

  const piMessageWithUsage = {
    role: 'assistant',
    content: [{ type: 'text', text: 'Files listed.' }],
    usage: { input: 121, output: 64, cacheRead: 2560, totalTokens: 2745, completion_time: 1.5 },
    stopReason: 'stop',
    timestamp: 123
  };
  const neoMessageWithUsage = toNeoMessage(piMessageWithUsage);
  assert.strictEqual(neoMessageWithUsage.usage.prompt_tokens, 2681);
  assert.strictEqual(neoMessageWithUsage.usage.completion_tokens, 64);
  assert.strictEqual(neoMessageWithUsage.usage.cached_tokens, 2560);
  assert.strictEqual(neoMessageWithUsage.usage.input, 121);
  assert.strictEqual(neoMessageWithUsage.usage.cacheRead, 2560);
  assert.strictEqual(neoMessageWithUsage.usage.completion_time, 1.5);
  assert.strictEqual(neoMessageWithUsage.usage.tokens_per_sec, 43);

  class FakeAgent {
    constructor(options) {
      this.options = options;
      this.state = {
        ...options.initialState,
        errorMessage: null,
        messages: [...options.initialState.messages]
      };
      this.listeners = [];
    }
    subscribe(listener) {
      this.listeners.push(listener);
      return () => { this.listeners = this.listeners.filter(item => item !== listener); };
    }
    async emit(event) {
      for (const listener of this.listeners) await listener(event, new AbortController().signal);
    }
    async continue() {
      await this.emit({ type: 'turn_start' });
      const tool = this.state.tools.find(item => item.name === 'read_file');
      await this.emit({ type: 'tool_execution_start', toolCallId: 'call_fake', toolName: 'read_file', args: { path: 'README.md' } });
      const result = await tool.execute('call_fake', { path: 'README.md' });
      this.state.messages.push({
        role: 'toolResult', toolCallId: 'call_fake', toolName: 'read_file', content: result.content,
        details: result.details, isError: false, timestamp: Date.now()
      });
      const assistant = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Pi completed safely.' }],
        api: this.state.model.api,
        provider: this.state.model.provider,
        model: this.state.model.id,
        usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: 'stop',
        timestamp: Date.now()
      };
      this.state.messages.push(assistant);
      await this.emit({ type: 'message_update', message: assistant, assistantMessageEvent: { type: 'text_delta', delta: 'Pi completed safely.', partial: assistant } });
    }
    abort() {}
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-pi-harness-'));
  const bus = new AgentEventBus('pi_test');
  const seenEvents = [];
  for (const eventName of Object.values(AGENT_EVENTS)) bus.on(eventName, payload => seenEvents.push({ eventName, payload }));
  const adapter = new PiHarnessAdapter({
    moduleLoader: async () => ({ FakeAgent, Agent: FakeAgent, streamSimple: () => { throw new Error('unused fake stream'); } }),
    toolExecutor: {
      execute: async options => {
        calls.push(options);
        return { result: 'README contents', tool_call_id: options.toolCall.id };
      }
    }
  });
  const result = await adapter.run({
    sessionId: 'pi_test',
    messages: [{ role: 'user', content: 'Read the README', timestamp: Date.now() }],
    model: 'groq::test-model',
    settings: { provider: 'groq', GROQ_API_KEY: 'test-key', apiKeys: { groq: 'test-key' }, agentMode: true },
    toolRegistry: new ToolRegistry(),
    permissionEngine: new PermissionEngine({ agentMode: true }),
    eventBus: bus,
    workspaceRoot: tempRoot,
    maxIterations: 5
  });
  fs.rmSync(tempRoot, { recursive: true, force: true });

  assert.strictEqual(result.status, 'completed');
  assert.strictEqual(result.harness, 'pi');
  assert.strictEqual(calls.length, 1, 'Pi tools must execute through NeoChat ToolExecutor');
  assert.strictEqual(calls[0].toolCall.function.name, 'read_file');
  assert.ok(seenEvents.some(item => item.eventName === AGENT_EVENTS.TOOL_CALL_REQUEST));
  assert.ok(seenEvents.some(item => item.eventName === AGENT_EVENTS.TOOL_RESULT));
  assert.ok(seenEvents.some(item => item.eventName === AGENT_EVENTS.TOKEN_DELTA));

  const [{ Agent }, { createFauxCore, fauxAssistantMessage, fauxToolCall }] = await Promise.all([
    import('@earendil-works/pi-agent-core'),
    import('@earendil-works/pi-ai')
  ]);
  const faux = createFauxCore({
    api: 'openai-completions',
    provider: 'groq',
    models: [{ id: 'test-model' }],
    tokensPerSecond: 0
  });
  faux.setResponses([
    fauxAssistantMessage(fauxToolCall('read_file', { path: 'README.md' }, { id: 'call_real_pi' }), { stopReason: 'toolUse' }),
    fauxAssistantMessage('Real Pi loop completed.')
  ]);
  const realRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-real-pi-'));
  let realExecutions = 0;
  const realAdapter = new PiHarnessAdapter({
    moduleLoader: async () => ({ Agent, streamSimple: faux.streamSimple }),
    toolExecutor: {
      execute: async () => {
        realExecutions += 1;
        return { result: 'README contents' };
      }
    }
  });
  const realResult = await realAdapter.run({
    sessionId: 'real_pi_test',
    messages: [{ role: 'user', content: 'Use a tool', timestamp: Date.now() }],
    model: 'groq::test-model',
    settings: { provider: 'groq', GROQ_API_KEY: 'test-key', apiKeys: { groq: 'test-key' }, agentMode: true },
    toolRegistry: new ToolRegistry(),
    permissionEngine: new PermissionEngine({ agentMode: true }),
    eventBus: new AgentEventBus('real_pi_test'),
    workspaceRoot: realRoot,
    maxIterations: 5
  });
  fs.rmSync(realRoot, { recursive: true, force: true });
  assert.strictEqual(realResult.status, 'completed');
  assert.strictEqual(realExecutions, 1, 'The real Pi Agent loop must route tool execution through NeoChat');
  assert.ok(realResult.message.content.includes('Real Pi loop completed.'));

  console.log('Agent harness adapter tests passed.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

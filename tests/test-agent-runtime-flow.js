const assert = require('assert');

const { NeoAgentRuntime, AGENT_EVENTS } = require('../electron/agent');
const { agentLoop } = require('../electron/agent/agentLoop');
const { modelRouter } = require('../electron/agent/modelRouter');
const { SwarmManager } = require('../electron/agent/swarmManager');
const { CompactionManager } = require('../electron/agent/compactionManager');

async function testQueuedHistoryAndSubscriptions() {
  const runtime = new NeoAgentRuntime();
  const session = runtime.createSession({ sessionId: 'flow-session', messages: [] });
  const originalRun = agentLoop.run;
  const executionOrder = [];

  agentLoop.run = async ({ messages, eventBus }) => {
    const prompt = messages[messages.length - 1].content;
    executionOrder.push(`start:${prompt}`);
    await new Promise(resolve => setTimeout(resolve, prompt === 'first' ? 20 : 1));
    const resultMessages = [...messages, { role: 'assistant', content: `answer:${prompt}` }];
    eventBus.emitDone(resultMessages[resultMessages.length - 1]);
    executionOrder.push(`end:${prompt}`);
    return { status: 'completed', messages: resultMessages, message: resultMessages[resultMessages.length - 1] };
  };

  let listenerA = 0;
  let listenerB = 0;
  const unsubscribeA = runtime.subscribe(session.sessionId, event => {
    if (event.event === AGENT_EVENTS.DONE) listenerA += 1;
  });
  const unsubscribeB = runtime.subscribe(session.sessionId, event => {
    if (event.event === AGENT_EVENTS.DONE) listenerB += 1;
  });

  try {
    const first = runtime.prompt(session.sessionId, 'first');
    const second = runtime.prompt(session.sessionId, 'second');
    await Promise.all([first, second]);
    assert.deepStrictEqual(executionOrder, ['start:first', 'end:first', 'start:second', 'end:second']);
    assert.deepStrictEqual(session.messages.map(message => message.content), ['first', 'answer:first', 'second', 'answer:second']);
    assert.strictEqual(listenerA, 2);
    assert.strictEqual(listenerB, 2);
    unsubscribeA();
    session.eventBus.emitDone({ role: 'assistant', content: 'third' });
    assert.strictEqual(listenerA, 2);
    assert.strictEqual(listenerB, 3, 'unsubscribing one listener must preserve the other');
  } finally {
    unsubscribeA();
    unsubscribeB();
    agentLoop.run = originalRun;
  }
}

async function testSwarmRouterContract() {
  const manager = new SwarmManager();
  const originalStream = modelRouter.streamCompletion;
  let receivedSignal = false;
  let streamed = '';

  modelRouter.streamCompletion = async options => {
    receivedSignal = options.signal instanceof AbortSignal;
    options.callbacks.onToken('hello ');
    options.callbacks.onToken('world');
    return { success: true, message: { role: 'assistant', content: 'hello world' } };
  };

  try {
    const output = await manager._executeAgent({
      role: { name: 'Test', systemPrompt: 'Test' },
      prompt: 'Run',
      settings: {},
      workspaceRoot: process.cwd(),
      abortController: new AbortController(),
      onChunk: chunk => { streamed += chunk; }
    });
    assert.strictEqual(output, 'hello world');
    assert.strictEqual(streamed, 'hello world');
    assert.strictEqual(receivedSignal, true);
  } finally {
    modelRouter.streamCompletion = originalStream;
  }
}

function testCompactionIntegrity() {
  const manager = new CompactionManager();
  const messages = [
    { role: 'user', content: 'old request '.repeat(30) },
    { role: 'assistant', content: '', tool_calls: [{ id: 'call-old', function: { name: 'read_file', arguments: '{"path":"old.js"}' } }] },
    { role: 'tool', tool_call_id: 'call-old', name: 'read_file', content: 'old result '.repeat(30) },
    { role: 'assistant', content: 'old outcome '.repeat(30) },
    { role: 'user', content: 'recent request' },
    { role: 'assistant', content: '', tool_calls: [{ id: 'call-new', function: { name: 'read_file', arguments: '{"path":"new.js"}' } }] },
    { role: 'tool', tool_call_id: 'call-new', name: 'read_file', content: 'recent tool result' }
  ];
  const result = manager.compactHistory({ messages, maxContextTokens: 100, keepRecentTurns: 1 });
  assert.strictEqual(result.compacted, true);
  assert.strictEqual(result.messages[1].content, 'recent request');
  assert.strictEqual(result.messages[2].tool_calls[0].id, 'call-new');
  assert.strictEqual(result.messages[3].tool_call_id, 'call-new');
  assert.match(result.summary, /old\.js/);
}

async function run() {
  await testQueuedHistoryAndSubscriptions();
  await testSwarmRouterContract();
  testCompactionIntegrity();
  console.log('Agent runtime flow tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

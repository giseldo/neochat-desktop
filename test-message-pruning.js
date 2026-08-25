const assert = require('assert');
const {
  groupMessagesIntoAtomicBlocks,
  sanitizeMessageHistory,
  pruneMessageHistory,
  estimateTokenCount
} = require('./electron/messageUtils');

console.log('--- Running Message Pruning & Sanitization Tests ---');

// Test 1: Atomic block grouping
console.log('\n[Test 1] Testing groupMessagesIntoAtomicBlocks...');
const sampleMessages1 = [
  { role: 'system', content: 'You are an AI' },
  { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
  { role: 'assistant', content: 'Hi there!' },
  { role: 'user', content: [{ type: 'text', text: 'Search something' }] },
  {
    role: 'assistant',
    content: '',
    tool_calls: [
      { id: 'call_1', type: 'function', function: { name: 'web_search', arguments: '{"q":"a"}' } },
      { id: 'call_2', type: 'function', function: { name: 'web_search', arguments: '{"q":"b"}' } }
    ]
  },
  { role: 'tool', tool_call_id: 'call_1', content: 'Result 1' },
  { role: 'tool', tool_call_id: 'call_2', content: 'Result 2' },
  { role: 'assistant', content: 'Here is the answer.' }
];

const blocks1 = groupMessagesIntoAtomicBlocks(sampleMessages1);
assert.strictEqual(blocks1.length, 6, 'Should have 6 atomic blocks');
assert.strictEqual(blocks1[0][0].role, 'system');
assert.strictEqual(blocks1[1][0].role, 'user');
assert.strictEqual(blocks1[2][0].role, 'assistant');
assert.strictEqual(blocks1[3][0].role, 'user');
// Block 4 should contain the assistant with tool_calls AND both tool responses (3 messages)
assert.strictEqual(blocks1[4].length, 3, 'Assistant with 2 tool calls should be grouped with its 2 tool messages into 1 block');
assert.strictEqual(blocks1[4][0].role, 'assistant');
assert.strictEqual(blocks1[4][1].role, 'tool');
assert.strictEqual(blocks1[4][2].role, 'tool');
assert.strictEqual(blocks1[5][0].role, 'assistant');
console.log('✅ Test 1 passed: Atomic blocks correctly grouped.');

// Test 2: Dropping orphan tool messages during sanitization
console.log('\n[Test 2] Testing sanitizeMessageHistory dropping orphan tools...');
const orphanToolMessages = [
  { role: 'user', content: 'Hello' },
  { role: 'tool', tool_call_id: 'orphan_call', content: 'Orphan tool output' }, // Orphan!
  { role: 'assistant', content: 'Response' }
];

const sanitized2 = sanitizeMessageHistory(orphanToolMessages);
assert.strictEqual(sanitized2.length, 2, 'Orphan tool message must be dropped');
assert.strictEqual(sanitized2[0].role, 'user');
assert.strictEqual(sanitized2[1].role, 'assistant');
console.log('✅ Test 2 passed: Orphan tool messages successfully dropped.');

// Test 3: Simulation of user's exact bug scenario (Multi-turn tool search exceeding token limit)
console.log('\n[Test 3] Simulating multi-turn tool calling with token pruning...');
// Let's create a conversation with small context model (e.g. 2000 tokens context -> target 1000 tokens)
const modelContextSizes = {
  'deepseek-test': { context: 2000 }
};

const longSearchContent = 'A'.repeat(600); // ~150 tokens per tool result

const bugScenarioMessages = [
  { role: 'user', content: [{ type: 'text', text: 'piada' }] },
  { role: 'assistant', content: 'Por que o programador foi ao oftalmologista?...' },
  { role: 'user', content: [{ type: 'text', text: 'noticias de hoje' }] }
];

// Add 6 iterations of tool calls
for (let iter = 1; iter <= 6; iter++) {
  const callId1 = `call_iter_${iter}_1`;
  const callId2 = `call_iter_${iter}_2`;
  bugScenarioMessages.push({
    role: 'assistant',
    content: '',
    tool_calls: [
      { id: callId1, type: 'function', function: { name: 'web_search', arguments: `{"query":"query ${iter} 1"}` } },
      { id: callId2, type: 'function', function: { name: 'web_search', arguments: `{"query":"query ${iter} 2"}` } }
    ]
  });
  bugScenarioMessages.push({ role: 'tool', tool_call_id: callId1, content: `Result ${iter}-1: ${longSearchContent}` });
  bugScenarioMessages.push({ role: 'tool', tool_call_id: callId2, content: `Result ${iter}-2: ${longSearchContent}` });
}

// Now prune the history
const pruned = pruneMessageHistory(bugScenarioMessages, 'deepseek-test', modelContextSizes);

// Verify validity of the pruned message history:
// Invariant 1: Every message with role 'tool' MUST be immediately preceded by an assistant message with tool_calls containing its tool_call_id
// (or preceded by other tool messages belonging to the same assistant message)
for (let i = 0; i < pruned.length; i++) {
  const msg = pruned[i];
  if (msg.role === 'tool') {
    // Look backwards to find the assistant message
    let foundMatchingAssistant = false;
    for (let k = i - 1; k >= 0; k--) {
      if (pruned[k].role === 'assistant' && Array.isArray(pruned[k].tool_calls)) {
        const hasCallId = pruned[k].tool_calls.some(tc => tc.id === msg.tool_call_id);
        if (hasCallId) {
          foundMatchingAssistant = true;
          break;
        }
      }
      // If we hit a user or system message before finding the matching assistant, it's invalid
      if (pruned[k].role === 'user' || pruned[k].role === 'system') {
        break;
      }
    }
    assert.strictEqual(
      foundMatchingAssistant,
      true,
      `Message at index ${i} with role 'tool' (id ${msg.tool_call_id}) MUST have a preceding assistant with tool_calls`
    );
  }
}

// Invariant 2: The conversation does NOT start with a tool message
assert.notStrictEqual(pruned[0].role, 'tool', 'Pruned conversation must not start with a tool message');

console.log(`✅ Test 3 passed: ${bugScenarioMessages.length} messages pruned to ${pruned.length} messages without breaking any tool call / tool response pairs!`);

// Test 4: Verify sanitizeMessageHistory cleans internal fields
console.log('\n[Test 4] Testing internal fields stripping in sanitizeMessageHistory...');
const dirtyMessage = {
  role: 'assistant',
  content: 'Hello',
  reasoning: 'Some internal thoughts',
  isStreaming: false,
  reasoningDuration: 5,
  liveReasoning: 'live',
  liveExecutedTools: [1, 2],
  executed_tools: [3],
  usage: { total_tokens: 100 },
  timestamp: 123456789,
  createdAt: '2026-08-25T00:00:00.000Z'
};

const cleaned = sanitizeMessageHistory([dirtyMessage]);
assert.strictEqual(cleaned[0].reasoning, undefined);
assert.strictEqual(cleaned[0].isStreaming, undefined);
assert.strictEqual(cleaned[0].reasoningDuration, undefined);
assert.strictEqual(cleaned[0].liveReasoning, undefined);
assert.strictEqual(cleaned[0].liveExecutedTools, undefined);
assert.strictEqual(cleaned[0].executed_tools, undefined);
assert.strictEqual(cleaned[0].usage, undefined);
assert.strictEqual(cleaned[0].timestamp, undefined);
assert.strictEqual(cleaned[0].createdAt, undefined);
assert.strictEqual(cleaned[0].content, 'Hello');
console.log('✅ Test 4 passed: Internal fields properly stripped.');

console.log('\n🎉 ALL MESSAGE PRUNING & SANITIZATION TESTS PASSED SUCCESSFULLY! 🎉\n');

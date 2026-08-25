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
const cleanedAsst = cleaned.find(m => m.role === 'assistant');
assert(cleanedAsst, 'Cleaned array must contain assistant message');
assert.strictEqual(cleanedAsst.reasoning, undefined);
assert.strictEqual(cleanedAsst.isStreaming, undefined);
assert.strictEqual(cleanedAsst.reasoningDuration, undefined);
assert.strictEqual(cleanedAsst.liveReasoning, undefined);
assert.strictEqual(cleanedAsst.liveExecutedTools, undefined);
assert.strictEqual(cleanedAsst.executed_tools, undefined);
assert.strictEqual(cleanedAsst.usage, undefined);
assert.strictEqual(cleanedAsst.timestamp, undefined);
assert.strictEqual(cleanedAsst.createdAt, undefined);
assert.strictEqual(cleanedAsst.content, 'Hello');
console.log('✅ Test 4 passed: Internal fields properly stripped.');

// Test 5: Strict pairing with partial tool responses
console.log('\n[Test 5] Testing strict pairing with partial tool responses...');
const partialToolMessages = [
  { role: 'user', content: [{ type: 'text', text: 'Run tools' }] },
  {
    role: 'assistant',
    content: '',
    tool_calls: [
      { id: 'call_success', type: 'function', function: { name: 'web_search', arguments: '{"q":"a"}' } },
      { id: 'call_failed_unfulfilled', type: 'function', function: { name: 'web_search', arguments: '{"q":"b"}' } }
    ]
  },
  { role: 'tool', tool_call_id: 'call_success', content: 'Success result' }
  // Notice call_failed_unfulfilled is missing in tool responses
];

const sanitized5 = sanitizeMessageHistory(partialToolMessages);
assert.strictEqual(sanitized5.length, 3, 'Should keep user, assistant with matched tools, and matching tool response');
assert.strictEqual(sanitized5[1].tool_calls.length, 1, 'Assistant should only have 1 matched tool call');
assert.strictEqual(sanitized5[1].tool_calls[0].id, 'call_success', 'Should keep the call_success ID');
console.log('✅ Test 5 passed: Partial tool calls properly filtered to only fulfilled calls.');

// Test 6: Preserving the active user turn during heavy multi-search pruning
console.log('\n[Test 6] Testing active turn user prompt preservation during heavy search pruning...');
const multiSearchMessages = [
  { role: 'user', content: [{ type: 'text', text: 'piada inicial' }] },
  { role: 'assistant', content: 'Resposta da piada...' },
  { role: 'user', content: [{ type: 'text', text: 'quais as principais noticias de hoje?' }] }
];

for (let iter = 1; iter <= 10; iter++) {
  const c1 = `c_${iter}_1`;
  const c2 = `c_${iter}_2`;
  multiSearchMessages.push({
    role: 'assistant',
    content: iter === 1 ? 'Buscando notícias...' : '',
    tool_calls: [
      { id: c1, type: 'function', function: { name: 'web_search', arguments: '{}' } },
      { id: c2, type: 'function', function: { name: 'web_search', arguments: '{}' } }
    ]
  });
  multiSearchMessages.push({ role: 'tool', tool_call_id: c1, content: 'Notícia '.repeat(100) });
  multiSearchMessages.push({ role: 'tool', tool_call_id: c2, content: 'Notícia '.repeat(100) });
}

const pruned6 = pruneMessageHistory(multiSearchMessages, 'deepseek-test', { 'deepseek-test': { context: 1500 } });
const userPromptsInPruned = pruned6.filter(m => m.role === 'user');
assert(userPromptsInPruned.length >= 1, 'Pruned history must have at least 1 user prompt');
const lastUserPrompt = userPromptsInPruned[userPromptsInPruned.length - 1];
const lastUserText = Array.isArray(lastUserPrompt.content) ? lastUserPrompt.content[0].text : lastUserPrompt.content;
assert.strictEqual(lastUserText, 'quais as principais noticias de hoje?', 'Active turn user prompt must be preserved');
console.log('✅ Test 6 passed: Active user prompt preserved during heavy tool pruning.');

console.log('\n🎉 ALL MESSAGE PRUNING & SANITIZATION TESTS PASSED SUCCESSFULLY! 🎉\n');

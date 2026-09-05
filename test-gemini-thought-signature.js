const assert = require('assert');
const { sanitizeMessageHistory } = require('./electron/messageUtils');
const { ModelRouter } = require('./electron/agent/modelRouter');

console.log('--- Running Gemini Thought Signature Tests ---');

// Test 1: sanitizeMessageHistory preserves thought_signature and extra_content
console.log('\n[Test 1] Testing sanitizeMessageHistory preserves thought_signature...');
const messagesWithSignatures = [
  { role: 'user', content: 'List files' },
  {
    role: 'assistant',
    content: '',
    tool_calls: [
      {
        id: 'call_gemini_1',
        type: 'function',
        function: { name: 'list_directory', arguments: '{"path":"."}' },
        thought_signature: 'sig_crypto_test_123',
        extra_content: { google: { thought_signature: 'sig_crypto_test_123' } }
      }
    ]
  },
  { role: 'tool', tool_call_id: 'call_gemini_1', content: '["file1.txt"]' }
];

const sanitized = sanitizeMessageHistory(messagesWithSignatures);
assert.strictEqual(sanitized.length, 3, 'All 3 messages should be preserved');
assert.strictEqual(sanitized[1].tool_calls[0].thought_signature, 'sig_crypto_test_123', 'thought_signature must be preserved');
assert.deepStrictEqual(sanitized[1].tool_calls[0].extra_content, { google: { thought_signature: 'sig_crypto_test_123' } }, 'extra_content must be preserved');
console.log('✅ Test 1 passed: sanitizeMessageHistory preserved thought_signature & extra_content.');

// Test 2: ModelRouter.buildApiParams preserves real thought_signature for Gemini
console.log('\n[Test 2] Testing ModelRouter.buildApiParams with existing thought_signature for Gemini...');
const router = new ModelRouter();
const paramsWithSig = router.buildApiParams({
  messages: messagesWithSignatures,
  model: 'gemini-2.5-flash',
  settings: { provider: 'gemini' },
  tools: [{ type: 'function', function: { name: 'list_directory' } }]
});

const assistantMsg = paramsWithSig.messages.find(m => m.role === 'assistant');
assert.ok(assistantMsg, 'Assistant message should be present');
assert.strictEqual(assistantMsg.tool_calls[0].thought_signature, 'sig_crypto_test_123');
assert.strictEqual(assistantMsg.tool_calls[0].thoughtSignature, 'sig_crypto_test_123');
assert.deepStrictEqual(assistantMsg.tool_calls[0].extra_content, { google: { thought_signature: 'sig_crypto_test_123' } });
console.log('✅ Test 2 passed: ModelRouter preserved real thought_signature for Gemini.');

// Test 3: ModelRouter.buildApiParams injects skip_thought_signature_validator for Gemini when missing
console.log('\n[Test 3] Testing ModelRouter.buildApiParams fallback for missing thought_signature on Gemini...');
const messagesWithoutSignature = [
  { role: 'user', content: 'List files' },
  {
    role: 'assistant',
    content: '',
    tool_calls: [
      {
        id: 'call_legacy_1',
        type: 'function',
        function: { name: 'list_directory', arguments: '{"path":"."}' }
      }
    ]
  },
  { role: 'tool', tool_call_id: 'call_legacy_1', content: '["file1.txt"]' }
];

const paramsWithFallback = router.buildApiParams({
  messages: messagesWithoutSignature,
  model: 'gemini-2.5-flash',
  settings: { provider: 'gemini' },
  tools: [{ type: 'function', function: { name: 'list_directory' } }]
});

const assistantMsgFallback = paramsWithFallback.messages.find(m => m.role === 'assistant');
assert.ok(assistantMsgFallback, 'Assistant message should be present');
assert.strictEqual(assistantMsgFallback.tool_calls[0].thought_signature, 'skip_thought_signature_validator');
assert.strictEqual(assistantMsgFallback.tool_calls[0].thoughtSignature, 'skip_thought_signature_validator');
assert.deepStrictEqual(assistantMsgFallback.tool_calls[0].extra_content, { google: { thought_signature: 'skip_thought_signature_validator' } });
console.log('✅ Test 3 passed: ModelRouter successfully injected skip_thought_signature_validator for Gemini.');

// Test 4: Non-Gemini providers do not get injected with skip_thought_signature_validator unnecessarily
console.log('\n[Test 4] Testing non-Gemini provider buildApiParams does not inject dummy signature...');
const paramsOpenAI = router.buildApiParams({
  messages: messagesWithoutSignature,
  model: 'gpt-4o',
  settings: { provider: 'openai' },
  tools: [{ type: 'function', function: { name: 'list_directory' } }]
});

const assistantMsgOpenAI = paramsOpenAI.messages.find(m => m.role === 'assistant');
assert.strictEqual(assistantMsgOpenAI.tool_calls[0].thought_signature, undefined);
assert.strictEqual(assistantMsgOpenAI.tool_calls[0].extra_content, undefined);
console.log('✅ Test 4 passed: Non-Gemini providers are unmodified.');

console.log('\n========================================');
console.log('🎉 ALL GEMINI THOUGHT SIGNATURE TESTS PASSED! 🎉');
console.log('========================================');

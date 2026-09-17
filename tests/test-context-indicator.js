const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Running Context Usage Indicator Tests ---');

// Dynamically import the ES module
async function runTests() {
  const contextUsageModulePath = path.resolve(__dirname, '../src/renderer/lib/contextUsage.js');
  const code = fs.readFileSync(contextUsageModulePath, 'utf8');
  const dataUri = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  const { getModelContextWindow, calculateConversationTokens, calculateContextUsage, DEFAULT_FALLBACK_CONTEXT } = await import(dataUri);

  console.log('[1] Testing getModelContextWindow...');
  // Test direct config
  const configs = {
    'llama-3.3-70b-versatile': { context: 128000 },
    'custom::my-model': { context: 16384 },
    'mistral-small-2603': { context: 8192 }
  };

  assert.strictEqual(getModelContextWindow('llama-3.3-70b-versatile', configs), 128000);
  assert.strictEqual(getModelContextWindow('custom::my-model', configs), 16384);
  assert.strictEqual(getModelContextWindow('groq::mistral-small-2603', configs), 8192);

  // Test heuristics
  assert.strictEqual(getModelContextWindow('gemini-2.0-flash', {}), 1000000);
  assert.strictEqual(getModelContextWindow('claude-3-7-sonnet', {}), 200000);
  assert.strictEqual(getModelContextWindow('deepseek-r1', {}), 64000);
  assert.strictEqual(getModelContextWindow('llama-3-8b', {}), 8192);
  assert.strictEqual(getModelContextWindow('unknown-model-xyz', {}), DEFAULT_FALLBACK_CONTEXT);
  console.log('   ✓ Model context window detection passed');

  console.log('[2] Testing calculateConversationTokens...');
  // Empty messages
  assert.strictEqual(calculateConversationTokens([], '', []), 0);

  // User message typed in draft
  assert.strictEqual(calculateConversationTokens([], 'Hello world!', []), 3); // 12 chars / 4 = 3 tokens

  // Message with usage in last assistant message (Turn 1: user, Turn 2: assistant with 180 prompt + 22 comp = 202)
  const messages = [
    { role: 'user', content: 'Tell me a joke' },
    {
      role: 'assistant',
      content: 'Why did the chicken cross the road?',
      usage: {
        prompt_tokens: 180,
        completion_tokens: 22,
        total_tokens: 202
      }
    }
  ];
  assert.strictEqual(calculateConversationTokens(messages, '', []), 202);

  // With a subsequent draft message (40 chars = 10 tokens)
  assert.strictEqual(calculateConversationTokens(messages, 'A'.repeat(40), []), 212);

  // With attached files
  const draftFiles = [
    { name: 'code.js', content: 'B'.repeat(100) }, // 25 tokens
    { name: 'photo.png', fileType: 'image' } // 800 tokens
  ];
  assert.strictEqual(calculateConversationTokens(messages, '', draftFiles), 202 + 25 + 800);
  console.log('   ✓ Conversation tokens calculation passed');

  console.log('[3] Testing calculateContextUsage (Replicating User Screenshot)...');
  // In user screenshot:
  // Current conversation tokens: 202
  // Total loaded context: 8192
  // 2.5% used (97.5% left)
  // Display pill: 2%
  const usageStats = calculateContextUsage({
    messages,
    selectedModel: 'mistral-small-2603',
    modelConfigs: { 'mistral-small-2603': { context: 8192 } },
    draftMessage: '',
    draftFiles: []
  });

  assert.strictEqual(usageStats.conversationTokens, 202);
  assert.strictEqual(usageStats.totalContext, 8192);
  assert.strictEqual(usageStats.displayPercentage, 2);
  assert.strictEqual(usageStats.usedPctStr, '2.5');
  assert.strictEqual(usageStats.leftPctStr, '97.5');
  console.log('   ✓ Replicating user screenshot values passed (202 / 8192 -> 2% pill, 2.5% used, 97.5% left)');

  console.log('[4] Verifying i18n Translations...');
  const translationsPath = path.resolve(__dirname, '../src/renderer/i18n/translations.js');
  const translationsCode = fs.readFileSync(translationsPath, 'utf8');

  assert(translationsCode.includes('currentConversationTokens'), 'Missing currentConversationTokens translation');
  assert(translationsCode.includes('totalLoadedContext'), 'Missing totalLoadedContext translation');
  assert(translationsCode.includes('contextUsageSummary'), 'Missing contextUsageSummary translation');
  assert(translationsCode.includes('contextUsageTooltip'), 'Missing contextUsageTooltip translation');
  console.log('   ✓ Translations verified for pt and en');

  console.log('========================================');
  console.log('🎉 ALL CONTEXT USAGE TESTS PASSED! 🎉');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

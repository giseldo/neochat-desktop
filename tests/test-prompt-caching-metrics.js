const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { collectUsage, toCsv } = require('../electron/observabilityManager');

async function testPromptCachingMetrics() {
  console.log('🧪 Testing Prompt Caching & Observability Metrics...');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-obs-test-'));
  const historyDir = path.join(tempDir, 'chat-history');
  fs.mkdirSync(historyDir, { recursive: true });

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  // Write a mock chat with prompt caching usage (e.g. Anthropic Claude / DeepSeek)
  const mockChat = {
    id: 'chat_test_cache_1',
    createdAt: `${currentMonth}-01T10:00:00.000Z`,
    updatedAt: `${currentMonth}-01T10:05:00.000Z`,
    model: 'claude-3-7-sonnet',
    messages: [
      { role: 'user', content: 'Explain architectural patterns in microservices' },
      {
        role: 'assistant',
        content: 'Here are key patterns...',
        usage: {
          prompt_tokens: 500,
          completion_tokens: 300,
          cache_read_input_tokens: 4500 // 4,500 tokens read from cache!
        }
      }
    ]
  };

  fs.writeFileSync(path.join(historyDir, 'chat_test_cache_1.json'), JSON.stringify(mockChat));

  const settings = {
    observability: {
      monthlyBudgetUsd: 10,
      modelRates: {
        'claude-3-7-sonnet': { input: 3.0, output: 15.0 } // $3/1M input, $15/1M output
      }
    }
  };

  const summary = collectUsage(tempDir, settings, now);

  assert.strictEqual(summary.chats, 1);
  assert.strictEqual(summary.messages, 1);
  assert.strictEqual(summary.promptTokens, 500);
  assert.strictEqual(summary.completionTokens, 300);
  assert.strictEqual(summary.cachedTokens, 4500);
  assert(summary.estimatedSavingsUsd > 0, 'Should calculate monetary savings from prompt cache');
  assert(summary.cacheHitRate > 80, 'Cache hit rate should be 90% (4500 / 5000)');

  const csv = toCsv(summary);
  assert(csv.includes('claude-3-7-sonnet'), 'CSV must contain model name');
  assert(csv.includes('cache_hit_rate_pct'), 'CSV must contain cache header');

  console.log('✅ [PASS] Prompt caching tokens, savings and hit rate calculations verified');

  // Cleanup
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
  console.log('🎉 All Prompt Caching Observability tests passed successfully!\n');
}

testPromptCachingMetrics().catch(err => {
  console.error('❌ Prompt Caching test failed:', err);
  process.exit(1);
});

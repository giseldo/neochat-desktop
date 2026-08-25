const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { collectUsage, toCsv } = require('./electron/observabilityManager');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-observability-'));
const history = path.join(root, 'chat-history');
fs.mkdirSync(history);
fs.writeFileSync(path.join(history, 'chat.json'), JSON.stringify({
  model: 'test-model', updatedAt: '2026-08-10T10:00:00.000Z', messages: [
    { role: 'user', content: 'hello' },
    { role: 'assistant', usage: { prompt_tokens: 1000, completion_tokens: 500 } }
  ]
}));

try {
  const summary = collectUsage(root, { observability: { monthlyBudgetUsd: 0.003, defaultRate: { input: 1, output: 2 } } }, new Date('2026-08-25T00:00:00.000Z'));
  assert.strictEqual(summary.totalTokens, 1500);
  assert.strictEqual(summary.estimatedCostUsd, 0.002);
  assert.strictEqual(summary.budgetPercent, 67);
  assert.strictEqual(summary.byModel['test-model'].messages, 1);
  assert(toCsv(summary).includes('test-model'));
  console.log('observability manager tests passed');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

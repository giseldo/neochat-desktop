const fs = require('fs');
const path = require('path');

function collectUsage(userDataPath, settings = {}, now = new Date()) {
  const historyDir = path.join(userDataPath, 'chat-history');
  const rates = settings.observability?.modelRates || {};
  const month = now.toISOString().slice(0, 7);
  const summary = {
    month,
    chats: 0,
    messages: 0,
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    estimatedSavingsUsd: 0,
    cacheHitRate: 0,
    byModel: {}
  };
  if (!fs.existsSync(historyDir)) return summary;

  for (const filename of fs.readdirSync(historyDir).filter(name => name.endsWith('.json'))) {
    try {
      const chat = JSON.parse(fs.readFileSync(path.join(historyDir, filename), 'utf8'));
      if (!(chat.updatedAt || chat.createdAt || '').startsWith(month)) continue;
      const model = chat.model || 'unknown';
      const bucket = summary.byModel[model] ||= {
        chats: 0,
        messages: 0,
        promptTokens: 0,
        completionTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        estimatedSavingsUsd: 0
      };
      bucket.chats += 1;
      summary.chats += 1;
      for (const message of chat.messages || []) {
        if (message.role !== 'assistant') continue;
        const u = message.usage || {};
        const prompt = Number(u.prompt_tokens ?? u.input_tokens ?? (u.input !== undefined ? (Number(u.input || 0) + Number(u.cacheRead || 0)) : 0)) || 0;
        const completion = Number(u.completion_tokens ?? u.output_tokens ?? u.output ?? 0) || 0;
        const cached = Number(u.prompt_cache_hit_tokens ?? u.cache_read_input_tokens ?? u.cached_tokens ?? u.cacheRead ?? u.prompt_tokens_details?.cached_tokens ?? 0) || 0;
        const rate = rates[model] || settings.observability?.defaultRate || { input: 0, output: 0 };
        const inputRate = Number(rate.input) || 0;
        const outputRate = Number(rate.output) || 0;
        const cost = (prompt * inputRate + completion * outputRate) / 1_000_000;
        // Prompt caching typically yields ~50% to 90% savings on cached tokens vs normal input rate
        const savings = (cached * (inputRate * 0.75)) / 1_000_000;

        summary.messages += 1;
        summary.promptTokens += prompt;
        summary.completionTokens += completion;
        summary.cachedTokens += cached;
        summary.estimatedCostUsd += cost;
        summary.estimatedSavingsUsd += savings;

        bucket.messages += 1;
        bucket.promptTokens += prompt;
        bucket.completionTokens += completion;
        bucket.cachedTokens += cached;
        bucket.estimatedCostUsd += cost;
        bucket.estimatedSavingsUsd += savings;
      }
      bucket.totalTokens = bucket.promptTokens + bucket.completionTokens;
    } catch (error) {
      console.warn(`[Observability] Ignoring unreadable history file ${filename}:`, error.message);
    }
  }
  summary.totalTokens = summary.promptTokens + summary.completionTokens;
  summary.estimatedCostUsd = Number(summary.estimatedCostUsd.toFixed(6));
  summary.estimatedSavingsUsd = Number(summary.estimatedSavingsUsd.toFixed(6));
  const totalInputs = summary.promptTokens + summary.cachedTokens;
  summary.cacheHitRate = totalInputs > 0 ? Number(((summary.cachedTokens / totalInputs) * 100).toFixed(1)) : 0;

  for (const bucket of Object.values(summary.byModel)) {
    bucket.estimatedCostUsd = Number(bucket.estimatedCostUsd.toFixed(6));
    bucket.estimatedSavingsUsd = Number(bucket.estimatedSavingsUsd.toFixed(6));
    const modelInputs = bucket.promptTokens + bucket.cachedTokens;
    bucket.cacheHitRate = modelInputs > 0 ? Number(((bucket.cachedTokens / modelInputs) * 100).toFixed(1)) : 0;
  }
  const budget = Number(settings.observability?.monthlyBudgetUsd) || 0;
  summary.monthlyBudgetUsd = budget;
  summary.budgetPercent = budget > 0 ? Math.round((summary.estimatedCostUsd / budget) * 100) : 0;
  summary.budgetExceeded = budget > 0 && summary.estimatedCostUsd >= budget;
  return summary;
}

function toCsv(summary) {
  const rows = [['model', 'chats', 'messages', 'prompt_tokens', 'completion_tokens', 'cached_tokens', 'total_tokens', 'estimated_cost_usd', 'estimated_savings_usd', 'cache_hit_rate_pct']];
  for (const [model, usage] of Object.entries(summary.byModel)) {
    rows.push([
      model,
      usage.chats,
      usage.messages,
      usage.promptTokens,
      usage.completionTokens,
      usage.cachedTokens || 0,
      usage.totalTokens,
      usage.estimatedCostUsd,
      usage.estimatedSavingsUsd || 0,
      usage.cacheHitRate || 0
    ]);
  }
  return rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
}

function initializeObservabilityHandlers(ipcMain, app, dialog, loadSettings) {
  const getSummary = () => collectUsage(app.getPath('userData'), loadSettings());
  ipcMain.handle('observability-summary', () => getSummary());
  ipcMain.handle('observability-export', async (_event, format = 'json') => {
    const summary = getSummary();
    const extension = format === 'csv' ? 'csv' : 'json';
    const result = await dialog.showSaveDialog({
      title: 'Export usage report',
      defaultPath: `neochat-usage-${summary.month}.${extension}`,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };
    const content = format === 'csv' ? toCsv(summary) : JSON.stringify(summary, null, 2);
    fs.writeFileSync(result.filePath, content, 'utf8');
    return { success: true, filePath: result.filePath };
  });
}

module.exports = { collectUsage, toCsv, initializeObservabilityHandlers };

const fs = require('fs');
const path = require('path');

function collectUsage(userDataPath, settings = {}, now = new Date()) {
  const historyDir = path.join(userDataPath, 'chat-history');
  const rates = settings.observability?.modelRates || {};
  const month = now.toISOString().slice(0, 7);
  const summary = { month, chats: 0, messages: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, byModel: {} };
  if (!fs.existsSync(historyDir)) return summary;

  for (const filename of fs.readdirSync(historyDir).filter(name => name.endsWith('.json'))) {
    try {
      const chat = JSON.parse(fs.readFileSync(path.join(historyDir, filename), 'utf8'));
      if (!(chat.updatedAt || chat.createdAt || '').startsWith(month)) continue;
      const model = chat.model || 'unknown';
      const bucket = summary.byModel[model] ||= { chats: 0, messages: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 };
      bucket.chats += 1;
      summary.chats += 1;
      for (const message of chat.messages || []) {
        if (message.role !== 'assistant') continue;
        const prompt = Number(message.usage?.prompt_tokens ?? message.usage?.input_tokens ?? 0) || 0;
        const completion = Number(message.usage?.completion_tokens ?? message.usage?.output_tokens ?? 0) || 0;
        const rate = rates[model] || settings.observability?.defaultRate || { input: 0, output: 0 };
        const cost = (prompt * (Number(rate.input) || 0) + completion * (Number(rate.output) || 0)) / 1_000_000;
        summary.messages += 1;
        summary.promptTokens += prompt;
        summary.completionTokens += completion;
        summary.estimatedCostUsd += cost;
        bucket.messages += 1;
        bucket.promptTokens += prompt;
        bucket.completionTokens += completion;
        bucket.estimatedCostUsd += cost;
      }
      bucket.totalTokens = bucket.promptTokens + bucket.completionTokens;
    } catch (error) {
      console.warn(`[Observability] Ignoring unreadable history file ${filename}:`, error.message);
    }
  }
  summary.totalTokens = summary.promptTokens + summary.completionTokens;
  summary.estimatedCostUsd = Number(summary.estimatedCostUsd.toFixed(6));
  for (const bucket of Object.values(summary.byModel)) bucket.estimatedCostUsd = Number(bucket.estimatedCostUsd.toFixed(6));
  const budget = Number(settings.observability?.monthlyBudgetUsd) || 0;
  summary.monthlyBudgetUsd = budget;
  summary.budgetPercent = budget > 0 ? Math.round((summary.estimatedCostUsd / budget) * 100) : 0;
  summary.budgetExceeded = budget > 0 && summary.estimatedCostUsd >= budget;
  return summary;
}

function toCsv(summary) {
  const rows = [['model', 'chats', 'messages', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'estimated_cost_usd']];
  for (const [model, usage] of Object.entries(summary.byModel)) {
    rows.push([model, usage.chats, usage.messages, usage.promptTokens, usage.completionTokens, usage.totalTokens, usage.estimatedCostUsd]);
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

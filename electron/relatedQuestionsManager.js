const { ModelRouter } = require('./agent/modelRouter');

function textContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(part => typeof part === 'string' ? part : part?.text || '').join('\n');
  return String(content || '');
}

function parseQuestions(raw) {
  const value = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let candidates;
  let requireQuestionMark = false;
  try {
    candidates = JSON.parse(value);
  } catch {
    const arrayStart = value.indexOf('[');
    const arrayEnd = value.lastIndexOf(']');
    const arrayText = arrayStart >= 0
      ? value.slice(arrayStart, arrayEnd > arrayStart ? arrayEnd + 1 : undefined)
      : '';

    try {
      candidates = arrayText ? JSON.parse(arrayText) : null;
    } catch {
      candidates = null;
    }

    if (!Array.isArray(candidates) && arrayText) {
      candidates = [...arrayText.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(match => {
        try { return JSON.parse(`"${match[1]}"`); } catch { return match[1]; }
      });
    }

    if (!Array.isArray(candidates)) {
      candidates = value.split('\n');
      requireQuestionMark = true;
    }
  }
  if (!Array.isArray(candidates)) return [];
  const seen = new Set();
  return candidates
    .map(item => String(item || '').replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^['"]|['"],?$/g, '').trim().slice(0, 240))
    .filter(item => {
      const key = item.toLocaleLowerCase();
      if (!item || item === '[' || item === ']' || (requireQuestionMark && !/[?？]$/.test(item)) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function resolveRelatedQuestionsModel(model, settings = {}, modelConfigs = {}) {
  const requested = model || settings.model;
  const [prefixedProvider, prefixedModel] = typeof requested === 'string' && requested.includes('::')
    ? requested.split('::', 2)
    : [null, requested];
  const directConfig = modelConfigs[requested];
  const matchedConfig = directConfig || Object.values(modelConfigs).find(config =>
    config &&
    (config.modelKey === requested || config.rawModelId === prefixedModel || config.id === prefixedModel) &&
    (!prefixedProvider || !config.provider || config.provider === prefixedProvider)
  );

  return {
    provider: matchedConfig?.provider || prefixedProvider || settings.provider || 'groq',
    model: matchedConfig?.rawModelId || matchedConfig?.id || prefixedModel
  };
}

class RelatedQuestionsManager {
  constructor(loadSettings, getModelConfigs = null) {
    this.loadSettings = loadSettings;
    this.getModelConfigs = getModelConfigs;
    this.router = new ModelRouter();
  }

  async generate({ userMessage, assistantMessage, model } = {}) {
    const user = textContent(userMessage).trim().slice(0, 6000);
    const assistant = textContent(assistantMessage).trim().slice(0, 10000);
    if (!user || !assistant) return [];
    const settings = this.loadSettings();
    const modelConfigs = this.getModelConfigs ? await this.getModelConfigs(settings) : {};
    const resolved = resolveRelatedQuestionsModel(model, settings, modelConfigs);
    if (!resolved.model) return [];
    const runtimeSettings = { ...settings, provider: resolved.provider, model: resolved.model, temperature: 0.35, maxTokens: 1000 };
    const result = await this.router.streamCompletion({
      model: resolved.model,
      settings: runtimeSettings,
      systemPrompt: 'Suggest 3 to 5 concise follow-up questions the user may want to ask next. Each question must have fewer than 24 words, use the same language as the user, and be directly related to the conversation. Return only a JSON array of strings.',
      messages: [{ role: 'user', content: `User:\n${user}\n\nAssistant:\n${assistant}` }]
    });
    if (!result.success) throw new Error(result.error || 'Related question generation failed');
    return parseQuestions(result.message?.content || result.message?.reasoning);
  }

  registerIpcHandlers(ipcMain) {
    ipcMain.handle('related-questions:generate', async (_event, payload) => {
      try { return { questions: await this.generate(payload) }; }
      catch (error) {
        console.warn('[RelatedQuestions] Generation failed:', error.message);
        return { questions: [], error: error.message };
      }
    });
  }
}

module.exports = { RelatedQuestionsManager, parseQuestions, resolveRelatedQuestionsModel };

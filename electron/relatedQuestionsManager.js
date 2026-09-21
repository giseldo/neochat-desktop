const { ModelRouter } = require('./agent/modelRouter');

function textContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(part => typeof part === 'string' ? part : part?.text || '').join('\n');
  return String(content || '');
}

function parseQuestions(raw) {
  const value = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let candidates;
  try { candidates = JSON.parse(value); } catch { candidates = value.split('\n'); }
  if (!Array.isArray(candidates)) return [];
  const seen = new Set();
  return candidates
    .map(item => String(item || '').replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^['"]|['"]$/g, '').trim().slice(0, 240))
    .filter(item => {
      const key = item.toLocaleLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

class RelatedQuestionsManager {
  constructor(loadSettings) {
    this.loadSettings = loadSettings;
    this.router = new ModelRouter();
  }

  async generate({ userMessage, assistantMessage, model } = {}) {
    const user = textContent(userMessage).trim().slice(0, 6000);
    const assistant = textContent(assistantMessage).trim().slice(0, 10000);
    if (!user || !assistant) return [];
    const settings = this.loadSettings();
    let provider = settings.provider || 'groq';
    let modelName = model || settings.model;
    if (typeof modelName === 'string' && modelName.includes('::')) [provider, modelName] = modelName.split('::', 2);
    const runtimeSettings = { ...settings, provider, model: modelName };
    this.router.validateApiKey(runtimeSettings);
    const response = await this.router.createClient(runtimeSettings).chat.completions.create({
      model: modelName,
      stream: false,
      temperature: 0.35,
      max_tokens: 300,
      messages: [
        { role: 'system', content: 'Suggest 3 to 5 concise follow-up questions the user may want to ask next. Each question must have fewer than 24 words, use the same language as the user, and be directly related to the conversation. Return only a JSON array of strings.' },
        { role: 'user', content: `User:\n${user}\n\nAssistant:\n${assistant}` }
      ]
    });
    return parseQuestions(response.choices?.[0]?.message?.content);
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

module.exports = { RelatedQuestionsManager, parseQuestions };

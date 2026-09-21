const { ModelRouter } = require('./agent/modelRouter');

function textContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(part => typeof part === 'string' ? part : part?.text || '').join('\n');
  return String(content || '');
}

function stripThinking(text) {
  if (!text) return '';
  return String(text)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .replace(/<thought>[\s\S]*$/gi, '')
    .trim();
}

const PROMPT_OR_REASONING_LEAK_REGEX = /^(?:we\s+(?:need|should|can|will)|i\s+(?:need|should|will|must)|you\s+need|suggest(?:\s+\d+|\s+to|\s+3)?|here\s+(?:are|is)|sure|note:|examples?:?|user:|assistant:|language\s+is|return\s+only|based\s+on|let'?s|thought|reasoning|output:?|in\s+portuguese|in\s+english|the\s+user|after\s+hearing|concise\s+follow-up)\b/i;

function isReasoningOrPromptLeak(text) {
  if (!text) return true;
  const trimmed = text.trim();
  if (PROMPT_OR_REASONING_LEAK_REGEX.test(trimmed)) return true;
  if (trimmed.startsWith('{') || trimmed.startsWith('}') || trimmed.includes('": "') || trimmed.includes('":')) return true;
  return false;
}

function cleanCandidate(item) {
  if (typeof item !== 'string') return '';
  return item
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
    .replace(/^[\s"'\`]+|[\s"'\`,;]+$/g, '')
    .replace(/\\"/g, '"')
    .trim();
}

function isValidQuestion(item, fromStrictJson = false) {
  if (!item || typeof item !== 'string') return false;
  const text = cleanCandidate(item);
  if (text.length < 3 || text.length > 240) return false;
  if (isReasoningOrPromptLeak(text)) return false;
  if (/^[\[\]{}():;.,!?\s]+$/.test(text)) return false;

  if (fromStrictJson) {
    return true;
  }

  const hasQuestionMark = /[?？]$/.test(text);
  const startsWithInterrogative = /^(?:como|qual|quais|por\s+que|porque|o\s+que|quem|onde|quando|quanto|quantos|pode|poderia|me\s+conte|me\s+dê|conte|explique|mostre|dê|how|what|why|where|when|who|which|can|could|tell|explain|show|is|are|do|does|will|would)\b/i.test(text);

  return hasQuestionMark || startsWithInterrogative;
}

function parseQuestions(raw) {
  const text = stripThinking(raw);
  if (!text) return [];

  let candidates = null;
  let fromStrictJson = false;

  // 1. Try direct JSON.parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      candidates = parsed;
      fromStrictJson = true;
    } else if (parsed && typeof parsed === 'object') {
      const arrayProp = parsed.questions || parsed.follow_up_questions || parsed.suggestions || parsed.items || parsed.related || parsed.queries;
      if (Array.isArray(arrayProp)) {
        candidates = arrayProp;
        fromStrictJson = true;
      }
    }
  } catch {}

  // 2. Try markdown fenced json block
  if (!candidates) {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      try {
        const parsed = JSON.parse(fenceMatch[1].trim());
        if (Array.isArray(parsed)) {
          candidates = parsed;
          fromStrictJson = true;
        } else if (parsed && typeof parsed === 'object') {
          const arrayProp = parsed.questions || parsed.follow_up_questions || parsed.suggestions || parsed.items || parsed.related || parsed.queries;
          if (Array.isArray(arrayProp)) {
            candidates = arrayProp;
            fromStrictJson = true;
          }
        }
      } catch {}
    }
  }

  // 3. Try finding `[` ... `]` boundaries
  if (!candidates) {
    const arrayStart = text.indexOf('[');
    const arrayEnd = text.lastIndexOf(']');
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      const arrayText = text.slice(arrayStart, arrayEnd + 1);
      try {
        const parsed = JSON.parse(arrayText);
        if (Array.isArray(parsed)) {
          candidates = parsed;
          fromStrictJson = true;
        }
      } catch {
        const matches = [...arrayText.matchAll(/"((?:\\.|[^"\\])*)"/g)];
        if (matches.length > 0) {
          candidates = matches.map(m => {
            try { return JSON.parse(`"${m[1]}"`); } catch { return m[1]; }
          });
          fromStrictJson = false;
        }
      }
    }
  }

  // 4. Fallback to line-by-line parsing
  if (!candidates || candidates.length === 0) {
    candidates = text.split('\n');
    fromStrictJson = false;
  }

  const seen = new Set();
  const results = [];

  for (const rawItem of candidates) {
    const cleaned = cleanCandidate(rawItem);
    if (!isValidQuestion(cleaned, fromStrictJson)) continue;
    const lowerKey = cleaned.toLowerCase();
    if (seen.has(lowerKey)) continue;
    seen.add(lowerKey);
    results.push(cleaned.slice(0, 240));
    if (results.length >= 5) break;
  }

  return results;
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
    const user = stripThinking(textContent(userMessage)).trim().slice(0, 4000);
    const assistant = stripThinking(textContent(assistantMessage)).trim().slice(0, 6000);
    if (!user || !assistant) return [];

    const settings = this.loadSettings();
    const modelConfigs = this.getModelConfigs ? await this.getModelConfigs(settings) : {};
    const resolved = resolveRelatedQuestionsModel(model, settings, modelConfigs);
    if (!resolved.model) return [];

    const runtimeSettings = {
      ...settings,
      provider: resolved.provider,
      model: resolved.model,
      temperature: 0.3,
      maxTokens: 600
    };

    const systemPrompt = 'You are an AI assistant that suggests relevant follow-up questions. Suggest 3 to 5 concise follow-up questions the user might want to ask next to continue the conversation naturally. Rules:\n- Respond ONLY with a valid JSON array of strings (e.g. ["Question 1?", "Question 2?"]).\n- Match the language of the conversation.\n- Keep each question under 20 words.\n- Do not include any reasoning, thinking, or extra text outside the JSON array.';

    const result = await this.router.streamCompletion({
      model: resolved.model,
      settings: runtimeSettings,
      systemPrompt,
      messages: [{
        role: 'user',
        content: `Conversation context:\nUser: ${user}\nAssistant: ${assistant}\n\nGenerate 3-5 concise follow-up questions for the user as a JSON array of strings:`
      }]
    });

    if (!result.success) {
      console.warn('[RelatedQuestions] Generation completion failed:', result.error);
      return [];
    }

    const rawContent = result.message?.content || '';
    return parseQuestions(rawContent);
  }

  registerIpcHandlers(ipcMain) {
    ipcMain.handle('related-questions:generate', async (_event, payload) => {
      try {
        const questions = await this.generate(payload);
        return { questions: Array.isArray(questions) ? questions : [] };
      } catch (error) {
        console.warn('[RelatedQuestions] Generation failed:', error.message);
        return { questions: [], error: error.message };
      }
    });
  }
}

module.exports = { RelatedQuestionsManager, parseQuestions, resolveRelatedQuestionsModel, stripThinking };


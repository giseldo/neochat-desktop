/**
 * Context window calculation and estimation utilities for chat models.
 */

// Known default context windows by model name heuristic
const HEURISTIC_CONTEXT_WINDOWS = [
  { pattern: /gemini/i, context: 1000000 },
  { pattern: /claude/i, context: 200000 },
  { pattern: /sonar|perplexity/i, context: 128000 },
  { pattern: /grok/i, context: 131072 },
  { pattern: /qwen-2\.5|qwen2\.5/i, context: 128000 },
  { pattern: /llama-3\.[123]/i, context: 128000 },
  { pattern: /gpt-4|o[134]/i, context: 128000 },
  { pattern: /command-r/i, context: 128000 },
  { pattern: /deepseek/i, context: 64000 },
  { pattern: /mistral|mixtral|codestral/i, context: 32768 },
  { pattern: /qwen/i, context: 32768 },
  { pattern: /llama-3/i, context: 8192 },
];

export const DEFAULT_FALLBACK_CONTEXT = 8192;

/**
 * Get the max context window size (in tokens) for a given model.
 * Checks modelConfigs (API and custom overrides) then falls back to heuristics.
 *
 * @param {string} modelId
 * @param {Record<string, any>} modelConfigs
 * @returns {number}
 */
export function getModelContextWindow(modelId, modelConfigs = {}) {
  if (!modelId) return DEFAULT_FALLBACK_CONTEXT;

  // 1. Direct match in modelConfigs
  const direct = modelConfigs[modelId];
  if (direct && typeof direct.context === 'number' && direct.context > 0) {
    return direct.context;
  }

  // 2. Stripped provider prefix (e.g. 'groq::mistral-small-2603' -> 'mistral-small-2603')
  const rawId = modelId.includes('::') ? modelId.split('::')[1] : modelId;
  const rawConfig = modelConfigs[rawId];
  if (rawConfig && typeof rawConfig.context === 'number' && rawConfig.context > 0) {
    return rawConfig.context;
  }

  // 3. Match by rawModelId or id property in config values
  const found = Object.values(modelConfigs).find(
    cfg => cfg && (cfg.rawModelId === rawId || cfg.id === rawId || cfg.rawModelId === modelId || cfg.id === modelId)
  );
  if (found && typeof found.context === 'number' && found.context > 0) {
    return found.context;
  }

  // 4. Heuristic based on model name
  const nameToTest = rawId.toLowerCase();
  for (const item of HEURISTIC_CONTEXT_WINDOWS) {
    if (item.pattern.test(nameToTest)) {
      return item.context;
    }
  }

  // 5. Default
  return DEFAULT_FALLBACK_CONTEXT;
}

/**
 * Calculate the current conversation tokens based on message history,
 * the latest turn's usage, subsequent turns, draft input, and attachments.
 *
 * @param {Array<any>} messages
 * @param {string} draftMessage
 * @param {Array<any>} draftFiles
 * @returns {number}
 */
export function calculateConversationTokens(messages = [], draftMessage = '', draftFiles = []) {
  let baseTokens = 0;
  let lastAssistantIndex = -1;

  if (Array.isArray(messages) && messages.length > 0) {
    // Look backwards for the latest assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg && msg.role === 'assistant') {
        lastAssistantIndex = i;
        const u = msg.usage || {};
        const prompt = Number(u.prompt_tokens ?? u.input_tokens ?? (u.input !== undefined ? (Number(u.input || 0) + Number(u.cacheRead || 0)) : 0)) || 0;
        const comp = Number(u.completion_tokens ?? u.output_tokens ?? u.output ?? 0) || 0;

        if (prompt > 0 || comp > 0) {
          baseTokens = prompt + comp;
        } else {
          // If no direct usage recorded, estimate cumulative history tokens up to this assistant message
          let cumulativeChars = 0;
          for (let j = 0; j <= i; j++) {
            const m = messages[j];
            if (!m) continue;
            const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
            cumulativeChars += content.length + (m.reasoning ? m.reasoning.length : 0);
          }
          baseTokens = Math.max(1, Math.round(cumulativeChars / 4));
        }
        break;
      }
    }

    if (lastAssistantIndex === -1) {
      // No assistant message yet in this conversation (e.g., initial user prompt sent)
      let allChars = 0;
      for (const m of messages) {
        if (!m) continue;
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
        allChars += content.length + (m.reasoning ? m.reasoning.length : 0);
      }
      baseTokens = allChars > 0 ? Math.max(1, Math.round(allChars / 4)) : 0;
    } else {
      // Add tokens of any user / tool messages sent AFTER the last assistant message
      for (let i = lastAssistantIndex + 1; i < messages.length; i++) {
        const m = messages[i];
        if (!m) continue;
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
        const chars = content.length + (m.reasoning ? m.reasoning.length : 0);
        baseTokens += Math.max(1, Math.round(chars / 4));
      }
    }
  }

  // Add draft message text in textarea
  if (typeof draftMessage === 'string' && draftMessage.trim().length > 0) {
    baseTokens += Math.max(1, Math.round(draftMessage.trim().length / 4));
  }

  // Add draft files attached to input
  if (Array.isArray(draftFiles) && draftFiles.length > 0) {
    for (const file of draftFiles) {
      if (!file) continue;
      if (file.fileType === 'image') {
        baseTokens += 800; // Multimodal vision image token estimate
      } else if (typeof file.content === 'string' && file.content.length > 0) {
        baseTokens += Math.max(1, Math.round(file.content.length / 4));
      } else if (typeof file.size === 'number' && file.size > 0) {
        baseTokens += Math.max(1, Math.round(file.size / 4));
      }
    }
  }

  return Math.max(0, baseTokens);
}

/**
 * Return formatted context usage stats and percentages.
 *
 * @param {object} params
 * @param {Array<any>} params.messages
 * @param {string} params.selectedModel
 * @param {Record<string, any>} params.modelConfigs
 * @param {string} [params.draftMessage]
 * @param {Array<any>} [params.draftFiles]
 * @returns {{
 *   conversationTokens: number,
 *   totalContext: number,
 *   rawPercentage: number,
 *   clampedPercentage: number,
 *   displayPercentage: number,
 *   usedPctStr: string,
 *   leftPctStr: string
 * }}
 */
export function calculateContextUsage({
  messages = [],
  selectedModel = '',
  modelConfigs = {},
  draftMessage = '',
  draftFiles = []
}) {
  const conversationTokens = calculateConversationTokens(messages, draftMessage, draftFiles);
  const totalContext = getModelContextWindow(selectedModel, modelConfigs);

  const rawPercentage = totalContext > 0 ? (conversationTokens / totalContext) * 100 : 0;
  const clampedPercentage = Math.min(100, Math.max(0, rawPercentage));
  const displayPercentage = Math.round(clampedPercentage);

  // Format percentage strings: "2.5" used, "97.5" left
  const usedPctStr = clampedPercentage >= 100
    ? '100'
    : (clampedPercentage === 0 ? '0.0' : (Math.round(clampedPercentage * 10) / 10).toFixed(1));
  const leftPct = Math.max(0, 100 - clampedPercentage);
  const leftPctStr = (Math.round(leftPct * 10) / 10).toFixed(1);

  return {
    conversationTokens,
    totalContext,
    rawPercentage,
    clampedPercentage,
    displayPercentage,
    usedPctStr,
    leftPctStr
  };
}

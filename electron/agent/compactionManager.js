/**
 * CompactionManager - Token window monitoring and historical context compaction.
 */

class CompactionManager {
  /**
   * Estimate token count for a list of messages.
   * Simple character-based approximation: ~4 characters per token.
   * @param {Array<object>} messages
   * @param {string} [systemPrompt='']
   * @returns {number}
   */
  estimateTokens(messages = [], systemPrompt = '') {
    let charCount = systemPrompt ? systemPrompt.length : 0;
    for (const msg of messages) {
      if (!msg) continue;
      if (typeof msg.content === 'string') {
        charCount += msg.content.length;
      }
      if (Array.isArray(msg.tool_calls)) {
        charCount += JSON.stringify(msg.tool_calls).length;
      }
    }
    return Math.ceil(charCount / 4);
  }

  /**
   * Compact conversation history if token estimate exceeds max allowed threshold.
   * @param {object} params
   * @param {Array<object>} params.messages
   * @param {string} params.systemPrompt
   * @param {number} [params.maxContextTokens=32000]
   * @param {number} [params.keepRecentTurns=4]
   * @returns {{ compacted: boolean, messages: Array<object>, summary?: string }}
   */
  compactHistory({
    messages = [],
    systemPrompt = '',
    maxContextTokens = 32000,
    keepRecentTurns = 6
  }) {
    const estimated = this.estimateTokens(messages, systemPrompt);
    const tokenLimit = Math.floor(maxContextTokens * 0.8); // 80% watermark

    if (estimated <= tokenLimit || messages.length <= keepRecentTurns * 2) {
      return { compacted: false, messages };
    }

    console.log(`[CompactionManager] Context size (${estimated} est tokens) exceeds watermark (${tokenLimit}). Compacting...`);

    // Separate messages to summarize vs recent messages to preserve
    const preserveCount = Math.min(messages.length, keepRecentTurns * 2);
    const toSummarize = messages.slice(0, messages.length - preserveCount);
    const toPreserve = messages.slice(messages.length - preserveCount);

    // Build structured summary of older turns
    const filesReferenced = new Set();
    const toolsUsed = new Set();
    const keyActions = [];

    for (const msg of toSummarize) {
      if (msg.role === 'user') {
        const text = typeof msg.content === 'string' ? msg.content : '';
        if (text) keyActions.push(`User requested: ${text.slice(0, 120)}`);
      }
      if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          const fn = tc.function?.name || tc.name;
          if (fn) {
            toolsUsed.add(fn);
            try {
              const args = typeof tc.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function?.arguments;
              if (args?.path || args?.file) filesReferenced.add(args.path || args.file);
            } catch (e) {}
          }
        }
      }
    }

    const summaryText = [
      `[Context Compaction Summary of Prior Steps]`,
      keyActions.length > 0 ? `Key requests:\n- ${keyActions.slice(-5).join('\n- ')}` : '',
      toolsUsed.size > 0 ? `Tools used: ${Array.from(toolsUsed).join(', ')}` : '',
      filesReferenced.size > 0 ? `Files inspected/modified: ${Array.from(filesReferenced).join(', ')}` : '',
      `Older messages have been compacted to conserve model context window.`
    ].filter(Boolean).join('\n');

    const compactedMessages = [
      {
        role: 'system',
        content: summaryText
      },
      ...toPreserve
    ];

    return {
      compacted: true,
      messages: compactedMessages,
      summary: summaryText
    };
  }
}

const compactionManager = new CompactionManager();

module.exports = {
  CompactionManager,
  compactionManager
};

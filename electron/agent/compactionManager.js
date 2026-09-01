/**
 * CompactionManager - Token window monitoring and historical context compaction.
 */

class CompactionManager {
  /**
   * Estimate token count for a list of messages.
   * Conservative approximation over every model-visible message field.
   * @param {Array<object>} messages
   * @param {string} [systemPrompt='']
   * @returns {number}
   */
  estimateTokens(messages = [], systemPrompt = '') {
    let charCount = systemPrompt ? systemPrompt.length : 0;
    for (const msg of messages) {
      if (!msg) continue;
      charCount += JSON.stringify(msg).length;
    }
    return Math.ceil(charCount / 3.5);
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

    // Preserve complete recent user turns, including assistant/tool call pairs.
    const userIndexes = messages.map((message, index) => message?.role === 'user' ? index : -1).filter(index => index >= 0);
    const preserveStart = userIndexes.length > keepRecentTurns
      ? userIndexes[userIndexes.length - keepRecentTurns]
      : 0;
    const toSummarize = messages.slice(0, preserveStart);
    const toPreserve = messages.slice(preserveStart);

    // Build structured summary of older turns
    const filesReferenced = new Set();
    const toolsUsed = new Set();
    const keyActions = [];
    const outcomes = [];

    for (const msg of toSummarize) {
      if (msg.role === 'user') {
        const text = typeof msg.content === 'string' ? msg.content : '';
        if (text) keyActions.push(`User requested: ${text.slice(0, 240)}`);
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
      if (msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.trim()) {
        outcomes.push(`Assistant: ${msg.content.trim().slice(0, 300)}`);
      }
      if (msg.role === 'tool') {
        const status = typeof msg.content === 'string' && /error/i.test(msg.content) ? 'error' : 'completed';
        outcomes.push(`Tool ${msg.name || msg.tool_call_id || 'unknown'}: ${status}`);
      }
    }

    const summaryText = [
      `[Context Compaction Summary of Prior Steps]`,
      keyActions.length > 0 ? `Key requests:\n- ${keyActions.slice(-5).join('\n- ')}` : '',
      toolsUsed.size > 0 ? `Tools used: ${Array.from(toolsUsed).join(', ')}` : '',
      filesReferenced.size > 0 ? `Files inspected/modified: ${Array.from(filesReferenced).join(', ')}` : '',
      outcomes.length > 0 ? `Recorded outcomes:\n- ${outcomes.slice(-12).join('\n- ')}` : '',
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

/**
 * Extracts <think> / <thought> / <thinking> tags from message content.
 * Handles:
 * 1. Fully closed tags: <think>...</think>
 * 2. Multiple think blocks
 * 3. In-progress streaming: unclosed <think>...
 * 4. Preserves code blocks containing <think> (e.g. ```xml <think>...```)
 *
 * @param {string|any} rawContent
 * @returns {{
 *   hasThink: boolean,
 *   thinking: string,
 *   cleanContent: string,
 *   isStreamingThink: boolean
 * }}
 */
export function extractThinking(rawContent) {
  if (typeof rawContent !== 'string' || !rawContent) {
    return {
      hasThink: false,
      thinking: '',
      cleanContent: typeof rawContent === 'string' ? rawContent : '',
      isStreamingThink: false
    };
  }

  // Preserve fenced code blocks so code snippets containing <think> are not treated as thinking
  const codeBlocks = [];
  const contentWithoutCode = rawContent.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `__THINK_CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(match);
    return placeholder;
  });

  const restoreCodeBlocks = (str) => {
    return str.replace(/__THINK_CODE_BLOCK_(\d+)__/g, (_, idx) => {
      return codeBlocks[parseInt(idx, 10)] || '';
    });
  };

  const thinkBlockRegex = /<\s*(think|thought|thinking)(?:\s[^>]*)?>([\s\S]*?)<\s*\/\s*\1\s*>/gi;
  const unclosedThinkRegex = /<\s*(think|thought|thinking)(?:\s[^>]*)?>([\s\S]*)$/i;

  const thinkingParts = [];
  let cleanContent = contentWithoutCode;

  // 1. Extract closed <think>...</think> blocks
  cleanContent = cleanContent.replace(thinkBlockRegex, (match, tag, content) => {
    const restored = restoreCodeBlocks(content).trim();
    if (restored) {
      thinkingParts.push(restored);
    }
    return '';
  });

  // 2. Check for an unclosed <think> tag at the end (active streaming)
  let isStreamingThink = false;
  const unclosedMatch = cleanContent.match(unclosedThinkRegex);
  if (unclosedMatch) {
    isStreamingThink = true;
    const unclosedContent = unclosedMatch[2] ? restoreCodeBlocks(unclosedMatch[2]).trim() : '';
    if (unclosedContent) {
      thinkingParts.push(unclosedContent);
    }
    cleanContent = cleanContent.replace(unclosedThinkRegex, '');
  }

  // Restore code blocks in cleanContent
  cleanContent = restoreCodeBlocks(cleanContent).trim();
  const thinking = thinkingParts.join('\n\n---\n\n').trim();
  const hasThink = Boolean(thinking) || isStreamingThink;

  return {
    hasThink,
    thinking,
    cleanContent,
    isStreamingThink
  };
}

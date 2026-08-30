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

/**
 * Extracts web search sources from a message object or its tool results.
 * 
 * @param {Object} message
 * @param {Array} allMessages
 * @returns {Array<{url: string, title?: string, snippet?: string, domain?: string}>}
 */
export function extractWebSearchSources(message, allMessages = []) {
  if (!message || message.role === 'user') return [];

  if (Array.isArray(message.sources) && message.sources.length > 0) {
    return message.sources;
  }

  const sources = [];

  const findToolResult = (toolCallId) => {
    if (!allMessages || !Array.isArray(allMessages)) return null;
    const toolMessage = allMessages.find(
      msg => msg.role === 'tool' && msg.tool_call_id === toolCallId
    );
    return toolMessage ? toolMessage.content : null;
  };

  // Check tool_calls + allMessages
  const tool_calls = message.tool_calls;
  if (tool_calls && tool_calls.length > 0 && allMessages) {
    for (const tc of tool_calls) {
      if (tc.function?.name === 'web_search') {
        const res = findToolResult(tc.id);
        if (res) {
          try {
            const parsed = typeof res === 'string' ? JSON.parse(res) : res;
            if (Array.isArray(parsed.results)) {
              sources.push(...parsed.results);
            }
          } catch (e) {
            console.warn('Failed to parse web_search tool results:', e);
          }
        }
      }
    }
  }

  // Check executed_tools / liveExecutedTools
  const tools = message.liveExecutedTools?.length > 0 ? message.liveExecutedTools : message.executed_tools;
  if (tools && tools.length > 0) {
    for (const t of tools) {
      if (t.name === 'web_search' && t.output) {
        try {
          const parsed = typeof t.output === 'string' ? JSON.parse(t.output) : t.output;
          if (Array.isArray(parsed.results)) {
            for (const r of parsed.results) {
              if (!sources.some(s => s.url === r.url)) {
                sources.push(r);
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse executed_tools web_search:', e);
        }
      }
    }
  }

  // Deduplicate by URL
  const unique = [];
  for (const s of sources) {
    if (s && s.url && !unique.some(u => u.url === s.url)) {
      unique.push(s);
    }
  }

  return unique;
}

/**
 * Extracts Local Knowledge Base (RAG) sources from a message object or its tool results.
 * 
 * @param {Object} message
 * @param {Array} allMessages
 * @returns {Array}
 */
export function extractKnowledgeSources(message, allMessages = []) {
  if (!message || message.role === 'user') return [];

  const sources = [];

  const findToolResult = (toolCallId) => {
    if (!allMessages || !Array.isArray(allMessages)) return null;
    const toolMessage = allMessages.find(
      msg => msg.role === 'tool' && msg.tool_call_id === toolCallId
    );
    return toolMessage ? toolMessage.content : null;
  };

  const tool_calls = message.tool_calls;
  if (tool_calls && tool_calls.length > 0 && allMessages) {
    for (const tc of tool_calls) {
      if (tc.function?.name === 'query_project_knowledge' || tc.function?.name === 'read_project_file') {
        const res = findToolResult(tc.id);
        if (res) {
          try {
            const parsed = typeof res === 'string' ? JSON.parse(res) : res;
            if (Array.isArray(parsed.results)) {
              sources.push(...parsed.results);
            } else if (parsed.filePath && parsed.content) {
              sources.push(parsed);
            }
          } catch (e) {
            console.warn('Failed to parse RAG tool results:', e);
          }
        }
      }
    }
  }

  const tools = message.liveExecutedTools?.length > 0 ? message.liveExecutedTools : message.executed_tools;
  if (tools && tools.length > 0) {
    for (const t of tools) {
      if ((t.name === 'query_project_knowledge' || t.name === 'read_project_file') && t.output) {
        try {
          const parsed = typeof t.output === 'string' ? JSON.parse(t.output) : t.output;
          if (Array.isArray(parsed.results)) {
            for (const r of parsed.results) {
              if (!sources.some(s => s.id === r.id || (s.filePath === r.filePath && s.startLine === r.startLine))) {
                sources.push(r);
              }
            }
          } else if (parsed.filePath && parsed.content) {
            if (!sources.some(s => s.filePath === parsed.filePath && s.startLine === parsed.startLine)) {
              sources.push(parsed);
            }
          }
        } catch (e) {
          console.warn('Failed to parse executed_tools RAG:', e);
        }
      }
    }
  }

  return sources;
}

/**
 * Preprocesses citation markers in markdown content (e.g. 【3†source】, [3†source], [1], [2])
 * and converts them into standard markdown links pointing to the corresponding search source URL.
 * Preserves code blocks and inline code from replacement.
 *
 * @param {string} content
 * @param {Array<{url: string, title?: string, snippet?: string, domain?: string}>} sources
 * @returns {string}
 */
export function preprocessCitations(content, sources = []) {
  if (!content || typeof content !== 'string') return '';

  const safeSources = Array.isArray(sources) ? sources : [];

  // Split content by code blocks and inline code to avoid replacing inside code
  const parts = content.split(/(```[\s\S]*?```|`[^`\n]*?`)/g);

  return parts
    .map((part, index) => {
      // Odd indices are code blocks or inline code - return unchanged
      if (index % 2 === 1) {
        return part;
      }

      let res = part;

      // 1. Remove RAG line markers like 【4†L24-L30】
      res = res.replace(/【\d+†L\d+-L\d+】/g, '');
      res = res.replace(/【L\d+-L\d+】/g, '');

      // 2. Convert standard OpenAI/GPT-OSS search citation tokens:
      // Examples: 【3†source】, 【4:0†source】, 【1†escavador.com】, 【2】
      res = res.replace(/【(\d+)(?::\d+)?(?:†[^】]*)?】/g, (match, numStr) => {
        const num = parseInt(numStr, 10);
        if (num > 0 && safeSources[num - 1] && safeSources[num - 1].url) {
          const src = safeSources[num - 1];
          const title = (src.title || src.domain || `Fonte ${num}`).replace(/["\n\r]/g, ' ').trim();
          return ` [${num}](${src.url} "${title}")`;
        }
        return ` [${num}]`;
      });

      // 3. Convert [N†source] format: [3†source]
      res = res.replace(/\[(\d+)(?::\d+)?†[^\]]*\]/g, (match, numStr) => {
        const num = parseInt(numStr, 10);
        if (num > 0 && safeSources[num - 1] && safeSources[num - 1].url) {
          const src = safeSources[num - 1];
          const title = (src.title || src.domain || `Fonte ${num}`).replace(/["\n\r]/g, ' ').trim();
          return ` [${num}](${src.url} "${title}")`;
        }
        return ` [${num}]`;
      });

      // 4. Convert bracketed numbers [1], [2], [1, 2] ONLY when matching valid sources
      // Must not match if followed by ( (already a link) or : (link reference definition)
      if (safeSources.length > 0) {
        // Handle comma-separated list like [1, 2] or [1, 3, 4]
        res = res.replace(/(^|[\s([{"'«“—–])\[((?:\d+\s*,\s*)+\d+)\](?![(\w:])/g, (match, prefix, group) => {
          const nums = group.split(',').map(n => parseInt(n.trim(), 10));
          const converted = nums.map(num => {
            if (num > 0 && safeSources[num - 1] && safeSources[num - 1].url) {
              const src = safeSources[num - 1];
              const title = (src.title || src.domain || `Fonte ${num}`).replace(/["\n\r]/g, ' ').trim();
              return `[${num}](${src.url} "${title}")`;
            }
            return `[${num}]`;
          });
          return `${prefix}[${converted.join(', ')}]`;
        });

        // Handle single numeric citations like [1], [2]
        res = res.replace(/(^|[\s([{"'«“—–])\[(\d+)\](?![(\w:])/g, (match, prefix, numStr) => {
          const num = parseInt(numStr, 10);
          if (num > 0 && safeSources[num - 1] && safeSources[num - 1].url) {
            const src = safeSources[num - 1];
            const title = (src.title || src.domain || `Fonte ${num}`).replace(/["\n\r]/g, ' ').trim();
            return `${prefix}[${num}](${src.url} "${title}")`;
          }
          return match;
        });
      }

      return res;
    })
    .join('');
}


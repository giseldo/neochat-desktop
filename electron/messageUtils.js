/**
 * Groups a message array into atomic conversational blocks.
 * An atomic block cannot be split across pruning boundaries.
 * Examples of atomic blocks:
 * - A system message
 * - A user message
 * - A standard assistant message (no tool calls)
 * - An assistant message with tool_calls + ALL its consecutive matching tool messages
 *
 * @param {Array} messages - Cleaned message array
 * @returns {Array<Array<Object>>} - Array of atomic message blocks
 */
function groupMessagesIntoAtomicBlocks(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  const blocks = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      // Collect assistant message and all consecutive matching tool messages
      const block = [msg];
      const validCallIds = new Set(msg.tool_calls.map(tc => tc.id).filter(Boolean));
      
      let j = i + 1;
      while (j < messages.length && messages[j].role === 'tool') {
        const toolMsg = messages[j];
        if (validCallIds.has(toolMsg.tool_call_id)) {
          block.push(toolMsg);
        } else {
          break;
        }
        j++;
      }

      blocks.push(block);
      i = j;
    } else {
      // Single message block (system, user, assistant without tools, or standalone)
      blocks.push([msg]);
      i++;
    }
  }

  return blocks;
}

/**
 * Sanitizes and repairs message history for OpenAI / Groq / DeepSeek compatible APIs.
 * Ensures:
 * 1. Strips internal runtime fields (reasoning, liveStreaming, etc.)
 * 2. Formats user/assistant/tool messages correctly
 * 3. Enforces that EVERY 'tool' message is preceded by an assistant message containing a matching tool_call_id
 * 4. Drops orphan tool messages that would cause HTTP 400 invalid_request_error
 * 5. Cleans up broken assistant tool_calls that have no corresponding tool responses in the middle of history
 *
 * @param {Array} messages - Raw messages array
 * @returns {Array} - Sanitized messages array safe for API submission
 */
function sanitizeMessageHistory(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  // Step 1: Clean and normalize individual messages
  const cleaned = messages.map(msg => {
    if (!msg || typeof msg !== 'object') return null;

    const cleanMsg = { ...msg };

    // Strip internal runtime fields
    delete cleanMsg.reasoning;
    delete cleanMsg.isStreaming;
    delete cleanMsg.reasoningDuration;
    delete cleanMsg.reasoningSummaries;
    delete cleanMsg.liveReasoning;
    delete cleanMsg.liveExecutedTools;
    delete cleanMsg.executed_tools;
    delete cleanMsg.reasoningStartTime;
    delete cleanMsg.usage;
    delete cleanMsg.finish_reason;
    delete cleanMsg.timestamp;
    delete cleanMsg.createdAt;
    delete cleanMsg.durationMs;
    delete cleanMsg.pre_calculated_tool_responses;
    delete cleanMsg.mcp_approval_requests;
    delete cleanMsg.status;
    delete cleanMsg.error;

    // Normalize user content
    if (cleanMsg.role === 'user') {
      if (typeof cleanMsg.content === 'string') {
        cleanMsg.content = [{ type: 'text', text: cleanMsg.content }];
      } else if (!Array.isArray(cleanMsg.content)) {
        cleanMsg.content = [{ type: 'text', text: '' }];
      }
      cleanMsg.content = cleanMsg.content.map(part => ({ type: part.type || 'text', ...part }));
    }

    // Normalize assistant content
    if (cleanMsg.role === 'assistant') {
      if (typeof cleanMsg.content !== 'string') {
        if (Array.isArray(cleanMsg.content)) {
          cleanMsg.content = cleanMsg.content.filter(p => p.type === 'text').map(p => p.text).join('');
        } else if (cleanMsg.content === null || cleanMsg.content === undefined) {
          cleanMsg.content = '';
        } else {
          try {
            cleanMsg.content = JSON.stringify(cleanMsg.content);
          } catch {
            cleanMsg.content = '';
          }
        }
      }
      if (typeof cleanMsg.content === 'string') {
        cleanMsg.content = extractThinking(cleanMsg.content).cleanContent;
      }

      // Normalize tool_calls
      if (Array.isArray(cleanMsg.tool_calls) && cleanMsg.tool_calls.length > 0) {
        cleanMsg.tool_calls = cleanMsg.tool_calls.map((tc, idx) => ({
          id: tc.id || `call_${Date.now()}_${idx}`,
          type: tc.type || 'function',
          function: {
            name: tc.function?.name || 'unknown_tool',
            arguments: typeof tc.function?.arguments === 'string'
              ? tc.function.arguments
              : JSON.stringify(tc.function?.arguments || {})
          }
        }));
      } else {
        delete cleanMsg.tool_calls;
      }
    }

    // Normalize tool content
    if (cleanMsg.role === 'tool') {
      cleanMsg.tool_call_id = String(cleanMsg.tool_call_id || '');
      if (typeof cleanMsg.content !== 'string') {
        try {
          cleanMsg.content = JSON.stringify(cleanMsg.content ?? '');
        } catch {
          cleanMsg.content = '[Error stringifying tool content]';
        }
      }
    }

    return cleanMsg;
  }).filter(Boolean);

  // Step 2: Enforce structural invariants (tool call / tool response pairings)
  const sanitized = [];
  let i = 0;

  while (i < cleaned.length) {
    const msg = cleaned[i];

    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const validCallIds = new Set(msg.tool_calls.map(tc => tc.id));
      
      // Look ahead for consecutive tool messages
      const toolResponses = [];
      let j = i + 1;
      while (j < cleaned.length && cleaned[j].role === 'tool') {
        const candidate = cleaned[j];
        if (validCallIds.has(candidate.tool_call_id)) {
          toolResponses.push(candidate);
        } else {
          console.warn(`[MessageUtils] Ignoring unmatched tool response with ID: ${candidate.tool_call_id}`);
        }
        j++;
      }

      if (toolResponses.length > 0) {
        // Enforce strict pairing: filter msg.tool_calls to ONLY include tool_calls that actually have matching responses!
        // This prevents 400 invalid_request_error when an assistant requested multiple tools but only some were executed.
        const foundCallIds = new Set(toolResponses.map(r => r.tool_call_id));
        const matchedToolCalls = msg.tool_calls.filter(tc => foundCallIds.has(tc.id));

        if (matchedToolCalls.length > 0) {
          const assistantWithMatchedTools = {
            ...msg,
            tool_calls: matchedToolCalls
          };
          sanitized.push(assistantWithMatchedTools);
          for (const tr of toolResponses) {
            sanitized.push(tr);
          }
        } else if (msg.content && msg.content.trim()) {
          // If no tool_calls matched but message has text, strip tool_calls
          const strippedMsg = { ...msg };
          delete strippedMsg.tool_calls;
          sanitized.push(strippedMsg);
        }
        i = j;
      } else {
        // No tool responses follow this assistant message
        if (i === cleaned.length - 1) {
          // It's the last message (e.g. streaming or waiting for execution)
          sanitized.push(msg);
        } else {
          // In the middle of conversation without tool responses:
          // If it has text content, convert to a pure assistant message without tool_calls
          if (msg.content && msg.content.trim()) {
            const strippedMsg = { ...msg };
            delete strippedMsg.tool_calls;
            sanitized.push(strippedMsg);
          } else {
            // No text and no tool responses -> drop empty broken assistant message
            console.warn('[MessageUtils] Dropping empty assistant message with unfulfilled tool_calls in history');
          }
        }
        i++;
      }
    } else if (msg.role === 'tool') {
      // Orphan tool message encountered outside of an assistant tool_calls block!
      console.warn(`[MessageUtils] Dropping orphan tool message with tool_call_id: ${msg.tool_call_id}`);
      i++;
    } else {
      // System, user, or regular assistant message
      sanitized.push(msg);
      i++;
    }
  }

  // Step 3: Ensure non-system conversation starts with a user message
  const firstNonSystemIdx = sanitized.findIndex(m => m.role !== 'system');
  if (firstNonSystemIdx !== -1 && sanitized[firstNonSystemIdx].role !== 'user') {
    // If the first non-system message is an assistant or tool, ensure a valid user prompt placeholder
    // precedes it so OpenAI / Groq / DeepSeek APIs do not throw 400 invalid_request_error.
    sanitized.splice(firstNonSystemIdx, 0, {
      role: 'user',
      content: [{ type: 'text', text: 'Continue' }]
    });
  }

  return sanitized;
}

/**
 * Prunes message history to stay under 50% of model's context window
 * Prioritizes preserving:
 * 1. Initial system prompt / context
 * 2. The active turn's user prompt (last user message)
 * 3. The latest assistant message and its tool calls / responses
 * Prunes in atomic blocks so tool calls and tool responses are never separated.
 * Handles image filtering based on specified rules.
 *
 * @param {Array} messages - Complete message history
 * @param {String} model - Selected model name
 * @param {object} modelContextSizes - Object containing context window sizes for models.
 * @returns {Array} - Pruned message history array
 */
function pruneMessageHistory(messages, model, modelContextSizes) {
  // Handle edge cases
  if (!messages || !Array.isArray(messages) || messages.length <= 2) {
    return sanitizeMessageHistory(messages);
  }

  // Get context window size for the selected model
  const modelInfo = (modelContextSizes && modelContextSizes[model]) ||
                    (modelContextSizes && Object.values(modelContextSizes).find(cfg => cfg && (cfg.rawModelId === model || cfg.id === model))) ||
                    (modelContextSizes && modelContextSizes['default']) ||
                    { context: 8192 };
  const contextWindow = modelInfo.context || 8192;
  const targetTokenCount = Math.floor(contextWindow * 0.5); // Use 50% of context window

  // First sanitize to ensure structural validity before pruning
  let sanitizedMessages = sanitizeMessageHistory(messages);

  // --- Image Pruning Logic ---
  let totalImageCount = 0;
  let lastUserMessageWithImagesIndex = -1;

  sanitizedMessages.forEach((msg, index) => {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      const imageParts = msg.content.filter(part => part.type === 'image_url');
      if (imageParts.length > 0) {
        totalImageCount += imageParts.length;
        lastUserMessageWithImagesIndex = index;
      }
    }
  });

  // If total images exceed 5, keep only images from the last user message that had them
  if (totalImageCount > 5 && lastUserMessageWithImagesIndex !== -1) {
    console.log(`Total image count (${totalImageCount}) exceeds 5. Keeping images only from the last user message (index ${lastUserMessageWithImagesIndex}).`);
    sanitizedMessages = sanitizedMessages.map((msg, index) => {
      if (msg.role === 'user' && Array.isArray(msg.content) && index !== lastUserMessageWithImagesIndex) {
        const textParts = msg.content.filter(part => part.type === 'text');
        if (textParts.length > 0) {
          return { ...msg, content: textParts };
        } else {
          return { ...msg, content: [{ type: 'text', text: '' }] };
        }
      }
      return msg;
    });
  }
  // --- End Image Pruning Logic ---

  // Recalculate tokens after image pruning
  let currentTotalTokens = sanitizedMessages.reduce((sum, msg) => sum + estimateTokenCount(msg), 0);

  if (currentTotalTokens <= targetTokenCount) {
    return sanitizedMessages;
  }

  console.log(`Token count (${currentTotalTokens}) exceeds target (${targetTokenCount}). Starting turn-prioritized atomic pruning...`);

  // Group messages into atomic blocks so assistant tool_calls + tool responses are never split
  let blocks = groupMessagesIntoAtomicBlocks(sanitizedMessages);
  let messagesPrunedCount = 0;

  // Find the block containing the LAST user message (the active prompt for the current turn)
  let lastUserBlockIdx = -1;
  for (let bIdx = blocks.length - 1; bIdx >= 0; bIdx--) {
    if (blocks[bIdx].some(m => m.role === 'user')) {
      lastUserBlockIdx = bIdx;
      break;
    }
  }

  // Phase 1: Prune historical turns BEFORE the active user turn (from block 1 to lastUserBlockIdx - 1)
  while (lastUserBlockIdx > 1 && currentTotalTokens > targetTokenCount) {
    const blockToRemove = blocks[1];
    const blockTokens = blockToRemove.reduce((sum, msg) => sum + estimateTokenCount(msg), 0);

    blocks.splice(1, 1);
    lastUserBlockIdx--;
    currentTotalTokens -= blockTokens;
    messagesPrunedCount += blockToRemove.length;
  }

  // Phase 2: If tokens STILL exceed target (e.g. current turn has many tool calls/results),
  // prune intermediate tool blocks inside the current turn from oldest to newest.
  // We MUST keep:
  // - blocks[lastUserBlockIdx] (the active user prompt)
  // - blocks[blocks.length - 1] (the latest tool call / assistant response block)
  while (blocks.length > lastUserBlockIdx + 2 && currentTotalTokens > targetTokenCount) {
    const blockToRemove = blocks[lastUserBlockIdx + 1];
    const blockTokens = blockToRemove.reduce((sum, msg) => sum + estimateTokenCount(msg), 0);

    blocks.splice(lastUserBlockIdx + 1, 1);
    currentTotalTokens -= blockTokens;
    messagesPrunedCount += blockToRemove.length;
  }

  if (messagesPrunedCount > 0) {
    console.log(`Pruned ${messagesPrunedCount} messages in atomic blocks. Final tokens: ${currentTotalTokens} (target: ${targetTokenCount})`);
  }

  const flattened = blocks.flat();
  return sanitizeMessageHistory(flattened);
}

/**
 * Estimates token count for a single message (ignoring image tokens).
 * @param {Object} message - Message object with role and content.
 * @returns {Number} - Estimated token count.
 */
function estimateTokenCount(message) {
  if (!message) return 0;

  let tokenCount = 0;
  let textContent = '';

  // Handle different content structures (string or array)
  if (typeof message.content === 'string') {
    textContent = message.content;
  } else if (Array.isArray(message.content)) {
    // Sum text content length from text parts
    textContent = message.content
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('\n'); // Join text parts for length calculation
  }
  // NOTE: Ignoring non-text/image parts if the array format is extended.

  // Basic approximation: characters / 4
  if (textContent) {
    // Add tokens based on character count (e.g., simple approximation)
    tokenCount += Math.ceil(textContent.length / 4);
  }

  // Account for tool calls in assistant messages
  if (message.role === 'assistant' && message.tool_calls && Array.isArray(message.tool_calls)) {
    message.tool_calls.forEach(toolCall => {
      // Estimate tokens for the JSON representation of the tool call
      try {
          const serializedToolCall = JSON.stringify(toolCall);
          tokenCount += Math.ceil(serializedToolCall.length / 4);
      } catch (e) {
          console.warn("Error serializing tool call for token estimation:", e);
          tokenCount += 50; // Add arbitrary penalty if serialization fails
      }
    });
  }

  // Account for tool results in tool messages
  if (message.role === 'tool') {
      // Estimate tokens for the (potentially stringified) content of the tool result
      const contentString = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
      tokenCount += Math.ceil(contentString.length / 4);
      // Add a small overhead for the tool role/id itself
      tokenCount += 10; // Rough estimate for tool_call_id, role etc.
  }

  // Add a small base token count per message for metadata (role, etc.)
  tokenCount += 5; // Arbitrary small number

  // NOTE: Image token cost is currently ignored in this estimation.
  // A more accurate approach would require model-specific tokenization or heuristics.

  return tokenCount;
}

/**
 * Extracts <think> / <thought> / <thinking> tags from message content.
 * Handles closed tags, multiple blocks, streaming unclosed tags, and code block preservation.
 *
 * @param {string|any} rawContent
 * @returns {{
 *   hasThink: boolean,
 *   thinking: string,
 *   cleanContent: string,
 *   isStreamingThink: boolean
 * }}
 */
function extractThinking(rawContent) {
  if (typeof rawContent !== 'string' || !rawContent) {
    return {
      hasThink: false,
      thinking: '',
      cleanContent: typeof rawContent === 'string' ? rawContent : '',
      isStreamingThink: false
    };
  }

  // Preserve fenced code blocks
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

module.exports = {
    groupMessagesIntoAtomicBlocks,
    sanitizeMessageHistory,
    pruneMessageHistory,
    estimateTokenCount,
    extractThinking
}; 
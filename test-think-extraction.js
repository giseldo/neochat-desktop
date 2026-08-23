const assert = require('assert');

function extractThinking(rawContent) {
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

console.log('Testing extractThinking...');

// Test 1: User's exact screenshot format
const input1 = `<think> Here's a thinking process:
1. Analyze User Input:
- User asks: "quais as notícias de hoje?"
All good. Proceed. ✅ </think>
Como sou um modelo de IA sem acesso à internet em tempo real...`;

const res1 = extractThinking(input1);
assert.strictEqual(res1.hasThink, true, 'Test 1 hasThink failed');
assert.strictEqual(res1.isStreamingThink, false, 'Test 1 isStreamingThink failed');
assert.ok(res1.thinking.includes('Analyze User Input'), 'Test 1 thinking content failed');
assert.strictEqual(res1.cleanContent, 'Como sou um modelo de IA sem acesso à internet em tempo real...', 'Test 1 cleanContent failed');
console.log('Test 1 passed: Standard think block correctly separated.');

// Test 2: In-progress streaming inside <think>
const input2 = `<think>\nHere is some thinking in progress...`;
const res2 = extractThinking(input2);
assert.strictEqual(res2.hasThink, true, 'Test 2 hasThink failed');
assert.strictEqual(res2.isStreamingThink, true, 'Test 2 isStreamingThink failed');
assert.strictEqual(res2.thinking, 'Here is some thinking in progress...', 'Test 2 thinking failed');
assert.strictEqual(res2.cleanContent, '', 'Test 2 cleanContent should be empty while thinking');
console.log('Test 2 passed: In-progress streaming handled properly.');

// Test 3: Regular message without think
const input3 = `Hello! How can I help you today?`;
const res3 = extractThinking(input3);
assert.strictEqual(res3.hasThink, false, 'Test 3 hasThink should be false');
assert.strictEqual(res3.cleanContent, input3, 'Test 3 cleanContent mismatch');
assert.strictEqual(res3.thinking, '', 'Test 3 thinking should be empty');
console.log('Test 3 passed: Regular message untouched.');

// Test 4: Code block with think inside code
const input4 = `<think>\nThinking\n</think>\nHere is code:\n\`\`\`xml\n<think>test</think>\n\`\`\``;
const res4 = extractThinking(input4);
assert.strictEqual(res4.hasThink, true, 'Test 4 hasThink failed');
assert.strictEqual(res4.thinking, 'Thinking', 'Test 4 thinking failed');
assert.ok(res4.cleanContent.includes('<think>test</think>'), 'Test 4 code block preservation failed');
console.log('Test 4 passed: Code blocks preserved.');

// Test 5: Code block inside <think>
const input5 = `<think>\nLet's write code:\n\`\`\`js\nconst x = 1;\n\`\`\`\nDone.\n</think>\nFinal answer`;
const res5 = extractThinking(input5);
assert.strictEqual(res5.hasThink, true, 'Test 5 hasThink failed');
assert.ok(res5.thinking.includes('const x = 1;'), 'Test 5 code inside think failed');
assert.strictEqual(res5.cleanContent, 'Final answer', 'Test 5 cleanContent failed');
console.log('Test 5 passed: Code inside think preserved.');

// Test 6: Uppercase and variations (<THINK>, <thought>, <thinking>)
const input6 = `<THINK>Thinking 1</THINK><thought>Thinking 2</thought>Result`;
const res6 = extractThinking(input6);
assert.strictEqual(res6.hasThink, true, 'Test 6 hasThink failed');
assert.ok(res6.thinking.includes('Thinking 1') && res6.thinking.includes('Thinking 2'), 'Test 6 thinking combination failed');
assert.strictEqual(res6.cleanContent, 'Result', 'Test 6 cleanContent failed');
console.log('Test 6 passed: Uppercase and tag variations supported.');

// Test 7: Only <think>...</think> with no answer text yet
const input7 = `<think>Deep thought only</think>`;
const res7 = extractThinking(input7);
assert.strictEqual(res7.hasThink, true, 'Test 7 hasThink failed');
assert.strictEqual(res7.thinking, 'Deep thought only', 'Test 7 thinking failed');
assert.strictEqual(res7.cleanContent, '', 'Test 7 cleanContent should be empty');
console.log('Test 7 passed: Only think block handled.');

console.log('\nAll extractThinking tests passed successfully!');

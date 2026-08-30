const assert = require('assert');
const { cleanAndTrimSnippet, executeWebSearch } = require('./electron/webSearchService');
const { sanitizeMessageHistory, compressHistoricalToolContent, estimateTokenCount } = require('./electron/messageUtils');
const { handleExecuteToolCall } = require('./electron/toolHandler');

console.log('--- Running Web Search Token Savings Tests ---');

// Test 1: cleanAndTrimSnippet removes noisy whitespace and limits to max length
console.log('\n[Test 1] Testing cleanAndTrimSnippet...');
const longSnippet = '  This is a   very noisy \n\n snippet with \t lots of whitespace and text that goes on and on. '.repeat(10);
const trimmed = cleanAndTrimSnippet(longSnippet, 150);
assert(trimmed.length <= 153, `Trimmed snippet length should be <= 153, got ${trimmed.length}`);
assert(!trimmed.includes('\n'), 'Snippet should not have newlines');
assert(!trimmed.includes('  '), 'Snippet should not have double spaces');
assert(trimmed.endsWith('...'), 'Snippet should end with ellipsis');
console.log('✅ Test 1 passed: Snippet cleaned and trimmed effectively.');

// Test 2: Tool Handler outputs compact JSON (no indentation spaces)
console.log('\n[Test 2] Testing compact JSON output from toolHandler...');
const mockToolCall = {
  id: 'call_search_123',
  function: {
    name: 'web_search',
    arguments: JSON.stringify({ query: 'JavaScript' })
  }
};

(async () => {
  const result = await handleExecuteToolCall(null, mockToolCall, [], {}, {
    webSearch: { enabled: true, provider: 'local', maxResults: 3 }
  });

  assert(result && result.result, 'Tool execution must return result');
  assert(!result.result.includes('\n  "'), 'Result should be compact JSON without multi-line indentation');
  const parsed = JSON.parse(result.result);
  assert.strictEqual(parsed.query, 'JavaScript');
  assert(Array.isArray(parsed.results), 'results must be an array');
  assert(parsed.results.length <= 3, 'Default results should be <= 3');
  console.log(`✅ Test 2 passed: Tool returned compact JSON with ${parsed.results.length} results (${result.result.length} chars).`);

  // Test 3: Historical Tool Output Compression
  console.log('\n[Test 3] Testing compressHistoricalToolContent...');
  const bulkyToolResult = JSON.stringify({
    query: 'noticias de tecnologia',
    provider: 'local',
    resultsCount: 3,
    results: [
      { title: 'Noticia 1', url: 'https://news1.com', snippet: 'A'.repeat(300), domain: 'news1.com' },
      { title: 'Noticia 2', url: 'https://news2.com', snippet: 'B'.repeat(300), domain: 'news2.com' },
      { title: 'Noticia 3', url: 'https://news3.com', snippet: 'C'.repeat(300), domain: 'news3.com' }
    ]
  });

  const compressed = compressHistoricalToolContent(bulkyToolResult);
  assert(compressed.length < bulkyToolResult.length * 0.6, `Compressed should be substantially smaller than raw. Raw: ${bulkyToolResult.length}, Compressed: ${compressed.length}`);
  const parsedComp = JSON.parse(compressed);
  assert.strictEqual(parsedComp.status, 'completed_in_previous_turn');
  assert.strictEqual(parsedComp.results.length, 3);
  assert.strictEqual(parsedComp.results[0].url, 'https://news1.com');
  console.log(`✅ Test 3 passed: Historical tool output compressed from ${bulkyToolResult.length} to ${compressed.length} chars (~${Math.round((1 - compressed.length/bulkyToolResult.length)*100)}% reduction).`);

  // Test 4: Full Multi-Turn Conversation Sanitization
  console.log('\n[Test 4] Testing sanitizeMessageHistory across multi-turn chat...');
  const multiTurnMessages = [
    // Turn 1
    { role: 'user', content: 'Qual a ultima versao do Node.js?' },
    {
      role: 'assistant',
      content: '',
      tool_calls: [{ id: 'call_search_1', type: 'function', function: { name: 'web_search', arguments: '{"query":"Node.js"}' } }]
    },
    { role: 'tool', tool_call_id: 'call_search_1', content: bulkyToolResult },
    { role: 'assistant', content: 'A versão mais recente é v22.' },
    // Turn 2 (Active prompt)
    { role: 'user', content: 'E quais as novidades dela?' }
  ];

  const sanitized = sanitizeMessageHistory(multiTurnMessages);
  const histToolMsg = sanitized.find(m => m.role === 'tool' && m.tool_call_id === 'call_search_1');
  assert(histToolMsg, 'Historical tool message must exist');
  assert(histToolMsg.content.includes('completed_in_previous_turn'), 'Historical tool message must have been compressed');
  assert(histToolMsg.content.length < bulkyToolResult.length, 'Historical tool message content length must be reduced');
  console.log('✅ Test 4 passed: Multi-turn chat automatically compressed historical search tool message.');

  console.log('\n🎉 ALL WEB SEARCH TOKEN SAVINGS TESTS PASSED! 🎉\n');
})().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});

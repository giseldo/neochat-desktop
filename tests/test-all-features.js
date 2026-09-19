/**
 * Comprehensive Automated Test Suite for NeoChat Desktop
 * Tests all newly implemented backend modules, services, and IPC dependencies.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES DO NEOCHAT DESKTOP');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  async function asyncTest(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  test('Carregamento do módulo chatHandler', () => {
    const chatHandler = require('../electron/chatHandler');
    assert(typeof chatHandler.handleChatStream === 'function', 'handleChatStream deve ser uma função');
    assert(typeof chatHandler.handleCompareChatStream === 'function', 'handleCompareChatStream deve ser uma função');
    assert(typeof chatHandler.stopChatStream === 'function', 'stopChatStream deve ser uma função');
    assert(typeof chatHandler.createGroqClient === 'function', 'createGroqClient deve ser uma função');

    // Test client creation and buildURL fix against 404
    const client = chatHandler.createGroqClient({ provider: 'groq', apiKeys: { groq: 'test-key' } });
    const resolvedUrl = client.buildURL('/openai/v1/chat/completions');
    assert.strictEqual(resolvedUrl, 'https://api.groq.com/openai/v1/chat/completions', 'URL não deve duplicar o prefixo /openai/v1/');
  });

  test('Carregamento do módulo localAiService', () => {
    const localAi = require('../electron/localAiService');
    assert(typeof localAi.detectLocalAiProviders === 'function', 'detectLocalAiProviders deve ser uma função');
  });

  test('Carregamento do módulo ragService', () => {
    const rag = require('../electron/ragService');
    assert(typeof rag.indexFolder === 'function', 'indexFolder deve ser uma função');
    assert(typeof rag.queryKnowledge === 'function', 'queryKnowledge deve ser uma função');
    assert(typeof rag.readFileContent === 'function', 'readFileContent deve ser uma função');
  });

  test('Carregamento do módulo webSearchService', () => {
    const webSearch = require('../electron/webSearchService');
    assert(typeof webSearch.searchWeb === 'function', 'searchWeb deve ser uma função');
    assert(typeof webSearch.getWebSearchToolDefinition === 'function', 'getWebSearchToolDefinition deve ser uma função');
  });

  test('Carregamento do módulo screenCaptureService', () => {
    const screenCapture = require('../electron/screenCaptureService');
    assert(typeof screenCapture.getScreenSources === 'function', 'getScreenSources deve ser uma função');
    assert(typeof screenCapture.capturePrimaryScreen === 'function', 'capturePrimaryScreen deve ser uma função');
  });

  test('Carregamento do módulo memoryService (User Memory)', () => {
    const memory = require('../electron/memoryService');
    assert(typeof memory.getMemories === 'function', 'getMemories deve ser uma função');
    assert(typeof memory.addMemory === 'function', 'addMemory deve ser uma função');
    assert(typeof memory.updateMemory === 'function', 'updateMemory deve ser uma função');
    assert(typeof memory.getFormattedMemoryPrompt === 'function', 'getFormattedMemoryPrompt deve ser uma função');
    assert(typeof memory.getMemoryToolDefinitions === 'function', 'getMemoryToolDefinitions deve ser uma função');
  });

  test('Carregamento do módulo toolHandler', () => {
    const toolHandler = require('../electron/toolHandler');
    assert(typeof toolHandler.handleExecuteToolCall === 'function', 'handleExecuteToolCall deve ser uma função');
  });

  // 2. Local AI Detection Probe Test
  await asyncTest('Sondagem de IA Local (Ollama & LM Studio probe)', async () => {
    const localAi = require('../electron/localAiService');
    const result = await localAi.detectLocalAiProviders();
    assert(result !== null && typeof result === 'object', 'Resultado deve ser um objeto');
    assert(typeof result.detected === 'boolean', 'detected deve ser boolean');
    assert(result.providers && result.providers.ollama, 'providers.ollama deve existir');
    assert(result.providers && result.providers.lmstudio, 'providers.lmstudio deve existir');
    assert(result.providers && result.providers.omnirouter, 'providers.omnirouter deve existir');
  });

  // 3. Web Search Service Test (DuckDuckGo Zero-Config)
  await asyncTest('Busca Web Nativa (DuckDuckGo fallback gratuito)', async () => {
    const webSearch = require('../electron/webSearchService');
    const res = await webSearch.searchWeb('Node.js JavaScript', { provider: 'duckduckgo', maxResults: 3 });
    assert(res !== null && typeof res === 'object', 'Resultado deve ser um objeto');
    assert(Array.isArray(res.results), 'results deve ser um array');
    console.log(`   -> DuckDuckGo retornou ${res.results.length} resultados.`);
  });

  // 4. RAG Service BM25 Indexing & Query Test
  await asyncTest('Indexador RAG Local e Busca BM25', async () => {
    const rag = require('../electron/ragService');
    rag.initialize({ getPath: () => './' });
    const indexRes = await rag.indexFolder('./electron/scripts', 'test_proj');
    assert(indexRes.fileCount > 0, 'Deve ter indexado arquivos');
    
    const queryRes = await rag.queryKnowledge('deno powershell', { projectId: 'test_proj', limit: 3 });
    assert(Array.isArray(queryRes.results), 'Query results deve ser array');
    assert(queryRes.results.length > 0, 'Deve retornar ao menos 1 resultado BM25');

    // Cleanup cache
    try {
      fs.rmSync('./rag_cache', { recursive: true, force: true });
    } catch(e) {}
  });

  // 5. Tool Handler Execution Test
  await asyncTest('Execução de Tool Call query_project_knowledge', async () => {
    const { handleExecuteToolCall } = require('../electron/toolHandler');
    const toolCall = {
      id: 'call_test_1',
      function: {
        name: 'query_project_knowledge',
        arguments: JSON.stringify({ query: 'test query' })
      }
    };
    const res = await handleExecuteToolCall(null, toolCall, [], {}, { toolOutputLimit: 4000 });
    assert(res && res.result, 'Deve retornar resultado de execução');
    const parsed = JSON.parse(res.result);
    assert(Array.isArray(parsed.results), 'Parsed results deve ser array');
  });

  console.log('\n====================================================');
  console.log(`📊 RESULTADO DOS TESTES: ${passedTests}/${totalTests} PASSARAM`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Erro crítico no executor de testes:', err);
  process.exit(1);
});

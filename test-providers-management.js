const assert = require('assert');
const {
  PROVIDERS,
  getCustomProviders,
  getAllProviders,
  isProviderConfigured,
  isProviderEnabled,
  getActiveProviders,
  getBaseUrlForProvider,
  getApiKeyForProvider,
  getModelsUrlForProvider,
  getProviderCandidates
} = require('./shared/providers');

console.log('--- Testing Multi-Provider Management ---');

// Test 1: Presets Exist
console.log('Test 1: Presets Exist...');
const presetKeys = Object.keys(PROVIDERS);
assert.ok(presetKeys.length >= 7, 'Should have at least 7 preset providers');
const groq = PROVIDERS.groq;
const openai = PROVIDERS.openai;
const ollama = PROVIDERS.ollama;
assert.ok(groq, 'Groq provider preset must exist');
assert.ok(openai, 'OpenAI provider preset must exist');
assert.ok(ollama, 'Ollama provider preset must exist');
console.log('  ✓ Presets exist (' + presetKeys.length + ' presets found)');

// Test 2: Status Configured vs Active
console.log('Test 2: Configured vs Active status...');
const mockSettings = {
  provider: 'groq',
  apiKeys: {
    groq: 'gsk_test123',
    openai: 'sk-test456',
    deepseek: '<replace me>'
  },
  enabledProviders: ['groq', 'openai', 'ollama']
};

assert.strictEqual(isProviderConfigured(mockSettings, 'groq'), true, 'Groq should be configured');
assert.strictEqual(isProviderConfigured(mockSettings, 'openai'), true, 'OpenAI should be configured');
assert.strictEqual(isProviderConfigured(mockSettings, 'deepseek'), false, 'DeepSeek with placeholder key is not configured');
assert.strictEqual(isProviderConfigured(mockSettings, 'ollama'), true, 'Local Ollama is always configured');
assert.strictEqual(isProviderConfigured(mockSettings, 'mistral'), false, 'Mistral without key is not configured');

assert.strictEqual(isProviderEnabled(mockSettings, 'groq'), true, 'Groq is in enabledProviders');
assert.strictEqual(isProviderEnabled(mockSettings, 'openai'), true, 'OpenAI is in enabledProviders');
assert.strictEqual(isProviderEnabled(mockSettings, 'ollama'), true, 'Ollama is in enabledProviders');
assert.strictEqual(isProviderEnabled(mockSettings, 'deepseek'), false, 'DeepSeek is not in enabledProviders');
console.log('  ✓ Configured and Active checks pass');

// Test 3: Active Providers List
console.log('Test 3: getActiveProviders returns only configured & enabled providers...');
const active = getActiveProviders(mockSettings);
const activeIds = active.map(p => p.id).sort();
assert.deepStrictEqual(activeIds, ['groq', 'ollama', 'openai']);
console.log('  ✓ Active providers:', activeIds);

// Test 4: Custom Providers
console.log('Test 4: Custom Providers support...');
const settingsWithCustom = {
  ...mockSettings,
  customProviders: [
    {
      id: 'perplexity',
      name: 'Perplexity AI',
      baseUrl: 'https://api.perplexity.ai/v1',
      apiKey: 'pplx-12345',
      defaultModel: 'sonar-pro',
      description: 'Perplexity API',
      isCustom: true
    },
    {
      id: 'local-vllm',
      name: 'Local vLLM Server',
      baseUrl: 'http://localhost:8000/v1',
      isLocal: true,
      requiresApiKey: false,
      isCustom: true
    }
  ],
  enabledProviders: ['groq', 'perplexity', 'local-vllm']
};

const customList = getCustomProviders(settingsWithCustom);
assert.strictEqual(customList.length, 2, 'Should return 2 custom providers');
assert.strictEqual(customList[0].id, 'perplexity');
assert.strictEqual(customList[1].id, 'local-vllm');

const allWithCustom = getAllProviders(settingsWithCustom);
assert.ok(allWithCustom.some(p => p.id === 'perplexity'), 'All providers should include Perplexity');
assert.ok(allWithCustom.some(p => p.id === 'local-vllm'), 'All providers should include Local vLLM');

assert.strictEqual(isProviderConfigured(settingsWithCustom, 'perplexity'), true);
assert.strictEqual(isProviderConfigured(settingsWithCustom, 'local-vllm'), true);
assert.strictEqual(isProviderEnabled(settingsWithCustom, 'perplexity'), true);
assert.strictEqual(isProviderEnabled(settingsWithCustom, 'local-vllm'), true);

const activeWithCustom = getActiveProviders(settingsWithCustom);
const activeWithCustomIds = activeWithCustom.map(p => p.id).sort();
assert.deepStrictEqual(activeWithCustomIds, ['groq', 'local-vllm', 'perplexity']);
console.log('  ✓ Custom providers fully integrated and recognized:', activeWithCustomIds);

// Test 5: Base URLs and API Keys
console.log('Test 5: URL and Key resolution...');
assert.strictEqual(getBaseUrlForProvider('perplexity', settingsWithCustom), 'https://api.perplexity.ai/v1');
assert.strictEqual(getApiKeyForProvider('perplexity', settingsWithCustom), 'pplx-12345');
assert.strictEqual(getModelsUrlForProvider('perplexity', settingsWithCustom), 'https://api.perplexity.ai/v1/models');
assert.strictEqual(getBaseUrlForProvider('local-vllm', settingsWithCustom), 'http://localhost:8000/v1');
assert.strictEqual(getModelsUrlForProvider('local-vllm', settingsWithCustom), 'http://localhost:8000/v1/models');
console.log('  ✓ Base URLs and API Keys resolved correctly');

// Test 6: Fallback Candidates
console.log('Test 6: Fallback candidates...');
const settingsWithFallback = {
  ...settingsWithCustom,
  provider: 'groq',
  fallbackProviders: ['perplexity', 'local-vllm', 'openai']
};
const candidates = getProviderCandidates(settingsWithFallback);
assert.strictEqual(candidates[0].provider, 'groq');
assert.strictEqual(candidates[1].provider, 'perplexity');
assert.strictEqual(candidates[2].provider, 'local-vllm');
console.log('  ✓ Fallback provider order resolved correctly');

console.log('\nAll Multi-Provider Management tests passed successfully! 🎉');

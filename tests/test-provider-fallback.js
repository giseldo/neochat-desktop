const assert = require('assert');
const { getProviderCandidates, getProviderBaseUrl } = require('../shared/providers');

const candidates = getProviderCandidates({
    provider: 'groq',
    model: 'primary-model',
    fallbackProviders: ['ollama', 'openai', 'ollama'],
    fallbackModels: { openai: 'fallback-gpt' },
    apiKeys: { groq: 'one', openai: 'two' }
});

assert.deepStrictEqual(candidates.map(item => item.provider), ['groq', 'ollama', 'openai']);
assert.strictEqual(candidates[0].model, 'primary-model');
assert.strictEqual(candidates[1].model, 'llama3.2');
assert.strictEqual(candidates[2].model, 'fallback-gpt');
assert.strictEqual(getProviderBaseUrl(candidates[1]), 'http://localhost:11434/v1');
assert.strictEqual(getProviderBaseUrl(candidates[2]), 'https://api.openai.com/v1');

const overridden = getProviderCandidates({ provider: 'groq', customApiBaseUrlEnabled: true, customApiBaseUrl: 'http://proxy/v1' });
assert.strictEqual(getProviderBaseUrl(overridden[0]), 'http://proxy/v1');
console.log('Provider fallback routing tests passed.');

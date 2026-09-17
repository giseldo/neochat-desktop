const assert = require('assert');
const { normalizeImageGeneration } = require('../electron/settingsManager');

// Test defaults
assert.deepStrictEqual(normalizeImageGeneration(), {
  enabled: true,
  provider: 'grok',
  useCustomApiKey: false,
  apiKey: '',
  model: 'grok-imagine-image',
  aspectRatio: '1:1',
  quality: 'standard'
});

// Test xAI provider alias mapping and custom values
assert.deepStrictEqual(normalizeImageGeneration({
  enabled: false,
  provider: 'xai',
  useCustomApiKey: true,
  apiKey: 'xai-test-key-123',
  model: 'grok-imagine-image-2.0',
  aspectRatio: '16:9',
  quality: 'hd'
}), {
  enabled: false,
  provider: 'grok',
  useCustomApiKey: true,
  apiKey: 'xai-test-key-123',
  model: 'grok-imagine-image-2.0',
  aspectRatio: '16:9',
  quality: 'hd'
});

// Test OpenAI provider default model fallback
assert.deepStrictEqual(normalizeImageGeneration({
  provider: 'openai',
  apiKey: 'sk-proj-test'
}), {
  enabled: true,
  provider: 'openai',
  useCustomApiKey: false,
  apiKey: 'sk-proj-test',
  model: 'dall-e-3',
  aspectRatio: '1:1',
  quality: 'standard'
});

// Test invalid aspect ratio fallback
assert.strictEqual(normalizeImageGeneration({ aspectRatio: 'invalid' }).aspectRatio, '1:1');

console.log('Image generation settings tests passed successfully.');

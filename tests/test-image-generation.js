const assert = require('assert');
const { generateImage, getOpenAISize } = require('../electron/imageGenerationManager');

async function runTests() {
  console.log('--- Testing imageGenerationManager ---');

  // Test aspect ratio dimension mappings
  assert.strictEqual(getOpenAISize('1:1'), '1024x1024');
  assert.strictEqual(getOpenAISize('16:9'), '1792x1024');
  assert.strictEqual(getOpenAISize('9:16'), '1024x1792');
  assert.strictEqual(getOpenAISize('unknown'), '1024x1024');
  console.log('✓ getOpenAISize passed');

  // Test empty prompt validation
  const emptyRes = await generateImage({ prompt: '   ' });
  assert.strictEqual(emptyRes.success, false);
  assert.ok(emptyRes.error.includes('não pode estar vazio'));
  console.log('✓ empty prompt validation passed');

  // Test missing API key validation
  const noKeyRes = await generateImage({ prompt: 'test image' }, {});
  assert.strictEqual(noKeyRes.success, false);
  assert.ok(noKeyRes.error.includes('Chave de API não configurada'));
  console.log('✓ missing API key validation passed');

  // Test message sanitization fallback for generated image messages
  const { sanitizeMessageHistory } = require('../electron/messageUtils');
  const testMessages = [
    { role: 'user', content: 'Draw a cat', isImagePrompt: true },
    { role: 'assistant', content: '', isGeneratedImage: true, image: { prompt: 'Draw a cat', dataUrl: 'data:image/png;base64,123' } }
  ];
  const sanitized = sanitizeMessageHistory(testMessages);
  assert.strictEqual(sanitized.length, 2);
  assert.strictEqual(sanitized[0].role, 'user');
  assert.strictEqual(sanitized[1].role, 'assistant');
  assert.ok(sanitized[1].content.includes('Generated image'));
  console.log('✓ message sanitization fallback for generated image passed');

  console.log('🎉 All imageGenerationManager unit tests passed!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

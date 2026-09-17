const assert = require('assert');
const { getModelContextSizes, supportsBuiltInTools, convertAPIModelsToContextSizes } = require('../shared/models');
const { getDefaultModel } = require('../shared/providers');
const { pruneMessageHistory } = require('../electron/messageUtils');

console.log('--- Testing Multi-Provider Model Collision & Routing ---');

// Mock Groq API response
const mockGroqResponse = {
  data: [
    { id: 'allam-2-7b', object: 'model' },
    { id: 'canopylabs/orpheus-arabic-saudi', object: 'model' },
    { id: 'canopylabs/orpheus-v1-english', object: 'model' },
    { id: 'groq/compound', object: 'model' },
    { id: 'groq/compound-mini', object: 'model' },
    { id: 'openai/gpt-oss-120b', object: 'model' },
    { id: 'openai/gpt-oss-20b', object: 'model' },
    { id: 'qwen/qwen3.6-27b', object: 'model' },
    { id: 'qwen/qwen3.8-27b', object: 'model' },
  ]
};

// Mock OpenRouter API response with colliding model IDs
const mockOpenRouterResponse = {
  data: [
    { id: 'openai/gpt-oss-120b', object: 'model' },
    { id: 'openai/gpt-oss-20b', object: 'model' },
    { id: 'qwen/qwen3.6-27b', object: 'model' },
    { id: 'qwen/qwen3.8-27b', object: 'model' },
    { id: 'anthropic/claude-3.7-sonnet', object: 'model' },
    { id: 'openai/gpt-4o', object: 'model' },
  ]
};

// 1. Test convertAPIModelsToContextSizes
console.log('Test 1: Convert API models for each provider...');
const groqModels = convertAPIModelsToContextSizes(mockGroqResponse, { providerId: 'groq', providerName: 'Groq' });
const openrouterModels = convertAPIModelsToContextSizes(mockOpenRouterResponse, { providerId: 'openrouter', providerName: 'OpenRouter' });

assert.strictEqual(Object.keys(groqModels).filter(k => k !== 'default').length, 7, 'Groq should have 7 chat models (excluding canopylabs TTS)');
assert.strictEqual(groqModels['canopylabs/orpheus-v1-english'], undefined, 'Canopy Labs audio/TTS model must be filtered out');
assert.strictEqual(Object.keys(openrouterModels).filter(k => k !== 'default').length, 6, 'OpenRouter should have 6 models');
console.log('  ✓ Models converted properly with metadata and non-chat models filtered');

// 2. Test merging multi-provider models without collision
console.log('Test 2: Merge multi-provider models with unique keys...');
const allApiModels = {};

Object.entries(groqModels).forEach(([id, cfg]) => {
  if (id !== 'default') {
    const modelKey = `groq::${id}`;
    allApiModels[modelKey] = {
      ...cfg,
      id,
      rawModelId: id,
      modelKey,
      provider: 'groq',
      group: 'Groq',
      displayName: cfg.displayName || id
    };
  }
});

Object.entries(openrouterModels).forEach(([id, cfg]) => {
  if (id !== 'default') {
    const modelKey = `openrouter::${id}`;
    allApiModels[modelKey] = {
      ...cfg,
      id,
      rawModelId: id,
      modelKey,
      provider: 'openrouter',
      group: 'OpenRouter',
      displayName: cfg.displayName || id
    };
  }
});

const mergedConfigs = getModelContextSizes({}, allApiModels);

// Groq models must all 7 chat models be present (non-chat canopylabs filtered)
const groqKeys = Object.keys(mergedConfigs).filter(k => k.startsWith('groq::'));
assert.strictEqual(groqKeys.length, 7, 'Groq should still have all 7 chat models after OpenRouter is merged');
assert.ok(mergedConfigs['groq::openai/gpt-oss-120b'], 'Groq openai/gpt-oss-120b must exist');
assert.strictEqual(mergedConfigs['groq::openai/gpt-oss-120b'].provider, 'groq');
assert.strictEqual(mergedConfigs['groq::openai/gpt-oss-120b'].group, 'Groq');

// OpenRouter models must all 6 be present
const openrouterKeys = Object.keys(mergedConfigs).filter(k => k.startsWith('openrouter::'));
assert.strictEqual(openrouterKeys.length, 6, 'OpenRouter should have all 6 models');
assert.ok(mergedConfigs['openrouter::openai/gpt-oss-120b'], 'OpenRouter openai/gpt-oss-120b must exist');
assert.strictEqual(mergedConfigs['openrouter::openai/gpt-oss-120b'].provider, 'openrouter');
assert.strictEqual(mergedConfigs['openrouter::openai/gpt-oss-120b'].group, 'OpenRouter');

console.log('  ✓ Both providers preserve all models without collision (Groq: 7, OpenRouter: 6)');

// 3. Test determineModel logic (from chatHandler)
console.log('Test 3: determineModel provider & model routing resolution...');

function determineModel(model, settings, modelContextSizes) {
    const rawInput = model || settings?.model || getDefaultModel(settings);
    let modelInfo = modelContextSizes ? modelContextSizes[rawInput] : null;

    if (!modelInfo && modelContextSizes && typeof rawInput === 'string') {
        if (rawInput.includes('::')) {
            const [pId, rawId] = rawInput.split('::');
            modelInfo = modelContextSizes[rawId];
            if (!modelInfo) {
                const found = Object.values(modelContextSizes).find(cfg =>
                    cfg && (cfg.rawModelId === rawId || cfg.id === rawId) && (!cfg.provider || cfg.provider === pId)
                );
                if (found) modelInfo = found;
            }
        } else {
            const preferredProvider = settings?.provider || 'groq';
            const found = Object.values(modelContextSizes).find(cfg =>
                cfg && (cfg.rawModelId === rawInput || cfg.id === rawInput) && cfg.provider === preferredProvider
            ) || Object.values(modelContextSizes).find(cfg =>
                cfg && (cfg.rawModelId === rawInput || cfg.id === rawInput)
            );
            if (found) modelInfo = found;
        }
    }

    modelInfo = modelInfo || (modelContextSizes ? modelContextSizes['default'] : null) || { context: 1000000, vision_supported: false };
    const modelToUse = modelInfo?.rawModelId || modelInfo?.id || (typeof rawInput === 'string' && rawInput.includes('::') ? rawInput.split('::')[1] : rawInput);
    const modelProvider = modelInfo?.provider || (typeof rawInput === 'string' && rawInput.includes('::') ? rawInput.split('::')[0] : settings?.provider) || 'groq';

    return { modelToUse, modelInfo, selectedModelKey: rawInput, modelProvider };
}

// When groq::openai/gpt-oss-120b is passed
const resGroq = determineModel('groq::openai/gpt-oss-120b', { provider: 'groq' }, mergedConfigs);
assert.strictEqual(resGroq.modelToUse, 'openai/gpt-oss-120b', 'Raw model to send to API must be openai/gpt-oss-120b');
assert.strictEqual(resGroq.modelProvider, 'groq', 'Provider must be groq');

// When openrouter::openai/gpt-oss-120b is passed
const resOpenRouter = determineModel('openrouter::openai/gpt-oss-120b', { provider: 'groq' }, mergedConfigs);
assert.strictEqual(resOpenRouter.modelToUse, 'openai/gpt-oss-120b', 'Raw model to send to API must be openai/gpt-oss-120b');
assert.strictEqual(resOpenRouter.modelProvider, 'openrouter', 'Provider must be openrouter');

// When legacy unprefixed openai/gpt-oss-120b is passed with settings.provider = 'openrouter'
const resLegacyOR = determineModel('openai/gpt-oss-120b', { provider: 'openrouter' }, mergedConfigs);
assert.strictEqual(resLegacyOR.modelToUse, 'openai/gpt-oss-120b');
assert.strictEqual(resLegacyOR.modelProvider, 'openrouter');

console.log('  ✓ determineModel routes to correct provider and sends raw model ID');

// 4. Test supportsBuiltInTools and pruneMessageHistory
console.log('Test 4: supportsBuiltInTools and pruneMessageHistory...');
assert.strictEqual(supportsBuiltInTools('groq::openai/gpt-oss-120b', mergedConfigs), true);
assert.strictEqual(supportsBuiltInTools('openai/gpt-oss-120b', mergedConfigs), true);
assert.strictEqual(supportsBuiltInTools('allam-2-7b', mergedConfigs), false);

const testMessages = [
  { role: 'system', content: 'You are an assistant' },
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi' }
];
const pruned = pruneMessageHistory(testMessages, 'groq::openai/gpt-oss-120b', mergedConfigs);
assert.strictEqual(pruned.length, 3);
console.log('  ✓ Tool support and message pruning verified');

console.log('\nAll Multi-Provider Model Collision & Routing tests passed successfully! 🎉\n');

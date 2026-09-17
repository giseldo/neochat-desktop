const assert = require('assert');
const { pruneMessageHistory, sanitizeMessageHistory } = require('../electron/messageUtils');
const { getModelContextSizes } = require('../shared/models');

console.log('--- Running Auto-Pruning Settings & Execution Tests ---');

// 1. Test getModelContextSizes with autoPrune in customModels
console.log('\n[Test 1] Testing getModelContextSizes autoPrune propagation...');
const customModels = {
  'model-with-prune-enabled': {
    context: 4000,
    autoPrune: true
  },
  'model-with-prune-disabled': {
    context: 4000,
    autoPrune: false
  },
  'model-without-setting': {
    context: 4000
  }
};

const merged = getModelContextSizes(customModels);
assert.strictEqual(merged['custom::model-with-prune-enabled'].autoPrune, true, 'autoPrune: true must be preserved');
assert.strictEqual(merged['custom::model-with-prune-disabled'].autoPrune, false, 'autoPrune: false must be preserved');
assert.strictEqual(merged['custom::model-without-setting'].autoPrune, undefined, 'unspecified autoPrune should be undefined');
console.log('✅ Test 1 passed: getModelContextSizes properly propagates autoPrune.');

// 2. Test pruneMessageHistory behavior when autoPrune is disabled
console.log('\n[Test 2] Testing pruneMessageHistory with autoPrune disabled...');
const modelContextSizes = {
  'test-small-context': { context: 1000 } // target 50% = 500 tokens
};

// Create a history that exceeds 500 tokens (~2500 tokens)
const testMessages = [
  { role: 'user', content: 'Message 1: ' + 'A'.repeat(2000) },
  { role: 'assistant', content: 'Response 1: ' + 'B'.repeat(2000) },
  { role: 'user', content: 'Message 2: ' + 'C'.repeat(2000) },
  { role: 'assistant', content: 'Response 2: ' + 'D'.repeat(2000) },
  { role: 'user', content: 'Active prompt: ' + 'E'.repeat(200) }
];

// With autoPrune: false via options
const notPrunedOptions = pruneMessageHistory(testMessages, 'test-small-context', modelContextSizes, { autoPrune: false });
assert.strictEqual(notPrunedOptions.length, testMessages.length, 'All 5 messages must be preserved when autoPrune is false via options');
console.log('  ✓ Preserved all messages when autoPrune: false passed in options');

// With autoPrune: false via modelInfo
const modelConfigsWithDisabled = {
  'test-small-context': { context: 1000, autoPrune: false }
};
const notPrunedModel = pruneMessageHistory(testMessages, 'test-small-context', modelConfigsWithDisabled);
assert.strictEqual(notPrunedModel.length, testMessages.length, 'All 5 messages must be preserved when model has autoPrune: false');
console.log('  ✓ Preserved all messages when model has autoPrune: false');

// 3. Test pruneMessageHistory behavior when autoPrune is enabled
console.log('\n[Test 3] Testing pruneMessageHistory with autoPrune enabled...');
// With autoPrune: true via options
const prunedOptions = pruneMessageHistory(testMessages, 'test-small-context', modelContextSizes, { autoPrune: true });
assert(prunedOptions.length < testMessages.length, 'Messages must be pruned when autoPrune is true via options');
console.log(`  ✓ Messages pruned from ${testMessages.length} to ${prunedOptions.length} when autoPrune: true passed in options`);

// With autoPrune: true via modelInfo
const modelConfigsWithEnabled = {
  'test-small-context': { context: 1000, autoPrune: true }
};
const prunedModel = pruneMessageHistory(testMessages, 'test-small-context', modelConfigsWithEnabled);
assert(prunedModel.length < testMessages.length, 'Messages must be pruned when model has autoPrune: true');
console.log(`  ✓ Messages pruned from ${testMessages.length} to ${prunedModel.length} when model has autoPrune: true`);

// 4. Test precedence: options override modelInfo
console.log('\n[Test 4] Testing option precedence over model config...');
const overrideResult = pruneMessageHistory(testMessages, 'test-small-context', modelConfigsWithEnabled, { autoPrune: false });
assert.strictEqual(overrideResult.length, testMessages.length, 'options.autoPrune: false must override modelConfig.autoPrune: true');
console.log('✅ Test 4 passed: Option overrides modelConfig as expected.');

console.log('\n🎉 ALL AUTO-PRUNING TESTS PASSED SUCCESSFULLY! 🎉\n');

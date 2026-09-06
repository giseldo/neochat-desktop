const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { getDefaultEnabledModels } = require('./shared/providers.js');

// Load ES module filterModels in Node test environment
const filterCode = fs.readFileSync('./src/renderer/utils/modelFilters.js', 'utf8')
  .replace('export function filterModels', 'function filterModels') + '\nmodule.exports = { filterModels };';
const sandbox = { module: { exports: {} }, exports: {} };
vm.createContext(sandbox);
vm.runInContext(filterCode, sandbox);
const { filterModels } = sandbox.module.exports;

console.log('--- Testing Strict Opt-In Model Activation ---');

// Test 1: getDefaultEnabledModels returns curated models
console.log('Test 1: getDefaultEnabledModels curation...');
const defaults = getDefaultEnabledModels();
assert.ok(Array.isArray(defaults), 'Defaults should be an array');
assert.ok(defaults.includes('llama-3.3-70b-versatile'), 'Must include llama-3.3-70b-versatile');
assert.ok(defaults.includes('gpt-4o'), 'Must include gpt-4o');
assert.ok(defaults.includes('anthropic/claude-3.7-sonnet'), 'Must include claude-3.7-sonnet');
assert.ok(defaults.includes('grok-2-latest'), 'Must include grok-2-latest');
assert.ok(!defaults.includes('canopylabs/orpheus-v1-english'), 'Must NOT include uncurated audio models');
console.log('  ✓ Curated defaults verified (Total curated models: ' + defaults.length + ')');

// Test 2: filterModels rejects uncurated remote models not in enabledModels
console.log('Test 2: filterModels strict opt-in behavior...');
const modelList = [
  'llama-3.3-70b-versatile',
  'qwen-2.5-coder-32b',
  'canopylabs/orpheus-v1-english',
  'unapproved-remote-model-xyz',
  'gpt-4o'
];
const configs = {
  'llama-3.3-70b-versatile': { rawModelId: 'llama-3.3-70b-versatile' },
  'qwen-2.5-coder-32b': { rawModelId: 'qwen-2.5-coder-32b' },
  'canopylabs/orpheus-v1-english': { rawModelId: 'canopylabs/orpheus-v1-english' },
  'unapproved-remote-model-xyz': { rawModelId: 'unapproved-remote-model-xyz' },
  'gpt-4o': { rawModelId: 'gpt-4o' }
};

const userEnabledModels = ['llama-3.3-70b-versatile', 'gpt-4o'];
const filtered = filterModels(modelList, configs, userEnabledModels);

assert.strictEqual(filtered.length, 2, 'Only the 2 explicitly enabled models should pass');
assert.ok(filtered.includes('llama-3.3-70b-versatile'), 'llama-3.3-70b-versatile must pass');
assert.ok(filtered.includes('gpt-4o'), 'gpt-4o must pass');
assert.ok(!filtered.includes('canopylabs/orpheus-v1-english'), 'canopylabs/orpheus-v1-english must be filtered out');
assert.ok(!filtered.includes('unapproved-remote-model-xyz'), 'unapproved-remote-model-xyz must be filtered out');
assert.ok(!filtered.includes('qwen-2.5-coder-32b'), 'qwen-2.5-coder-32b must be filtered out because it is not enabled');
console.log('  ✓ Remote models not in enabledModels are strictly filtered out');

// Test 3: Namespaced modelKey matching
console.log('Test 3: Namespaced modelKey matching with rawModelId...');
const namespacedList = ['groq::llama-3.3-70b-versatile', 'groq::canopylabs/orpheus-v1-english'];
const namespacedConfigs = {
  'groq::llama-3.3-70b-versatile': { rawModelId: 'llama-3.3-70b-versatile' },
  'groq::canopylabs/orpheus-v1-english': { rawModelId: 'canopylabs/orpheus-v1-english' }
};

const filteredNamespaced = filterModels(namespacedList, namespacedConfigs, ['llama-3.3-70b-versatile']);
assert.strictEqual(filteredNamespaced.length, 1, 'Only groq::llama-3.3-70b-versatile should match rawModelId');
assert.strictEqual(filteredNamespaced[0], 'groq::llama-3.3-70b-versatile');
console.log('  ✓ Namespaced models correctly match by rawModelId');

// Test 4: Dynamic toggle test
console.log('Test 4: Dynamic toggle...');
const toggledOn = [...userEnabledModels, 'qwen-2.5-coder-32b'];
const filteredToggled = filterModels(modelList, configs, toggledOn);
assert.strictEqual(filteredToggled.length, 3, 'After toggling ON, 3 models should pass');
assert.ok(filteredToggled.includes('qwen-2.5-coder-32b'));
console.log('  ✓ Dynamically toggling ON immediately enables model');

console.log('\nAll Strict Opt-In Model Activation tests passed successfully! 🎉');

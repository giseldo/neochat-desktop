const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { normalizeLabs, loadSettings, saveSettings } = require('../electron/settingsManager');

console.log('🧪 Testing NeoChat Labs Settings & Feature Normalization...\n');

// 1. Test normalizeLabs defaults
const defaultLabs = normalizeLabs();
assert.strictEqual(defaultLabs.enabled, true, 'Default labs.enabled must be true');
assert.strictEqual(defaultLabs.podcast, false, 'podcast default must be false');
assert.strictEqual(defaultLabs.arena, false, 'arena default must be false');
assert.strictEqual(defaultLabs.news, false, 'news default must be false');
assert.strictEqual(defaultLabs.briefing, false, 'briefing default must be false');
assert.strictEqual(defaultLabs.graph, false, 'graph default must be false');
assert.strictEqual(defaultLabs.sandbox, false, 'sandbox default must be false');
assert.strictEqual(defaultLabs.swarm, false, 'swarm default must be false');
assert.strictEqual(defaultLabs.workflows, false, 'workflows default must be false');
assert.strictEqual(defaultLabs.compareModels, false, 'compareModels default must be false');
assert.strictEqual(defaultLabs.backgroundTasks, false, 'backgroundTasks default must be false');
assert.strictEqual(defaultLabs.trajectory, false, 'trajectory default must be false');
assert.strictEqual(defaultLabs.metrics, false, 'metrics default must be false');
assert.strictEqual(defaultLabs.pluginsHub, false, 'pluginsHub default must be false');
assert.strictEqual(defaultLabs.agenticEmployees, false, 'agenticEmployees default must be false');
console.log('  ✅ normalizeLabs defaults verified (clean focus mode)');

// 2. Test normalizeLabs preserves custom true values
const customLabs = normalizeLabs({
  enabled: true,
  podcast: true,
  sandbox: true,
  workflows: true,
  invalidKey: 'shouldBeIgnored'
});
assert.strictEqual(customLabs.enabled, true);
assert.strictEqual(customLabs.podcast, true);
assert.strictEqual(customLabs.sandbox, true);
assert.strictEqual(customLabs.workflows, true);
assert.strictEqual(customLabs.arena, false);
assert.strictEqual(customLabs.invalidKey, undefined);
console.log('  ✅ normalizeLabs with selective features verified');

// 3. Test normalizeLabs with master switch disabled
const disabledLabs = normalizeLabs({
  enabled: false,
  podcast: true
});
assert.strictEqual(disabledLabs.enabled, false);
assert.strictEqual(disabledLabs.podcast, true);
console.log('  ✅ Master switch disabling preserved');

// 4. Test coercion of truthy / falsy values
const coercedLabs = normalizeLabs({
  enabled: 1,
  podcast: 'yes',
  arena: 0,
  sandbox: null,
  swarm: undefined
});
assert.strictEqual(coercedLabs.enabled, true);
assert.strictEqual(coercedLabs.podcast, true);
assert.strictEqual(coercedLabs.arena, false);
assert.strictEqual(coercedLabs.sandbox, false);
assert.strictEqual(coercedLabs.swarm, false);
console.log('  ✅ Strict boolean coercion verified');

// 5. Test Presets logic
function applyPreset(presetType) {
  const allKeys = ['podcast', 'arena', 'news', 'briefing', 'graph', 'sandbox', 'swarm', 'workflows', 'compareModels', 'backgroundTasks', 'trajectory', 'metrics', 'pluginsHub', 'agenticEmployees'];
  const res = { enabled: true };
  if (presetType === 'essential') {
    allKeys.forEach(k => { res[k] = false; });
  } else if (presetType === 'developer') {
    const devKeys = ['sandbox', 'workflows', 'compareModels', 'backgroundTasks', 'trajectory', 'metrics'];
    allKeys.forEach(k => { res[k] = devKeys.includes(k); });
  } else if (presetType === 'all') {
    allKeys.forEach(k => { res[k] = true; });
  }
  return normalizeLabs(res);
}

const essentialPreset = applyPreset('essential');
assert.strictEqual(Object.keys(essentialPreset).filter(k => k !== 'enabled').every(k => essentialPreset[k] === false), true);
console.log('  ✅ Preset "Modo Essencial / Clean" sets all 14 experimental items to false');

const devPreset = applyPreset('developer');
assert.strictEqual(devPreset.sandbox, true);
assert.strictEqual(devPreset.workflows, true);
assert.strictEqual(devPreset.compareModels, true);
assert.strictEqual(devPreset.backgroundTasks, true);
assert.strictEqual(devPreset.trajectory, true);
assert.strictEqual(devPreset.metrics, true);
assert.strictEqual(devPreset.podcast, false);
assert.strictEqual(devPreset.arena, false);
assert.strictEqual(devPreset.briefing, false);
console.log('  ✅ Preset "Modo Developer" selectively enables only dev tools');

const allPreset = applyPreset('all');
assert.strictEqual(Object.keys(allPreset).every(k => allPreset[k] === true), true);
console.log('  ✅ Preset "Ativar Todos" enables all experimental items');

console.log('\n🎉 ALL NEOCHAT LABS TESTS PASSED!\n');

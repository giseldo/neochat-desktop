const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { initializeSettingsHandlers, loadSettings } = require('../electron/settingsManager');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-filter-tab-test-'));
const handlers = new Map();
const ipcMain = {
  handle(channel, handler) {
    handlers.set(channel, handler);
  }
};
const app = { getPath: () => tempDir };

try {
  initializeSettingsHandlers(ipcMain, app);

  // 1. Check default values when no settings file exists
  console.log('Test 1: Default providerFilterTab is "active"...');
  const defaults = loadSettings();
  assert.strictEqual(defaults.providerFilterTab, 'active', 'providerFilterTab must default to "active"');
  console.log('  ✓ Default is "active"');

  const save = handlers.get('save-settings');
  assert.ok(save, 'save-settings IPC handler should be registered');

  // 2. Save providerFilterTab: 'configured' and check persistence
  console.log('Test 2: Save providerFilterTab: "configured" and verify persistence...');
  Promise.resolve(save({}, { ...defaults, providerFilterTab: 'configured' }))
    .then((result) => {
      assert.strictEqual(result.success, true);
      const reloaded = loadSettings();
      assert.strictEqual(reloaded.providerFilterTab, 'configured', 'providerFilterTab: "configured" should persist');
      console.log('  ✓ Persisted "configured" successfully');

      // 3. Save providerFilterTab: 'all'
      console.log('Test 3: Save providerFilterTab: "all" and verify persistence...');
      return save({}, { ...reloaded, providerFilterTab: 'all' });
    })
    .then((result) => {
      assert.strictEqual(result.success, true);
      const reloaded = loadSettings();
      assert.strictEqual(reloaded.providerFilterTab, 'all', 'providerFilterTab: "all" should persist');
      console.log('  ✓ Persisted "all" successfully');

      // 4. Fallback when not in file
      console.log('Test 4: Fallback to "active" when missing from settings.json...');
      fs.writeFileSync(path.join(tempDir, 'settings.json'), JSON.stringify({}));
      assert.strictEqual(loadSettings().providerFilterTab, 'active', 'missing providerFilterTab should default to "active"');
      console.log('  ✓ Fallback to "active" passed');

      console.log('\nAll Provider Filter Tab settings tests passed successfully! 🎉');
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exitCode = 1;
    })
    .finally(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
} catch (error) {
  fs.rmSync(tempDir, { recursive: true, force: true });
  throw error;
}

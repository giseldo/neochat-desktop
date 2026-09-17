const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { initializeSettingsHandlers, loadSettings } = require('../electron/settingsManager');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-default-model-'));
const handlers = new Map();
const ipcMain = {
  handle(channel, handler) {
    handlers.set(channel, handler);
  }
};
const app = { getPath: () => tempDir };

try {
  initializeSettingsHandlers(ipcMain, app);

  // 1. Default model must be empty string
  const defaults = loadSettings();
  assert.strictEqual(defaults.model, '', 'Default model should be an empty string');

  // 2. Settings file with {} must return model as empty string
  fs.writeFileSync(path.join(tempDir, 'settings.json'), JSON.stringify({}));
  const emptyLoaded = loadSettings();
  assert.strictEqual(emptyLoaded.model, '', 'Empty settings.json should default model to empty string');

  // 3. User configured model should persist
  const save = handlers.get('save-settings');
  assert.ok(save, 'save-settings handler exists');

  Promise.resolve(save({}, { ...defaults, model: 'custom-model-123' }))
    .then((result) => {
      assert.strictEqual(result.success, true);
      assert.strictEqual(loadSettings().model, 'custom-model-123', 'User model selection should persist');
      console.log('Default model tests passed successfully!');
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => fs.rmSync(tempDir, { recursive: true, force: true }));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  fs.rmSync(tempDir, { recursive: true, force: true });
}

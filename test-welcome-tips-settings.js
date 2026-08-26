const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { initializeSettingsHandlers, loadSettings } = require('./electron/settingsManager');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-welcome-tips-'));
const handlers = new Map();
const ipcMain = {
  handle(channel, handler) {
    handlers.set(channel, handler);
  }
};
const app = { getPath: () => tempDir };

try {
  initializeSettingsHandlers(ipcMain, app);

  // 1. Check default values
  const defaults = loadSettings();
  assert.strictEqual(defaults.showWelcomeTips, false, 'showWelcomeTips must be false by default');
  assert.strictEqual(defaults.showWelcomeSuggestions, false, 'showWelcomeSuggestions must be false by default');

  const save = handlers.get('save-settings');
  assert.ok(save, 'save-settings IPC handler should be registered');

  // 2. Save showWelcomeTips: true and showWelcomeSuggestions: true and check persistence
  Promise.resolve(save({}, { ...defaults, showWelcomeTips: true, showWelcomeSuggestions: true }))
    .then((result) => {
      assert.strictEqual(result.success, true);
      assert.strictEqual(loadSettings().showWelcomeTips, true, 'showWelcomeTips: true should persist');
      assert.strictEqual(loadSettings().showWelcomeSuggestions, true, 'showWelcomeSuggestions: true should persist');

      // 3. Fallback when not in file
      fs.writeFileSync(path.join(tempDir, 'settings.json'), JSON.stringify({}));
      assert.strictEqual(loadSettings().showWelcomeTips, false, 'missing showWelcomeTips should default to false');
      assert.strictEqual(loadSettings().showWelcomeSuggestions, false, 'missing showWelcomeSuggestions should default to false');

      console.log('Welcome tips & suggestions settings tests passed successfully!');
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => fs.rmSync(tempDir, { recursive: true, force: true }));
} catch (error) {
  fs.rmSync(tempDir, { recursive: true, force: true });
  throw error;
}

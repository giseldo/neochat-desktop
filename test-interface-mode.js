const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { initializeSettingsHandlers, loadSettings } = require('./electron/settingsManager');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-interface-mode-'));
const handlers = new Map();
const ipcMain = {
  handle(channel, handler) {
    handlers.set(channel, handler);
  }
};
const app = { getPath: () => tempDir };

try {
  initializeSettingsHandlers(ipcMain, app);

  const defaults = loadSettings();
  assert.strictEqual(defaults.interfaceMode, 'user', 'new installations must default to user mode');

  const save = handlers.get('save-settings');
  assert.ok(save, 'save-settings IPC handler should be registered');

  Promise.resolve(save({}, { ...defaults, interfaceMode: 'power' }))
    .then((result) => {
      assert.strictEqual(result.success, true);
      assert.strictEqual(loadSettings().interfaceMode, 'power', 'power mode should persist');

      fs.writeFileSync(path.join(tempDir, 'settings.json'), JSON.stringify({ interfaceMode: 'invalid' }));
      assert.strictEqual(loadSettings().interfaceMode, 'user', 'invalid modes must safely fall back');
      console.log('Interface mode tests passed.');
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

const assert = require('assert');
const { EventEmitter } = require('events');
const { initializeUpdateManager } = require('../electron/updateManager');

async function run() {
  const handlers = new Map();
  const sent = [];
  const updater = new EventEmitter();
  let downloads = 0;
  let installs = 0;

  updater.checkForUpdates = async () => {
    updater.emit('checking-for-update');
    updater.emit('update-available', { version: '1.1.0' });
  };
  updater.downloadUpdate = async () => { downloads += 1; };
  updater.quitAndInstall = () => { installs += 1; };

  initializeUpdateManager({
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    app: { isPackaged: true, getVersion: () => '1.0.0' },
    autoUpdater: updater,
    getWindow: () => ({ isDestroyed: () => false, webContents: { send: (channel, payload) => sent.push({ channel, payload }) } }),
    loadSettings: () => ({ autoUpdate: { checkOnStartup: false, channel: 'beta' } })
  });

  assert.strictEqual(updater.autoDownload, false);
  assert.strictEqual(updater.autoInstallOnAppQuit, false);
  await handlers.get('updater-check')();
  assert.strictEqual(updater.allowPrerelease, true);
  assert.strictEqual(handlers.get('updater-get-status')().status, 'available');
  assert.strictEqual(handlers.get('updater-get-status')().currentVersion, '1.0.0');

  updater.emit('download-progress', { percent: 42.4 });
  assert.strictEqual(handlers.get('updater-get-status')().percent, 42);
  updater.emit('update-downloaded', { version: '1.1.0' });
  assert.strictEqual(handlers.get('updater-get-status')().status, 'downloaded');

  await handlers.get('updater-download')();
  handlers.get('updater-install')();
  assert.strictEqual(downloads, 1);
  assert.strictEqual(installs, 1);
  assert(sent.some(event => event.channel === 'updater-status' && event.payload.status === 'available'));
  console.log('update manager tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

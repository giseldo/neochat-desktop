const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { ResearchStore } = require('./store');

app.setName('neochat-research');
app.setPath('userData', path.join(app.getPath('appData'), 'neochat-research'));
let window;

function createWindow() {
  window = new BrowserWindow({
    title: 'NeoChat Research', width: 1280, height: 850, minWidth: 800, minHeight: 600,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.on('closed', () => { window = null; });
  if (process.env.NODE_ENV === 'development') window.loadURL('http://localhost:5174');
  else window.loadFile(path.join(__dirname, '../../dist/index.html'));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { window.restore(); window.focus(); } });
  app.whenReady().then(() => {
    const store = new ResearchStore(path.join(app.getPath('userData'), 'reviews'));
    for (const method of ['list', 'get', 'save', 'importRis']) {
      ipcMain.handle(`research:${method}`, (event, payload) => {
        if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Origem inválida.');
        return store[method](payload);
      });
    }
    createWindow();
    app.on('activate', () => { if (!window) createWindow(); });
  }).catch(error => { dialog.showErrorBox('NeoChat Research', error.message); app.quit(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const { exportCsv, exportMarkdown } = require('./export');
const path = require('path');
const { ResearchStore } = require('./store');

app.setName('neochat-research');
app.setPath('userData', process.env.NEOCHAT_RESEARCH_USER_DATA_PATH ? path.resolve(process.env.NEOCHAT_RESEARCH_USER_DATA_PATH) : path.join(app.getPath('appData'), 'neochat-research'));
let window;

function createWindow() {
  window = new BrowserWindow({
    title: 'NeoChat Research', width: 1280, height: 850, minWidth: 800, minHeight: 600,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('will-prevent-unload', event => {
    const choice = dialog.showMessageBoxSync(window, { type: 'question', buttons: ['Continuar editando', 'Descartar alterações'], defaultId: 0, cancelId: 0, title: 'Alterações não salvas', message: 'Fechar sem salvar as alterações do projeto?' });
    if (choice === 1) event.preventDefault();
  });
  window.on('closed', () => { window = null; });
  if (process.env.NODE_ENV === 'development') window.loadURL('http://localhost:5174');
  else window.loadFile(path.join(__dirname, '../../dist/index.html'));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { window.restore(); window.focus(); } });
  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('com.neochat.research');
    const store = new ResearchStore(path.join(app.getPath('userData'), 'reviews'));
    ipcMain.handle('research:files', async (event, { action, id, referenceId }) => {
      if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Origem inválida.');
      if (action === 'attach' || action === 'restore') {
        const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: action === 'attach' ? 'PDF' : 'Backup Research', extensions: [action === 'attach' ? 'pdf' : 'json'] }] });
        if (result.canceled) return null;
        const filename = result.filePaths[0];
        if (fs.statSync(filename).size > (action === 'attach' ? 50000000 : 250000000)) throw new Error('Arquivo muito grande.');
        return action === 'attach' ? store.attachPdf(id, referenceId, fs.readFileSync(filename)) : store.restore(fs.readFileSync(filename, 'utf8'));
      }
      if (action === 'openPdf') {
        const project = store.get(id);
        if (!project.references.some(item => item.id === referenceId && item.hasPdf)) throw new Error('PDF não encontrado.');
        const error = await shell.openPath(store.pdfPath(id, referenceId));
        if (error) throw new Error(error);
        return null;
      }
      if (!['backup', 'csv', 'markdown'].includes(action)) throw new Error('Ação inválida.');
      const contents = action === 'backup' ? store.backup(id) : action === 'markdown' ? exportMarkdown(store.get(id)) : exportCsv(store.get(id));
      const extension = { backup: 'json', markdown: 'md', csv: 'csv' }[action];
      const result = await dialog.showSaveDialog(window, { defaultPath: `revisao.${extension}`, filters: [{ name: 'Exportação Research', extensions: [extension] }] });
      if (result.canceled) return null;
      fs.writeFileSync(result.filePath, contents, 'utf8');
      return { exported: true };
    });
    for (const method of ['list', 'get', 'save', 'importRis', 'importReferences']) {
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

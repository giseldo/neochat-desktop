const fs = require('fs');
const path = require('path');

const BACKUP_VERSION = 1;
const SECRET_KEYS = new Set(['apiKeys', 'googleOAuthToken', 'googleRefreshToken', 'googleClientSecret']);

function sanitizeSettings(settings) {
    const clean = JSON.parse(JSON.stringify(settings || {}));
    for (const key of SECRET_KEYS) delete clean[key];
    if (clean.webSearch) delete clean.webSearch.apiKey;
    return clean;
}

function readJson(filePath, fallback) {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildBackup(userDataPath, settings) {
    const chatDir = path.join(userDataPath, 'chat-history');
    const chats = fs.existsSync(chatDir)
        ? fs.readdirSync(chatDir).filter(name => name.endsWith('.json')).map(name => readJson(path.join(chatDir, name), null)).filter(Boolean)
        : [];
    return {
        format: 'neochat-backup',
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        settings: sanitizeSettings(settings),
        projects: readJson(path.join(userDataPath, 'projects.json'), []),
        chats
    };
}

function validateBackup(data) {
    if (!data || data.format !== 'neochat-backup' || data.version !== BACKUP_VERSION) throw new Error('Unsupported backup format');
    if (!Array.isArray(data.chats) || !Array.isArray(data.projects) || typeof data.settings !== 'object') throw new Error('Invalid backup contents');
    for (const chat of data.chats) {
        if (!chat?.id || !Array.isArray(chat.messages) || !/^[a-zA-Z0-9-]+$/.test(chat.id)) throw new Error('Invalid chat in backup');
    }
    return data;
}

function writeAtomic(filePath, value) {
    const temporary = `${filePath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2));
    fs.renameSync(temporary, filePath);
}

function restoreBackup(userDataPath, data, currentSettings) {
    validateBackup(data);
    const chatDir = path.join(userDataPath, 'chat-history');
    fs.mkdirSync(chatDir, { recursive: true });
    const recoveryDir = path.join(userDataPath, 'backups', `pre-import-${Date.now()}`);
    fs.mkdirSync(recoveryDir, { recursive: true });
    if (fs.existsSync(path.join(userDataPath, 'projects.json'))) fs.copyFileSync(path.join(userDataPath, 'projects.json'), path.join(recoveryDir, 'projects.json'));
    for (const name of fs.readdirSync(chatDir).filter(name => name.endsWith('.json'))) {
        fs.copyFileSync(path.join(chatDir, name), path.join(recoveryDir, name));
    }
    for (const chat of data.chats) writeAtomic(path.join(chatDir, `${chat.id}.json`), chat);
    writeAtomic(path.join(userDataPath, 'projects.json'), data.projects);
    return { settings: { ...currentSettings, ...sanitizeSettings(data.settings) }, recoveryDir, importedChats: data.chats.length };
}

function initializeBackupHandlers(ipcMain, app, dialog, getMainWindow, loadSettings, saveSettings) {
    ipcMain.handle('backup-export', async () => {
        const result = await dialog.showSaveDialog(getMainWindow(), { defaultPath: `neochat-backup-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'NeoChat Backup', extensions: ['json'] }] });
        if (result.canceled || !result.filePath) return { canceled: true };
        writeAtomic(result.filePath, buildBackup(app.getPath('userData'), loadSettings()));
        return { success: true, filePath: result.filePath };
    });
    ipcMain.handle('backup-import', async () => {
        const result = await dialog.showOpenDialog(getMainWindow(), { properties: ['openFile'], filters: [{ name: 'NeoChat Backup', extensions: ['json'] }] });
        if (result.canceled || !result.filePaths[0]) return { canceled: true };
        const restored = restoreBackup(app.getPath('userData'), readJson(result.filePaths[0]), loadSettings());
        await saveSettings(restored.settings);
        return { success: true, importedChats: restored.importedChats, recoveryDir: restored.recoveryDir };
    });
}

module.exports = { BACKUP_VERSION, buildBackup, initializeBackupHandlers, restoreBackup, sanitizeSettings, validateBackup };

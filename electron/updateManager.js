let state = { status: 'idle', version: null, percent: 0, error: null };

function initializeUpdateManager({ ipcMain, app, autoUpdater, getWindow, loadSettings }) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    const publish = (updates) => {
        state = { ...state, ...updates };
        const window = getWindow();
        if (window && !window.isDestroyed()) window.webContents.send('updater-status', state);
    };

    autoUpdater.on('checking-for-update', () => publish({ status: 'checking', error: null }));
    autoUpdater.on('update-available', info => publish({ status: 'available', version: info.version, releaseNotes: info.releaseNotes || null }));
    autoUpdater.on('update-not-available', info => publish({ status: 'current', version: info?.version || app.getVersion() }));
    autoUpdater.on('download-progress', progress => publish({ status: 'downloading', percent: Math.round(progress.percent || 0) }));
    autoUpdater.on('update-downloaded', info => publish({ status: 'downloaded', version: info.version, percent: 100 }));
    autoUpdater.on('error', error => publish({ status: 'error', error: error.message }));

    const check = async (force = false) => {
        if (!app.isPackaged && !force) return { success: false, development: true, state };
        try {
            autoUpdater.allowPrerelease = loadSettings().autoUpdate?.channel === 'beta';
            await autoUpdater.checkForUpdates();
            return { success: true, state };
        } catch (error) {
            publish({ status: 'error', error: error.message });
            return { success: false, error: error.message, state };
        }
    };

    ipcMain.handle('updater-get-status', () => ({ ...state, currentVersion: app.getVersion(), packaged: app.isPackaged }));
    ipcMain.handle('updater-check', () => check(false));
    ipcMain.handle('updater-download', async () => { await autoUpdater.downloadUpdate(); return { success: true }; });
    ipcMain.handle('updater-install', () => { autoUpdater.quitAndInstall(false, true); return { success: true }; });

    if (app.isPackaged && loadSettings().autoUpdate?.checkOnStartup !== false) {
        const startupTimer = setTimeout(() => check(false), 10000);
        startupTimer.unref?.();
    }
    return { check, getState: () => state };
}

module.exports = { initializeUpdateManager };

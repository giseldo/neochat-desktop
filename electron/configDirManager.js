const fs = require('fs');
const path = require('path');

const POINTER_FILENAME = 'custom-user-data-path.json';

/**
 * Gets the standard default OS userData path for the application
 * @param {Electron.App} app
 * @returns {string}
 */
function getDefaultUserDataPath(app) {
    if (!app || typeof app.getPath !== 'function') {
        throw new Error('App instance is required');
    }
    const appData = app.getPath('appData');
    const appName = (typeof app.getName === 'function' ? app.getName() : null) || 'groq-desktop-app';
    return path.join(appData, appName);
}

/**
 * Gets the path to the bootstrap pointer file in default AppData
 * @param {Electron.App} app
 * @returns {string}
 */
function getPointerFilePath(app) {
    return path.join(getDefaultUserDataPath(app), POINTER_FILENAME);
}

/**
 * Checks for a configured custom userData path on early startup and configures app.setPath('userData')
 * Must be called before app logs or managers initialize.
 * @param {Electron.App} app
 * @returns {string} Active userData path
 */
function bootstrapUserDataPath(app) {
    try {
        const defaultPath = getDefaultUserDataPath(app);
        
        // Priority 1: Environment variable NEOCHAT_USER_DATA_PATH
        if (process.env.NEOCHAT_USER_DATA_PATH && process.env.NEOCHAT_USER_DATA_PATH.trim()) {
            const envPath = path.resolve(process.env.NEOCHAT_USER_DATA_PATH.trim());
            if (!fs.existsSync(envPath)) {
                fs.mkdirSync(envPath, { recursive: true });
            }
            app.setPath('userData', envPath);
            console.log('[ConfigDir] Using userData path from environment variable:', envPath);
            return envPath;
        }

        // Priority 2: Pointer file in standard AppData
        const pointerPath = getPointerFilePath(app);
        if (fs.existsSync(pointerPath)) {
            const raw = fs.readFileSync(pointerPath, 'utf8');
            const data = JSON.parse(raw);
            if (data && typeof data.customUserDataPath === 'string' && data.customUserDataPath.trim()) {
                const customPath = path.resolve(data.customUserDataPath.trim());
                if (!fs.existsSync(customPath)) {
                    fs.mkdirSync(customPath, { recursive: true });
                }
                app.setPath('userData', customPath);
                console.log('[ConfigDir] Using custom userData path from pointer file:', customPath);
                return customPath;
            }
        }
    } catch (error) {
        console.error('[ConfigDir] Error bootstrapping custom userData path:', error);
    }
    return app.getPath('userData');
}

/**
 * Recursively copy a directory or file from source to target
 * @param {string} src
 * @param {string} dest
 * @param {Array<string>} excludeNames
 */
function copyRecursively(src, dest, excludeNames = [POINTER_FILENAME]) {
    if (!fs.existsSync(src)) return;

    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
            if (excludeNames.includes(entry)) continue;
            copyRecursively(path.join(src, entry), path.join(dest, entry), excludeNames);
        }
    } else if (stats.isFile()) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
    }
}

/**
 * Get info about current and default config directories
 * @param {Electron.App} app
 * @returns {{ currentPath: string, defaultPath: string, isCustom: boolean, settingsPath: string }}
 */
function getConfigDirInfo(app) {
    const currentPath = path.resolve(app.getPath('userData'));
    const defaultPath = path.resolve(getDefaultUserDataPath(app));
    const isCustom = currentPath.toLowerCase() !== defaultPath.toLowerCase();
    const settingsPath = path.join(currentPath, 'settings.json');
    return {
        currentPath,
        defaultPath,
        isCustom,
        settingsPath
    };
}

/**
 * Select a directory via native OS dialog
 * @param {Electron.Dialog} dialog
 * @param {Electron.BrowserWindow|null} mainWindow
 * @param {Electron.App} app
 * @returns {Promise<string|null>}
 */
async function selectFolderDialog(dialog, mainWindow, app) {
    const currentPath = app.getPath('userData');
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Selecionar Pasta de Configurações e Dados',
        defaultPath: currentPath,
        properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
    }

    return result.filePaths[0];
}

/**
 * Change the userData directory to a new custom path
 * @param {Electron.App} app
 * @param {string} newPath
 * @param {Object} options
 * @param {boolean} [options.copyExisting=true]
 * @param {Function} [options.onConfigDirChanged=null]
 * @returns {Promise<{ success: boolean, newPath: string, isCustom: boolean, error?: string }>}
 */
async function changeUserDataPath(app, newPath, { copyExisting = true, onConfigDirChanged = null } = {}) {
    try {
        if (!newPath || typeof newPath !== 'string' || !newPath.trim()) {
            throw new Error('Caminho de pasta inválido.');
        }

        const resolvedNewPath = path.resolve(newPath.trim());
        const currentPath = path.resolve(app.getPath('userData'));
        const defaultPath = path.resolve(getDefaultUserDataPath(app));

        // Create target directory if it does not exist
        if (!fs.existsSync(resolvedNewPath)) {
            fs.mkdirSync(resolvedNewPath, { recursive: true });
        }

        // Check write permission
        const testFile = path.join(resolvedNewPath, `.neochat-write-test-${Date.now()}`);
        try {
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
        } catch (permErr) {
            throw new Error(`Sem permissão de gravação na pasta selecionada: ${permErr.message}`);
        }

        // If target is the same as default path, treat as reset
        if (resolvedNewPath.toLowerCase() === defaultPath.toLowerCase()) {
            return await resetDefaultUserDataPath(app, { copyExisting, onConfigDirChanged });
        }

        // If not already in the new path, copy existing files if requested
        if (resolvedNewPath.toLowerCase() !== currentPath.toLowerCase()) {
            if (copyExisting && fs.existsSync(currentPath)) {
                console.log(`[ConfigDir] Copying configuration data from "${currentPath}" to "${resolvedNewPath}"...`);
                copyRecursively(currentPath, resolvedNewPath, [POINTER_FILENAME]);
            }

            // Save pointer file in default AppData
            const pointerPath = getPointerFilePath(app);
            const pointerDir = path.dirname(pointerPath);
            if (!fs.existsSync(pointerDir)) {
                fs.mkdirSync(pointerDir, { recursive: true });
            }
            fs.writeFileSync(pointerPath, JSON.stringify({
                customUserDataPath: resolvedNewPath,
                updatedAt: new Date().toISOString()
            }, null, 2), 'utf8');

            // Update app's userData path in runtime
            app.setPath('userData', resolvedNewPath);
            console.log('[ConfigDir] UserData path successfully switched to:', resolvedNewPath);

            // Trigger notification callback for managers
            if (typeof onConfigDirChanged === 'function') {
                await onConfigDirChanged(resolvedNewPath, currentPath);
            }
        }

        return {
            success: true,
            newPath: resolvedNewPath,
            isCustom: true
        };
    } catch (error) {
        console.error('[ConfigDir] Failed to change config folder:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Reset userData directory to default OS AppData folder
 * @param {Electron.App} app
 * @param {Object} options
 * @param {boolean} [options.copyExisting=false]
 * @param {Function} [options.onConfigDirChanged=null]
 * @returns {Promise<{ success: boolean, defaultPath: string, isCustom: boolean, error?: string }>}
 */
async function resetDefaultUserDataPath(app, { copyExisting = false, onConfigDirChanged = null } = {}) {
    try {
        const defaultPath = path.resolve(getDefaultUserDataPath(app));
        const currentPath = path.resolve(app.getPath('userData'));

        if (!fs.existsSync(defaultPath)) {
            fs.mkdirSync(defaultPath, { recursive: true });
        }

        // Copy files if requested and current path was custom
        if (copyExisting && currentPath.toLowerCase() !== defaultPath.toLowerCase() && fs.existsSync(currentPath)) {
            console.log(`[ConfigDir] Copying data back to default path "${defaultPath}"...`);
            copyRecursively(currentPath, defaultPath, [POINTER_FILENAME]);
        }

        // Remove pointer file
        const pointerPath = getPointerFilePath(app);
        if (fs.existsSync(pointerPath)) {
            try {
                fs.unlinkSync(pointerPath);
            } catch (err) {
                console.warn('[ConfigDir] Could not remove pointer file:', err.message);
            }
        }

        // Update app userData path
        app.setPath('userData', defaultPath);
        console.log('[ConfigDir] UserData path reset to default:', defaultPath);

        if (typeof onConfigDirChanged === 'function') {
            await onConfigDirChanged(defaultPath, currentPath);
        }

        return {
            success: true,
            defaultPath,
            isCustom: false
        };
    } catch (error) {
        console.error('[ConfigDir] Failed to reset config folder:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Open the active config directory in the OS file manager
 * @param {Electron.App} app
 * @param {Electron.Shell} shell
 * @returns {Promise<string>} Error message or empty string on success
 */
async function openFolder(app, shell) {
    const currentPath = app.getPath('userData');
    if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath, { recursive: true });
    }
    return shell.openPath(currentPath);
}

/**
 * Register IPC handlers for config directory management
 * @param {Electron.IpcMain} ipcMain
 * @param {Electron.App} app
 * @param {Electron.Dialog} dialog
 * @param {Electron.Shell} shell
 * @param {Function} getMainWindow
 * @param {Function} onConfigDirChanged
 */
function registerHandlers(ipcMain, app, dialog, shell, getMainWindow, onConfigDirChanged) {
    ipcMain.handle('config-dir-get-info', async () => {
        return getConfigDirInfo(app);
    });

    ipcMain.handle('config-dir-select-folder', async () => {
        const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
        return selectFolderDialog(dialog, win, app);
    });

    ipcMain.handle('config-dir-change-folder', async (_event, { newPath, copyExisting = true }) => {
        return changeUserDataPath(app, newPath, { copyExisting, onConfigDirChanged });
    });

    ipcMain.handle('config-dir-reset-folder', async (_event, { copyExisting = false } = {}) => {
        return resetDefaultUserDataPath(app, { copyExisting, onConfigDirChanged });
    });

    ipcMain.handle('config-dir-open-folder', async () => {
        const errorMsg = await openFolder(app, shell);
        return { success: !errorMsg, error: errorMsg || null };
    });
}

module.exports = {
    getDefaultUserDataPath,
    getPointerFilePath,
    bootstrapUserDataPath,
    copyRecursively,
    getConfigDirInfo,
    selectFolderDialog,
    changeUserDataPath,
    resetDefaultUserDataPath,
    openFolder,
    registerHandlers
};

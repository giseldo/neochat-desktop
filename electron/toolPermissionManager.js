const VALID_POLICIES = new Set(['prompt', 'allow', 'deny']);

function normalizePermissions(value = {}) {
    const tools = {};
    for (const [key, policy] of Object.entries(value.tools || {})) {
        if (VALID_POLICIES.has(policy)) tools[key] = policy;
    }
    return {
        defaultPolicy: VALID_POLICIES.has(value.defaultPolicy) ? value.defaultPolicy : 'prompt',
        tools,
        allowAll: value.allowAll === true
    };
}

function toolKey(toolName, serverLabel) {
    return serverLabel ? `${serverLabel}/${toolName}` : toolName;
}

function resolvePermission(permissions, toolName, serverLabel) {
    const normalized = normalizePermissions(permissions);
    if (normalized.allowAll) return 'allow';
    const exact = normalized.tools[toolKey(toolName, serverLabel)];
    const generic = normalized.tools[toolName];
    return exact || generic || normalized.defaultPolicy;
}

function initializeToolPermissionHandlers(ipcMain, loadSettings, saveSettings) {
    ipcMain.handle('tool-permissions-get', () => normalizePermissions(loadSettings().toolPermissions));
    ipcMain.handle('tool-permissions-resolve', (_event, toolName, serverLabel) =>
        resolvePermission(loadSettings().toolPermissions, toolName, serverLabel)
    );
    ipcMain.handle('tool-permissions-set', async (_event, { toolName, serverLabel, policy }) => {
        if (!toolName || !VALID_POLICIES.has(policy)) return { success: false, error: 'Invalid tool permission' };
        const settings = loadSettings();
        const permissions = normalizePermissions(settings.toolPermissions);
        permissions.tools[toolKey(toolName, serverLabel)] = policy;
        return saveSettings({ ...settings, toolPermissions: permissions });
    });
    ipcMain.handle('tool-permissions-set-global', async (_event, updates) => {
        const settings = loadSettings();
        const permissions = normalizePermissions({ ...settings.toolPermissions, ...updates });
        return saveSettings({ ...settings, toolPermissions: permissions });
    });
    ipcMain.handle('tool-permissions-reset', async () => {
        const settings = loadSettings();
        return saveSettings({ ...settings, toolPermissions: normalizePermissions() });
    });
}

module.exports = { initializeToolPermissionHandlers, normalizePermissions, resolvePermission, toolKey };

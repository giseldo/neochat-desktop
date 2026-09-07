const {
  assertCallId,
  assertSessionId,
  validateAgentOptions,
  validateMessage
} = require('./ipcValidation');

function registerAgentIpcHandlers({ ipcMain, runtime, loadSettings, getMcpState, selectWorkspace }) {
  const sessionOwners = new Map();

  const claimSession = (event, sessionId) => {
    const ownerId = sessionOwners.get(sessionId);
    if (ownerId !== undefined && ownerId !== event.sender.id) throw new Error('Agent session belongs to another renderer.');
    sessionOwners.set(sessionId, event.sender.id);
  };
  const requireOwner = (event, sessionId) => {
    if (sessionOwners.get(sessionId) !== event.sender.id) throw new Error('Renderer is not authorized for this agent session.');
  };

  ipcMain.handle('agent:create-session', async (event, options = {}) => {
    const session = runtime.createSession(validateAgentOptions(options));
    claimSession(event, session.sessionId);
    return { sessionId: session.sessionId, workspaceRoot: session.workspaceRoot };
  });

  ipcMain.handle('agent:prompt', async (event, sessionId, userMessage, options = {}) => {
    assertSessionId(sessionId);
    validateMessage(userMessage);
    const validatedOptions = validateAgentOptions(options);
    claimSession(event, sessionId);
    const { discoveredTools, mcpClients } = getMcpState();
    const unsubscribe = runtime.subscribe(sessionId, data => {
      if (event.sender && !event.sender.isDestroyed()) event.sender.send('agent:event', data);
    });
    try {
      return await runtime.prompt(sessionId, userMessage, {
        ...validatedOptions,
        settings: { ...loadSettings(), ...(validatedOptions.settings || {}) },
        mcpClients,
        discoveredTools
      });
    } finally {
      unsubscribe();
    }
  });

  ipcMain.handle('agent:approve-tool', async (event, sessionId, callId, alwaysAllow) => {
    assertSessionId(sessionId);
    assertCallId(callId);
    requireOwner(event, sessionId);
    return runtime.approveTool(sessionId, callId, alwaysAllow);
  });
  ipcMain.handle('agent:reject-tool', async (event, sessionId, callId, reason) => {
    assertSessionId(sessionId);
    assertCallId(callId);
    requireOwner(event, sessionId);
    return runtime.rejectTool(sessionId, callId, reason);
  });
  ipcMain.handle('agent:cancel', async (event, sessionId) => {
    assertSessionId(sessionId);
    requireOwner(event, sessionId);
    runtime.cancel(sessionId);
    return { success: true };
  });
  ipcMain.handle('agent:rollback', async (event, sessionId) => {
    assertSessionId(sessionId);
    requireOwner(event, sessionId);
    return runtime.rollback(sessionId);
  });
  ipcMain.handle('agent:get-workspace-info', async (_event, workspaceRoot) => runtime.getWorkspaceInfo(workspaceRoot));
  ipcMain.handle('agent:get-workspace-tree', async (_event, workspaceRoot, options = {}) => {
    return runtime.getWorkspaceTree(workspaceRoot, options);
  });
  ipcMain.handle('agent:read-workspace-file', async (_event, workspaceRoot, filePath) => {
    return runtime.readWorkspaceFile(workspaceRoot, filePath);
  });
  ipcMain.handle('agent:reveal-in-explorer', async (_event, targetPath) => {
    if (!targetPath || typeof targetPath !== 'string') return { success: false, error: 'Invalid path' };
    const { shell } = require('electron');
    if (shell?.showItemInFolder) {
      shell.showItemInFolder(targetPath);
      return { success: true };
    }
    return { success: false, error: 'Shell not available' };
  });
  ipcMain.handle('agent:open-path', async (_event, folderPath) => {
    if (!folderPath || typeof folderPath !== 'string') return { success: false, error: 'Invalid path' };
    const { shell } = require('electron');
    if (shell?.openPath) {
      const err = await shell.openPath(folderPath);
      return { success: !err, error: err };
    }
    return { success: false, error: 'Shell not available' };
  });
  ipcMain.handle('agent:list-harnesses', async () => runtime.listHarnesses());
  ipcMain.handle('agent:get-session', async (event, sessionId) => {
    assertSessionId(sessionId);
    requireOwner(event, sessionId);
    return runtime.getSessionSnapshot(sessionId);
  });
  ipcMain.handle('agent:get-trajectory', async (event, sessionId, options = {}) => {
    assertSessionId(sessionId);
    requireOwner(event, sessionId);
    return runtime.getTrajectory(sessionId, options);
  });
  ipcMain.handle('agent:select-workspace', async () => selectWorkspace());

  return { sessionOwners };
}

module.exports = { registerAgentIpcHandlers };

const assert = require('assert');
const fs = require('fs');
const { registerAgentIpcHandlers } = require('./electron/agent/ipcHandlers');

async function run() {
  const handlers = new Map();
  const ipcMain = { handle: (channel, handler) => handlers.set(channel, handler) };
  const events = [];
  let unsubscribed = false;
  let promptOptions;
  const runtime = {
    createSession: options => ({ sessionId: options.sessionId || 'session-created', workspaceRoot: options.workspaceRoot }),
    subscribe: (_sessionId, callback) => {
      callback({ type: 'state', state: 'running' });
      return () => { unsubscribed = true; };
    },
    prompt: async (_sessionId, message, options) => {
      promptOptions = options;
      return { message };
    },
    approveTool: () => true,
    rejectTool: () => true,
    cancel: () => {},
    rollback: () => ({ success: true }),
    getWorkspaceInfo: workspaceRoot => ({ root: workspaceRoot }),
    listHarnesses: () => [{ id: 'native' }, { id: 'pi' }],
    getSessionSnapshot: sessionId => ({ sessionId }),
    getTrajectory: sessionId => [{ sessionId }]
  };

  registerAgentIpcHandlers({
    ipcMain,
    runtime,
    loadSettings: () => ({ persisted: true, overridden: false }),
    getMcpState: () => ({ discoveredTools: ['tool'], mcpClients: { local: {} } }),
    selectWorkspace: async () => ({ canceled: true })
  });

  const expectedChannels = [
    'agent:create-session', 'agent:prompt', 'agent:approve-tool', 'agent:reject-tool',
    'agent:cancel', 'agent:rollback', 'agent:get-workspace-info', 'agent:list-harnesses', 'agent:get-session',
    'agent:get-trajectory', 'agent:select-workspace'
  ];
  assert.deepStrictEqual([...handlers.keys()], expectedChannels);
  const preloadSource = fs.readFileSync(require.resolve('./electron/preload.js'), 'utf8');
  for (const channel of expectedChannels) assert.ok(preloadSource.includes(channel), `Preload is missing ${channel}`);

  const sender = { id: 7, isDestroyed: () => false, send: (channel, data) => events.push({ channel, data }) };
  const otherSender = { id: 8, isDestroyed: () => false, send: () => {} };
  const event = { sender };
  const session = await handlers.get('agent:create-session')(event, { sessionId: 'session-ipc', workspaceRoot: process.cwd() });
  assert.strictEqual(session.sessionId, 'session-ipc');
  await assert.rejects(() => handlers.get('agent:get-session')({ sender: otherSender }, 'session-ipc'), /not authorized/);

  const result = await handlers.get('agent:prompt')(event, 'session-ipc', 'hello', { settings: { overridden: true } });
  assert.strictEqual(result.message, 'hello');
  assert.strictEqual(promptOptions.settings.persisted, true);
  assert.strictEqual(promptOptions.settings.overridden, true);
  assert.deepStrictEqual(promptOptions.discoveredTools, ['tool']);
  assert.strictEqual(unsubscribed, true);
  assert.strictEqual(events[0].channel, 'agent:event');

  await assert.rejects(() => handlers.get('agent:prompt')(event, '../invalid', 'hello'), /Invalid agent session ID/);
  await assert.rejects(() => handlers.get('agent:approve-tool')(event, 'session-ipc', ''), /Invalid tool call ID/);
  console.log('Agent IPC contract tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

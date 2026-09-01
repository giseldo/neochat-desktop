const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveWorkspacePath } = require('./electron/agent/pathPolicy');
const { ToolExecutor } = require('./electron/agent/toolExecutor');
const { PermissionEngine, PERMISSION_DECISION, getApprovalScope } = require('./electron/agent/permissionEngine');
const { validateAgentOptions, validateMessage, assertSessionId } = require('./electron/agent/ipcValidation');

async function run() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-security-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-outside-'));
  fs.writeFileSync(path.join(workspace, 'inside.txt'), 'inside');
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'secret');

  try {
    assert.strictEqual(resolveWorkspacePath(workspace, 'inside.txt', { mustExist: true }), path.join(workspace, 'inside.txt'));
    assert.throws(() => resolveWorkspacePath(workspace, '../secret.txt'), /outside the authorized workspace/);
    assert.throws(() => resolveWorkspacePath(workspace, path.join(outside, 'secret.txt')), /outside the authorized workspace/);

    const executor = new ToolExecutor();
    const escapedRead = await executor.execute({
      sessionId: 'security-test',
      workspaceRoot: workspace,
      toolCall: {
        id: 'call-read-escape',
        function: { name: 'read_file', arguments: JSON.stringify({ path: path.join(outside, 'secret.txt') }) }
      }
    });
    assert.match(escapedRead.error, /outside the authorized workspace/);

    const escapedWrite = await executor.execute({
      sessionId: 'security-test',
      workspaceRoot: workspace,
      toolCall: {
        id: 'call-write-escape',
        function: { name: 'write_file', arguments: JSON.stringify({ path: '../escaped.txt', content: 'nope' }) }
      }
    });
    assert.match(escapedWrite.error, /outside the authorized workspace/);
    assert.strictEqual(fs.existsSync(path.join(path.dirname(workspace), 'escaped.txt')), false);

    const permissions = new PermissionEngine();
    const first = { id: 'call-1', function: { name: 'shell_exec', arguments: JSON.stringify({ command: 'pnpm test' }) } };
    const second = { id: 'call-2', function: { name: 'shell_exec', arguments: JSON.stringify({ command: 'git push' }) } };
    assert.notStrictEqual(getApprovalScope(first), getApprovalScope(second));
    assert.strictEqual(permissions.evaluate('session-a', first).decision, PERMISSION_DECISION.PROMPT);
    const pending = permissions.requestApproval('session-a', first, 1000);
    assert.strictEqual(permissions.approve('session-b', first.id, true), false, 'another session must not approve the call');
    assert.strictEqual(permissions.approve('session-a', first.id, true), true);
    await pending;
    assert.strictEqual(permissions.evaluate('session-a', first).decision, PERMISSION_DECISION.ALLOW);
    assert.strictEqual(permissions.evaluate('session-a', second).decision, PERMISSION_DECISION.PROMPT);

    assertSessionId('session_123:child');
    assert.throws(() => assertSessionId('../invalid'));
    assert.strictEqual(validateMessage('hello'), 'hello');
    assert.throws(() => validateMessage(''));
    assert.throws(() => validateAgentOptions({ workspaceRoot: 'relative/path' }));

    console.log('Agent security boundary tests passed.');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveWorkspacePath } = require('./electron/agent/pathPolicy');
const { ToolExecutor } = require('./electron/agent/toolExecutor');
const { PermissionEngine, PERMISSION_DECISION, getApprovalScope, requiresElevatedApproval } = require('./electron/agent/permissionEngine');
const { validateAgentOptions, validateMessage, assertSessionId } = require('./electron/agent/ipcValidation');
const { buildRestrictedEnv, validateCommand, validateDirectProcess } = require('./electron/agent/processPolicy');
const { ShellSession } = require('./electron/agent/shellManager');

async function run() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-security-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-outside-'));
  fs.writeFileSync(path.join(workspace, 'inside.txt'), 'inside');
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'secret');

  try {
    assert.strictEqual(
      resolveWorkspacePath(workspace, 'inside.txt', { mustExist: true }),
      fs.realpathSync.native(path.join(workspace, 'inside.txt'))
    );
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

    const directTool = await executor.execute({
      sessionId: 'security-test',
      workspaceRoot: workspace,
      settings: { agentExecutableAllowlist: ['node'] },
      toolCall: {
        id: 'call-direct-process',
        function: { name: 'process_exec', arguments: JSON.stringify({ executable: 'node', arguments: ['-e', 'process.stdout.write("direct")'] }) }
      }
    });
    assert.strictEqual(directTool.exitCode, 0);
    assert.match(directTool.result, /direct/);

    const forbiddenTool = await executor.execute({
      sessionId: 'security-test',
      workspaceRoot: workspace,
      settings: { agentExecutableAllowlist: ['node'] },
      toolCall: {
        id: 'call-forbidden-process',
        function: { name: 'process_exec', arguments: JSON.stringify({ executable: 'python', arguments: ['--version'] }) }
      }
    });
    assert.match(forbiddenTool.error, /allowlist/);

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

    const restrictedEnv = buildRestrictedEnv({ PATH: process.env.PATH || '', GROQ_API_KEY: 'secret', CUSTOM_SAFE: 'allowed' }, ['CUSTOM_SAFE']);
    assert.strictEqual(restrictedEnv.GROQ_API_KEY, undefined);
    assert.strictEqual(restrictedEnv.CUSTOM_SAFE, 'allowed');
    assert.throws(() => validateCommand('git push origin main'), /network access/);
    assert.doesNotThrow(() => validateCommand('git push origin main', { networkAccess: true }));
    assert.throws(() => validateCommand('node -e "fetch(\'https://example.com\')"'), /network access/);
    assert.throws(() => validateCommand('shutdown /s'), /administration commands/);
    assert.doesNotThrow(() => validateCommand('pnpm run format'));
    assert.doesNotThrow(() => validateDirectProcess('node', ['--version'], { allowedExecutables: ['node'] }));
    assert.throws(() => validateDirectProcess('python', ['--version'], { allowedExecutables: ['node'] }), /allowlist/);
    assert.strictEqual(requiresElevatedApproval({ function: { name: 'process_exec', arguments: '{"executable":"node","network_access":true}' } }), true);
    assert.strictEqual(restrictedEnv.HTTP_PROXY, 'http://127.0.0.1:9');

    process.env.NEOCHAT_TEST_SECRET = 'must-not-leak';
    const shell = new ShellSession('security-shell', workspace);
    const envResult = await shell.exec('node -e "process.stdout.write(process.env.NEOCHAT_TEST_SECRET || \'filtered\')"');
    delete process.env.NEOCHAT_TEST_SECRET;
    assert.strictEqual(envResult.stdout, 'filtered');

    const directResult = await shell.execFile('node', ['-e', 'process.stdout.write(process.argv[1])', 'literal;not-a-shell'], {
      allowedExecutables: ['node']
    });
    assert.strictEqual(directResult.stdout, 'literal;not-a-shell');

    const cappedResult = await shell.exec('node -e "process.stdout.write(\'x\'.repeat(50000))"', { maxOutputBytes: 16384 });
    assert.strictEqual(cappedResult.exitCode, 125);
    assert.match(cappedResult.stderr, /exceeding 16384 output bytes/);

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

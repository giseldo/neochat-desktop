/**
 * Automated test suite for the Neo Agent Runtime.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
  neoAgentRuntime,
  workspaceManager,
  toolRegistry,
  toolExecutor,
  permissionEngine,
  checkpointsManager,
  shellManager,
  AGENT_STATES,
  AGENT_EVENTS
} = require('./electron/agent');

async function runTests() {
  console.log('--- [Test Suite] Neo Agent Runtime ---');

  // Test 1: Workspace Intelligence
  console.log('\n[1] Testing WorkspaceManager...');
  const wsInfo = await workspaceManager.inspectWorkspace(process.cwd());
  assert(wsInfo.exists, 'Workspace should exist');
  assert.strictEqual(wsInfo.projectType, 'node', 'Project type should be node');
  assert(wsInfo.agentsDoc !== null, 'AGENTS.md should be detected');
  assert(wsInfo.manifest && wsInfo.manifest.name === 'neochat-desktop', 'package.json should be parsed');
  console.log('   ✓ Workspace detected:', wsInfo.name, `(${wsInfo.projectType}) with`, wsInfo.agentsDoc.filename);

  const contextStr = await workspaceManager.buildWorkspaceContextString(process.cwd());
  assert(contextStr.includes('neochat-desktop'), 'Context string should include package name');
  assert(contextStr.includes('AGENTS.md'), 'Context string should include AGENTS.md');
  console.log('   ✓ Context string generated successfully (length:', contextStr.length, 'chars)');

  // Test 2: Tool Registry
  console.log('\n[2] Testing ToolRegistry...');
  const codeTools = toolRegistry.getFormattedTools({ mode: 'code', agentMode: true });
  const toolNames = codeTools.map(t => t.function.name);
  assert(toolNames.includes('read_file'), 'Should include read_file');
  assert(toolNames.includes('write_file'), 'Should include write_file');
  assert(toolNames.includes('edit_file'), 'Should include edit_file');
  assert(toolNames.includes('shell_exec'), 'Should include shell_exec');
  assert(toolNames.includes('git_status'), 'Should include git_status');
  console.log('   ✓ Registered tools for Code mode:', toolNames.length, 'tools');

  // Test 3: Tool Executor (Native FS & Checkpoints)
  console.log('\n[3] Testing ToolExecutor (Filesystem & Checkpoints)...');
  const tempTestFile = path.join(process.cwd(), 'temp-runtime-test.txt');
  
  // Write file
  const writeRes = await toolExecutor.execute({
    sessionId: 'test_session',
    toolCall: {
      id: 'call_1',
      function: {
        name: 'write_file',
        arguments: JSON.stringify({ path: 'temp-runtime-test.txt', content: 'Line 1: Hello\nLine 2: Neo\nLine 3: Runtime' })
      }
    },
    workspaceRoot: process.cwd()
  });
  assert(!writeRes.error, `write_file failed: ${writeRes.error}`);
  assert(fs.existsSync(tempTestFile), 'temp file should exist on disk');
  console.log('   ✓ write_file executed successfully');

  // Read file with line range
  const readRes = await toolExecutor.execute({
    sessionId: 'test_session',
    toolCall: {
      id: 'call_2',
      function: {
        name: 'read_file',
        arguments: JSON.stringify({ path: 'temp-runtime-test.txt', start_line: 2, end_line: 2 })
      }
    },
    workspaceRoot: process.cwd()
  });
  assert(!readRes.error, `read_file failed: ${readRes.error}`);
  assert(readRes.result.includes('Line 2: Neo'), 'read_file line range should contain Line 2');
  console.log('   ✓ read_file with line ranges executed successfully');

  // Edit file
  const editRes = await toolExecutor.execute({
    sessionId: 'test_session',
    toolCall: {
      id: 'call_3',
      function: {
        name: 'edit_file',
        arguments: JSON.stringify({
          path: 'temp-runtime-test.txt',
          target_content: 'Line 2: Neo',
          replacement_content: 'Line 2: Neo Agent Harness'
        })
      }
    },
    workspaceRoot: process.cwd()
  });
  assert(!editRes.error, `edit_file failed: ${editRes.error}`);
  const editedContent = fs.readFileSync(tempTestFile, 'utf8');
  assert(editedContent.includes('Line 2: Neo Agent Harness'), 'edit_file should have modified the content');
  console.log('   ✓ edit_file exact block replacement executed successfully');

  // Checkpoint Rollback
  const rollbackRes = checkpointsManager.rollbackLastAction('test_session');
  assert(rollbackRes.success, `rollback failed: ${rollbackRes.error}`);
  const restoredContent = fs.readFileSync(tempTestFile, 'utf8');
  assert(restoredContent.includes('Line 2: Neo') && !restoredContent.includes('Neo Agent Harness'), 'rollback should restore previous content');
  console.log('   ✓ Checkpoint rollback restored previous file state');

  // Cleanup test file
  if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);

  // Test 4: Grep and Glob search
  console.log('\n[4] Testing Grep & Glob Search...');
  const globRes = await toolExecutor.execute({
    sessionId: 'test_session',
    toolCall: {
      id: 'call_4',
      function: {
        name: 'glob_search',
        arguments: JSON.stringify({ pattern: 'AGENTS.md' })
      }
    },
    workspaceRoot: process.cwd()
  });
  assert(!globRes.error, `glob_search failed: ${globRes.error}`);
  assert(globRes.result.includes('AGENTS.md'), 'glob_search should find AGENTS.md');
  console.log('   ✓ glob_search found matching files');

  const grepRes = await toolExecutor.execute({
    sessionId: 'test_session',
    toolCall: {
      id: 'call_5',
      function: {
        name: 'grep_search',
        arguments: JSON.stringify({ query: 'neochat-desktop' })
      }
    },
    workspaceRoot: process.cwd()
  });
  assert(!grepRes.error, `grep_search failed: ${grepRes.error}`);
  console.log('   ✓ grep_search returned results');

  // Test 5: Shell Manager
  console.log('\n[5] Testing ShellManager...');
  const shellRes = await shellManager.exec('test_shell', 'node -v', { cwd: process.cwd() });
  assert.strictEqual(shellRes.exitCode, 0, 'Shell command should succeed');
  assert(shellRes.stdout.startsWith('v'), 'node -v should return version string');
  console.log('   ✓ shellManager executed command (output:', shellRes.stdout, `in ${shellRes.durationMs}ms)`);

  // Test 6: Runtime Session & EventBus
  console.log('\n[6] Testing NeoAgentRuntime Facade & EventBus...');
  const session = neoAgentRuntime.createSession({ sessionId: 'session_unit_test', workspaceRoot: process.cwd() });
  assert.strictEqual(session.sessionId, 'session_unit_test');
  
  let capturedStateChange = null;
  session.eventBus.on(AGENT_EVENTS.STATE_CHANGE, (data) => {
    capturedStateChange = data;
  });

  session.eventBus.emitStateChange(AGENT_STATES.IDLE, AGENT_STATES.THINKING, { test: true });
  assert(capturedStateChange !== null, 'State change event should be received');
  assert.strictEqual(capturedStateChange.toState, AGENT_STATES.THINKING);
  console.log('   ✓ EventBus emitted state change event correctly');

  // Test 7: Permission Engine
  console.log('\n[7] Testing PermissionEngine...');
  const safeEval = permissionEngine.evaluate('session_unit_test', {
    function: { name: 'read_file' }
  });
  assert.strictEqual(safeEval.decision, 'allow', 'read_file should be allowed by default');

  const mutatingEval = permissionEngine.evaluate('session_unit_test', {
    function: { name: 'shell_exec' }
  });
  assert.strictEqual(mutatingEval.decision, 'prompt', 'shell_exec should prompt by default');
  console.log('   ✓ PermissionEngine accurately evaluates safe vs mutating tools');

  console.log('\n========================================');
  console.log('🎉 ALL 7 TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

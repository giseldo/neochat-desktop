/**
 * Automated test suite for Terminal, Browser, and Background Tasks in NeoChat Desktop.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { terminalManager } = require('../electron/terminalManager');
const { taskManager } = require('../electron/taskManager');
const { browserManager } = require('../electron/browserManager');
const { toolRegistry } = require('../electron/agent/toolRegistry');
const { toolExecutor } = require('../electron/agent/toolExecutor');

async function runTests() {
  console.log('--- [Test Suite] Terminal, Browser & Background Tasks ---');

  // Test 1: TerminalManager
  console.log('\n[1] Testing TerminalManager...');
  terminalManager.initialize();
  const sessions = terminalManager.listSessions();
  assert(sessions.length >= 1, 'Should have at least 1 initial session');
  console.log('   ✓ Initial session initialized:', sessions[0].name, `(${sessions[0].id})`);

  const createdSession = terminalManager.createSession({ id: 'test-term-tab', name: 'Test PowerShell' });
  assert.strictEqual(createdSession.id, 'test-term-tab', 'Created session ID should match');
  console.log('   ✓ New terminal tab session created successfully');

  // Exec command in terminal
  let streamReceived = false;
  const unsubData = terminalManager.onData((data) => {
    if (data.sessionId === 'test-term-tab') streamReceived = true;
  });

  const isWindows = process.platform === 'win32';
  const testCmd = isWindows ? 'Write-Output "Neo Terminal Online"' : 'echo "Neo Terminal Online"';
  const execRes = await terminalManager.exec('test-term-tab', testCmd);
  assert.strictEqual(execRes.exitCode, 0, 'Command execution exit code should be 0');
  assert(execRes.stdout.includes('Neo Terminal Online'), 'Output should include text');
  assert(streamReceived, 'Streaming onData listener should receive output chunks');
  console.log('   ✓ Terminal command execution and streaming passed');

  unsubData();
  terminalManager.destroySession('test-term-tab');
  assert(!terminalManager.getSession('test-term-tab'), 'Session should be destroyed');
  console.log('   ✓ Terminal session cleanup verified');

  // Test 2: TaskManager (Background Tasks)
  console.log('\n[2] Testing TaskManager (Background Tasks)...');
  let taskStartedEvent = false;
  let taskCompletedEvent = false;
  const unsubTask = taskManager.onUpdate((event, data) => {
    if (event === 'task:started') taskStartedEvent = true;
    if (event === 'task:completed') taskCompletedEvent = true;
  });

  const bgTask = taskManager.runTask({
    name: 'Verify build script in background',
    command: isWindows ? 'Write-Output "Background task completed successfully"' : 'echo "Background task completed successfully"',
    cwd: process.cwd()
  });

  assert(bgTask.id, 'Task ID should be generated');
  assert.strictEqual(bgTask.name, 'Verify build script in background');
  console.log('   ✓ Task registered with ID:', bgTask.id);

  // Wait for background process to finish
  await new Promise(r => setTimeout(r, 1200));

  const taskFromList = taskManager.getTask(bgTask.id);
  assert(taskFromList, 'Task should be found in manager');
  assert.strictEqual(taskFromList.status, 'completed', 'Task status should be completed');
  assert(taskStartedEvent, 'task:started event should fire');
  assert(taskCompletedEvent, 'task:completed event should fire');
  console.log('   ✓ Task completed with exitCode:', taskFromList.exitCode, `in ${taskFromList.durationMs}ms`);

  const logs = taskManager.getTaskLogs(bgTask.id);
  assert(logs.length > 0, 'Task logs should contain output');
  assert(logs.some(l => l.text.includes('Background task completed')), 'Log text should match output');
  console.log('   ✓ Task logs verified:', logs.length, 'log entries');

  unsubTask();

  // Test 3: BrowserManager
  console.log('\n[3] Testing BrowserManager...');
  const normalizedPort = browserManager.normalizeUrl('8080');
  assert.strictEqual(normalizedPort, 'http://localhost:8080', 'Port should resolve to http://localhost:8080');

  const normalizedDomain = browserManager.normalizeUrl('groq.com');
  assert.strictEqual(normalizedDomain, 'https://groq.com', 'Domain should resolve to https://');
  console.log('   ✓ URL normalization passed');

  // Test 4: Tool Registry & Agent Tool Execution
  console.log('\n[4] Testing ToolRegistry & ToolExecutor...');
  const formattedTools = toolRegistry.getFormattedTools({ mode: 'code', agentMode: true });
  const toolNames = formattedTools.map(t => t.function.name);
  assert(toolNames.includes('run_background_task'), 'Should include run_background_task');
  assert(toolNames.includes('list_background_tasks'), 'Should include list_background_tasks');
  assert(toolNames.includes('kill_background_task'), 'Should include kill_background_task');
  assert(toolNames.includes('read_url_content'), 'Should include read_url_content');
  console.log('   ✓ All new native tools found in ToolRegistry');

  // Execute list_background_tasks via ToolExecutor
  const listRes = await toolExecutor.execute({
    sessionId: 'test_agent_session',
    toolCall: {
      id: 'call_list_bg_tasks',
      function: {
        name: 'list_background_tasks',
        arguments: '{}'
      }
    },
    workspaceRoot: process.cwd()
  });
  assert(!listRes.error, `Tool execution error: ${listRes.error}`);
  assert(listRes.result.includes('Verify build script in background'), 'Tool result should contain listed task');
  console.log('   ✓ Agent tool list_background_tasks executed successfully');

  // Clear completed tasks
  const cleared = taskManager.clearCompletedTasks();
  console.log('   ✓ clearCompletedTasks verified, remaining active tasks:', cleared.length);

  console.log('\n========================================');
  console.log('🎉 ALL TERMINAL, BROWSER & TASK TESTS PASSED!');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});

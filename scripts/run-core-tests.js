const path = require('path');
const { spawnSync } = require('child_process');

const testsDir = path.join(__dirname, '..', 'tests');

const tests = [
  'test-agent-security.js',
  'test-agent-runtime.js',
  'test-agent-runtime-flow.js',
  'test-agent-persistence.js',
  'test-agent-ipc-contract.js',
  'test-agent-harnesses.js',
  'test-swarm-manager.js',
  'test-tool-permissions.js',
  'test-provider-fallback.js',
  'test-interface-mode.js',
  'test-chat-branching.js',
  'test-workflows.js',
  'test-scheduler.js',
  'test-rag-incremental.js',
  'test-rag-hybrid.js',
  'test-git-manager.js',
  'test-config-dir.js',
  'test-canvas.js',
  'test-browser-panel.js',
  'test-plugin-manager.js',
  'test-external-plugins.js',
  'test-mcp-registry.js',
  'test-assistants.js',
  'test-skills.js',
  'test-terminal-and-tasks.js',
  'test-default-model-empty.js'
];

for (const test of tests) {
  console.log(`\n=== ${test} ===`);
  const testPath = path.join(testsDir, test);
  const result = spawnSync(process.execPath, [testPath], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`\nAll ${tests.length} core test files passed.`);

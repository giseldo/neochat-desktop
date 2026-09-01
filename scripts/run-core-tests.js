const { spawnSync } = require('child_process');

const tests = [
  'test-agent-security.js',
  'test-agent-runtime.js',
  'test-agent-runtime-flow.js',
  'test-agent-persistence.js',
  'test-swarm-manager.js',
  'test-tool-permissions.js',
  'test-provider-fallback.js',
  'test-interface-mode.js',
  'test-chat-branching.js',
  'test-workflows.js',
  'test-scheduler.js',
  'test-rag-incremental.js',
  'test-git-manager.js',
  'test-config-dir.js',
  'test-canvas.js',
  'test-browser-panel.js',
  'test-plugin-manager.js',
  'test-terminal-and-tasks.js'
];

for (const test of tests) {
  console.log(`\n=== ${test} ===`);
  const result = spawnSync(process.execPath, [test], { stdio: 'inherit', cwd: process.cwd() });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`\nAll ${tests.length} core test files passed.`);

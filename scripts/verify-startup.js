const assert = require('assert');
const { spawnSync } = require('child_process');

const syntaxTargets = ['electron/main.js', 'electron/preload.js'];
for (const target of syntaxTargets) {
  const result = spawnSync(process.execPath, ['--check', target], { cwd: process.cwd(), encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr || `Syntax check failed for ${target}`);
}

const modules = [
  '../electron/agent',
  '../electron/agent/ipcHandlers',
  '../electron/agent/processPolicy',
  '../electron/agent/sessionStore',
  '../electron/taskManager'
];
for (const modulePath of modules) assert.doesNotThrow(() => require(modulePath));

const packageJson = require('../package.json');
assert.strictEqual(packageJson.main, 'electron/main.js');
assert.match(packageJson.engines.node, /^>=22/);
console.log('Main-process startup module checks passed.');

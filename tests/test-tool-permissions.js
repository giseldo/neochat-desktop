const assert = require('assert');
const {
    normalizePermissions,
    resolvePermission,
    toolKey
} = require('../electron/toolPermissionManager');

assert.deepStrictEqual(normalizePermissions(), {
    defaultPolicy: 'prompt',
    tools: {},
    allowAll: false
});
assert.strictEqual(toolKey('write_file', 'filesystem'), 'filesystem/write_file');
assert.strictEqual(resolvePermission({ tools: { read_file: 'allow' } }, 'read_file'), 'allow');
assert.strictEqual(resolvePermission({ tools: { 'filesystem/write_file': 'deny', write_file: 'allow' } }, 'write_file', 'filesystem'), 'deny');
assert.strictEqual(resolvePermission({ defaultPolicy: 'deny' }, 'unknown'), 'deny');
assert.strictEqual(resolvePermission({ allowAll: true, tools: { dangerous: 'deny' } }, 'dangerous'), 'allow');
assert.strictEqual(resolvePermission({ defaultPolicy: 'invalid', tools: { bad: 'invalid' } }, 'bad'), 'prompt');

console.log('Tool permission policy tests passed.');

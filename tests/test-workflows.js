const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const workflows = require('../electron/workflowManager');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-workflows-'));
try {
    workflows.initialize({ getPath: () => tempDir });
    const created = workflows.save({ name: 'Release', description: 'Prepare release', steps: ['Review {{target}}', 'Publish'] });
    assert.ok(created.id);
    assert.strictEqual(workflows.readAll().length, 1);
    const prompt = workflows.buildExecutionPrompt(created, { target: 'main' });
    assert.ok(prompt.includes('Etapa 1: Review main'));
    assert.ok(prompt.includes('Etapa 2: Publish'));
    const updated = workflows.save({ ...created, name: 'Release v2', steps: ['Test'] });
    assert.strictEqual(updated.id, created.id);
    assert.strictEqual(workflows.readAll()[0].name, 'Release v2');
    assert.throws(() => workflows.save({ name: '', steps: [] }), /name is required/);
    assert.strictEqual(workflows.remove(created.id), true);
    assert.strictEqual(workflows.readAll().length, 0);
    console.log('Workflow tests passed.');
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}

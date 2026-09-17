const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const scheduler = require('../electron/schedulerManager');

const base = new Date('2026-08-25T10:00:00.000Z');
assert.strictEqual(scheduler.nextRun({ type: 'interval', intervalMinutes: 30 }, base), '2026-08-25T10:30:00.000Z');
const daily = scheduler.nextRun({ type: 'daily', time: '09:00' }, base);
assert.ok(new Date(daily) > base);
assert.throws(() => scheduler.normalize({ type: 'daily' }), /Workflow is required/);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-schedules-'));
const handlers = new Map();
try {
    scheduler.initializeHandlers(
        { handle: (name, handler) => handlers.set(name, handler) },
        { getPath: () => tempDir },
        () => null,
        { readAll: () => [], buildExecutionPrompt: () => '' },
        null
    );
    const result = handlers.get('schedules-save')({}, { workflowId: 'workflow-1', type: 'interval', intervalMinutes: 15 });
    assert.strictEqual(result.success, true);
    assert.strictEqual(handlers.get('schedules-list')().length, 1);
    assert.strictEqual(handlers.get('schedules-delete')({}, result.schedule.id).success, true);
    assert.strictEqual(handlers.get('schedules-list')().length, 0);
    console.log('Scheduler tests passed.');
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}

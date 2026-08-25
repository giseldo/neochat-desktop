const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildBackup, restoreBackup, validateBackup } = require('./electron/backupManager');

const source = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-backup-source-'));
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-backup-target-'));
try {
    fs.mkdirSync(path.join(source, 'chat-history'));
    const chat = { id: 'chat-1', title: 'Test', messages: [{ role: 'user', content: 'hello' }] };
    fs.writeFileSync(path.join(source, 'chat-history', 'chat-1.json'), JSON.stringify(chat));
    fs.writeFileSync(path.join(source, 'projects.json'), JSON.stringify([{ id: 'project-1', name: 'Project' }]));

    const backup = buildBackup(source, { interfaceMode: 'power', apiKeys: { groq: 'secret' }, webSearch: { apiKey: 'secret-2' } });
    validateBackup(backup);
    assert.strictEqual(backup.chats.length, 1);
    assert.strictEqual(backup.settings.apiKeys, undefined);
    assert.strictEqual(backup.settings.webSearch.apiKey, undefined);

    fs.mkdirSync(path.join(target, 'chat-history'));
    fs.writeFileSync(path.join(target, 'chat-history', 'old.json'), JSON.stringify({ id: 'old', messages: [] }));
    const restored = restoreBackup(target, backup, { apiKeys: { groq: 'keep-me' }, language: 'pt' });
    assert.strictEqual(restored.settings.apiKeys.groq, 'keep-me');
    assert.strictEqual(restored.settings.interfaceMode, 'power');
    assert.ok(fs.existsSync(path.join(target, 'chat-history', 'chat-1.json')));
    assert.ok(fs.existsSync(path.join(restored.recoveryDir, 'old.json')));
    assert.throws(() => validateBackup({ format: 'wrong' }), /Unsupported/);
    console.log('Backup manager tests passed.');
} finally {
    fs.rmSync(source, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
}

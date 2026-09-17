const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const history = require('../electron/chatHistoryManager');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-branches-'));
try {
    history.initialize({ getPath: () => tempDir }, () => ({}));
    const source = history.createChat('model-a', false, 'project-a');
    history.updateChatTitle(source.id, 'Original');
    history.updateChatMessages(source.id, [
        { role: 'user', content: 'one' },
        { role: 'assistant', content: 'two' },
        { role: 'user', content: 'three' }
    ]);

    const branch = history.createChatBranch(source.id, 1);
    assert.notStrictEqual(branch.id, source.id);
    assert.strictEqual(branch.parentChatId, source.id);
    assert.strictEqual(branch.rootChatId, source.id);
    assert.strictEqual(branch.branchPoint.messageIndex, 1);
    assert.strictEqual(branch.messages.length, 2);
    assert.strictEqual(history.loadChat(source.id).messages.length, 3, 'source must remain unchanged');
    assert.throws(() => history.createChatBranch(source.id, 99), /Invalid branch point/);

    const metadata = history.listChats().find(chat => chat.id === branch.id);
    assert.strictEqual(metadata.parentChatId, source.id);
    console.log('Chat branching tests passed.');
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}

// test-chat-organization.js - Test suite for pin, archive, and chat organization features
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-test-org-'));
const mockApp = {
    getPath: (name) => {
        if (name === 'userData') return tempUserData;
        return tempUserData;
    }
};

const mockLoadSettings = () => ({
    apiKeys: { groq: 'test-key' },
    model: 'llama-3.3-70b-versatile',
});

console.log('Testing Chat Organization Features (Pin, Archive, List Metadata)...');
console.log('Temp userData path:', tempUserData);

const chatHistoryManager = require('./electron/chatHistoryManager');

// Initialize manager
chatHistoryManager.initialize(mockApp, mockLoadSettings);

async function runTests() {
    try {
        // 1. Create a test chat
        console.log('\n1. Creating test chat...');
        const chat1 = chatHistoryManager.createChat('llama-3.3-70b-versatile', false, null);
        assert.strictEqual(chat1.pinned, false, 'Initial chat should not be pinned');
        assert.strictEqual(chat1.archived, false, 'Initial chat should not be archived');
        console.log('? Chat created with pinned=false, archived=false');

        // 2. Test togglePinChat (pin)
        console.log('\n2. Testing togglePinChat (pin)...');
        const pinnedChat = chatHistoryManager.togglePinChat(chat1.id, true);
        assert(pinnedChat, 'Should return updated chat');
        assert.strictEqual(pinnedChat.pinned, true, 'Chat should be pinned');
        assert(pinnedChat.pinnedAt, 'Chat should have pinnedAt timestamp');

        // Verify disk persistence
        const reloadedPinned = chatHistoryManager.loadChat(chat1.id);
        assert.strictEqual(reloadedPinned.pinned, true, 'Disk chat should be pinned');
        assert(reloadedPinned.pinnedAt, 'Disk chat should have pinnedAt');

        // Verify listChats includes pinned metadata
        let list = chatHistoryManager.listChats();
        let listed = list.find(c => c.id === chat1.id);
        assert(listed, 'Chat should be in list');
        assert.strictEqual(listed.pinned, true, 'Listed chat should have pinned=true');
        assert(listed.pinnedAt, 'Listed chat should have pinnedAt');
        console.log('? Pinned status persisted and verified in listChats');

        // 3. Test togglePinChat (unpin toggle)
        console.log('\n3. Testing togglePinChat (unpin toggle)...');
        const unpinnedChat = chatHistoryManager.togglePinChat(chat1.id);
        assert.strictEqual(unpinnedChat.pinned, false, 'Chat should now be unpinned');
        assert.strictEqual(unpinnedChat.pinnedAt, null, 'pinnedAt should be null');
        console.log('? Unpinned toggle works correctly');

        // 4. Test toggleArchiveChat (archive)
        console.log('\n4. Testing toggleArchiveChat (archive)...');
        const archivedChat = chatHistoryManager.toggleArchiveChat(chat1.id, true);
        assert.strictEqual(archivedChat.archived, true, 'Chat should be archived');
        assert(archivedChat.archivedAt, 'Chat should have archivedAt timestamp');

        // Verify disk persistence
        const reloadedArchived = chatHistoryManager.loadChat(chat1.id);
        assert.strictEqual(reloadedArchived.archived, true, 'Disk chat should be archived');

        // Verify listChats includes archived metadata
        list = chatHistoryManager.listChats();
        listed = list.find(c => c.id === chat1.id);
        assert.strictEqual(listed.archived, true, 'Listed chat should have archived=true');
        assert(listed.archivedAt, 'Listed chat should have archivedAt');
        console.log('? Archive status persisted and verified in listChats');

        // 5. Test toggleArchiveChat (unarchive toggle)
        console.log('\n5. Testing toggleArchiveChat (unarchive toggle)...');
        const unarchivedChat = chatHistoryManager.toggleArchiveChat(chat1.id);
        assert.strictEqual(unarchivedChat.archived, false, 'Chat should now be active/unarchived');
        assert.strictEqual(unarchivedChat.archivedAt, null, 'archivedAt should be null');
        console.log('? Unarchive toggle works correctly');

        // 6. Test searchChatsContent includes pinned and archived fields
        console.log('\n6. Testing searchChatsContent metadata...');
        chatHistoryManager.updateChatTitle(chat1.id, 'An�lise Financeira');
        chatHistoryManager.togglePinChat(chat1.id, true);
        const searchResults = chatHistoryManager.searchChatsContent('Financeira');
        assert(searchResults.length > 0, 'Search should find the chat');
        assert.strictEqual(searchResults[0].pinned, true, 'Search result should have pinned=true');
        assert.strictEqual(searchResults[0].archived, false, 'Search result should have archived=false');
        console.log('? searchChatsContent metadata matches expectations');

        // Cleanup temp dir
        fs.rmSync(tempUserData, { recursive: true, force: true });
        console.log('\n? All Chat Organization tests passed successfully!');
    } catch (err) {
        console.error('\n? Test failed:', err);
        try { fs.rmSync(tempUserData, { recursive: true, force: true }); } catch (e) {}
        process.exit(1);
    }
}

runTests();

// test-clear-messages.js - Test suite for deleteAllChats and clearChatMessages
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

// Create a mock Electron App instance with a temp userData path
const tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-test-clear-'));
const mockApp = {
    getPath: (name) => {
        if (name === 'userData') return tempUserData;
        return tempUserData;
    }
};

const mockLoadSettings = () => ({
    apiKeys: { groq: 'test-key' },
    model: 'llama-3.1-8b-instant',
});

console.log('Testing deleteAllChats and clearChatMessages functionality...');
console.log('Temp userData path:', tempUserData);

const chatHistoryManager = require('../electron/chatHistoryManager');

// Initialize manager
chatHistoryManager.initialize(mockApp, mockLoadSettings);

try {
    // 1. Create multiple chats with messages
    console.log('\n1. Creating test chats with messages...');
    const chat1 = chatHistoryManager.createChat('llama-3.1-8b-instant', false, null);
    chatHistoryManager.updateChatMessages(chat1.id, [
        { role: 'user', content: 'Olá, teste 1' },
        { role: 'assistant', content: 'Resposta 1' }
    ]);

    const chat2 = chatHistoryManager.createChat('llama-3.1-8b-instant', false, null);
    chatHistoryManager.updateChatMessages(chat2.id, [
        { role: 'user', content: 'Olá, teste 2' },
        { role: 'assistant', content: 'Resposta 2' },
        { role: 'user', content: 'Mensagem adicional' }
    ]);

    const chat3 = chatHistoryManager.createChat('llama-3.1-8b-instant', false, null);

    const initialChats = chatHistoryManager.listChats();
    assert.strictEqual(initialChats.length, 3, 'Should have 3 chats created');
    console.log('✓ Created 3 chats successfully');

    // 2. Test clearChatMessages for a single chat
    console.log('\n2. Testing clearChatMessages on chat2...');
    const updatedChat2 = chatHistoryManager.clearChatMessages(chat2.id);
    assert(updatedChat2, 'Chat 2 should be returned');
    assert.strictEqual(updatedChat2.messages.length, 0, 'Chat 2 messages should be empty');
    
    // Reload from disk to verify persistence
    const reloadedChat2 = chatHistoryManager.loadChat(chat2.id);
    assert.strictEqual(reloadedChat2.messages.length, 0, 'Chat 2 messages from disk should be empty');
    console.log('✓ clearChatMessages emptied chat2 messages and persisted correctly');

    // Verify other chats are intact
    const reloadedChat1 = chatHistoryManager.loadChat(chat1.id);
    assert.strictEqual(reloadedChat1.messages.length, 2, 'Chat 1 messages should still be intact');
    console.log('✓ Chat 1 remains unaffected');

    // 3. Test deleteAllChats
    console.log('\n3. Testing deleteAllChats...');
    const deleteResult = chatHistoryManager.deleteAllChats();
    assert(deleteResult.success, 'deleteAllChats should return success: true');
    assert.strictEqual(deleteResult.count, 3, 'Should have deleted 3 chat files');

    const remainingChats = chatHistoryManager.listChats();
    assert.strictEqual(remainingChats.length, 0, 'No chats should remain');
    console.log('✓ deleteAllChats deleted all chat files successfully');

    // 4. Test deleteAllChats on an already empty directory
    console.log('\n4. Testing deleteAllChats on empty directory...');
    const deleteEmptyResult = chatHistoryManager.deleteAllChats();
    assert(deleteEmptyResult.success, 'deleteAllChats on empty dir should return success: true');
    assert.strictEqual(deleteEmptyResult.count, 0, 'Count should be 0');
    console.log('✓ deleteAllChats handles empty directory gracefully');

    console.log('\n=======================================');
    console.log('🎉 ALL CLEAR MESSAGES TESTS PASSED! 🎉');
    console.log('=======================================\n');
} finally {
    // Cleanup temp directory
    try {
        fs.rmSync(tempUserData, { recursive: true, force: true });
        console.log('Cleaned up test directory:', tempUserData);
    } catch (e) {
        console.error('Error cleaning up temp directory:', e);
    }
}

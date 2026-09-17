// test-rename-chat.js - Test suite for updateChatTitle and chat renaming
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

// Create a mock Electron App instance with a temp userData path
const tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-test-rename-'));
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

console.log('Testing updateChatTitle functionality...');
console.log('Temp userData path:', tempUserData);

const chatHistoryManager = require('../electron/chatHistoryManager');

// Initialize manager
chatHistoryManager.initialize(mockApp, mockLoadSettings);

async function runTests() {
    try {
        // 1. Create a test chat
        console.log('\n1. Creating test chat...');
        const chat = chatHistoryManager.createChat('llama-3.3-70b-versatile', false, null);
        assert.strictEqual(chat.title, 'New Chat', 'Initial title should be "New Chat"');
        console.log('✓ Initial chat created with title:', chat.title);

        // 2. Rename chat to a custom title
        console.log('\n2. Renaming chat to "Custom Analysis 2026"...');
        const updatedChat = chatHistoryManager.updateChatTitle(chat.id, 'Custom Analysis 2026');
        assert(updatedChat, 'Updated chat should be returned');
        assert.strictEqual(updatedChat.title, 'Custom Analysis 2026', 'Chat title should be updated');

        // Reload from disk to verify persistence
        const reloadedChat = chatHistoryManager.loadChat(chat.id);
        assert.strictEqual(reloadedChat.title, 'Custom Analysis 2026', 'Disk chat title should match updated title');

        // Check listChats includes the new title
        const chatsList = chatHistoryManager.listChats();
        const listedChat = chatsList.find(c => c.id === chat.id);
        assert(listedChat, 'Chat should be present in list');
        assert.strictEqual(listedChat.title, 'Custom Analysis 2026', 'Listed chat title should match updated title');
        console.log('✓ Renamed chat successfully and verified persistence on disk');

        // 3. Test trimming of whitespace
        console.log('\n3. Testing title with leading/trailing whitespace...');
        chatHistoryManager.updateChatTitle(chat.id, '   Trimmed Title   ');
        const reloadedTrimmed = chatHistoryManager.loadChat(chat.id);
        assert.strictEqual(reloadedTrimmed.title, 'Trimmed Title', 'Title should be trimmed');
        console.log('✓ Whitespace properly trimmed');

        // 4. Test empty title fallback
        console.log('\n4. Testing empty title fallback...');
        chatHistoryManager.updateChatTitle(chat.id, '   ');
        const reloadedEmpty = chatHistoryManager.loadChat(chat.id);
        assert.strictEqual(reloadedEmpty.title, 'Trimmed Title', 'Empty title should fallback to previous or default title');
        console.log('✓ Empty title properly handled');

        // 5. Test nonexistent chat ID
        console.log('\n5. Testing nonexistent chat ID...');
        const nonExistentResult = chatHistoryManager.updateChatTitle('non-existent-id-12345', 'New Title');
        assert.strictEqual(nonExistentResult, null, 'Updating non-existent chat should return null');
        console.log('✓ Non-existent chat returned null');

        // 6. Test generateChatTitle automatic fallback and extraction
        console.log('\n6. Testing generateChatTitle automatic fallback on plain string and structured message...');
        const fallbackTitle = await chatHistoryManager.generateChatTitle('Como fazer um bolo de cenoura com cobertura de chocolate');
        assert(fallbackTitle, 'Fallback title should be generated');
        assert.strictEqual(fallbackTitle, 'Como fazer um bolo de cenoura', 'Should extract first 6 words for title');
        console.log('✓ Plain string title generated:', fallbackTitle);

        const structuredTitle = await chatHistoryManager.generateChatTitle([
            { type: 'text', text: 'Análise de performance de banco de dados PostgreSQL em produção' }
        ]);
        assert(structuredTitle, 'Structured message title should be generated');
        assert.strictEqual(structuredTitle, 'Análise de performance de banco de', 'Should extract text from structured parts');
        console.log('✓ Structured message title generated:', structuredTitle);

        console.log('\n=======================================');
        console.log('🎉 ALL RENAME & TITLE TESTS PASSED! 🎉');
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
}

runTests();

// test-projects.js - Test suite for projects functionality
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

// Create a mock Electron App instance with a temp userData path
const tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-desktop-test-'));
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

console.log('Testing Projects Manager and Chat History Integration...');
console.log('Temp userData path:', tempUserData);

const projectManager = require('../electron/projectManager');
const chatHistoryManager = require('../electron/chatHistoryManager');

// Initialize managers
chatHistoryManager.initialize(mockApp, mockLoadSettings);
projectManager.initialize(mockApp, chatHistoryManager);

try {
    // 1. Create a Project
    console.log('\n1. Testing createProject...');
    const project1 = projectManager.createProject({
        name: 'Projeto de Teste',
        description: 'Descrição do projeto de teste',
        color: '#3b82f6',
        icon: '🚀',
        customPrompt: 'Você é um assistente de engenharia de software.'
    });

    assert(project1.id, 'Project should have an ID');
    assert.strictEqual(project1.name, 'Projeto de Teste');
    assert.strictEqual(project1.icon, '🚀');
    assert.strictEqual(project1.color, '#3b82f6');
    assert.strictEqual(project1.customPrompt, 'Você é um assistente de engenharia de software.');
    console.log('✓ Project created successfully:', project1.id);

    // 2. List Projects
    console.log('\n2. Testing listProjects...');
    const list = projectManager.listProjects();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, project1.id);
    console.log('✓ Projects listed correctly (count: 1)');

    // 3. Get Project
    console.log('\n3. Testing getProject...');
    const fetched = projectManager.getProject(project1.id);
    assert.strictEqual(fetched.name, 'Projeto de Teste');
    console.log('✓ Project retrieved correctly');

    // 4. Update Project
    console.log('\n4. Testing updateProject...');
    const updated = projectManager.updateProject(project1.id, {
        name: 'Projeto Atualizado',
        color: '#10b981'
    });
    assert.strictEqual(updated.name, 'Projeto Atualizado');
    assert.strictEqual(updated.color, '#10b981');
    assert.strictEqual(updated.icon, '🚀'); // unchanged
    console.log('✓ Project updated successfully');

    // 5. Create Chat assigned to Project
    console.log('\n5. Testing createChat with projectId...');
    const chat1 = chatHistoryManager.createChat('llama-3.1-8b-instant', false, project1.id);
    assert.strictEqual(chat1.projectId, project1.id);
    console.log('✓ Chat created with projectId:', chat1.id, '->', chat1.projectId);

    // 6. List chats and verify projectId metadata
    console.log('\n6. Testing listChats with projectId metadata...');
    const chats = chatHistoryManager.listChats();
    assert.strictEqual(chats.length, 1);
    assert.strictEqual(chats[0].projectId, project1.id);
    console.log('✓ Chat metadata includes projectId');

    // 7. Update Chat Project
    console.log('\n7. Testing updateChatProject...');
    const project2 = projectManager.createProject({
        name: 'Segundo Projeto'
    });
    chatHistoryManager.updateChatProject(chat1.id, project2.id);
    const reloadedChat = chatHistoryManager.loadChat(chat1.id);
    assert.strictEqual(reloadedChat.projectId, project2.id);
    console.log('✓ Chat reassigned to project2');

    // 8. Delete Project and verify unassigning
    console.log('\n8. Testing deleteProject unassign cascade...');
    projectManager.deleteProject(project2.id);
    const chatAfterProjectDelete = chatHistoryManager.loadChat(chat1.id);
    assert.strictEqual(chatAfterProjectDelete.projectId, null);
    console.log('✓ Project deleted and chat projectId safely reset to null');

    const remainingProjects = projectManager.listProjects();
    assert.strictEqual(remainingProjects.length, 1);
    assert.strictEqual(remainingProjects[0].id, project1.id);
    console.log('✓ Project list has remaining project');

    console.log('\n=======================================');
    console.log('🎉 ALL PROJECT BACKEND TESTS PASSED! 🎉');
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

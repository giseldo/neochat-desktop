const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { listBots, getBot, saveBot, deleteBot, DEFAULT_BOTS } = require('../electron/botManager');
const memoryService = require('../electron/memoryService');

console.log('Testing botManager...');

// 1. Test default built-in bots
const bots = listBots();
assert(Array.isArray(bots), 'listBots must return an array');
assert(bots.length >= 2, 'Should have at least 2 default bots');
const hermesAssistant = bots.find(b => b.id === 'bot_hermes_assistant');
assert(hermesAssistant, 'Should have bot_hermes_assistant');
assert.equal(hermesAssistant.isBuiltIn, true);
assert(hermesAssistant.tools.includes('save_user_memory'), 'Should have memory tools');

const hermesDev = bots.find(b => b.id === 'bot_hermes_dev');
assert(hermesDev, 'Should have bot_hermes_dev');
assert.equal(hermesDev.agentEnabled, true);
assert(hermesDev.tools.includes('shell_exec'), 'Hermes dev should have shell_exec');

// 2. Test getBot
const fetched = getBot('bot_hermes_assistant');
assert.equal(fetched.id, 'bot_hermes_assistant');

// 3. Test creating a custom bot
const created = saveBot({
  name: 'Test Agent',
  description: 'Custom test bot',
  systemPrompt: 'You are a test bot.',
  preferredModel: 'llama-3.3-70b-versatile',
  temperature: 0.3,
  agentEnabled: true,
  searchEnabled: true,
  tools: ['web_search', 'save_user_memory']
});
assert(created.success, 'Bot creation should succeed');
assert(created.bot.id.startsWith('bot_'), 'Bot id should start with bot_');
const customId = created.bot.id;

// Verify custom bot is in the list
const botsAfterAdd = listBots();
assert(botsAfterAdd.some(b => b.id === customId), 'Custom bot should be listed');

// 4. Test memoryService with botId scoping
console.log('Testing memoryService with botId scoping...');
const mem1 = memoryService.addMemory('O usuário programa em React e Electron', 'fact', 'ai_extracted', customId);
assert(mem1.success, 'addMemory with botId should succeed');
assert.equal(mem1.memory.botId, customId, 'Memory should have correct botId');

const botMemories = memoryService.getBotMemories(customId);
assert(botMemories.length >= 1, 'Should find bot memory');
assert(botMemories.some(m => m.id === mem1.memory.id), 'Should contain newly added memory');

// Check prompt formatting for activeBot
const prompt = memoryService.getFormattedMemoryPrompt({ userMemory: { enabled: true } }, created.bot);
assert(prompt.includes('=== BOT LEARNED KNOWLEDGE & LESSONS (Test Agent) ==='), 'Prompt should have bot learned knowledge section');
assert(prompt.includes('React e Electron'), 'Prompt should contain learned memory content');

// Clean up test memory and test bot
memoryService.deleteMemory(mem1.memory.id);
deleteBot(customId);
assert.equal(getBot(customId), null, 'Custom bot should be deleted');

console.log('All botManager and memoryService bot-scoping tests passed successfully!');

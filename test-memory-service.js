const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('--- Testing NeoChat User Persistent Long-Term Memory Service ---');

const memoryService = require('./electron/memoryService');

// Create temporary directory to isolate test
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-mem-test-'));
const mockApp = {
  getPath: () => tempDir
};

console.log('1. Initializing Memory Service with isolated userData...');
memoryService.initialize(mockApp);

console.log('2. Testing getMemories initial state...');
let list = memoryService.getMemories();
assert(Array.isArray(list), 'Memories list should be an array');
assert.strictEqual(list.length, 0, 'Initial list should be empty');

console.log('3. Testing adding manual memories with categories...');
const mem1 = memoryService.addMemory('Prefiro respostas em TypeScript com Tailwind CSS', 'preference', 'manual');
assert(mem1.success, 'Should add memory successfully');
assert.strictEqual(mem1.isNew, true, 'Should be recognized as new');
assert.strictEqual(mem1.memory.category, 'preference', 'Category should match');
assert.strictEqual(mem1.memory.enabled, true, 'Default enabled should be true');

const mem2 = memoryService.addMemory('Meu nome é Alex e sou desenvolvedor sênior', 'fact', 'ai_extracted');
assert(mem2.success, 'Should add fact memory successfully');
assert.strictEqual(mem2.memory.category, 'fact', 'Category should match');
assert.strictEqual(mem2.memory.source, 'ai_extracted', 'Source should match');

const mem3 = memoryService.addMemory('Nunca use bibliotecas legadas de CSS em novos componentes', 'rule', 'manual');
assert(mem3.success, 'Should add rule memory successfully');

console.log('4. Testing deduplication / update on same content...');
const memDuplicate = memoryService.addMemory('prefiro respostas em typescript com tailwind css', 'preference', 'manual');
assert.strictEqual(memDuplicate.isNew, false, 'Duplicate text should be updated, not re-added');

list = memoryService.getMemories();
assert.strictEqual(list.length, 3, 'Should have exactly 3 unique memories');

console.log('5. Testing updateMemory...');
const updateRes = memoryService.updateMemory(mem1.memory.id, { enabled: false });
assert(updateRes.success, 'Should update successfully');
assert.strictEqual(updateRes.memory.enabled, false, 'Memory should now be disabled');

console.log('6. Testing getMemoryStats...');
const stats = memoryService.getMemoryStats();
assert.strictEqual(stats.total, 3, 'Total should be 3');
assert.strictEqual(stats.active, 2, 'Active should be 2 (1 was disabled)');
assert.strictEqual(stats.byCategory.fact, 1, 'Fact category count should be 1');
assert.strictEqual(stats.byCategory.rule, 1, 'Rule category count should be 1');

console.log('7. Testing formatted system prompt generation...');
// When enabled with memories
const formattedPrompt = memoryService.getFormattedMemoryPrompt({ userMemory: { enabled: true } });
assert(formattedPrompt.includes('USER GENERAL MEMORY & PROFILE'), 'Prompt should contain header');
assert(formattedPrompt.includes('Meu nome é Alex'), 'Prompt should contain active fact');
assert(formattedPrompt.includes('Nunca use bibliotecas legadas'), 'Prompt should contain active rule');
assert(!formattedPrompt.includes('TypeScript com Tailwind'), 'Prompt should NOT contain disabled preference');
assert(formattedPrompt.includes('save_user_memory'), 'Prompt should inject save_user_memory command');
assert(formattedPrompt.includes('forget_user_memory'), 'Prompt should inject forget_user_memory command');

// When disabled in settings
const disabledPrompt = memoryService.getFormattedMemoryPrompt({ userMemory: { enabled: false } });
assert.strictEqual(disabledPrompt, '', 'Disabled userMemory must inject NOTHING (empty string)');

console.log('8. Testing tool definitions...');
const toolDefs = memoryService.getMemoryToolDefinitions();
assert(Array.isArray(toolDefs), 'Tool defs should be an array');
assert(toolDefs.some(t => t.function.name === 'save_user_memory'), 'Should contain save_user_memory tool');
assert(toolDefs.some(t => t.function.name === 'forget_user_memory'), 'Should contain forget_user_memory tool');

console.log('9. Testing forgetMemoryByQuery...');
const forgetRes = memoryService.forgetMemoryByQuery('desenvolvedor');
assert(forgetRes.success, 'Should forget memory matching query');
assert.strictEqual(memoryService.getMemories().length, 2, 'Should now have 2 memories left');

console.log('10. Testing clearMemories and empty prompt injection...');
const clearRes = memoryService.clearMemories();
assert(clearRes.success, 'Should clear all memories');
assert.strictEqual(memoryService.getMemories().length, 0, 'Memories should be completely empty');

// When enabled with 0 memories, commands MUST STILL BE INJECTED
const emptyMemoriesPrompt = memoryService.getFormattedMemoryPrompt({ userMemory: { enabled: true } });
assert(emptyMemoriesPrompt.includes('save_user_memory'), 'Empty memories prompt must still inject save_user_memory command');
assert(emptyMemoriesPrompt.includes('forget_user_memory'), 'Empty memories prompt must still inject forget_user_memory command');
assert(emptyMemoriesPrompt.includes('No persistent user memories are stored yet'), 'Should indicate memory is empty');

console.log('11. Testing toolHandler execution with enabled vs disabled settings...');
const toolHandler = require('./electron/toolHandler');

// When disabled: save_user_memory must be blocked
const disabledToolCall = {
  id: 'call_save_disabled',
  function: {
    name: 'save_user_memory',
    arguments: JSON.stringify({ memory: 'Teste memória desabilitada', category: 'fact' })
  }
};
const disabledResult = Promise.resolve(toolHandler.handleExecuteToolCall(
  { sender: { isDestroyed: () => false, send: () => {} } },
  disabledToolCall,
  [],
  {},
  { userMemory: { enabled: false } }
));

disabledResult.then(async (res) => {
  assert(res.error, 'Tool call when memory is disabled MUST return an error');
  assert(res.error.includes('desativado'), 'Error message should inform that memory is disabled');
  assert.strictEqual(memoryService.getMemories().length, 0, 'No memory should be saved when disabled');

  // When enabled: save_user_memory must succeed
  const enabledToolCall = {
    id: 'call_save_enabled',
    function: {
      name: 'save_user_memory',
      arguments: JSON.stringify({ memory: 'Gosta de café sem açúcar', category: 'preference' })
    }
  };
  const enabledResult = await toolHandler.handleExecuteToolCall(
    { sender: { isDestroyed: () => false, send: () => {} } },
    enabledToolCall,
    [],
    {},
    { userMemory: { enabled: true } }
  );

  assert(enabledResult.result, 'Tool call when memory is enabled MUST return result');
  assert.strictEqual(memoryService.getMemories().length, 1, 'Memory should be successfully saved');
  assert.strictEqual(memoryService.getMemories()[0].content, 'Gosta de café sem açúcar');

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('✅ ALL MEMORY SERVICE & PERMISSION TESTS PASSED SUCCESSFULLY!');
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

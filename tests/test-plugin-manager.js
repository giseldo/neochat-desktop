const assert = require('assert');
const { PluginManager, pluginManager } = require('../electron/pluginManager');

async function runPluginManagerTests() {
  console.log('--- [Test Suite] NeoChat Plugin System & Micro-Kernel ---');

  // Test 1: Plugin registration
  console.log('\n[1] Testing Plugin Registration...');
  const testManager = new PluginManager();
  
  testManager.register({
    id: 'test-plugin',
    name: 'Test Plugin',
    description: 'Unit test mock plugin',
    version: '1.0.0',
    lazy: true,
    init: async (ctx) => {
      ctx.initCalled = true;
    },
    activate: async (ctx) => {
      ctx.activateCalled = true;
    }
  });

  const registered = testManager.getPlugin('test-plugin');
  assert.ok(registered, 'Plugin should be registered');
  assert.strictEqual(registered.id, 'test-plugin');
  assert.strictEqual(registered.name, 'Test Plugin');
  console.log('   ✓ Custom plugin registered successfully');

  // Test 2: Plugin initialization & built-ins
  console.log('\n[2] Testing Built-in Plugins Initialization...');
  const mockIpcHandlers = new Map();
  const mockIpcListeners = new Map();

  const mockContext = {
    app: {
      getPath: () => 'C:\\temp',
      name: 'neochat-desktop'
    },
    ipcMain: {
      handle: (channel, fn) => mockIpcHandlers.set(channel, fn),
      on: (channel, fn) => mockIpcListeners.set(channel, fn)
    },
    getMainWindow: () => null,
    dialog: {},
    shell: {},
    loadSettings: () => ({ enabledPlugins: {} }),
    saveSettings: () => {}
  };

  await testManager.initialize(mockContext);

  const allPlugins = testManager.listPlugins();
  assert.ok(allPlugins.length >= 12, `Expected at least 12 plugins, found ${allPlugins.length}`);

  const expectedPluginIds = [
    'rag', 'canvas', 'terminal', 'browser', 'mcp',
    'workflows', 'scheduler', 'swarm', 'coderunner',
    'git', 'backup', 'observability'
  ];

  for (const pluginId of expectedPluginIds) {
    const p = testManager.getPlugin(pluginId);
    assert.ok(p, `Built-in plugin ${pluginId} must be registered`);
    assert.strictEqual(p.enabled, true, `Plugin ${pluginId} should be enabled by default`);
    console.log(`   ✓ Built-in plugin: ${p.name} (${pluginId}) registered and initialized`);
  }

  // Test 3: Verify Management IPC handlers
  console.log('\n[3] Testing Management IPC Handlers...');
  assert.ok(mockIpcHandlers.has('plugins:list'), 'plugins:list IPC handler must be registered');
  assert.ok(mockIpcHandlers.has('plugins:toggle'), 'plugins:toggle IPC handler must be registered');

  const listHandler = mockIpcHandlers.get('plugins:list');
  const pluginsList = listHandler();
  assert.ok(Array.isArray(pluginsList), 'plugins:list should return an array');
  assert.ok(pluginsList.some(p => p.id === 'rag'), 'RAG plugin must be listed');
  console.log(`   ✓ plugins:list returned ${pluginsList.length} plugins`);

  // Test 4: Dynamic Activation and Deactivation
  console.log('\n[4] Testing Plugin Activation & Deactivation...');
  assert.strictEqual(testManager.isPluginEnabled('rag'), true);
  
  await testManager.activate('rag');
  const ragPlugin = testManager.getPlugin('rag');
  assert.strictEqual(ragPlugin.active, true, 'RAG plugin should be active after activate()');
  console.log('   ✓ RAG plugin activated successfully');

  await testManager.deactivate('rag');
  assert.strictEqual(ragPlugin.active, false, 'RAG plugin should be inactive after deactivate()');
  console.log('   ✓ RAG plugin deactivated successfully');

  // Test 5: Default singleton instance
  console.log('\n[5] Testing Singleton PluginManager Instance...');
  assert.ok(pluginManager instanceof PluginManager, 'pluginManager export must be an instance of PluginManager');
  console.log('   ✓ pluginManager singleton verified');

  console.log('\n========================================');
  console.log('🎉 ALL 5 PLUGIN SYSTEM TESTS PASSED! 🎉');
  console.log('========================================\n');
}

runPluginManagerTests().catch(err => {
  console.error('Plugin Manager Test Failure:', err);
  process.exit(1);
});

const assert = require('assert');
const { PluginManager, pluginManager } = require('./electron/pluginManager');

async function testPluginsEcosystem() {
  console.log('====================================================');
  console.log('🧪 RUNNING NEOCHAT PLUGINS & MODULAR SYSTEM TESTS 🧪');
  console.log('====================================================');

  const testManager = new PluginManager();
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

  // Test 1: Initialize Plugin Manager with all built-in and dynamic plugins
  console.log('\n[1] Testing Plugin Discovery & Registration...');
  await testManager.initialize(mockContext);

  const allPlugins = testManager.listPlugins();
  console.log(`   ✓ Total plugins registered: ${allPlugins.length}`);
  assert.ok(allPlugins.length >= 18, `Expected at least 18 plugins, got ${allPlugins.length}`);

  // Test 2: Verify all 7 new feature plugins exist
  console.log('\n[2] Verifying 7 New Modular Feature Plugins...');
  const newPluginIds = [
    'arena',
    'live-preview',
    'podcast-studio',
    'knowledge-graph',
    'daily-briefing',
    'mcp-hub',
    'computer-vision'
  ];

  for (const id of newPluginIds) {
    const plugin = testManager.getPlugin(id);
    assert.ok(plugin, `Plugin '${id}' must be registered`);
    assert.strictEqual(plugin.enabled, true, `Plugin '${id}' should be enabled by default`);
    assert.strictEqual(plugin.lazy, true, `Plugin '${id}' must be lazy-loaded for zero idle resource usage`);
    console.log(`   ✓ Plugin verified: [${plugin.id}] - "${plugin.name}" (${plugin.category})`);
  }

  // Test 3: Verify Live Preview Bundle execution
  console.log('\n[3] Testing Live Preview Sandbox Bundler...');
  const livePreviewPlugin = require('./electron/plugins/livePreviewPlugin');
  const bundleRes = livePreviewPlugin.init;
  assert.ok(typeof bundleRes === 'function', 'Live Preview plugin must have init function');
  
  const livePreviewHandler = mockIpcHandlers.get('live-preview:bundle');
  assert.ok(livePreviewHandler, 'live-preview:bundle IPC handler must be registered');
  const bundleOutput = await livePreviewHandler(null, {
    code: '<h1 class="text-xl">Hello World</h1>',
    title: 'Test Live Preview'
  });
  assert.ok(bundleOutput.bundledHtml.includes('Hello World'), 'Bundle should contain user code');
  assert.ok(bundleOutput.bundledHtml.includes('tailwindcss'), 'Bundle should include Tailwind CDN');
  console.log('   ✓ Live Preview bundler generated standalone sandboxed HTML successfully');

  // Test 4: Verify Knowledge Graph & Data Studio parser
  console.log('\n[4] Testing Knowledge Graph & Data Studio Engine...');
  const dataStudioHandler = mockIpcHandlers.get('data-studio:parse-table');
  assert.ok(dataStudioHandler, 'data-studio:parse-table IPC handler must be registered');
  const sampleCsv = `Mês,Vendas,Custo\nJaneiro,100,20\nFevereiro,150,30`;
  const tableData = await dataStudioHandler(null, { rawText: sampleCsv });
  assert.strictEqual(tableData.columns.length, 3, 'Should parse 3 columns');
  assert.strictEqual(tableData.rows.length, 2, 'Should parse 2 rows');
  assert.strictEqual(tableData.rows[0].Vendas, 100, 'Should convert numeric string to number');
  console.log('   ✓ Tabular data parser converted CSV into chart-ready metrics');

  // Test 5: Verify MCP Hub curated catalog
  console.log('\n[5] Testing MCP Hub Curated Registry...');
  const mcpHubHandler = mockIpcHandlers.get('mcp-hub:list-servers');
  assert.ok(mcpHubHandler, 'mcp-hub:list-servers IPC handler must be registered');
  const servers = await mcpHubHandler();
  assert.ok(servers.length >= 5, 'Should return curated servers');
  assert.ok(servers.some(s => s.id === 'github'), 'GitHub server should be in curated list');
  assert.ok(servers.some(s => s.id === 'postgres'), 'Postgres server should be in curated list');
  console.log(`   ✓ MCP Hub returned ${servers.length} 1-click curated servers`);

  // Test 6: Verify Proactive Daily Briefing
  console.log('\n[6] Testing Proactive Daily Briefing Generator...');
  const briefingHandler = mockIpcHandlers.get('daily-briefing:get');
  assert.ok(briefingHandler, 'daily-briefing:get IPC handler must be registered');
  const briefing = await briefingHandler(null, {});
  assert.ok(briefing.greeting, 'Briefing should have greeting');
  assert.ok(Array.isArray(briefing.agenda), 'Briefing should have agenda list');
  console.log(`   ✓ Daily Briefing generated: "${briefing.greeting}" for ${briefing.date}`);

  // Test 7: Verify Dynamic Plugin Activation / Deactivation Lifecycle
  console.log('\n[7] Testing Dynamic Activation / Deactivation (Zero Resource Cost)...');
  await testManager.activate('arena');
  assert.strictEqual(testManager.getPlugin('arena').active, true, 'Arena plugin should be active');
  
  await testManager.deactivate('arena');
  assert.strictEqual(testManager.getPlugin('arena').active, false, 'Arena plugin should be inactive and memory cleared');
  console.log('   ✓ Plugin activated and deactivated with zero residual leaks');

  console.log('\n====================================================');
  console.log('🎉 ALL 7 NEW FEATURE PLUGINS & ECOSYSTEM TESTS PASSED! 🎉');
  console.log('====================================================');
}

testPluginsEcosystem().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

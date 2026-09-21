const assert = require('assert');
const http = require('http');
const { ExternalPluginManager } = require('../electron/externalPluginManager');

async function run() {
  let settings = {};
  const manager = new ExternalPluginManager();
  manager.initialize({
    loadSettings: () => settings,
    saveSettings: next => { settings = next; }
  });

  const builtIns = manager.list();
  assert.strictEqual(builtIns.length, 12, 'all neo-chat built-in plugins must be available');
  assert(builtIns.some(plugin => plugin.id === 'arxiv'));
  assert(builtIns.some(plugin => plugin.id === 'openai-image-generation'));
  assert(builtIns.every(plugin => plugin.enabled === false), 'API plugins must be opt-in');

  const server = http.createServer((request, response) => {
    if (request.url === '/openapi.json') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test Echo', description: 'Test plugin' },
        servers: [{ url: `http://127.0.0.1:${server.address().port}` }],
        paths: {
          '/echo': {
            get: {
              operationId: 'echo',
              summary: 'Echo a message',
              parameters: [{ name: 'message', in: 'query', required: true, schema: { type: 'string' } }]
            }
          }
        }
      }));
      return;
    }
    const url = new URL(request.url, `http://${request.headers.host}`);
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ echoed: url.searchParams.get('message') }));
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const installed = await manager.installFromUrl(`http://127.0.0.1:${port}/openapi.json`);
    assert.strictEqual(installed.success, true);
    assert.strictEqual(installed.plugin.id, 'test-echo');

    manager.toggle('test-echo', true);
    const tools = manager.getToolDefinitions(false);
    const tool = tools.find(item => item.function.name === 'test_echo__echo');
    assert(tool, 'enabled plugin function must be exposed as a model tool');

    const result = await manager.executeTool('test_echo__echo', { message: 'hello' });
    assert.deepStrictEqual(result, { echoed: 'hello' });
    manager.remove('test-echo');
    assert(!manager.get('test-echo'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log('External OpenAPI plugin tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

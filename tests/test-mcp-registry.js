const assert = require('assert');
const { normalizeRegistryServer, normalizeRegistryServers } = require('../electron/mcpRegistry');
const { McpHubEngine } = require('../electron/plugins/mcpHubPlugin');

async function run() {
  const fixture = {
    server: {
      name: 'io.example/search',
      version: '1.2.3',
      description: 'Search example data',
      homepage: 'https://example.com/docs',
      remotes: [{
        type: 'streamable-http',
        url: 'https://mcp.example.com/mcp',
        variables: {},
        headers: [
          { name: 'X-Static', value: 'desktop', isSecret: false },
          { name: 'Authorization', value: '{token}', isSecret: true, isRequired: true }
        ]
      }]
    }
  };

  const normalized = normalizeRegistryServer(fixture);
  assert(normalized, 'valid registry server must be normalized');
  assert.strictEqual(normalized.transport, 'streamableHttp');
  assert.strictEqual(normalized.url, 'https://mcp.example.com/mcp');
  assert.deepStrictEqual(normalized.headers, { 'X-Static': 'desktop' });
  assert.deepStrictEqual(normalized.auth, { type: 'bearer', name: 'Authorization', required: true });
  assert.strictEqual(normalizeRegistryServers({ servers: [fixture, fixture] }).length, 1, 'duplicates must be removed');
  assert.strictEqual(normalizeRegistryServer({ name: 'stdio-only', packages: [] }), null, 'stdio-only registry entries are not remotely installable');

  let settings = {};
  const engine = new McpHubEngine();
  const custom = await engine.installCustomServer({
    name: 'Private Search',
    url: 'https://mcp.example.com/mcp',
    bearerToken: 'secret-token',
    settings,
    saveSettings: next => { settings = next; }
  });
  assert.strictEqual(custom.success, true);
  assert.strictEqual(custom.server.transport, 'streamableHttp');
  assert.strictEqual(custom.server.headers.Authorization, 'Bearer secret-token');
  assert(settings.mcpServers[custom.serverId], 'custom server must be persisted');

  console.log('MCP Registry and remote installation tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

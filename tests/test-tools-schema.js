const assert = require('assert');

// Mock tool inputs from an MCP server like @modelcontextprotocol/server-filesystem
const mockDiscoveredTools = [
  {
    name: 'read_file',
    description: 'Read the complete contents of a file from the file system.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read'
        }
      },
      required: ['path']
    },
    serverId: 'filesystem'
  },
  {
    name: 'read_multiple_files',
    description: 'Read multiple files at once.',
    input_schema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'List of file paths'
        }
      },
      required: ['paths']
    },
    serverId: 'filesystem'
  }
];

function prepareToolsTest(discoveredTools, isResponsesApi = false) {
    const tools = (discoveredTools || []).map(tool => {
        let safeSchema = {
            type: "object",
            properties: {}
        };

        const schema = tool.input_schema || tool.inputSchema;
        if (schema && typeof schema === 'object') {
             try {
                 if (schema.properties && typeof schema.properties === 'object' && schema.properties !== null) {
                     for (const [key, value] of Object.entries(schema.properties)) {
                         if (value && typeof value === 'object') {
                             safeSchema.properties[key] = { ...value };
                         }
                     }
                 }

                 if (Array.isArray(schema.required) && schema.required.length > 0) {
                     safeSchema.required = [...schema.required];
                 }
             } catch (e) {
                 safeSchema = { type: "object", properties: {} };
             }
        }

        if (isResponsesApi) {
            return {
                type: "function",
                name: tool.name || "unknown_tool",
                description: tool.description || "",
                parameters: safeSchema
            };
        } else {
            return {
                type: "function",
                function: {
                    name: tool.name || "unknown_tool",
                    description: tool.description || "",
                    parameters: safeSchema
                }
            };
        }
    });
    return tools;
}

console.log('Running tool schema tests...');

// 1. Standard Chat Completions API format
const stdTools = prepareToolsTest(mockDiscoveredTools, false);
assert.strictEqual(stdTools.length, 2);
assert.strictEqual(stdTools[0].type, 'function');
assert.strictEqual(stdTools[0].function.name, 'read_file');
assert.strictEqual(stdTools[0].function.strict, undefined, 'strict must not be defined/true');
assert.strictEqual(stdTools[0].function.parameters.type, 'object');
assert.strictEqual(stdTools[0].function.parameters.properties.path.type, 'string');
assert.deepStrictEqual(stdTools[0].function.parameters.required, ['path']);

// Verify array properties (items) are preserved
assert.strictEqual(stdTools[1].function.parameters.properties.paths.type, 'array');
assert.strictEqual(stdTools[1].function.parameters.properties.paths.items.type, 'string');

// 2. Responses API format
const respTools = prepareToolsTest(mockDiscoveredTools, true);
assert.strictEqual(respTools.length, 2);
assert.strictEqual(respTools[0].type, 'function');
assert.strictEqual(respTools[0].name, 'read_file');
assert.strictEqual(respTools[0].strict, undefined, 'strict must not be defined/true');
assert.strictEqual(respTools[0].parameters.type, 'object');

console.log('✓ All tool schema preparation tests passed successfully!');

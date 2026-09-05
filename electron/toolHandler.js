const { limitContentLength } = require('./utils');
const { executeWebSearch } = require('./webSearchService');
const { queryKnowledge, readFileContent } = require('./ragService');
const { handleCanvasToolCall } = require('./canvasManager');
const { toolExecutor } = require('./agent/toolExecutor');
const { addMemory, forgetMemoryByQuery } = require('./memoryService');

/**
 * Handles the 'execute-tool-call' IPC event.
 *
 * @param {Electron.IpcMainInvokeEvent} event - The IPC event object.
 * @param {object} toolCall - The tool call object received from the model.
 * @param {Array<object>} discoveredTools - List of available MCP tools.
 * @param {object} mcpClients - Object mapping server IDs to active MCP client instances.
 * @param {object} settings - The current application settings.
 * @returns {Promise<object>} - A promise resolving to the tool result or error.
 */
async function handleExecuteToolCall(event, toolCall, discoveredTools, mcpClients, settings) {
  console.log(`Handling execute-tool-call for: ${toolCall?.function?.name} (ID: ${toolCall?.id})`);

  // Basic validation of the tool call object
  if (!toolCall || !toolCall.id || !toolCall.function || !toolCall.function.name) {
     console.error('Invalid tool call object received:', toolCall);
     return { error: "Invalid tool call structure received from model.", tool_call_id: toolCall?.id || 'unknown' };
  }

  const toolName = toolCall.function.name;
  const toolCallId = toolCall.id;

  // Handle Native Coding Tools (read_file, write_file, edit_file, list_directory, glob_search, grep_search, shell_exec, git_status, git_diff, git_commit)
  const isNativeCodeTool = [
    'read_file', 'write_file', 'edit_file', 'list_directory',
    'glob_search', 'grep_search', 'shell_exec',
    'git_status', 'git_diff', 'git_commit'
  ].includes(toolName);

  if (isNativeCodeTool) {
    try {
      const workspaceRoot = settings?.workspaceRoot || process.cwd();
      const sessionId = settings?.currentChatId || 'default';
      const result = await toolExecutor.execute({
        sessionId,
        toolCall,
        toolDef: { name: toolName },
        settings,
        mcpClients,
        discoveredTools,
        workspaceRoot
      });
      return result;
    } catch (codeToolError) {
      console.error(`Error executing native code tool "${toolName}":`, codeToolError);
      return {
        error: limitContentLength(`Code tool error: ${codeToolError.message}`, settings?.toolOutputLimit || 8000),
        tool_call_id: toolCallId
      };
    }
  }

  // Helper to parse arguments
  let args = {};
  try {
    if (typeof toolCall.function.arguments === 'string' && toolCall.function.arguments.trim() !== '') {
      args = JSON.parse(toolCall.function.arguments);
    } else if (typeof toolCall.function.arguments === 'object' && toolCall.function.arguments !== null) {
      args = toolCall.function.arguments;
    }
  } catch (parseError) {
    console.error(`Error parsing arguments for ${toolName}: ${parseError.message}`);
    return {
      error: `Failed to parse arguments for ${toolName}. Error: ${parseError.message}`,
      tool_call_id: toolCallId
    };
  }

  // Handle Native Built-in Canvas Tools (canvas_create_document, canvas_update_document, canvas_edit_selection, canvas_get_document)
  if (toolName.startsWith('canvas_')) {
    try {
      const chatId = settings?.currentChatId || args?.chatId || 'default';
      const canvasResponse = handleCanvasToolCall(toolName, args, chatId);
      return {
        result: limitContentLength(JSON.stringify(canvasResponse, null, 2), settings?.toolOutputLimit || 16000),
        tool_call_id: toolCallId,
        canvasData: canvasResponse
      };
    } catch (canvasError) {
      console.error(`Error executing native Canvas tool "${toolName}":`, canvasError);
      return {
        error: limitContentLength(`Canvas tool error: ${canvasError.message}`, settings?.toolOutputLimit || 8000),
        tool_call_id: toolCallId
      };
    }
  }

  // Handle Native Built-in Web Search Tool
  if (toolName === 'web_search') {
    if (settings?.webSearch?.enabled === false) {
      return {
        error: 'Web search is currently disabled in settings.',
        tool_call_id: toolCallId
      };
    }

    const query = args.query || args.q || args.search_query;
    if (!query) {
      return {
        error: 'Missing required argument "query" for web_search.',
        tool_call_id: toolCallId
      };
    }

    try {
      const searchOptions = settings?.webSearch || { provider: 'local', apiKey: '', maxResults: 3 };
      const searchResponse = await executeWebSearch(query, searchOptions);
      return {
        result: limitContentLength(JSON.stringify(searchResponse), settings?.toolOutputLimit || 8000),
        tool_call_id: toolCallId
      };
    } catch (searchError) {
      console.error(`Error executing native web_search for "${query}":`, searchError);
      return {
        error: limitContentLength(`Web search error: ${searchError.message}`, settings?.toolOutputLimit || 8000),
        tool_call_id: toolCallId
      };
    }
  }

  // Handle Native Built-in RAG / Knowledge Base Search Tool
  if (toolName === 'query_project_knowledge') {
    const query = args.query || args.q || args.search_query;
    if (!query) {
      return {
        error: 'Missing required argument "query" for query_project_knowledge.',
        tool_call_id: toolCallId
      };
    }

    try {
      const projectId = args.projectId || settings?.activeProjectId || 'global';
      const searchResponse = queryKnowledge(query, { projectId, maxResults: 6 });
      return {
        result: limitContentLength(JSON.stringify(searchResponse, null, 2), settings?.toolOutputLimit || 8000),
        tool_call_id: toolCallId
      };
    } catch (ragError) {
      console.error(`Error querying project knowledge for "${query}":`, ragError);
      return {
        error: limitContentLength(`Knowledge search error: ${ragError.message}`, settings?.toolOutputLimit || 8000),
        tool_call_id: toolCallId
      };
    }
  }

  // Handle Native Built-in RAG File Reading Tool
  if (toolName === 'read_project_file') {
    const filePath = args.filePath || args.path || args.file;
    if (!filePath) {
      return {
        error: 'Missing required argument "filePath" for read_project_file.',
        tool_call_id: toolCallId
      };
    }

    try {
      const fileData = readFileContent(filePath, args.startLine, args.endLine);
      return {
        result: limitContentLength(JSON.stringify(fileData, null, 2), settings?.toolOutputLimit || 8000),
        tool_call_id: toolCallId
      };
    } catch (readError) {
      console.error(`Error reading project file "${filePath}":`, readError);
      return {
        error: limitContentLength(`File read error: ${readError.message}`, settings?.toolOutputLimit || 8000),
        tool_call_id: toolCallId
      };
    }
  }

  // Handle Native Built-in User Memory Tools (save_user_memory, forget_user_memory)
  if (toolName === 'save_user_memory') {
    const memoryContent = args.memory || args.content || args.fact || args.preference;
    if (!memoryContent) {
      return {
        error: 'Missing required argument "memory" for save_user_memory.',
        tool_call_id: toolCallId
      };
    }

    try {
      const category = args.category || 'preference';
      const result = addMemory(memoryContent, category, 'ai_extracted');
      
      // Notify renderer window about new learned memory
      if (event && event.sender && !event.sender.isDestroyed()) {
        event.sender.send('memory-updated', {
          action: 'added',
          memory: result.memory,
          isNew: result.isNew
        });
      }

      return {
        result: JSON.stringify({
          success: true,
          message: `Memória salva com sucesso no perfil do usuário: "${result.memory.content}" [Categoria: ${result.memory.category}]`,
          memory: result.memory
        }),
        tool_call_id: toolCallId
      };
    } catch (memError) {
      console.error('Error saving user memory:', memError);
      return {
        error: `Erro ao salvar memória: ${memError.message}`,
        tool_call_id: toolCallId
      };
    }
  }

  if (toolName === 'forget_user_memory') {
    const query = args.query || args.memory || args.memory_id || args.id;
    if (!query) {
      return {
        error: 'Missing required argument "query" for forget_user_memory.',
        tool_call_id: toolCallId
      };
    }

    try {
      const result = forgetMemoryByQuery(query);
      if (result.success && event && event.sender && !event.sender.isDestroyed()) {
        event.sender.send('memory-updated', {
          action: 'deleted',
          forgottenMemory: result.forgottenMemory
        });
      }

      return {
        result: JSON.stringify(result),
        tool_call_id: toolCallId
      };
    } catch (forgetError) {
      console.error('Error forgetting user memory:', forgetError);
      return {
        error: `Erro ao esquecer memória: ${forgetError.message}`,
        tool_call_id: toolCallId
      };
    }
  }

  try {
    // Find the MCP tool configuration matching the requested tool name
    const mcpTool = discoveredTools.find(t => t.name === toolName);

    if (!mcpTool) {
      console.error(`Tool "${toolName}" not found among discovered tools.`);
      return {
        error: `Unknown tool: ${toolName}. It might be disconnected or not available.`,
        tool_call_id: toolCallId
      };
    }

    // Find the specific client instance that provides this tool using serverId
    const clientId = mcpTool.serverId;
    if (!clientId) {
        console.error(`Tool configuration for "${toolName}" is missing its serverId.`);
         return {
            error: `Internal configuration error: Tool "${toolName}" has no associated server ID.`,
            tool_call_id: toolCallId
        };
    }

    const client = mcpClients[clientId];
    if (!client) {
      console.error(`MCP Client instance not found for server ID: ${clientId} (required by tool ${toolName})`);
      return {
        error: `The server providing the tool "${toolName}" (ID: ${clientId}) is not currently connected or active.`,
        tool_call_id: toolCallId
      };
    }

    // Safely parse arguments
    let args;
    try {
      // Handle cases where arguments might be null, undefined, or an empty string
      if (toolCall.function.arguments === null || toolCall.function.arguments === undefined || toolCall.function.arguments.trim() === '') {
          args = {}; // Treat as empty object if no arguments provided
      } else {
          args = JSON.parse(toolCall.function.arguments);
      }
       // Optional: Validate parsed args against mcpTool.input_schema here
    } catch (parseError) {
      console.error(`Error parsing arguments for tool "${toolName}": ${parseError.message}`);
      console.error(`Raw arguments string:`, toolCall.function.arguments);
      return {
        error: `Failed to parse arguments for tool "${toolName}". Please ensure arguments are valid JSON. Error: ${parseError.message}`,
        tool_call_id: toolCallId
      };
    }

    // Execute the tool call via the MCP client
    console.log(`Executing MCP tool "${toolName}" on server ${clientId} with args:`, args);
    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

       console.log(`MCP tool "${toolName}" executed successfully. Result content length: ${JSON.stringify(result?.content)?.length}`);

       // Prepare result, ensuring content is stringified and limited
       let resultString;
       try {
            // Handle different types of content (string, object, null, etc.)
            if (result?.content === undefined || result?.content === null) {
                resultString = ""; // Represent null/undefined content as empty string
            } else if (typeof result.content === 'string') {
                resultString = result.content;
            } else {
                resultString = JSON.stringify(result.content);
            }
       } catch (stringifyError) {
           console.error(`Failed to stringify result content for tool "${toolName}":`, stringifyError);
           resultString = `[Error stringifying tool result: ${stringifyError.message}]`;
       }

      return {
        result: limitContentLength(resultString, settings.toolOutputLimit), // Limit length *after* stringifying
        tool_call_id: toolCallId
      };
    } catch (executionError) {
      console.error(`Error executing MCP tool call for "${toolName}": ${executionError.message}`);
      // Log the execution error stack if available
      if (executionError.stack) {
           console.error(executionError.stack);
      }
      return {
        // Provide a more informative error message back to the model
        error: limitContentLength(`Error during execution of tool "${toolName}": ${executionError.message}`, settings.toolOutputLimit),
        tool_call_id: toolCallId
      };
    }

  } catch (handlerError) {
    // Catch unexpected errors within the handler logic itself
    console.error(`Unexpected error in handleExecuteToolCall for tool "${toolName}":`, handlerError);
    return {
      error: limitContentLength(`Internal error while handling tool call "${toolName}": ${handlerError.message}`),
      tool_call_id: toolCallId
    };
  }
}

module.exports = {
    handleExecuteToolCall
}; 
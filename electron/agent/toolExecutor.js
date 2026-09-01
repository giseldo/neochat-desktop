/**
 * ToolExecutor - Dispatches and executes Native Tools and MCP Tools safely.
 */

const fs = require('fs');
const path = require('path');
const { limitContentLength } = require('../utils');
const { executeWebSearch } = require('../webSearchService');
const { queryKnowledge, readFileContent } = require('../ragService');
const { handleCanvasToolCall } = require('../canvasManager');
const { runGit, getRepositoryStatus } = require('../gitManager');
const { shellManager } = require('./shellManager');
const { checkpointsManager } = require('./checkpoints');
const { workspaceManager } = require('./workspaceManager');
const { taskManager } = require('../taskManager');
const { browserManager } = require('../browserManager');
const { resolveWorkspacePath } = require('./pathPolicy');
const { DEFAULT_AGENT_EXECUTABLES } = require('./processPolicy');

class ToolExecutor {
  /**
   * Execute a tool call.
   * @param {object} params
   * @param {string} params.sessionId
   * @param {object} params.toolCall - { id, function: { name, arguments } }
   * @param {object} params.toolDef
   * @param {object} params.settings
   * @param {object} [params.mcpClients={}]
   * @param {Array<object>} [params.discoveredTools=[]]
   * @param {string} [params.workspaceRoot]
   * @returns {Promise<object>} Result object { result, error, tool_call_id, canvasData }
   */
  async execute({
    sessionId = 'default',
    toolCall,
    toolDef,
    settings = {},
    mcpClients = {},
    discoveredTools = [],
    workspaceRoot
  }) {
    if (!toolCall || !toolCall.id || !toolCall.function || !toolCall.function.name) {
      return {
        error: 'Invalid tool call structure.',
        tool_call_id: toolCall?.id || 'unknown'
      };
    }

    const toolName = toolCall.function.name;
    const toolCallId = toolCall.id;
    const root = resolveWorkspacePath(workspaceRoot || workspaceManager.getWorkspace(sessionId) || process.cwd(), '.', { mustExist: true });
    const outputLimit = settings?.toolOutputLimit || 16000;

    let args = {};
    try {
      if (typeof toolCall.function.arguments === 'string' && toolCall.function.arguments.trim()) {
        args = JSON.parse(toolCall.function.arguments);
      } else if (typeof toolCall.function.arguments === 'object' && toolCall.function.arguments !== null) {
        args = toolCall.function.arguments;
      }
    } catch (parseError) {
      return {
        error: `Failed to parse arguments for ${toolName}: ${parseError.message}`,
        tool_call_id: toolCallId
      };
    }

    try {
      // 1. Native Canvas Tools
      if (toolName.startsWith('canvas_')) {
        const chatId = settings?.currentChatId || args?.chatId || sessionId;
        const canvasResponse = handleCanvasToolCall(toolName, args, chatId);
        return {
          result: limitContentLength(JSON.stringify(canvasResponse, null, 2), outputLimit),
          tool_call_id: toolCallId,
          canvasData: canvasResponse
        };
      }

      // 2. Native Web Search
      if (toolName === 'web_search') {
        const query = args.query || args.q || args.search_query;
        if (!query) return { error: 'Missing required argument "query".', tool_call_id: toolCallId };
        const searchOptions = settings?.webSearch || { provider: 'local', apiKey: '', maxResults: 5 };
        const searchResponse = await executeWebSearch(query, searchOptions);
        return {
          result: limitContentLength(JSON.stringify(searchResponse), outputLimit),
          tool_call_id: toolCallId
        };
      }

      // 3. Native RAG / Knowledge Base Tools
      if (toolName === 'query_project_knowledge') {
        const query = args.query || args.q || args.search_query;
        if (!query) return { error: 'Missing required argument "query".', tool_call_id: toolCallId };
        const projectId = args.project_id || args.projectId || settings?.activeProjectId || 'global';
        const searchResponse = queryKnowledge(query, { projectId, maxResults: 6 });
        return {
          result: limitContentLength(JSON.stringify(searchResponse, null, 2), outputLimit),
          tool_call_id: toolCallId
        };
      }

      // 4. Native Filesystem: read_file
      if (toolName === 'read_file' || toolName === 'read_project_file') {
        const rawPath = args.path || args.filePath || args.file;
        if (!rawPath) return { error: 'Missing required argument "path".', tool_call_id: toolCallId };
        const targetPath = resolveWorkspacePath(root, rawPath, { mustExist: true });

        if (!fs.existsSync(targetPath)) {
          return { error: `File not found: ${rawPath}`, tool_call_id: toolCallId };
        }

        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
          return { error: `Cannot read directory as file: ${rawPath}. Use list_directory instead.`, tool_call_id: toolCallId };
        }

        const content = fs.readFileSync(targetPath, 'utf8');
        const lines = content.split(/\r?\n/);
        const startLine = Math.max(1, parseInt(args.start_line || args.startLine || 1, 10));
        const endLine = args.end_line || args.endLine ? Math.min(lines.length, parseInt(args.end_line || args.endLine, 10)) : lines.length;

        const sliced = lines.slice(startLine - 1, endLine);
        const formatted = sliced.map((line, idx) => `${startLine + idx}: ${line}`).join('\n');

        return {
          result: limitContentLength(formatted, outputLimit),
          tool_call_id: toolCallId,
          totalLines: lines.length,
          startLine,
          endLine
        };
      }

      // 5. Native Filesystem: write_file
      if (toolName === 'write_file') {
        const rawPath = args.path || args.filePath || args.file;
        if (!rawPath) return { error: 'Missing required argument "path".', tool_call_id: toolCallId };
        if (args.content === undefined || args.content === null) return { error: 'Missing required argument "content".', tool_call_id: toolCallId };

        const targetPath = resolveWorkspacePath(root, rawPath);
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        // Record pre-mutation snapshot
        const snapshot = checkpointsManager.recordPreMutation(sessionId, targetPath);
        fs.writeFileSync(targetPath, args.content, 'utf8');
        checkpointsManager.recordPostMutation(snapshot.id, args.content);

        return {
          result: `Successfully wrote ${Buffer.byteLength(args.content, 'utf8')} bytes to ${rawPath}`,
          tool_call_id: toolCallId,
          filePath: targetPath
        };
      }

      // 6. Native Filesystem: edit_file
      if (toolName === 'edit_file') {
        const rawPath = args.path || args.filePath;
        if (!rawPath) return { error: 'Missing required argument "path".', tool_call_id: toolCallId };
        if (!args.target_content && args.target_content !== '') return { error: 'Missing required argument "target_content".', tool_call_id: toolCallId };
        if (args.replacement_content === undefined) return { error: 'Missing required argument "replacement_content".', tool_call_id: toolCallId };

        const targetPath = resolveWorkspacePath(root, rawPath, { mustExist: true });
        if (!fs.existsSync(targetPath)) return { error: `File not found: ${rawPath}`, tool_call_id: toolCallId };

        const existingContent = fs.readFileSync(targetPath, 'utf8');
        const targetContent = args.target_content;
        const replacementContent = args.replacement_content;

        if (!existingContent.includes(targetContent)) {
          return {
            error: `Target content not found in ${rawPath}. Ensure exact characters, whitespace and indentation match.`,
            tool_call_id: toolCallId
          };
        }

        // Record pre-mutation snapshot
        const snapshot = checkpointsManager.recordPreMutation(sessionId, targetPath);
        const newContent = existingContent.replace(targetContent, replacementContent);
        fs.writeFileSync(targetPath, newContent, 'utf8');
        checkpointsManager.recordPostMutation(snapshot.id, newContent);

        return {
          result: `Successfully edited ${rawPath}. Replaced target block.`,
          tool_call_id: toolCallId,
          filePath: targetPath
        };
      }

      // 7. Native Filesystem: list_directory
      if (toolName === 'list_directory') {
        const rawPath = args.path || '.';
        const targetPath = resolveWorkspacePath(root, rawPath, { mustExist: true });
        if (!fs.existsSync(targetPath)) return { error: `Directory not found: ${rawPath}`, tool_call_id: toolCallId };

        const entries = fs.readdirSync(targetPath, { withFileTypes: true });
        const items = entries.map(e => {
          let size = null;
          if (e.isFile()) {
            try { size = fs.statSync(path.join(targetPath, e.name)).size; } catch (err) {}
          }
          return {
            name: e.name,
            type: e.isDirectory() ? 'directory' : (e.isFile() ? 'file' : 'other'),
            size
          };
        });

        return {
          result: limitContentLength(JSON.stringify(items, null, 2), outputLimit),
          tool_call_id: toolCallId
        };
      }

      // 8. Native Filesystem: glob_search
      if (toolName === 'glob_search') {
        const pattern = (args.pattern || '').toLowerCase();
        const baseDir = resolveWorkspacePath(root, args.path || '.', { mustExist: true });
        const maxResults = args.max_results || 50;

        const results = [];
        function walk(currentDir, depth = 0) {
          if (depth > 6 || results.length >= maxResults) return;
          try {
            const list = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const item of list) {
              if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist' || item.name === 'release') continue;
              const full = path.join(currentDir, item.name);
              const rel = path.relative(baseDir, full);
              if (item.isDirectory()) {
                walk(full, depth + 1);
              } else if (item.isFile()) {
                const ext = path.extname(item.name).toLowerCase();
                if (!pattern || item.name.toLowerCase().includes(pattern) || (pattern.startsWith('*.') && ext === pattern.slice(1))) {
                  results.push(rel);
                  if (results.length >= maxResults) break;
                }
              }
            }
          } catch (err) {}
        }
        walk(baseDir);

        return {
          result: limitContentLength(JSON.stringify(results, null, 2), outputLimit),
          tool_call_id: toolCallId
        };
      }

      // 9. Native Filesystem: grep_search
      if (toolName === 'grep_search') {
        const query = args.query;
        if (!query) return { error: 'Missing required argument "query".', tool_call_id: toolCallId };
        const baseDir = resolveWorkspacePath(root, args.path || '.', { mustExist: true });
        const isRegex = Boolean(args.is_regex);
        const caseSensitive = Boolean(args.case_sensitive);
        const maxResults = args.max_results || 50;

        let regex;
        try {
          regex = new RegExp(isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
        } catch (err) {
          return { error: `Invalid regex pattern: ${err.message}`, tool_call_id: toolCallId };
        }

        const matches = [];
        function searchDir(currentDir, depth = 0) {
          if (depth > 6 || matches.length >= maxResults) return;
          try {
            const list = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const item of list) {
              if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist' || item.name === 'release') continue;
              const full = path.join(currentDir, item.name);
              if (item.isDirectory()) {
                searchDir(full, depth + 1);
              } else if (item.isFile()) {
                try {
                  const content = fs.readFileSync(full, 'utf8');
                  const lines = content.split(/\r?\n/);
                  for (let i = 0; i < lines.length; i++) {
                    if (regex.test(lines[i])) {
                      matches.push({
                        file: path.relative(baseDir, full),
                        line: i + 1,
                        content: lines[i].trim()
                      });
                      if (matches.length >= maxResults) break;
                    }
                  }
                } catch (readErr) {}
              }
            }
          } catch (err) {}
        }
        searchDir(baseDir);

        return {
          result: limitContentLength(JSON.stringify(matches, null, 2), outputLimit),
          tool_call_id: toolCallId
        };
      }

      // 10. Direct Process Exec (no shell interpretation)
      if (toolName === 'process_exec') {
        const executable = args.executable;
        if (!executable) return { error: 'Missing required argument "executable".', tool_call_id: toolCallId };
        const processArgs = args.arguments || [];
        const execCwd = resolveWorkspacePath(root, args.cwd || '.', { mustExist: true });
        const timeoutMs = Math.min(Math.max(Number(args.timeout_ms) || 30000, 1000), 120000);
        const allowedExecutables = Array.isArray(settings.agentExecutableAllowlist)
          ? settings.agentExecutableAllowlist
          : DEFAULT_AGENT_EXECUTABLES;
        const processResult = await shellManager.execFile(sessionId, executable, processArgs, {
          cwd: execCwd,
          timeoutMs,
          maxOutputBytes: outputLimit,
          networkAccess: args.network_access === true,
          allowedExecutables,
          envAllowlist: Array.isArray(settings.agentEnvironmentAllowlist) ? settings.agentEnvironmentAllowlist : []
        });
        return {
          result: limitContentLength(JSON.stringify(processResult, null, 2), outputLimit),
          tool_call_id: toolCallId,
          exitCode: processResult.exitCode
        };
      }

      // 11. Native Shell Exec
      if (toolName === 'shell_exec') {
        const command = args.command;
        if (!command) return { error: 'Missing required argument "command".', tool_call_id: toolCallId };
        const execCwd = resolveWorkspacePath(root, args.cwd || '.', { mustExist: true });
        const timeoutMs = Math.min(Math.max(Number(args.timeout_ms) || 30000, 1000), 120000);

        const shellResult = await shellManager.exec(sessionId, command, {
          cwd: execCwd,
          timeoutMs,
          maxOutputBytes: outputLimit,
          networkAccess: args.network_access === true,
          allowSystemCommands: settings.agentAllowSystemCommands === true,
          envAllowlist: Array.isArray(settings.agentEnvironmentAllowlist) ? settings.agentEnvironmentAllowlist : []
        });
        return {
          result: limitContentLength(JSON.stringify(shellResult, null, 2), outputLimit),
          tool_call_id: toolCallId,
          exitCode: shellResult.exitCode
        };
      }

      // 12. Native Git Commands
      if (toolName === 'git_status') {
        const targetRepo = resolveWorkspacePath(root, args.repo_path || '.', { mustExist: true });
        const status = await getRepositoryStatus(targetRepo);
        return {
          result: limitContentLength(JSON.stringify(status, null, 2), outputLimit),
          tool_call_id: toolCallId
        };
      }

      if (toolName === 'git_diff') {
        const targetRepo = resolveWorkspacePath(root, args.repo_path || '.', { mustExist: true });
        const gitArgs = args.cached ? ['diff', '--cached'] : ['diff', 'HEAD'];
        const diff = await runGit(targetRepo, gitArgs);
        return {
          result: limitContentLength(diff.stdout || 'No changes found.', outputLimit),
          tool_call_id: toolCallId
        };
      }

      if (toolName === 'git_commit') {
        const message = args.message;
        if (!message) return { error: 'Missing required argument "message".', tool_call_id: toolCallId };
        const targetRepo = resolveWorkspacePath(root, args.repo_path || '.', { mustExist: true });
        await runGit(targetRepo, ['add', '--all']);
        const commit = await runGit(targetRepo, ['commit', '-m', message.trim()]);
        return {
          result: limitContentLength(commit.stdout || 'Committed successfully.', outputLimit),
          tool_call_id: toolCallId
        };
      }

      // 12. Native Browser / URL Fetching
      if (toolName === 'read_url_content' || toolName === 'fetch_url') {
        const targetUrl = args.url || args.targetUrl;
        if (!targetUrl) return { error: 'Missing required argument "url".', tool_call_id: toolCallId };
        const pageRes = await browserManager.fetchPageContent(targetUrl, args.timeout_ms || 10000);
        return {
          result: limitContentLength(JSON.stringify(pageRes, null, 2), outputLimit),
          tool_call_id: toolCallId
        };
      }

      // 13. Native Background Tasks
      if (toolName === 'run_background_task') {
        const command = args.command;
        if (!command) return { error: 'Missing required argument "command".', tool_call_id: toolCallId };
        const taskCwd = resolveWorkspacePath(root, args.cwd || '.', { mustExist: true });
        const taskInfo = taskManager.runTask({
          command,
          name: args.name || command,
          runner: args.runner,
          cwd: taskCwd,
          timeoutMs: Math.min(Math.max(Number(args.timeout_ms) || 300000, 1000), 3600000),
          networkAccess: args.network_access === true,
          allowSystemCommands: settings.agentAllowSystemCommands === true,
          restrictedEnv: true,
          maxOutputBytes: Number(settings.toolOutputLimitBytes) || 1_000_000,
          envAllowlist: Array.isArray(settings.agentEnvironmentAllowlist) ? settings.agentEnvironmentAllowlist : []
        });
        return {
          result: limitContentLength(JSON.stringify(taskInfo, null, 2), outputLimit),
          tool_call_id: toolCallId,
          taskId: taskInfo.id
        };
      }

      if (toolName === 'list_background_tasks') {
        const tasks = taskManager.listTasks();
        return {
          result: limitContentLength(JSON.stringify(tasks, null, 2), outputLimit),
          tool_call_id: toolCallId
        };
      }

      if (toolName === 'kill_background_task') {
        const taskId = args.task_id || args.taskId;
        if (!taskId) return { error: 'Missing required argument "task_id".', tool_call_id: toolCallId };
        const killed = taskManager.killTask(taskId);
        return {
          result: JSON.stringify({ success: killed, taskId }),
          tool_call_id: toolCallId
        };
      }

      // 12. MCP Tools
      const mcpTool = discoveredTools.find(t => t.name === toolName);
      if (mcpTool) {
        const client = mcpClients[mcpTool.serverName];
        if (!client) {
          return {
            error: `MCP server "${mcpTool.serverName}" is not currently connected.`,
            tool_call_id: toolCallId
          };
        }
        const mcpResponse = await client.callTool({
          name: toolName,
          arguments: args
        });
        const formattedMcp = limitContentLength(JSON.stringify(mcpResponse?.content || mcpResponse, null, 2), outputLimit);
        return {
          result: formattedMcp,
          tool_call_id: toolCallId
        };
      }

      return {
        error: `Unknown tool "${toolName}".`,
        tool_call_id: toolCallId
      };
    } catch (err) {
      return {
        error: `Error executing tool "${toolName}": ${err.message}`,
        tool_call_id: toolCallId
      };
    }
  }
}

const toolExecutor = new ToolExecutor();

module.exports = {
  ToolExecutor,
  toolExecutor
};

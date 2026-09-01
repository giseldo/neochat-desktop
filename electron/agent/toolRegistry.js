/**
 * ToolRegistry - Catalog of Native Neo Tools and MCP Tools.
 */

const NATIVE_TOOLS = {
  read_file: {
    name: 'read_file',
    type: 'native',
    description: 'Read the contents of a file from the workspace filesystem. Can read whole files or specific line ranges.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path relative to the authorized workspace root.'
        },
        start_line: {
          type: 'integer',
          description: 'Optional 1-indexed start line number.'
        },
        end_line: {
          type: 'integer',
          description: 'Optional 1-indexed end line number (inclusive).'
        }
      },
      required: ['path']
    }
  },

  write_file: {
    name: 'write_file',
    type: 'native',
    description: 'Create a new file or completely overwrite an existing file with the provided content.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path relative to the authorized workspace root.'
        },
        content: {
          type: 'string',
          description: 'The exact string content to write to the file.'
        },
        overwrite: {
          type: 'boolean',
          description: 'Whether to overwrite if the file already exists (default: true).'
        }
      },
      required: ['path', 'content']
    }
  },

  edit_file: {
    name: 'edit_file',
    type: 'native',
    description: 'Edit a specific contiguous block of text in an existing file by matching exact content.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path relative to the authorized workspace root.'
        },
        target_content: {
          type: 'string',
          description: 'The exact string to find and replace in the file (must match exactly including indentation).'
        },
        replacement_content: {
          type: 'string',
          description: 'The replacement string to put in place of target_content.'
        },
        start_line: {
          type: 'integer',
          description: 'Optional 1-indexed line number where target_content is expected to start.'
        },
        end_line: {
          type: 'integer',
          description: 'Optional 1-indexed line number where target_content is expected to end.'
        }
      },
      required: ['path', 'target_content', 'replacement_content']
    }
  },

  list_directory: {
    name: 'list_directory',
    type: 'native',
    description: 'List contents (files and directories) in a workspace directory.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path relative to the authorized workspace root.'
        },
        recursive: {
          type: 'boolean',
          description: 'Whether to recursively list child directories (default: false).'
        },
        max_depth: {
          type: 'integer',
          description: 'Maximum recursion depth when recursive is true (default: 2).'
        }
      }
    }
  },

  glob_search: {
    name: 'glob_search',
    type: 'native',
    description: 'Find files matching a glob pattern (e.g. "**/*.js", "src/**/*.jsx").',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to search for (e.g. "**/*.ts", "components/*.jsx").'
        },
        path: {
          type: 'string',
          description: 'Base directory to search in (defaults to workspace root).'
        },
        max_results: {
          type: 'integer',
          description: 'Maximum number of results to return (default: 50).'
        }
      },
      required: ['pattern']
    }
  },

  grep_search: {
    name: 'grep_search',
    type: 'native',
    description: 'Search for text or regex pattern across workspace files.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query text or regular expression.'
        },
        path: {
          type: 'string',
          description: 'Base directory or specific file to search within (defaults to workspace root).'
        },
        is_regex: {
          type: 'boolean',
          description: 'Whether query is a regex pattern (default: false).'
        },
        case_sensitive: {
          type: 'boolean',
          description: 'Whether matching is case sensitive (default: false).'
        },
        max_results: {
          type: 'integer',
          description: 'Maximum matching lines/files to return (default: 50).'
        }
      },
      required: ['query']
    }
  },

  shell_exec: {
    name: 'shell_exec',
    type: 'native',
    description: 'Execute a shell command in the project workspace terminal (e.g. "pnpm test", "git status", "node build.js").',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command line string to execute.'
        },
        cwd: {
          type: 'string',
          description: 'Working directory (defaults to current workspace root).'
        },
        timeout_ms: {
          type: 'integer',
          description: 'Execution timeout in milliseconds (default: 30000).'
        }
      },
      required: ['command']
    }
  },

  git_status: {
    name: 'git_status',
    type: 'native',
    description: 'Get current Git repository status (branch, changed files, untracked files).',
    parameters: {
      type: 'object',
      properties: {
        repo_path: {
          type: 'string',
          description: 'Directory path of the Git repository (defaults to workspace root).'
        }
      }
    }
  },

  git_diff: {
    name: 'git_diff',
    type: 'native',
    description: 'Get Git diff showing uncommitted changes in the repository.',
    parameters: {
      type: 'object',
      properties: {
        repo_path: {
          type: 'string',
          description: 'Directory path of the Git repository (defaults to workspace root).'
        },
        cached: {
          type: 'boolean',
          description: 'If true, view staged changes (--cached).'
        }
      }
    }
  },

  git_commit: {
    name: 'git_commit',
    type: 'native',
    description: 'Stage all changes and create a git commit with a descriptive message.',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Commit message following conventional commits format.'
        },
        repo_path: {
          type: 'string',
          description: 'Directory path of the Git repository (defaults to workspace root).'
        }
      },
      required: ['message']
    }
  },

  web_search: {
    name: 'web_search',
    type: 'native',
    description: 'Search the web in real-time for documentation, current events, APIs, or troubleshooting information.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query.'
        },
        max_results: {
          type: 'integer',
          description: 'Number of search results to return (default: 5).'
        }
      },
      required: ['query']
    }
  },

  query_project_knowledge: {
    name: 'query_project_knowledge',
    type: 'native',
    description: 'Query indexed knowledge base / RAG documentation for the active project.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Semantic or keyword search query for indexed knowledge.'
        },
        project_id: {
          type: 'string',
          description: 'Optional project ID (defaults to active project).'
        }
      },
      required: ['query']
    }
  },

  canvas_create_document: {
    name: 'canvas_create_document',
    type: 'native',
    description: 'Create a new document or code artifact in the interactive Canvas panel.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the document.' },
        content: { type: 'string', description: 'Content of the document.' },
        language: { type: 'string', description: 'Language / format (e.g. markdown, javascript, python, html).' }
      },
      required: ['title', 'content']
    }
  },

  canvas_update_document: {
    name: 'canvas_update_document',
    type: 'native',
    description: 'Replace the full content of the currently open Canvas document.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'New full content for the document.' }
      },
      required: ['content']
    }
  },

  canvas_edit_selection: {
    name: 'canvas_edit_selection',
    type: 'native',
    description: 'Edit a specific selected part of the active Canvas document.',
    parameters: {
      type: 'object',
      properties: {
        targetText: { type: 'string', description: 'Text to replace in the document.' },
        replacementText: { type: 'string', description: 'New replacement text.' }
      },
      required: ['targetText', 'replacementText']
    }
  },

  read_url_content: {
    name: 'read_url_content',
    type: 'native',
    description: 'Fetch content, HTML, or API responses from a URL (e.g. "http://localhost:8080/api", "http://localhost:5173", or public documentation).',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch content from.'
        },
        timeout_ms: {
          type: 'integer',
          description: 'Timeout in milliseconds (default: 10000).'
        }
      },
      required: ['url']
    }
  },

  run_background_task: {
    name: 'run_background_task',
    type: 'native',
    description: 'Launch a command as an asynchronous background task (e.g. starting dev servers, background builds, tests).',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell or node command string to execute in background.'
        },
        name: {
          type: 'string',
          description: 'Descriptive title for the background task (e.g. "Verify deploy after push", "Build app").'
        },
        runner: {
          type: 'string',
          description: 'Runner environment: "PowerShell", "Bash", or "Node".'
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the task.'
        }
      },
      required: ['command']
    }
  },

  list_background_tasks: {
    name: 'list_background_tasks',
    type: 'native',
    description: 'List all running and completed background tasks and their execution statuses.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  kill_background_task: {
    name: 'kill_background_task',
    type: 'native',
    description: 'Stop or cancel an active background task by its task ID.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The ID of the background task to cancel.'
        }
      },
      required: ['task_id']
    }
  },

  canvas_get_document: {
    name: 'canvas_get_document',
    type: 'native',
    description: 'Get the latest content and metadata of the currently active Canvas document.',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
};

class ToolRegistry {
  constructor() {
    this.nativeTools = new Map(Object.entries(NATIVE_TOOLS));
  }

  /**
   * Get tool definition by name.
   * @param {string} toolName
   * @param {Array<object>} [mcpTools=[]]
   * @returns {object|null}
   */
  getTool(toolName, mcpTools = []) {
    if (this.nativeTools.has(toolName)) {
      return this.nativeTools.get(toolName);
    }
    const mcpTool = mcpTools.find(t => t.name === toolName);
    if (mcpTool) {
      return {
        name: mcpTool.name,
        type: 'mcp',
        description: mcpTool.description || '',
        parameters: mcpTool.inputSchema || mcpTool.parameters || { type: 'object', properties: {} },
        serverName: mcpTool.serverName || 'mcp'
      };
    }
    return null;
  }

  /**
   * Format all available tools for OpenAI/Groq API consumption.
   * @param {object} options
   * @param {string} [options.mode='chat'] - 'chat' | 'code' | 'work'
   * @param {boolean} [options.agentMode=false]
   * @param {boolean} [options.isCanvasOpen=false]
   * @param {boolean} [options.webSearchEnabled=true]
   * @param {Array<object>} [options.mcpTools=[]]
   * @returns {Array<object>}
   */
  getFormattedTools(options = {}) {
    const {
      mode = 'chat',
      agentMode = false,
      isCanvasOpen = false,
      webSearchEnabled = true,
      mcpTools = []
    } = options;

    const selectedTools = [];

    // 1. In Coding or Agent Mode, include full filesystem & shell & git tools
    if (mode === 'code' || agentMode) {
      selectedTools.push(
        NATIVE_TOOLS.read_file,
        NATIVE_TOOLS.write_file,
        NATIVE_TOOLS.edit_file,
        NATIVE_TOOLS.list_directory,
        NATIVE_TOOLS.glob_search,
        NATIVE_TOOLS.grep_search,
        NATIVE_TOOLS.shell_exec,
        NATIVE_TOOLS.git_status,
        NATIVE_TOOLS.git_diff,
        NATIVE_TOOLS.git_commit,
        NATIVE_TOOLS.query_project_knowledge,
        NATIVE_TOOLS.run_background_task,
        NATIVE_TOOLS.list_background_tasks,
        NATIVE_TOOLS.kill_background_task,
        NATIVE_TOOLS.read_url_content
      );
    } else {
      // In Chat / Work mode, include lighter reading tools
      selectedTools.push(
        NATIVE_TOOLS.query_project_knowledge,
        NATIVE_TOOLS.read_url_content
      );
    }

    // 2. Web search tool
    if (webSearchEnabled) {
      selectedTools.push(NATIVE_TOOLS.web_search);
    }

    // 3. Canvas tools
    if (isCanvasOpen || mode === 'work' || mode === 'code') {
      selectedTools.push(
        NATIVE_TOOLS.canvas_create_document,
        NATIVE_TOOLS.canvas_update_document,
        NATIVE_TOOLS.canvas_edit_selection,
        NATIVE_TOOLS.canvas_get_document
      );
    }

    // 4. MCP Tools
    if (Array.isArray(mcpTools)) {
      for (const mcpTool of mcpTools) {
        if (!mcpTool || !mcpTool.name) continue;
        selectedTools.push({
          name: mcpTool.name,
          type: 'mcp',
          description: mcpTool.description || '',
          parameters: mcpTool.inputSchema || mcpTool.parameters || { type: 'object', properties: {} },
          serverName: mcpTool.serverName
        });
      }
    }

    // Deduplicate by name and format for OpenAI function calling
    const seen = new Set();
    const formatted = [];

    for (const tool of selectedTools) {
      if (!tool || !tool.name || seen.has(tool.name)) continue;
      seen.add(tool.name);

      formatted.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters || { type: 'object', properties: {} }
        }
      });
    }

    return formatted;
  }
}

const toolRegistry = new ToolRegistry();

module.exports = {
  ToolRegistry,
  toolRegistry,
  NATIVE_TOOLS
};

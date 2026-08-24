const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

let appInstance = null;

function initialize(app) {
  appInstance = app;
}

/**
 * Check availability of local runtimes (Python, Node)
 */
function checkRuntimes() {
  const result = {
    python: { available: false, command: null, version: null },
    node: { available: false, command: null, version: null }
  };

  // Check Python commands in order of preference
  const pythonCandidates = process.platform === 'win32' 
    ? ['python', 'py', 'python3'] 
    : ['python3', 'python'];

  for (const cmd of pythonCandidates) {
    try {
      const output = execSync(`${cmd} --version`, { timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      if (output.toLowerCase().includes('python')) {
        result.python = {
          available: true,
          command: cmd,
          version: output
        };
        break;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  // Check Node.js
  try {
    const nodeOutput = execSync('node --version', { timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    if (nodeOutput.startsWith('v')) {
      result.node = {
        available: true,
        command: 'node',
        version: `Node.js ${nodeOutput}`
      };
    }
  } catch (err) {
    // Node not available via CLI
  }

  return result;
}

/**
 * Execute code locally using installed runtimes
 * @param {Object} params
 * @param {string} params.language - 'python' | 'py' | 'javascript' | 'js' | 'ts'
 * @param {string} params.code - source code to execute
 * @param {number} [params.timeout=20000] - timeout in milliseconds
 * @returns {Promise<Object>} Execution result
 */
async function executeLocalCode({ language, code, timeout = 20000 }) {
  const lang = (language || '').toLowerCase().trim();
  const isPython = lang === 'python' || lang === 'py';
  const isJS = lang === 'javascript' || lang === 'js' || lang === 'ts' || lang === 'typescript';

  if (!isPython && !isJS) {
    return {
      success: false,
      stdout: '',
      stderr: `Language "${language}" is not supported for local execution. Supported: python, javascript.`,
      exitCode: 1,
      durationMs: 0,
      error: 'Unsupported language'
    };
  }

  const runtimes = checkRuntimes();
  if (isPython && !runtimes.python.available) {
    return {
      success: false,
      stdout: '',
      stderr: 'Python was not found on your system. Please install Python or use the WebAssembly (Pyodide) runner.',
      exitCode: 1,
      durationMs: 0,
      error: 'Python not installed'
    };
  }

  if (isJS && !runtimes.node.available) {
    return {
      success: false,
      stdout: '',
      stderr: 'Node.js runtime was not found on your system PATH.',
      exitCode: 1,
      durationMs: 0,
      error: 'Node not installed'
    };
  }

  // Create temporary file
  const tempDir = path.join(os.tmpdir(), 'neochat-code-runner');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const ext = isPython ? '.py' : '.js';
  const tempFile = path.join(tempDir, `script_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`);

  try {
    fs.writeFileSync(tempFile, code, 'utf8');

    const cmd = isPython ? runtimes.python.command : runtimes.node.command;
    const args = isPython ? ['-u', tempFile] : [tempFile];

    const startTime = Date.now();

    return await new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const child = spawn(cmd, args, {
        cwd: tempDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      const timer = setTimeout(() => {
        isTimedOut = true;
        try {
          child.kill('SIGKILL');
        } catch (e) {}
      }, timeout);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        resolve({
          success: false,
          stdout,
          stderr: stderr ? `${stderr}\n${err.message}` : err.message,
          exitCode: 1,
          durationMs,
          error: err.message
        });
      });

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;

        if (isTimedOut) {
          resolve({
            success: false,
            stdout,
            stderr: `${stderr}\nExecution timed out after ${timeout / 1000}s.`,
            exitCode: -1,
            durationMs,
            error: 'Execution timed out'
          });
        } else {
          resolve({
            success: exitCode === 0,
            stdout,
            stderr,
            exitCode: exitCode ?? 0,
            durationMs,
            error: exitCode === 0 ? null : (stderr || `Process exited with code ${exitCode}`)
          });
        }
      });
    });
  } catch (error) {
    return {
      success: false,
      stdout: '',
      stderr: error.message,
      exitCode: 1,
      durationMs: 0,
      error: error.message
    };
  } finally {
    // Clean up temporary script file
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (e) {}
  }
}

/**
 * Initialize IPC handlers for code runner
 * @param {Electron.IpcMain} ipcMain
 */
function initializeCodeRunnerHandlers(ipcMain) {
  ipcMain.handle('code-runner-check-runtimes', async () => {
    return checkRuntimes();
  });

  ipcMain.handle('code-runner-execute', async (event, params) => {
    return executeLocalCode(params || {});
  });
}

module.exports = {
  initialize,
  checkRuntimes,
  executeLocalCode,
  initializeCodeRunnerHandlers
};

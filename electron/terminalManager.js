/**
 * TerminalManager - Interactive multi-session terminal management for NeoChat Desktop.
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

class TerminalSession {
  constructor(id, options = {}) {
    this.id = id;
    this.name = options.name || `Terminal ${id}`;
    this.cwd = options.cwd || process.cwd();
    this.shell = options.shell || this.getDefaultShell();
    this.history = [];
    this.outputBuffer = [];
    this.maxBufferLines = 2000;
    this.activeChild = null;
    this.createdAt = Date.now();
  }

  getDefaultShell() {
    if (process.platform === 'win32') {
      return 'powershell.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  /**
   * Execute a command in this terminal session.
   * @param {string} commandLine
   * @param {object} options
   * @param {function} [options.onData]
   * @param {string} [options.cwd]
   * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
   */
  async exec(commandLine, options = {}) {
    if (options.cwd) {
      this.cwd = options.cwd;
    }
    const execCwd = this.cwd;
    const isWindows = process.platform === 'win32';
    const shellCmd = this.shell || this.getDefaultShell();
    
    let shellArgs;
    if (isWindows) {
      if (shellCmd.toLowerCase().includes('cmd.exe')) {
        shellArgs = ['/c', commandLine];
      } else {
        shellArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', commandLine];
      }
    } else {
      shellArgs = ['-c', commandLine];
    }

    const commandEntry = {
      command: commandLine,
      timestamp: Date.now(),
      cwd: execCwd
    };
    this.history.push(commandEntry);

    // Initial banner / command line output
    const promptLine = `\x1b[32m${execCwd}\x1b[0m \x1b[33m>\x1b[0m ${commandLine}\r\n`;
    this.appendOutput(promptLine);
    if (options.onData) options.onData({ sessionId: this.id, data: promptLine, stream: 'stdout' });

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      try {
        const child = spawn(shellCmd, shellArgs, {
          cwd: execCwd,
          env: {
            ...process.env,
            FORCE_COLOR: '1',
            COLORTERM: 'truecolor',
            TERM: 'xterm-256color',
            PAGER: 'cat'
          },
          windowsHide: true
        });

        this.activeChild = child;

        if (child.stdout) {
          child.stdout.on('data', (chunk) => {
            const text = chunk.toString('utf8');
            stdout += text;
            this.appendOutput(text);
            if (options.onData) options.onData({ sessionId: this.id, data: text, stream: 'stdout' });
          });
        }

        if (child.stderr) {
          child.stderr.on('data', (chunk) => {
            const text = chunk.toString('utf8');
            stderr += text;
            this.appendOutput(text);
            if (options.onData) options.onData({ sessionId: this.id, data: text, stream: 'stderr' });
          });
        }

        child.on('error', (err) => {
          const errText = `\r\n\x1b[31m[Terminal Error: ${err.message}]\x1b[0m\r\n`;
          stderr += errText;
          this.appendOutput(errText);
          if (options.onData) options.onData({ sessionId: this.id, data: errText, stream: 'stderr' });
          this.activeChild = null;
          resolve({ stdout, stderr, exitCode: 1 });
        });

        child.on('close', (code) => {
          this.activeChild = null;
          // Check for CD commands to update session cwd
          if (commandLine.trim().startsWith('cd ') || commandLine.trim().startsWith('Set-Location ')) {
            const targetDir = commandLine.trim().replace(/^(cd|Set-Location)\s+/, '').replace(/["']/g, '').trim();
            try {
              const resolved = path.isAbsolute(targetDir) ? targetDir : path.resolve(execCwd, targetDir);
              const fs = require('fs');
              if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
                this.cwd = resolved;
              }
            } catch (_) {}
          }
          resolve({ stdout, stderr, exitCode: code ?? 0 });
        });
      } catch (err) {
        const errText = `\r\n\x1b[31m[Failed to spawn shell: ${err.message}]\x1b[0m\r\n`;
        this.appendOutput(errText);
        if (options.onData) options.onData({ sessionId: this.id, data: errText, stream: 'stderr' });
        this.activeChild = null;
        resolve({ stdout: '', stderr: errText, exitCode: 1 });
      }
    });
  }

  write(data) {
    if (this.activeChild && this.activeChild.stdin && !this.activeChild.stdin.destroyed) {
      try {
        this.activeChild.stdin.write(data);
      } catch (_) {}
    }
  }

  kill() {
    if (this.activeChild) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', this.activeChild.pid, '/f', '/t']);
        } else {
          this.activeChild.kill('SIGINT');
        }
      } catch (_) {}
      this.activeChild = null;
      const msg = `\r\n\x1b[33m[Process interrupted]\x1b[0m\r\n`;
      this.appendOutput(msg);
    }
  }

  appendOutput(text) {
    this.outputBuffer.push(text);
    if (this.outputBuffer.length > this.maxBufferLines) {
      this.outputBuffer.splice(0, this.outputBuffer.length - this.maxBufferLines);
    }
  }

  clear() {
    this.outputBuffer = [];
  }

  getBuffer() {
    return this.outputBuffer.join('');
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      cwd: this.cwd,
      shell: this.shell,
      isRunning: Boolean(this.activeChild),
      historyCount: this.history.length
    };
  }
}

class TerminalManager {
  constructor() {
    this.sessions = new Map();
    this.dataListeners = new Set();
    this.exitListeners = new Set();
  }

  initialize() {
    if (this.sessions.size === 0) {
      this.createSession({ id: 'term-1', name: 'PowerShell' });
    }
  }

  createSession(options = {}) {
    const id = options.id || `term-${Date.now()}`;
    const session = new TerminalSession(id, options);
    this.sessions.set(id, session);
    return session.getInfo();
  }

  getSession(id) {
    return this.sessions.get(id) || null;
  }

  listSessions() {
    return Array.from(this.sessions.values()).map(s => s.getInfo());
  }

  async exec(sessionId, commandLine, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Terminal session "${sessionId}" not found.`);
    }

    const onData = (payload) => {
      for (const listener of this.dataListeners) {
        try { listener(payload); } catch (_) {}
      }
    };

    return await session.exec(commandLine, { ...options, onData });
  }

  write(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.write(data);
      return true;
    }
    return false;
  }

  kill(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.kill();
      return true;
    }
    return false;
  }

  clearSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.clear();
      return true;
    }
    return false;
  }

  destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.kill();
      this.sessions.delete(sessionId);
      return true;
    }
    return false;
  }

  getBuffer(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.getBuffer() : '';
  }

  onData(callback) {
    this.dataListeners.add(callback);
    return () => this.dataListeners.delete(callback);
  }

  registerIpcHandlers(ipcMain, getWindow) {
    ipcMain.handle('terminal:create', async (_event, options) => {
      return this.createSession(options);
    });

    ipcMain.handle('terminal:list', async () => {
      return this.listSessions();
    });

    ipcMain.handle('terminal:exec', async (_event, { sessionId, command, cwd }) => {
      return await this.exec(sessionId, command, { cwd });
    });

    ipcMain.handle('terminal:write', async (_event, { sessionId, data }) => {
      return this.write(sessionId, data);
    });

    ipcMain.handle('terminal:kill', async (_event, { sessionId }) => {
      return this.kill(sessionId);
    });

    ipcMain.handle('terminal:clear', async (_event, { sessionId }) => {
      return this.clearSession(sessionId);
    });

    ipcMain.handle('terminal:destroy', async (_event, { sessionId }) => {
      return this.destroySession(sessionId);
    });

    ipcMain.handle('terminal:get-buffer', async (_event, { sessionId }) => {
      return this.getBuffer(sessionId);
    });

    // Pipe terminal streaming events to renderer window
    this.onData((payload) => {
      const win = getWindow ? getWindow() : null;
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal:data', payload);
      }
    });
  }
}

const terminalManager = new TerminalManager();

module.exports = {
  TerminalManager,
  TerminalSession,
  terminalManager
};

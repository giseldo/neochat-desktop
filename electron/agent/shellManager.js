/**
 * ShellManager - Persistent and on-demand terminal execution for the Neo Agent Runtime.
 */

const { spawn } = require('child_process');
const { buildRestrictedEnv, terminateProcessTree, validateCommand, validateDirectProcess } = require('./processPolicy');

class ShellSession {
  constructor(sessionId, cwd = process.cwd()) {
    this.sessionId = sessionId;
    this.cwd = cwd;
    this.history = [];
    this.activeProcess = null;
  }

  /**
   * Execute a command line in the context of this shell session.
   * @param {string} commandLine
   * @param {object} options
   * @param {number} [options.timeoutMs=30000]
   * @param {string} [options.cwd]
   * @param {function} [options.onData]
   * @returns {Promise<{ stdout: string, stderr: string, exitCode: number, durationMs: number }>}
   */
  async exec(commandLine, options = {}) {
    validateCommand(commandLine, {
      networkAccess: options.networkAccess,
      allowSystemCommands: options.allowSystemCommands
    });
    if (this.activeProcess) throw new Error('A command is already running in this shell session.');
    const isWindows = process.platform === 'win32';
    const shellCmd = isWindows ? 'powershell.exe' : (process.env.SHELL || '/bin/bash');
    const shellArgs = isWindows
      ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', commandLine]
      : ['-c', commandLine];
    return this._executeSpawn(shellCmd, shellArgs, commandLine, options);
  }

  async execFile(executable, args = [], options = {}) {
    validateDirectProcess(executable, args, {
      networkAccess: options.networkAccess,
      allowSystemCommands: options.allowSystemCommands,
      allowedExecutables: options.allowedExecutables
    });
    if (this.activeProcess) throw new Error('A command is already running in this shell session.');
    return this._executeSpawn(executable, args, [executable, ...args].join(' '), options);
  }

  _executeSpawn(spawnCommand, spawnArgs, commandLabel, options) {
    const cwd = options.cwd || this.cwd || process.cwd();
    const timeoutMs = Math.min(Math.max(Number(options.timeoutMs) || 30000, 1000), 120000);
    const maxOutputBytes = Math.min(Math.max(Number(options.maxOutputBytes) || 1_000_000, 16_384), 10_000_000);
    const startTime = Date.now();
    const isWindows = process.platform === 'win32';

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;
      let outputBytes = 0;
      let outputLimited = false;

      const child = spawn(spawnCommand, spawnArgs, {
        cwd,
        env: buildRestrictedEnv(process.env, options.envAllowlist || [], { networkAccess: options.networkAccess }),
        windowsHide: true,
        detached: !isWindows
      });

      this.activeProcess = child;

      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        try {
          terminateProcessTree(child);
        } catch (err) {
          // ignore
        }
      }, timeoutMs);

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          const chunk = data.toString('utf8');
          outputBytes += Buffer.byteLength(chunk);
          if (outputBytes <= maxOutputBytes) stdout += chunk;
          else if (!outputLimited) { outputLimited = true; terminateProcessTree(child); }
          if (options.onData) options.onData({ type: 'stdout', chunk });
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          const chunk = data.toString('utf8');
          outputBytes += Buffer.byteLength(chunk);
          if (outputBytes <= maxOutputBytes) stderr += chunk;
          else if (!outputLimited) { outputLimited = true; terminateProcessTree(child); }
          if (options.onData) options.onData({ type: 'stderr', chunk });
        });
      }

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        this.activeProcess = null;
        const durationMs = Date.now() - startTime;
        resolve({
          stdout,
          stderr: `Process error: ${err.message}`,
          exitCode: 1,
          durationMs
        });
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        this.activeProcess = null;
        const durationMs = Date.now() - startTime;

        if (isTimedOut) {
          stderr += `\n[Execution timed out after ${timeoutMs}ms]`;
        }
        if (outputLimited) stderr += `\n[Execution stopped after exceeding ${maxOutputBytes} output bytes]`;

        const result = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: isTimedOut ? 124 : (outputLimited ? 125 : (code ?? 0)),
          durationMs
        };

        this.history.push({
          command: commandLabel,
          cwd,
          timestamp: Date.now(),
          ...result
        });

        // Keep last 50 history entries
        if (this.history.length > 50) this.history.shift();

        resolve(result);
      });
    });
  }

  kill() {
    if (this.activeProcess) {
      try {
        terminateProcessTree(this.activeProcess);
      } catch (err) {
        // ignore
      }
      this.activeProcess = null;
    }
  }
}

class ShellManager {
  constructor() {
    this.sessions = new Map();
  }

  getOrCreateSession(sessionId = 'default', cwd = process.cwd()) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new ShellSession(sessionId, cwd));
    }
    const session = this.sessions.get(sessionId);
    if (cwd && cwd !== session.cwd) {
      session.cwd = cwd;
    }
    return session;
  }

  async exec(sessionId, commandLine, options = {}) {
    const session = this.getOrCreateSession(sessionId, options.cwd);
    return await session.exec(commandLine, options);
  }

  async execFile(sessionId, executable, args = [], options = {}) {
    const session = this.getOrCreateSession(sessionId, options.cwd);
    return await session.execFile(executable, args, options);
  }

  kill(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.kill();
      this.sessions.delete(sessionId);
    }
  }

  destroyAll() {
    for (const session of this.sessions.values()) {
      session.kill();
    }
    this.sessions.clear();
  }
}

// Export singleton instance
const shellManager = new ShellManager();

module.exports = {
  ShellManager,
  ShellSession,
  shellManager
};

/**
 * ShellManager - Persistent and on-demand terminal execution for the Neo Agent Runtime.
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

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
    const cwd = options.cwd || this.cwd || process.cwd();
    const timeoutMs = options.timeoutMs || 30000;
    const startTime = Date.now();

    const isWindows = process.platform === 'win32';
    const shellCmd = isWindows ? 'powershell.exe' : (process.env.SHELL || '/bin/bash');
    const shellArgs = isWindows 
      ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', commandLine]
      : ['-c', commandLine];

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const child = spawn(shellCmd, shellArgs, {
        cwd,
        env: {
          ...process.env,
          PAGER: 'cat',
          TERM: 'dumb',
          NODE_ENV: process.env.NODE_ENV || 'production'
        },
        windowsHide: true
      });

      this.activeProcess = child;

      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        try {
          if (isWindows) {
            spawn('taskkill', ['/pid', child.pid, '/f', '/t']);
          } else {
            child.kill('SIGTERM');
          }
        } catch (err) {
          // ignore
        }
      }, timeoutMs);

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          const chunk = data.toString('utf8');
          stdout += chunk;
          if (options.onData) options.onData({ type: 'stdout', chunk });
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          const chunk = data.toString('utf8');
          stderr += chunk;
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

        const result = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: isTimedOut ? 124 : (code ?? 0),
          durationMs
        };

        this.history.push({
          command: commandLine,
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
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', this.activeProcess.pid, '/f', '/t']);
        } else {
          this.activeProcess.kill('SIGTERM');
        }
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

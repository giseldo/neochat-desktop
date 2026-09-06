/**
 * TaskManager - Background Task Execution and Monitoring Engine for NeoChat Desktop.
 */

const { spawn } = require('child_process');
const { buildRestrictedEnv, terminateProcessTree, validateCommand } = require('./agent/processPolicy');

class BackgroundTask {
  constructor(options = {}) {
    this.id = options.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.name = options.name || options.command || 'Background Task';
    this.command = options.command || '';
    this.cwd = options.cwd || process.cwd();
    this.runner = options.runner || (process.platform === 'win32' ? 'PowerShell' : 'Bash');
    this.status = 'running'; // 'running' | 'completed' | 'error' | 'cancelled'
    this.startTime = Date.now();
    this.endTime = null;
    this.durationMs = 0;
    this.exitCode = null;
    this.logs = [];
    this.maxLogs = 5000;
    this.maxOutputBytes = Math.min(Math.max(Number(options.maxOutputBytes) || 5_000_000, 16_384), 25_000_000);
    this.outputBytes = 0;
    this.outputLimited = false;
    this.childProcess = null;
  }

  appendLog(type, text) {
    const bytes = Buffer.byteLength(String(text), 'utf8');
    if (this.outputBytes + bytes > this.maxOutputBytes) {
      this.outputLimited = true;
      return false;
    }
    this.outputBytes += bytes;
    this.logs.push({
      type, // 'stdout' | 'stderr' | 'info'
      text,
      timestamp: Date.now()
    });
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      command: this.command,
      cwd: this.cwd,
      runner: this.runner,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      durationMs: this.endTime ? (this.endTime - this.startTime) : (Date.now() - this.startTime),
      exitCode: this.exitCode,
      logCount: this.logs.length,
      outputLimited: this.outputLimited
    };
  }
}

class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.listeners = new Set();
  }

  onUpdate(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emitUpdate(event, data) {
    for (const listener of this.listeners) {
      try { listener(event, data); } catch (_) {}
    }
  }

  listTasks() {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.startTime - a.startTime)
      .map(t => t.toJSON());
  }

  getTask(taskId) {
    const task = this.tasks.get(taskId);
    return task ? task.toJSON() : null;
  }

  getTaskLogs(taskId) {
    const task = this.tasks.get(taskId);
    return task ? task.logs : [];
  }

  /**
   * Run a new background task.
   * @param {object} options
   * @param {string} options.command
   * @param {string} [options.name]
   * @param {string} [options.cwd]
   * @param {string} [options.runner]
   * @param {number} [options.timeoutMs]
   * @returns {object} task summary
   */
  runTask(options = {}) {
    validateCommand(options.command, {
      networkAccess: options.networkAccess !== false,
      allowSystemCommands: options.allowSystemCommands === true
    });
    const task = new BackgroundTask(options);
    this.tasks.set(task.id, task);

    const isWindows = process.platform === 'win32';
    let shellCmd;
    let shellArgs;

    if (task.runner.toLowerCase() === 'node') {
      shellCmd = 'node';
      shellArgs = ['-e', task.command];
    } else if (isWindows) {
      shellCmd = 'powershell.exe';
      shellArgs = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', task.command];
    } else {
      shellCmd = process.env.SHELL || '/bin/bash';
      shellArgs = ['-c', task.command];
    }

    this.emitUpdate('task:started', task.toJSON());

    try {
      const child = spawn(shellCmd, shellArgs, {
        cwd: task.cwd,
        env: options.restrictedEnv
          ? buildRestrictedEnv(process.env, options.envAllowlist || [], { networkAccess: options.networkAccess })
          : { ...process.env, FORCE_COLOR: '1', PAGER: 'cat', NODE_ENV: process.env.NODE_ENV || 'production' },
        windowsHide: true,
        detached: !isWindows
      });

      task.childProcess = child;

      if (child.stdout) {
        child.stdout.on('data', (chunk) => {
          const text = chunk.toString('utf8');
          if (task.appendLog('stdout', text)) {
            this.emitUpdate('task:output', { taskId: task.id, type: 'stdout', text });
          } else if (task.status === 'running') {
            task.status = 'error';
            terminateProcessTree(child);
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (chunk) => {
          const text = chunk.toString('utf8');
          if (task.appendLog('stderr', text)) {
            this.emitUpdate('task:output', { taskId: task.id, type: 'stderr', text });
          } else if (task.status === 'running') {
            task.status = 'error';
            terminateProcessTree(child);
          }
        });
      }

      child.on('error', (err) => {
        task.status = 'error';
        task.endTime = Date.now();
        task.durationMs = task.endTime - task.startTime;
        task.appendLog('stderr', `[Process Execution Error: ${err.message}]`);
        task.childProcess = null;
        this.emitUpdate('task:completed', task.toJSON());
      });

      child.on('close', (code) => {
        if (task.status === 'running') {
          task.status = (code === 0) ? 'completed' : 'error';
        }
        task.endTime = Date.now();
        task.durationMs = task.endTime - task.startTime;
        task.exitCode = code ?? 0;
        task.childProcess = null;
        this.emitUpdate('task:completed', task.toJSON());
      });

      if (options.timeoutMs && options.timeoutMs > 0) {
        setTimeout(() => {
          if (task.status === 'running') {
            this.killTask(task.id, 'Execution timed out');
          }
        }, options.timeoutMs);
      }
    } catch (err) {
      task.status = 'error';
      task.endTime = Date.now();
      task.durationMs = task.endTime - task.startTime;
      task.appendLog('stderr', `[Failed to spawn background process: ${err.message}]`);
      this.emitUpdate('task:completed', task.toJSON());
    }

    return task.toJSON();
  }

  killTask(taskId, reason = 'Stopped by user') {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.childProcess) {
      try {
        terminateProcessTree(task.childProcess);
      } catch (_) {}
      task.childProcess = null;
    }

    task.status = 'cancelled';
    task.endTime = Date.now();
    task.durationMs = task.endTime - task.startTime;
    task.appendLog('info', `[Task cancelled: ${reason}]`);
    this.emitUpdate('task:killed', task.toJSON());
    return true;
  }

  clearCompletedTasks() {
    for (const [id, task] of this.tasks.entries()) {
      if (task.status !== 'running') {
        this.tasks.delete(id);
      }
    }
    this.emitUpdate('task:cleared', { remainingCount: this.tasks.size });
    return this.listTasks();
  }

  registerIpcHandlers(ipcMain, getWindow) {
    if (!ipcMain) return;
    const safeHandle = (channel, fn) => {
      try {
        if (typeof ipcMain.removeHandler === 'function') {
          ipcMain.removeHandler(channel);
        }
      } catch (_) {}
      ipcMain.handle(channel, fn);
    };

    safeHandle('tasks:list', async () => {
      return this.listTasks();
    });

    safeHandle('tasks:run', async (_event, options) => {
      return this.runTask(options);
    });

    safeHandle('tasks:kill', async (_event, { taskId }) => {
      return this.killTask(taskId);
    });

    safeHandle('tasks:get-logs', async (_event, { taskId }) => {
      return this.getTaskLogs(taskId);
    });

    safeHandle('tasks:clear', async () => {
      return this.clearCompletedTasks();
    });

    // Pipe background task events to renderer window (avoid duplicate subscriptions)
    if (!this._hasRegisteredUpdatePipe) {
      this._hasRegisteredUpdatePipe = true;
      this.onUpdate((event, data) => {
        const win = getWindow ? getWindow() : null;
        if (win && !win.isDestroyed()) {
          win.webContents.send('tasks:event', { event, data });
        }
      });
    }
  }
}

const taskManager = new TaskManager();

module.exports = {
  TaskManager,
  BackgroundTask,
  taskManager
};

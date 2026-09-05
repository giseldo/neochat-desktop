const { spawn } = require('child_process');

const SAFE_ENV_KEYS = new Set([
  'PATH', 'Path', 'PATHEXT', 'SystemRoot', 'WINDIR', 'COMSPEC',
  'TEMP', 'TMP', 'TMPDIR', 'USERPROFILE', 'HOME', 'SHELL',
  'LANG', 'LC_ALL', 'TERM', 'COLORTERM', 'CI', 'NODE_ENV',
  'APPDATA', 'LOCALAPPDATA', 'PNPM_HOME'
]);
const DEFAULT_AGENT_EXECUTABLES = Object.freeze([
  'node', 'pnpm', 'npm', 'npx', 'git', 'rg', 'eslint', 'vite', 'electron-builder', 'tsc',
  'python', 'python3', 'py', 'cargo', 'rustc', 'go', 'java', 'javac', 'dotnet',
  'bash', 'sh', 'powershell', 'pwsh', 'cmd', 'docker', 'deno', 'uv', 'uvx'
]);

const NETWORK_COMMAND_PATTERN = /(^|[\s;&|])(curl|wget|ssh|scp|sftp|ftp|telnet|nc|ncat)\b|\b(Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer)\b|\bgit\s+(push|pull|fetch|clone)\b|\b(npm|pnpm|yarn)\s+(install|add|update|publish|dlx)\b/i;
const NETWORK_INDICATOR_PATTERN = /https?:\/\/|\b(iwr|irm)\b|\b(fetch|axios|requests?|urlopen|http\.client|https?\.request|net\.connect|socket)\s*\(|\b(pip|pip3|cargo|go|gem|composer)\s+(install|get|add|update)\b/i;
const SYSTEM_COMMAND_PATTERN = /(?:^|[;&|])\s*(diskpart|format|shutdown|reboot|bcdedit|reg|regedit|schtasks|sc|netsh|wmic|runas|sudo|su|mount|umount|mkfs|fdisk|Set-ExecutionPolicy|Enable-PSRemoting|Disable-PSRemoting)\b/i;

function normalizeExecutableName(executable) {
  return String(executable || '').trim().replace(/^['"]|['"]$/g, '').split(/[\\/]/).pop().replace(/\.(exe|cmd|bat|com)$/i, '').toLowerCase();
}

function assertAllowedExecutable(executable, options = {}) {
  const normalized = normalizeExecutableName(executable);
  if (!normalized) throw new TypeError('Executable must be a non-empty string.');
  const configured = Array.isArray(options.allowedExecutables) ? options.allowedExecutables : [];
  if (configured.length > 0) {
    const allowed = new Set(configured.map(normalizeExecutableName).filter(Boolean));
    if (!allowed.has(normalized)) {
      const error = new Error(`Executable "${normalized}" is not in the agent executable allowlist.`);
      error.code = 'EXECUTABLE_NOT_ALLOWED';
      throw error;
    }
  }
  return normalized;
}

function buildRestrictedEnv(source = process.env, extraAllowedKeys = [], options = {}) {
  const allowed = new Set([...SAFE_ENV_KEYS, ...extraAllowedKeys.filter(key => typeof key === 'string')]);
  const env = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (allowed.has(key) && typeof value === 'string') env[key] = value;
  }
  const restricted = {
    ...env,
    PAGER: 'cat',
    TERM: 'dumb',
    NO_COLOR: '1',
    NODE_ENV: env.NODE_ENV || 'production'
  };
  if (options.networkAccess !== true) {
    Object.assign(restricted, {
      HTTP_PROXY: 'http://127.0.0.1:9',
      HTTPS_PROXY: 'http://127.0.0.1:9',
      ALL_PROXY: 'http://127.0.0.1:9',
      NO_PROXY: '',
      GIT_TERMINAL_PROMPT: '0',
      npm_config_offline: 'true',
      PIP_NO_INDEX: '1'
    });
  }
  return restricted;
}

function validateCommand(commandLine, options = {}) {
  if (typeof commandLine !== 'string' || !commandLine.trim()) throw new TypeError('Command must be a non-empty string.');
  if (commandLine.length > 32_768) throw new RangeError('Command exceeds the maximum length.');
  if (options.allowSystemCommands !== true && SYSTEM_COMMAND_PATTERN.test(commandLine)) {
    const error = new Error('Operating-system administration commands are blocked for agent shell execution.');
    error.code = 'SYSTEM_COMMAND_BLOCKED';
    throw error;
  }
  if (options.networkAccess !== true && (NETWORK_COMMAND_PATTERN.test(commandLine) || NETWORK_INDICATOR_PATTERN.test(commandLine))) {
    const error = new Error('Command appears to require network access. Set network_access=true and approve that exact call.');
    error.code = 'NETWORK_ACCESS_REQUIRED';
    throw error;
  }
}

function validateDirectProcess(executable, args = [], options = {}) {
  const normalized = assertAllowedExecutable(executable, options);
  if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string')) throw new TypeError('Process arguments must be an array of strings.');
  if (args.length > 256 || args.reduce((total, arg) => total + arg.length, 0) > 32_768) throw new RangeError('Process arguments exceed the maximum size.');
  const representation = [normalized, ...args].join(' ');
  validateCommand(representation, options);
  return normalized;
}

function terminateProcessTree(child) {
  if (!child?.pid) return;
  try {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { windowsHide: true, stdio: 'ignore' });
      killer.unref();
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch (_error) { child.kill('SIGTERM'); }
    }
  } catch (_error) {
    // Process may already have exited.
  }
}

module.exports = {
  DEFAULT_AGENT_EXECUTABLES,
  assertAllowedExecutable,
  buildRestrictedEnv,
  normalizeExecutableName,
  terminateProcessTree,
  validateCommand,
  validateDirectProcess
};

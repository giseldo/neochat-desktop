const { spawn } = require('child_process');

const SAFE_ENV_KEYS = new Set([
  'PATH', 'Path', 'PATHEXT', 'SystemRoot', 'WINDIR', 'COMSPEC',
  'TEMP', 'TMP', 'TMPDIR', 'USERPROFILE', 'HOME', 'SHELL',
  'LANG', 'LC_ALL', 'TERM', 'COLORTERM', 'CI', 'NODE_ENV',
  'APPDATA', 'LOCALAPPDATA', 'PNPM_HOME'
]);

const NETWORK_COMMAND_PATTERN = /(^|[\s;&|])(curl|wget|ssh|scp|sftp|ftp|telnet|nc|ncat)\b|\b(Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer)\b|\bgit\s+(push|pull|fetch|clone)\b|\b(npm|pnpm|yarn)\s+(install|add|update|publish|dlx)\b/i;

function buildRestrictedEnv(source = process.env, extraAllowedKeys = []) {
  const allowed = new Set([...SAFE_ENV_KEYS, ...extraAllowedKeys.filter(key => typeof key === 'string')]);
  const env = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (allowed.has(key) && typeof value === 'string') env[key] = value;
  }
  return {
    ...env,
    PAGER: 'cat',
    TERM: 'dumb',
    NO_COLOR: '1',
    NODE_ENV: env.NODE_ENV || 'production'
  };
}

function validateCommand(commandLine, options = {}) {
  if (typeof commandLine !== 'string' || !commandLine.trim()) throw new TypeError('Command must be a non-empty string.');
  if (commandLine.length > 32_768) throw new RangeError('Command exceeds the maximum length.');
  if (options.networkAccess !== true && NETWORK_COMMAND_PATTERN.test(commandLine)) {
    const error = new Error('Command appears to require network access. Set network_access=true and approve that exact call.');
    error.code = 'NETWORK_ACCESS_REQUIRED';
    throw error;
  }
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

module.exports = { buildRestrictedEnv, terminateProcessTree, validateCommand };

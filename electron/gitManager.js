const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function validateRepository(repoPath) {
  if (typeof repoPath !== 'string' || !repoPath.trim()) throw new Error('Repository path is required');
  const resolved = path.resolve(repoPath.trim());
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) throw new Error('Repository directory does not exist');
  if (!fs.existsSync(path.join(resolved, '.git'))) throw new Error('Directory is not a Git repository');
  return resolved;
}

async function runGit(repoPath, args) {
  const cwd = validateRepository(repoPath);
  const { stdout, stderr } = await execFileAsync('git', ['--no-optional-locks', ...args], {
    cwd, windowsHide: true, timeout: 30000, maxBuffer: 2 * 1024 * 1024
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function getRepositoryStatus(repoPath) {
  const [{ stdout: status }, { stdout: branch }, { stdout: remotes }] = await Promise.all([
    runGit(repoPath, ['status', '--short', '--branch']),
    runGit(repoPath, ['branch', '--show-current']),
    runGit(repoPath, ['remote', '-v'])
  ]);
  return { status, branch, remotes };
}

function initializeGitHandlers(ipcMain, dialog) {
  ipcMain.handle('git-select-repository', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true };
    try { return { success: true, path: validateRepository(result.filePaths[0]) }; }
    catch (error) { return { success: false, error: error.message }; }
  });
  ipcMain.handle('git-status', async (_event, repoPath) => {
    try { return { success: true, ...(await getRepositoryStatus(repoPath)) }; }
    catch (error) { return { success: false, error: error.message }; }
  });
  ipcMain.handle('git-diff', async (_event, repoPath) => {
    try { return { success: true, ...(await runGit(repoPath, ['diff', '--stat', 'HEAD'])) }; }
    catch (error) { return { success: false, error: error.message }; }
  });
  ipcMain.handle('git-commit', async (_event, repoPath, message) => {
    if (typeof message !== 'string' || !message.trim()) return { success: false, error: 'Commit message is required' };
    try {
      await runGit(repoPath, ['add', '--all']);
      return { success: true, ...(await runGit(repoPath, ['commit', '-m', message.trim()])) };
    } catch (error) { return { success: false, error: error.stderr?.trim() || error.message }; }
  });
  ipcMain.handle('git-push', async (_event, repoPath) => {
    try { return { success: true, ...(await runGit(repoPath, ['push'])) }; }
    catch (error) { return { success: false, error: error.stderr?.trim() || error.message }; }
  });
}

module.exports = { validateRepository, runGit, getRepositoryStatus, initializeGitHandlers };

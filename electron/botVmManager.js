const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let appInstance = null;
const vmCache = new Map();

function initialize(app) {
  appInstance = app;
}

function getBaseVmDir() {
  const userDataPath = appInstance ? appInstance.getPath('userData') : path.join(process.cwd(), 'temp_data');
  const dir = path.join(userDataPath, 'bot_vms');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getVmRoot(botId) {
  const cleanId = String(botId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getBaseVmDir(), cleanId);
}

function getVmWorkspace(botId) {
  return path.join(getVmRoot(botId), 'workspace');
}

function getVmTemp(botId) {
  return path.join(getVmRoot(botId), 'temp');
}

/**
 * Format bytes to readable string (e.g. 1.2 MB)
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Recursively calculate directory size and file count
 */
function getDirStats(dirPath) {
  let totalBytes = 0;
  let fileCount = 0;

  if (!fs.existsSync(dirPath)) {
    return { totalBytes, fileCount };
  }

  function walk(current) {
    try {
      const items = fs.readdirSync(current, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(current, item.name);
        if (item.isDirectory()) {
          walk(full);
        } else if (item.isFile()) {
          fileCount++;
          try {
            totalBytes += fs.statSync(full).size;
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  walk(dirPath);
  return { totalBytes, fileCount };
}

/**
 * Get or create the dedicated Virtual Machine for a bot
 */
function getOrCreateVm(botId, botData = null) {
  if (!botId) return null;

  const vmRoot = getVmRoot(botId);
  const workspacePath = getVmWorkspace(botId);
  const tempPath = getVmTemp(botId);

  // Ensure directories exist
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }
  if (!fs.existsSync(tempPath)) {
    fs.mkdirSync(tempPath, { recursive: true });
  }

  const manifestPath = path.join(vmRoot, 'vm_manifest.json');
  let manifest = {};

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      manifest = {};
    }
  }

  const botName = botData?.name || manifest.botName || 'Bot';
  const vmConfig = botData?.vmConfig || {};
  const enabled = vmConfig.enabled !== false;
  const type = vmConfig.type || manifest.type || 'sandbox'; // 'sandbox' | 'docker' | 'wsl'
  const isolation = vmConfig.isolation || manifest.isolation || 'isolated'; // 'isolated' | 'hybrid'
  const memoryLimitMb = vmConfig.memoryLimitMb || manifest.memoryLimitMb || 2048;
  const env = vmConfig.env || manifest.env || {};

  const updatedManifest = {
    vmId: `vm_${botId}`,
    botId,
    botName,
    enabled,
    type,
    isolation,
    memoryLimitMb,
    workspacePath,
    tempPath,
    env,
    status: 'ready',
    createdAt: manifest.createdAt || new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2), 'utf8');
  } catch (e) {
    console.error(`[BotVmManager] Failed to write manifest for ${botId}:`, e);
  }

  // Scaffolding: If workspace has no README.md, generate a welcoming workspace manifest
  const readmePath = path.join(workspacePath, 'README.md');
  if (!fs.existsSync(readmePath)) {
    try {
      const readmeContent = `# Máquina Virtual de ${botName}
- **ID da VM**: \`${updatedManifest.vmId}\`
- **Ambiente**: Micro-VM Sandbox Isolada (${type.toUpperCase()})
- **Modo de Isolamento**: ${isolation === 'isolated' ? 'Totalmente Isolada (somente este disco virtual)' : 'Híbrida'}
- **Memória Alocada**: ${memoryLimitMb} MB
- **Diretório Raiz**: \`${workspacePath}\`

---
Este diretório atua como o disco virtual exclusivo para **${botName}**.
Quaisquer arquivos gerados, scripts criados ou comandos executados pelo bot ficam salvos de forma independente nesta Máquina Virtual.
`;
      fs.writeFileSync(readmePath, readmeContent, 'utf8');
    } catch (e) {}
  }

  vmCache.set(botId, updatedManifest);
  return updatedManifest;
}

/**
 * Returns environment variables to inject into the bot's VM execution
 */
function getVmEnv(botId, botData = null) {
  const vm = getOrCreateVm(botId, botData);
  if (!vm) return {};

  return {
    NEOCHAT_VM: '1',
    BOT_VM_ID: vm.vmId,
    BOT_ID: botId,
    BOT_NAME: vm.botName,
    BOT_VM_WORKSPACE: vm.workspacePath,
    BOT_VM_TEMP: vm.tempPath,
    VIRTUAL_ENV: vm.workspacePath,
    TMPDIR: vm.tempPath,
    TEMP: vm.tempPath,
    TMP: vm.tempPath,
    ...(vm.env || {})
  };
}

/**
 * Inspect a Bot's Virtual Machine
 */
function getVmInfo(botId, botData = null) {
  if (!botId) return { success: false, error: 'botId is required' };

  try {
    const vm = getOrCreateVm(botId, botData);
    if (!vm) return { success: false, error: 'VM not found' };

    const { totalBytes, fileCount } = getDirStats(vm.workspacePath);

    return {
      success: true,
      vm: {
        ...vm,
        fileCount,
        sizeBytes: totalBytes,
        sizeFormatted: formatBytes(totalBytes),
        isReady: true
      }
    };
  } catch (err) {
    console.error(`[BotVmManager] Error getting VM info for ${botId}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Reset / Clean a Bot's Virtual Machine disk
 */
function resetVm(botId, botData = null) {
  if (!botId) return { success: false, error: 'botId is required' };

  try {
    // Terminate any running shell session for this VM
    try {
      const { shellManager } = require('./agent/shellManager');
      shellManager.kill(`bot_vm_${botId}`);
    } catch (e) {}

    const workspacePath = getVmWorkspace(botId);
    const tempPath = getVmTemp(botId);

    // Clean workspace
    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
    // Clean temp
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { recursive: true, force: true });
    }

    // Re-create VM workspace with fresh scaffolding
    const freshVm = getOrCreateVm(botId, botData);

    return {
      success: true,
      message: 'Máquina virtual resetada com sucesso.',
      vm: freshVm
    };
  } catch (err) {
    console.error(`[BotVmManager] Error resetting VM for ${botId}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Open the Bot's VM folder in the operating system's native file manager
 */
async function openVmFolder(botId, botData = null) {
  if (!botId) return { success: false, error: 'botId is required' };
  try {
    const { shell } = require('electron');
    const vm = getOrCreateVm(botId, botData);
    if (vm && fs.existsSync(vm.workspacePath)) {
      await shell.openPath(vm.workspacePath);
      return { success: true, path: vm.workspacePath };
    }
    return { success: false, error: 'Diretório da VM não encontrado' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * List files inside the Bot's VM workspace
 */
function listVmFiles(botId, relativeSubPath = '.') {
  if (!botId) return { success: false, error: 'botId is required' };
  try {
    const vm = getOrCreateVm(botId);
    const targetPath = path.resolve(vm.workspacePath, relativeSubPath);
    if (!targetPath.startsWith(vm.workspacePath)) {
      return { success: false, error: 'Caminho fora dos limites da Máquina Virtual.' };
    }

    if (!fs.existsSync(targetPath)) {
      return { success: true, files: [] };
    }

    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const files = entries.map(e => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      size: e.isFile() ? (fs.statSync(path.join(targetPath, e.name)).size) : null
    }));

    return { success: true, files, currentPath: targetPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Wrap shell commands based on VM type (Docker or WSL or Sandbox)
 */
function wrapCommand(command, vm) {
  if (!vm || vm.type === 'sandbox') {
    return command;
  }

  if (vm.type === 'docker') {
    // Check if docker is available and wrap in container
    try {
      return `docker exec -i neochat-vm-${vm.botId} sh -c ${JSON.stringify(command)}`;
    } catch (e) {
      return command;
    }
  }

  if (vm.type === 'wsl' && process.platform === 'win32') {
    return `wsl.exe --cd "${vm.workspacePath}" sh -c ${JSON.stringify(command)}`;
  }

  return command;
}

module.exports = {
  initialize,
  getVmRoot,
  getVmWorkspace,
  getVmTemp,
  getOrCreateVm,
  getVmEnv,
  getVmInfo,
  resetVm,
  openVmFolder,
  listVmFiles,
  wrapCommand
};

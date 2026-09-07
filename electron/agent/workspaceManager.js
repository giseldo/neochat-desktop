/**
 * WorkspaceManager - Workspace intelligence for the Neo Agent Runtime.
 * Detects AGENTS.md, project manifests, and Git repository state to build rich system context.
 */

const fs = require('fs');
const path = require('path');
const { getRepositoryStatus } = require('../gitManager');

class WorkspaceManager {
  constructor() {
    this.activeWorkspaces = new Map(); // sessionId -> workspaceRoot
  }

  setWorkspace(sessionId, workspaceRoot) {
    if (workspaceRoot && fs.existsSync(workspaceRoot)) {
      this.activeWorkspaces.set(sessionId, path.resolve(workspaceRoot));
    }
  }

  getWorkspace(sessionId) {
    return this.activeWorkspaces.get(sessionId) || process.cwd();
  }

  /**
   * Synchronously scan workspace root and extract metadata.
   * @param {string} workspaceRoot
   * @returns {object}
   */
  inspectWorkspaceSync(workspaceRoot) {
    const root = path.resolve(workspaceRoot || process.cwd());
    if (!fs.existsSync(root)) {
      return { root, exists: false };
    }

    const info = {
      root,
      exists: true,
      name: path.basename(root),
      agentsDoc: null,
      readmeDoc: null,
      manifest: null,
      projectType: 'generic',
      git: null
    };

    // 1. Look for AGENTS.md / CLAUDE.md
    const agentsPaths = [
      path.join(root, 'AGENTS.md'),
      path.join(root, 'agents.md'),
      path.join(root, 'CLAUDE.md')
    ];
    for (const p of agentsPaths) {
      if (fs.existsSync(p)) {
        try {
          info.agentsDoc = {
            path: p,
            filename: path.basename(p),
            content: fs.readFileSync(p, 'utf8')
          };
          break;
        } catch (err) {}
      }
    }

    // 2. Look for README.md if no AGENTS.md
    const readmePath = path.join(root, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        info.readmeDoc = {
          path: readmePath,
          content: readmeContent.slice(0, 3000)
        };
      } catch (err) {}
    }

    // 3. Look for project manifests (Node, Rust, Python, Go)
    const packageJsonPath = path.join(root, 'package.json');
    const cargoTomlPath = path.join(root, 'Cargo.toml');
    const pyprojectPath = path.join(root, 'pyproject.toml');
    const goModPath = path.join(root, 'go.mod');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        info.projectType = 'node';
        info.manifest = {
          name: pkg.name,
          version: pkg.version,
          scripts: pkg.scripts ? Object.keys(pkg.scripts) : [],
          dependencies: pkg.dependencies ? Object.keys(pkg.dependencies).slice(0, 20) : [],
          devDependencies: pkg.devDependencies ? Object.keys(pkg.devDependencies).slice(0, 20) : []
        };
      } catch (err) {}
    } else if (fs.existsSync(cargoTomlPath)) {
      info.projectType = 'rust';
    } else if (fs.existsSync(pyprojectPath) || fs.existsSync(path.join(root, 'requirements.txt'))) {
      info.projectType = 'python';
    } else if (fs.existsSync(goModPath)) {
      info.projectType = 'go';
    }

    return info;
  }

  /**
   * Synchronous system prompt context builder.
   * @param {string} workspaceRoot
   * @returns {string}
   */
  getWorkspaceSystemPrompt(workspaceRoot) {
    const info = this.inspectWorkspaceSync(workspaceRoot);
    if (!info.exists) return '';

    const lines = [];
    lines.push(`## Active Workspace Environment`);
    lines.push(`- **Root Directory**: \`${info.root}\``);
    lines.push(`- **Project Type**: ${info.projectType}`);

    if (info.manifest?.name) {
      lines.push(`- **Project Name**: ${info.manifest.name} (v${info.manifest.version || '0.0.0'})`);
      if (info.manifest.scripts?.length) {
        lines.push(`- **Available Scripts**: \`${info.manifest.scripts.join('`, `')}\``);
      }
    }

    if (info.agentsDoc?.content) {
      lines.push(`\n### Workspace Rules & Guidelines (${info.agentsDoc.filename})`);
      lines.push(info.agentsDoc.content);
    } else if (info.readmeDoc?.content) {
      lines.push(`\n### Project README Preview`);
      lines.push(info.readmeDoc.content);
    }

    return lines.join('\n');
  }

  /**
   * Scan workspace root and extract metadata.
   * @param {string} workspaceRoot
   * @returns {Promise<object>}
   */
  async inspectWorkspace(workspaceRoot) {
    const info = this.inspectWorkspaceSync(workspaceRoot);
    if (!info.exists) return info;

    // Async Git status
    try {
      if (fs.existsSync(path.join(info.root, '.git'))) {
        const gitStatus = await getRepositoryStatus(info.root);
        info.git = gitStatus;
      }
    } catch (err) {
      // ignore
    }

    return info;
  }

  /**
   * Build a formatted markdown context string for agent system instructions.
   * @param {string} workspaceRoot
   * @returns {Promise<string>}
   */
  async buildWorkspaceContextString(workspaceRoot) {
    const info = await this.inspectWorkspace(workspaceRoot);
    if (!info.exists) return '';

    const lines = [];
    lines.push(`## Active Workspace Environment`);
    lines.push(`- **Root Directory**: \`${info.root}\``);
    lines.push(`- **Project Type**: ${info.projectType}`);

    if (info.manifest?.name) {
      lines.push(`- **Project Name**: ${info.manifest.name} (v${info.manifest.version || '0.0.0'})`);
      if (info.manifest.scripts?.length) {
        lines.push(`- **Available Scripts**: \`${info.manifest.scripts.join('`, `')}\``);
      }
    }

    if (info.git) {
      lines.push(`- **Git Branch**: \`${info.git.branch || 'unknown'}\``);
      if (info.git.status) {
        lines.push(`- **Git Status Preview**:\n\`\`\`\n${info.git.status.slice(0, 1000)}\n\`\`\``);
      }
    }

    if (info.agentsDoc?.content) {
      lines.push(`\n### Workspace Rules & Guidelines (${info.agentsDoc.filename})`);
      lines.push(info.agentsDoc.content);
    } else if (info.readmeDoc?.content) {
      lines.push(`\n### Project README Preview`);
      lines.push(info.readmeDoc.content);
    }

    return lines.join('\n');
  }

  /**
   * Get recursive directory and file tree for workspace.
   * @param {string} workspaceRoot
   * @param {object} options
   * @returns {object}
   */
  getDirectoryTree(workspaceRoot, options = {}) {
    const root = path.resolve(workspaceRoot || process.cwd());
    if (!fs.existsSync(root)) {
      return { success: false, error: 'Diretório não encontrado ou inacessível.' };
    }

    const maxDepth = typeof options.maxDepth === 'number' ? options.maxDepth : 6;
    const defaultIgnores = new Set([
      'node_modules', '.git', 'dist', 'release', '.next', 'build', '.turbo',
      '.cache', '.output', '.vite', '.parcel-cache', 'coverage', '.svn', '.hg',
      '__pycache__', '.pytest_cache', 'venv', '.venv', 'env', '.idea', '.vscode'
    ]);
    if (Array.isArray(options.ignore)) {
      options.ignore.forEach(item => defaultIgnores.add(item));
    }

    let totalFiles = 0;
    let totalDirectories = 0;

    const scanDir = (currentDir, currentDepth = 0) => {
      const dirName = path.basename(currentDir);
      const relativePath = path.relative(root, currentDir).replace(/\\/g, '/');

      const node = {
        name: currentDepth === 0 ? (path.basename(root) || root) : dirName,
        path: currentDir,
        relativePath: relativePath || '.',
        isDirectory: true,
        children: []
      };

      if (currentDepth > 0) {
        totalDirectories++;
      }

      if (currentDepth >= maxDepth) {
        return node;
      }

      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        const dirEntries = [];
        const fileEntries = [];

        for (const entry of entries) {
          if (defaultIgnores.has(entry.name)) continue;
          if (entry.name.startsWith('.') && !['.env', '.env.example', '.gitignore', '.npmrc'].includes(entry.name) && !options.includeHidden) {
            continue;
          }

          const fullPath = path.join(currentDir, entry.name);
          const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

          if (entry.isDirectory()) {
            dirEntries.push(fullPath);
          } else if (entry.isFile()) {
            let size = 0;
            let mtime = null;
            try {
              const stat = fs.statSync(fullPath);
              size = stat.size;
              mtime = stat.mtime ? stat.mtime.toISOString() : null;
            } catch (err) {}

            totalFiles++;
            fileEntries.push({
              name: entry.name,
              path: fullPath,
              relativePath: relPath,
              isDirectory: false,
              extension: path.extname(entry.name).toLowerCase(),
              size,
              mtime
            });
          }
        }

        dirEntries.sort((a, b) => path.basename(a).localeCompare(path.basename(b), undefined, { sensitivity: 'base' }));
        fileEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        for (const subDir of dirEntries) {
          node.children.push(scanDir(subDir, currentDepth + 1));
        }
        for (const fileObj of fileEntries) {
          node.children.push(fileObj);
        }
      } catch (err) {
        node.error = err.message;
      }

      return node;
    };

    const tree = scanDir(root, 0);
    return {
      success: true,
      root,
      name: path.basename(root) || root,
      tree,
      totalFiles,
      totalDirectories
    };
  }

  /**
   * Safely read content of a workspace file.
   * @param {string} workspaceRoot
   * @param {string} targetPath
   * @returns {object}
   */
  readFileContent(workspaceRoot, targetPath) {
    const root = path.resolve(workspaceRoot || process.cwd());
    const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(root, targetPath);

    // Prevent path traversal outside root
    if (!resolved.startsWith(root) && !targetPath.startsWith(root)) {
      return { success: false, error: 'Acesso negado: o arquivo está fora do diretório do workspace.' };
    }

    if (!fs.existsSync(resolved)) {
      return { success: false, error: 'Arquivo não encontrado.' };
    }

    let stat;
    try {
      stat = fs.statSync(resolved);
    } catch (err) {
      return { success: false, error: `Não foi possível ler o arquivo: ${err.message}` };
    }

    if (!stat.isFile()) {
      return { success: false, error: 'O caminho selecionado não é um arquivo.' };
    }

    // 2 MB limit for text reading/preview
    if (stat.size > 2 * 1024 * 1024) {
      return {
        success: false,
        error: 'Arquivo muito grande para visualização (> 2MB).',
        size: stat.size,
        tooLarge: true
      };
    }

    try {
      const buffer = fs.readFileSync(resolved);
      const isBinary = buffer.slice(0, 1024).includes(0);
      if (isBinary) {
        return {
          success: false,
          isBinary: true,
          error: 'Arquivo binário (não pode ser exibido em texto).',
          size: stat.size
        };
      }

      const content = buffer.toString('utf8');
      const ext = path.extname(resolved).toLowerCase();
      return {
        success: true,
        path: resolved,
        relativePath: path.relative(root, resolved).replace(/\\/g, '/'),
        name: path.basename(resolved),
        extension: ext,
        size: stat.size,
        mtime: stat.mtime ? stat.mtime.toISOString() : null,
        content
      };
    } catch (err) {
      return { success: false, error: `Erro ao ler arquivo: ${err.message}` };
    }
  }
}

const workspaceManager = new WorkspaceManager();

module.exports = {
  WorkspaceManager,
  workspaceManager
};

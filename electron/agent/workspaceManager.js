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
   * Scan workspace root and extract metadata.
   * @param {string} workspaceRoot
   * @returns {Promise<object>}
   */
  async inspectWorkspace(workspaceRoot) {
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
        } catch (err) {
          // ignore
        }
      }
    }

    // 2. Look for README.md if no AGENTS.md
    const readmePath = path.join(root, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        info.readmeDoc = {
          path: readmePath,
          content: readmeContent.slice(0, 3000) // First 3k chars for summary
        };
      } catch (err) {
        // ignore
      }
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
      } catch (err) {
        // ignore
      }
    } else if (fs.existsSync(cargoTomlPath)) {
      info.projectType = 'rust';
    } else if (fs.existsSync(pyprojectPath) || fs.existsSync(path.join(root, 'requirements.txt'))) {
      info.projectType = 'python';
    } else if (fs.existsSync(goModPath)) {
      info.projectType = 'go';
    }

    // 4. Git status
    try {
      if (fs.existsSync(path.join(root, '.git'))) {
        const gitStatus = await getRepositoryStatus(root);
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
}

const workspaceManager = new WorkspaceManager();

module.exports = {
  WorkspaceManager,
  workspaceManager
};

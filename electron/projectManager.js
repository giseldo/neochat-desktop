const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let appInstance = null;
let chatHistoryMgr = null;

/**
 * Default preset colors for projects
 */
const PROJECT_COLOR_PRESETS = [
    '#f55036', // Groq Orange
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#8b5cf6', // Purple
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#6366f1', // Indigo
];

/**
 * Initialize the project manager
 * @param {Electron.App} app - Electron app instance
 * @param {Object} [chatHistoryManager] - Chat history manager instance for unassigning chats on project deletion
 */
function initialize(app, chatHistoryManager = null) {
    appInstance = app;
    chatHistoryMgr = chatHistoryManager;
}

/**
 * Get the path for the projects JSON storage file
 * @returns {string} Path to projects.json
 */
function getProjectsFilePath() {
    if (!appInstance) {
        throw new Error('Project manager not initialized');
    }
    const userDataPath = appInstance.getPath('userData');
    return path.join(userDataPath, 'projects.json');
}

/**
 * Read all projects from disk
 * @returns {Array<Object>} Array of project objects
 */
function readProjects() {
    const filePath = getProjectsFilePath();
    if (!fs.existsSync(filePath)) {
        return [];
    }

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Error reading projects.json:', error);
        return [];
    }
}

/**
 * Save projects list to disk
 * @param {Array<Object>} projects - Array of project objects
 */
function writeProjects(projects) {
    const filePath = getProjectsFilePath();
    try {
        fs.writeFileSync(filePath, JSON.stringify(projects, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing projects.json:', error);
        throw error;
    }
}

/**
 * List all projects sorted by updatedAt descending
 * @returns {Array<Object>} List of projects
 */
function listProjects() {
    const projects = readProjects();
    return projects.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

/**
 * Get a specific project by ID
 * @param {string} projectId - The project ID
 * @returns {Object|null} Project object or null
 */
function getProject(projectId) {
    if (!projectId) return null;
    const projects = readProjects();
    return projects.find(p => p.id === projectId) || null;
}

/**
 * Create a new project
 * @param {Object} projectData - Project attributes
 * @returns {Object} Newly created project
 */
function createProject({ name, description = '', color = '#f55036', icon = '📁', customPrompt = '', folders = [] }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error('Project name is required');
    }

    const projects = readProjects();
    const now = new Date().toISOString();
    const newProject = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: (description || '').trim(),
        color: color || PROJECT_COLOR_PRESETS[0],
        icon: icon || '📁',
        customPrompt: (customPrompt || '').trim(),
        folders: Array.isArray(folders) ? folders : [],
        createdAt: now,
        updatedAt: now
    };

    projects.unshift(newProject);
    writeProjects(projects);
    return newProject;
}

/**
 * Update an existing project
 * @param {string} projectId - Project ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated project or null if not found
 */
function updateProject(projectId, updates = {}) {
    if (!projectId) return null;

    const projects = readProjects();
    const index = projects.findIndex(p => p.id === projectId);
    if (index === -1) {
        console.error(`Project ${projectId} not found for update`);
        return null;
    }

    const now = new Date().toISOString();
    const current = projects[index];

    const updatedProject = {
        ...current,
        name: updates.name !== undefined ? updates.name.trim() : current.name,
        description: updates.description !== undefined ? updates.description.trim() : current.description,
        color: updates.color !== undefined ? updates.color : current.color,
        icon: updates.icon !== undefined ? updates.icon : current.icon,
        customPrompt: updates.customPrompt !== undefined ? updates.customPrompt.trim() : current.customPrompt,
        folders: Array.isArray(updates.folders) ? updates.folders : (current.folders || []),
        updatedAt: now
    };

    projects[index] = updatedProject;
    writeProjects(projects);
    return updatedProject;
}

/**
 * Delete a project and unassign its ID from any associated chats
 * @param {string} projectId - Project ID
 * @returns {boolean} True if deleted successfully
 */
function deleteProject(projectId) {
    if (!projectId) return false;

    const projects = readProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    if (filtered.length === projects.length) {
        return false;
    }

    writeProjects(filtered);

    // Unassign project from chats if chat history manager is available
    if (chatHistoryMgr && typeof chatHistoryMgr.unassignProjectFromChats === 'function') {
        try {
            chatHistoryMgr.unassignProjectFromChats(projectId);
        } catch (error) {
            console.error(`Error unassigning project ${projectId} from chats:`, error);
        }
    }

    return true;
}

/**
 * Initialize IPC handlers for projects
 * @param {Electron.IpcMain} ipcMain - IPC Main instance
 */
function initializeProjectHandlers(ipcMain) {
    // List all projects
    ipcMain.handle('projects-list', async () => {
        return listProjects();
    });

    // Get specific project
    ipcMain.handle('projects-get', async (event, projectId) => {
        return getProject(projectId);
    });

    // Create project
    ipcMain.handle('projects-create', async (event, projectData) => {
        return createProject(projectData || {});
    });

    // Update project
    ipcMain.handle('projects-update', async (event, projectId, updates) => {
        return updateProject(projectId, updates || {});
    });

    // Delete project
    ipcMain.handle('projects-delete', async (event, projectId) => {
        const success = deleteProject(projectId);
        return { success };
    });
}

module.exports = {
    initialize,
    initializeProjectHandlers,
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    PROJECT_COLOR_PRESETS
};

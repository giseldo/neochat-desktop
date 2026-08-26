const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let appInstance;
let storagePath;

function getStoragePath() {
    if (appInstance && typeof appInstance.getPath === 'function') {
        return path.join(appInstance.getPath('userData'), 'workflows.json');
    }
    return storagePath;
}

function normalizeWorkflow(input, existing = {}) {
    const name = String(input?.name || '').trim();
    const steps = Array.isArray(input?.steps) ? input.steps.map(step => String(step).trim()).filter(Boolean) : [];
    if (!name) throw new Error('Workflow name is required');
    if (!steps.length) throw new Error('Workflow requires at least one step');
    const now = new Date().toISOString();
    return {
        id: existing.id || crypto.randomUUID(),
        name: name.slice(0, 100),
        description: String(input.description || '').trim().slice(0, 500),
        steps,
        createdAt: existing.createdAt || now,
        updatedAt: now
    };
}

function readAll() {
    const currentStoragePath = getStoragePath();
    if (!currentStoragePath || !fs.existsSync(currentStoragePath)) return [];
    try {
        const value = JSON.parse(fs.readFileSync(currentStoragePath, 'utf8'));
        return Array.isArray(value) ? value : [];
    } catch (error) {
        console.error('Unable to read workflows:', error);
        return [];
    }
}

function writeAll(workflows) {
    const currentStoragePath = getStoragePath();
    const temporary = `${currentStoragePath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(workflows, null, 2));
    fs.renameSync(temporary, currentStoragePath);
}

function initialize(app) {
    appInstance = app;
    storagePath = path.join(app.getPath('userData'), 'workflows.json');
}

function save(input) {
    const workflows = readAll();
    const index = input.id ? workflows.findIndex(item => item.id === input.id) : -1;
    const workflow = normalizeWorkflow(input, index >= 0 ? workflows[index] : {});
    if (index >= 0) workflows[index] = workflow;
    else workflows.push(workflow);
    writeAll(workflows);
    return workflow;
}

function remove(id) {
    const workflows = readAll();
    const next = workflows.filter(item => item.id !== id);
    if (next.length === workflows.length) return false;
    writeAll(next);
    return true;
}

function buildExecutionPrompt(workflow, variables = {}) {
    const interpolate = text => text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => String(variables[key] ?? `{{${key}}}`));
    return [
        `Execute o workflow "${workflow.name}" em ordem. Conclua e verifique cada etapa antes de avançar.`,
        ...workflow.steps.map((step, index) => `Etapa ${index + 1}: ${interpolate(step)}`)
    ].join('\n\n');
}

function initializeHandlers(ipcMain, app) {
    initialize(app);
    ipcMain.handle('workflows-list', () => readAll());
    ipcMain.handle('workflows-save', (_event, workflow) => {
        try { return { success: true, workflow: save(workflow) }; }
        catch (error) { return { success: false, error: error.message }; }
    });
    ipcMain.handle('workflows-delete', (_event, id) => ({ success: remove(id) }));
    ipcMain.handle('workflows-build-prompt', (_event, id, variables) => {
        const workflow = readAll().find(item => item.id === id);
        if (!workflow) return { success: false, error: 'Workflow not found' };
        return { success: true, prompt: buildExecutionPrompt(workflow, variables) };
    });
}

module.exports = { buildExecutionPrompt, initialize, initializeHandlers, normalizeWorkflow, readAll, remove, save };

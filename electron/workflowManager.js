const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let appInstance;
let storagePath;
let webhookServer = null;
let webhookPort = 39281;
const activeWatchers = new Map();
const triggerListeners = new Set();

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
        trigger: input.trigger || existing.trigger || { type: 'manual' },
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
    if (!currentStoragePath) return;
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
    
    // Update active watchers if file_watch trigger is configured
    if (workflow.trigger?.type === 'file_watch' && workflow.trigger?.config?.watchDir) {
        startFileWatcher(workflow.id, workflow.trigger.config.watchDir);
    } else {
        stopFileWatcher(workflow.id);
    }
    
    return workflow;
}

function remove(id) {
    stopFileWatcher(id);
    const workflows = readAll();
    const next = workflows.filter(item => item.id !== id);
    if (next.length === workflows.length) return false;
    writeAll(next);
    return true;
}

function buildExecutionPrompt(workflow, variables = {}) {
    const interpolate = text => text.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_match, key) => {
        const keys = key.split('.');
        let val = variables;
        for (const k of keys) {
            if (val && typeof val === 'object' && k in val) {
                val = val[k];
            } else {
                return `{{${key}}}`;
            }
        }
        return String(val ?? `{{${key}}}`);
    });
    return [
        `Execute o workflow "${workflow.name}" em ordem. Conclua e verifique cada etapa antes de avançar.`,
        ...workflow.steps.map((step, index) => `Etapa ${index + 1}: ${interpolate(step)}`)
    ].join('\n\n');
}

function onWorkflowTriggered(listener) {
    triggerListeners.add(listener);
    return () => triggerListeners.delete(listener);
}

function dispatchTrigger(workflow, variables = {}, meta = {}) {
    const prompt = buildExecutionPrompt(workflow, variables);
    for (const listener of triggerListeners) {
        try {
            listener({ workflow, variables, prompt, meta, timestamp: Date.now() });
        } catch (e) {
            console.error('Trigger listener error:', e);
        }
    }
}

// Local Webhook Server
function startWebhookServer(port = 39281) {
    if (webhookServer) return { status: 'running', port: webhookPort };
    const http = require('http');
    webhookPort = port;

    webhookServer = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://localhost:${webhookPort}`);
        const pathParts = url.pathname.split('/').filter(Boolean);

        if (req.method === 'GET' && url.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok', activeWorkflows: readAll().length }));
        }

        if (req.method === 'POST' && pathParts[0] === 'webhook') {
            const targetIdOrName = pathParts[1];
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    let parsedBody = {};
                    if (body) {
                        try { parsedBody = JSON.parse(body); } catch (_) { parsedBody = { text: body }; }
                    }

                    const workflows = readAll();
                    const target = workflows.find(w => w.id === targetIdOrName || w.name.toLowerCase() === targetIdOrName?.toLowerCase());

                    if (!target) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: `Workflow "${targetIdOrName}" not found` }));
                    }

                    // Validate secret if configured
                    const secretConfig = target.trigger?.config?.secret;
                    const reqSecret = req.headers['x-webhook-secret'] || url.searchParams.get('secret');
                    if (secretConfig && secretConfig !== reqSecret) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Unauthorized: invalid webhook secret' }));
                    }

                    dispatchTrigger(target, parsedBody, { source: 'webhook', clientIp: req.socket.remoteAddress });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: true, workflowId: target.id, workflowName: target.name }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: err.message }));
                }
            });
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found. Use POST /webhook/:workflowId' }));
    });

    webhookServer.listen(webhookPort, '127.0.0.1', () => {
        console.log(`[WorkflowManager] Webhook server listening on http://127.0.0.1:${webhookPort}`);
    });

    return { status: 'started', port: webhookPort };
}

function stopWebhookServer() {
    if (webhookServer) {
        webhookServer.close();
        webhookServer = null;
        return { status: 'stopped' };
    }
    return { status: 'not_running' };
}

// File Watcher
function startFileWatcher(workflowId, watchDir) {
    stopFileWatcher(workflowId);
    if (!fs.existsSync(watchDir)) return false;

    let debounceTimer = null;
    try {
        const watcher = fs.watch(watchDir, { recursive: false }, (eventType, filename) => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const workflow = readAll().find(w => w.id === workflowId);
                if (workflow) {
                    dispatchTrigger(workflow, { file: filename, eventType, dir: watchDir }, { source: 'file_watch' });
                }
            }, 800);
        });

        activeWatchers.set(workflowId, watcher);
        return true;
    } catch (e) {
        console.error(`[WorkflowManager] Failed to start watcher for ${watchDir}:`, e);
        return false;
    }
}

function stopFileWatcher(workflowId) {
    if (activeWatchers.has(workflowId)) {
        try { activeWatchers.get(workflowId).close(); } catch (_) {}
        activeWatchers.delete(workflowId);
        return true;
    }
    return false;
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
    ipcMain.handle('workflows-start-webhook', (_event, port) => startWebhookServer(port));
    ipcMain.handle('workflows-stop-webhook', () => stopWebhookServer());
}

module.exports = {
    buildExecutionPrompt,
    initialize,
    initializeHandlers,
    normalizeWorkflow,
    readAll,
    remove,
    save,
    startWebhookServer,
    stopWebhookServer,
    startFileWatcher,
    stopFileWatcher,
    onWorkflowTriggered,
    dispatchTrigger
};

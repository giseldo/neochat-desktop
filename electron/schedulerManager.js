const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let appInstance;
let schedulePath;
let timer;

function getSchedulePath() {
    if (appInstance && typeof appInstance.getPath === 'function') {
        return path.join(appInstance.getPath('userData'), 'workflow-schedules.json');
    }
    return schedulePath;
}

function nextRun(schedule, from = new Date()) {
    if (schedule.type === 'interval') return new Date(from.getTime() + schedule.intervalMinutes * 60000).toISOString();
    const [hour, minute] = schedule.time.split(':').map(Number);
    const next = new Date(from);
    next.setHours(hour, minute, 0, 0);
    if (next <= from) next.setDate(next.getDate() + 1);
    return next.toISOString();
}

function normalize(input, existing = {}) {
    const type = input.type === 'daily' ? 'daily' : 'interval';
    const intervalMinutes = Math.max(1, Math.min(10080, Number(input.intervalMinutes) || 60));
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time || '') ? input.time : '09:00';
    if (!input.workflowId) throw new Error('Workflow is required');
    const schedule = { id: existing.id || crypto.randomUUID(), workflowId: input.workflowId, type, intervalMinutes, time, enabled: input.enabled !== false, lastRunAt: existing.lastRunAt || null };
    schedule.nextRunAt = input.nextRunAt || nextRun(schedule);
    return schedule;
}

function readAll() {
    const currentSchedulePath = getSchedulePath();
    if (!currentSchedulePath || !fs.existsSync(currentSchedulePath)) return [];
    try { const data = JSON.parse(fs.readFileSync(currentSchedulePath, 'utf8')); return Array.isArray(data) ? data : []; }
    catch (error) { console.error('Unable to read schedules:', error); return []; }
}

function writeAll(items) {
    const currentSchedulePath = getSchedulePath();
    const temporary = `${currentSchedulePath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(items, null, 2));
    fs.renameSync(temporary, currentSchedulePath);
}

function save(input) {
    const items = readAll();
    const index = input.id ? items.findIndex(item => item.id === input.id) : -1;
    const item = normalize(input, index >= 0 ? items[index] : {});
    if (index >= 0) items[index] = item; else items.push(item);
    writeAll(items);
    return item;
}

function remove(id) { const items = readAll(); const next = items.filter(item => item.id !== id); writeAll(next); return next.length !== items.length; }

function initializeHandlers(ipcMain, app, getWindow, workflowManager, NotificationClass) {
    appInstance = app;
    schedulePath = path.join(app.getPath('userData'), 'workflow-schedules.json');
    ipcMain.handle('schedules-list', () => readAll());
    ipcMain.handle('schedules-save', (_event, input) => { try { return { success: true, schedule: save(input) }; } catch (error) { return { success: false, error: error.message }; } });
    ipcMain.handle('schedules-delete', (_event, id) => ({ success: remove(id) }));
    const tick = () => {
        const now = new Date();
        const items = readAll();
        let changed = false;
        for (const item of items) {
            if (!item.enabled || new Date(item.nextRunAt) > now) continue;
            const workflow = workflowManager.readAll().find(value => value.id === item.workflowId);
            if (workflow) {
                getWindow()?.webContents.send('workflow-scheduled-run', { workflow, prompt: workflowManager.buildExecutionPrompt(workflow) });
                if (NotificationClass?.isSupported?.()) new NotificationClass({ title: 'NeoChat', body: `Workflow iniciado: ${workflow.name}` }).show();
            }
            item.lastRunAt = now.toISOString();
            item.nextRunAt = nextRun(item, now);
            changed = true;
        }
        if (changed) writeAll(items);
    };
    timer = setInterval(tick, 30000);
    timer.unref?.();
}

module.exports = { initializeHandlers, nextRun, normalize, readAll, remove, save };

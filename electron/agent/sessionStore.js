const fs = require('fs');
const path = require('path');

const SAFE_SESSION_ID = /^[a-zA-Z0-9._:-]{1,160}$/;

class AgentSessionStore {
  constructor(baseDir = null) {
    this.baseDir = baseDir;
  }

  configure(baseDir) {
    this.baseDir = path.resolve(baseDir);
    fs.mkdirSync(this._sessionsDir(), { recursive: true });
    fs.mkdirSync(this._trajectoryDir(), { recursive: true });
  }

  isConfigured() {
    return Boolean(this.baseDir);
  }

  _assertSessionId(sessionId) {
    if (!SAFE_SESSION_ID.test(sessionId)) throw new TypeError('Invalid session ID for persistence.');
  }

  _sessionsDir() {
    if (!this.baseDir) throw new Error('Agent session store is not configured.');
    return path.join(this.baseDir, 'sessions');
  }

  _trajectoryDir() {
    if (!this.baseDir) throw new Error('Agent session store is not configured.');
    return path.join(this.baseDir, 'trajectory');
  }

  _snapshotPath(sessionId) {
    this._assertSessionId(sessionId);
    return path.join(this._sessionsDir(), `${sessionId}.json`);
  }

  _trajectoryPath(sessionId) {
    this._assertSessionId(sessionId);
    return path.join(this._trajectoryDir(), `${sessionId}.jsonl`);
  }

  saveSnapshot(snapshot) {
    if (!this.isConfigured()) return;
    const target = this._snapshotPath(snapshot.sessionId);
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, target);
  }

  loadSnapshot(sessionId) {
    if (!this.isConfigured()) return null;
    const target = this._snapshotPath(sessionId);
    if (!fs.existsSync(target)) return null;
    try {
      const snapshot = JSON.parse(fs.readFileSync(target, 'utf8'));
      return snapshot && snapshot.sessionId === sessionId ? snapshot : null;
    } catch (error) {
      console.warn(`[AgentSessionStore] Ignoring invalid snapshot ${target}:`, error.message);
      return null;
    }
  }

  appendEvent(sessionId, event) {
    if (!this.isConfigured()) return;
    const record = { sequenceTimestamp: Date.now(), ...event, sessionId };
    fs.appendFileSync(this._trajectoryPath(sessionId), `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
  }

  readTrajectory(sessionId, options = {}) {
    if (!this.isConfigured()) return [];
    const target = this._trajectoryPath(sessionId);
    if (!fs.existsSync(target)) return [];
    const limit = Math.min(Math.max(Number(options.limit) || 1000, 1), 10_000);
    const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/).filter(Boolean);
    return lines.slice(-limit).map(line => {
      try { return JSON.parse(line); } catch (_error) { return null; }
    }).filter(Boolean);
  }
}

module.exports = { AgentSessionStore };

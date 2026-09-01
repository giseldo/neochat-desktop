/**
 * Checkpoints - File snapshots and rollback manager for the Neo Agent Runtime.
 */

const fs = require('fs');
const path = require('path');

class CheckpointsManager {
  constructor() {
    // sessionId -> Array of snapshots: [{ timestamp, filePath, existed, previousContent, newContent }]
    this.sessionHistory = new Map();
    this.storageDir = null;
    this.loadedSessions = new Set();
  }

  configureStorage(baseDir) {
    this.storageDir = path.join(path.resolve(baseDir), 'checkpoints');
    fs.mkdirSync(this.storageDir, { recursive: true });
    for (const sessionId of this.sessionHistory.keys()) this._persist(sessionId);
  }

  _sessionFile(sessionId) {
    if (!/^[a-zA-Z0-9._:-]{1,160}$/.test(sessionId)) throw new TypeError('Invalid checkpoint session ID.');
    return path.join(this.storageDir, `${sessionId}.json`);
  }

  _ensureLoaded(sessionId) {
    if (!this.storageDir || this.loadedSessions.has(sessionId)) return;
    this.loadedSessions.add(sessionId);
    const target = this._sessionFile(sessionId);
    if (!fs.existsSync(target)) return;
    try {
      const snapshots = JSON.parse(fs.readFileSync(target, 'utf8'));
      if (Array.isArray(snapshots)) this.sessionHistory.set(sessionId, snapshots);
    } catch (error) {
      console.warn(`[Checkpoints] Ignoring invalid persisted checkpoints for ${sessionId}:`, error.message);
    }
  }

  _persist(sessionId) {
    if (!this.storageDir) return;
    const target = this._sessionFile(sessionId);
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(this.sessionHistory.get(sessionId) || [], null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, target);
  }

  /**
   * Record a snapshot before modifying a file.
   * @param {string} sessionId
   * @param {string} filePath
   * @returns {object} snapshot info
   */
  recordPreMutation(sessionId, filePath) {
    this._ensureLoaded(sessionId);
    const resolvedPath = path.resolve(filePath);
    const existed = fs.existsSync(resolvedPath);
    let previousContent = null;

    if (existed) {
      try {
        previousContent = fs.readFileSync(resolvedPath, 'utf8');
      } catch (err) {
        console.warn(`[Checkpoints] Could not read file for pre-mutation snapshot: ${resolvedPath}`, err.message);
      }
    }

    const snapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      filePath: resolvedPath,
      existed,
      previousContent,
      newContent: null
    };

    if (!this.sessionHistory.has(sessionId)) {
      this.sessionHistory.set(sessionId, []);
    }
    this.sessionHistory.get(sessionId).push(snapshot);
    this._persist(sessionId);

    return snapshot;
  }

  /**
   * Finalize the snapshot with the new content after modification.
   * @param {string} snapshotId
   * @param {string} newContent
   */
  recordPostMutation(snapshotId, newContent) {
    for (const [sessionId, snapshots] of this.sessionHistory.entries()) {
      const snap = snapshots.find(s => s.id === snapshotId);
      if (snap) {
        snap.newContent = newContent;
        this._persist(sessionId);
        break;
      }
    }
  }

  /**
   * Roll back the last file mutation in the given session.
   * @param {string} sessionId
   * @returns {{ success: boolean, revertedFile?: string, error?: string }}
   */
  rollbackLastAction(sessionId) {
    this._ensureLoaded(sessionId);
    const snapshots = this.sessionHistory.get(sessionId);
    if (!snapshots || snapshots.length === 0) {
      return { success: false, error: 'No checkpoints available to rollback in this session.' };
    }

    const lastSnapshot = snapshots.pop();
    try {
      if (lastSnapshot.existed && lastSnapshot.previousContent !== null) {
        fs.writeFileSync(lastSnapshot.filePath, lastSnapshot.previousContent, 'utf8');
      } else if (!lastSnapshot.existed && fs.existsSync(lastSnapshot.filePath)) {
        fs.unlinkSync(lastSnapshot.filePath);
      }
      this._persist(sessionId);
      return {
        success: true,
        revertedFile: lastSnapshot.filePath,
        restoredContent: lastSnapshot.previousContent
      };
    } catch (err) {
      snapshots.push(lastSnapshot);
      this._persist(sessionId);
      return {
        success: false,
        error: `Failed to rollback ${lastSnapshot.filePath}: ${err.message}`
      };
    }
  }

  /**
   * Clear snapshots for a session.
   * @param {string} sessionId
   */
  clearSession(sessionId) {
    this.sessionHistory.delete(sessionId);
    this.loadedSessions.add(sessionId);
    if (this.storageDir) {
      const target = this._sessionFile(sessionId);
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
  }
}

const checkpointsManager = new CheckpointsManager();

module.exports = {
  CheckpointsManager,
  checkpointsManager
};

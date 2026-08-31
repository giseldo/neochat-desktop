/**
 * Checkpoints - File snapshots and rollback manager for the Neo Agent Runtime.
 */

const fs = require('fs');
const path = require('path');

class CheckpointsManager {
  constructor() {
    // sessionId -> Array of snapshots: [{ timestamp, filePath, existed, previousContent, newContent }]
    this.sessionHistory = new Map();
  }

  /**
   * Record a snapshot before modifying a file.
   * @param {string} sessionId
   * @param {string} filePath
   * @returns {object} snapshot info
   */
  recordPreMutation(sessionId, filePath) {
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

    return snapshot;
  }

  /**
   * Finalize the snapshot with the new content after modification.
   * @param {string} snapshotId
   * @param {string} newContent
   */
  recordPostMutation(snapshotId, newContent) {
    for (const snapshots of this.sessionHistory.values()) {
      const snap = snapshots.find(s => s.id === snapshotId);
      if (snap) {
        snap.newContent = newContent;
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
      return {
        success: true,
        revertedFile: lastSnapshot.filePath,
        restoredContent: lastSnapshot.previousContent
      };
    } catch (err) {
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
  }
}

const checkpointsManager = new CheckpointsManager();

module.exports = {
  CheckpointsManager,
  checkpointsManager
};

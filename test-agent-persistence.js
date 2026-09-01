const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { NeoAgentRuntime, AGENT_EVENTS } = require('./electron/agent');
const { agentLoop } = require('./electron/agent/agentLoop');
const { CheckpointsManager } = require('./electron/agent/checkpoints');

async function run() {
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-agent-store-'));
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-agent-workspace-'));
  const originalRun = agentLoop.run;

  try {
    const runtime = new NeoAgentRuntime();
    runtime.configurePersistence(storeDir);
    runtime.createSession({ sessionId: 'persist-session', workspaceRoot: workspace, model: 'test-model' });

    agentLoop.run = async ({ messages, eventBus }) => {
      eventBus.emitStateChange('IDLE', 'THINKING');
      eventBus.emitTrajectoryStep({ type: 'thinking', title: 'Persist this step' });
      const finalMessages = [...messages, { role: 'assistant', content: 'persisted answer' }];
      eventBus.emitDone(finalMessages[finalMessages.length - 1]);
      return { status: 'completed', messages: finalMessages, message: finalMessages[finalMessages.length - 1] };
    };

    await runtime.prompt('persist-session', 'persist me');
    const snapshot = runtime.getSessionSnapshot('persist-session');
    assert.strictEqual(snapshot.active, false);
    assert.deepStrictEqual(snapshot.messages.map(message => message.content), ['persist me', 'persisted answer']);

    const trajectory = runtime.getTrajectory('persist-session');
    assert(trajectory.some(event => event.event === AGENT_EVENTS.TRAJECTORY_STEP));
    assert(trajectory.some(event => event.event === AGENT_EVENTS.DONE));

    const restoredRuntime = new NeoAgentRuntime();
    restoredRuntime.configurePersistence(storeDir);
    const restored = restoredRuntime.createSession({ sessionId: 'persist-session' });
    assert.strictEqual(restored.workspaceRoot, workspace);
    assert.strictEqual(restored.model, 'test-model');
    assert.deepStrictEqual(restored.messages.map(message => message.content), ['persist me', 'persisted answer']);

    const checkpointFile = path.join(workspace, 'checkpoint.txt');
    fs.writeFileSync(checkpointFile, 'before');
    const checkpoints = new CheckpointsManager();
    checkpoints.configureStorage(storeDir);
    const checkpoint = checkpoints.recordPreMutation('checkpoint-session', checkpointFile);
    fs.writeFileSync(checkpointFile, 'after');
    checkpoints.recordPostMutation(checkpoint.id, 'after');

    const restoredCheckpoints = new CheckpointsManager();
    restoredCheckpoints.configureStorage(storeDir);
    const rollback = restoredCheckpoints.rollbackLastAction('checkpoint-session');
    assert.strictEqual(rollback.success, true);
    assert.strictEqual(fs.readFileSync(checkpointFile, 'utf8'), 'before');

    console.log('Agent persistence tests passed.');
  } finally {
    agentLoop.run = originalRun;
    fs.rmSync(storeDir, { recursive: true, force: true });
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

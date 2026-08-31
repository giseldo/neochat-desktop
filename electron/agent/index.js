/**
 * Neo Agent Runtime Package
 */

const { NeoAgentRuntime, AgentSession, neoAgentRuntime, AGENT_STATES, AGENT_EVENTS } = require('./runtime');
const { AgentEventBus } = require('./eventBus');
const { modelRouter, ModelRouter } = require('./modelRouter');
const { toolRegistry, ToolRegistry, NATIVE_TOOLS } = require('./toolRegistry');
const { toolExecutor, ToolExecutor } = require('./toolExecutor');
const { permissionEngine, PermissionEngine, PERMISSION_DECISION } = require('./permissionEngine');
const { workspaceManager, WorkspaceManager } = require('./workspaceManager');
const { shellManager, ShellManager } = require('./shellManager');
const { checkpointsManager, CheckpointsManager } = require('./checkpoints');
const { compactionManager, CompactionManager } = require('./compactionManager');
const { agentLoop, AgentLoop } = require('./agentLoop');

module.exports = {
  neoAgentRuntime,
  NeoAgentRuntime,
  AgentSession,
  AGENT_STATES,
  AGENT_EVENTS,
  AgentEventBus,
  modelRouter,
  ModelRouter,
  toolRegistry,
  ToolRegistry,
  NATIVE_TOOLS,
  toolExecutor,
  ToolExecutor,
  permissionEngine,
  PermissionEngine,
  PERMISSION_DECISION,
  workspaceManager,
  WorkspaceManager,
  shellManager,
  ShellManager,
  checkpointsManager,
  CheckpointsManager,
  compactionManager,
  CompactionManager,
  agentLoop,
  AgentLoop
};

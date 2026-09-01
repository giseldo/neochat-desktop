const path = require('path');

const SESSION_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,160}$/;

function assertPlainObject(value, label) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  if (JSON.stringify(value).length > 1_000_000) {
    throw new RangeError(`${label} exceeds the maximum serialized size.`);
  }
  return value;
}

function assertSessionId(value) {
  if (typeof value !== 'string' || !SESSION_ID_PATTERN.test(value)) {
    throw new TypeError('Invalid agent session ID.');
  }
  return value;
}

function assertCallId(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 256) {
    throw new TypeError('Invalid tool call ID.');
  }
  return value;
}

function validateMessage(value) {
  if (typeof value === 'string') {
    if (!value.trim() || value.length > 500_000) throw new RangeError('Invalid agent message.');
    return value;
  }
  const message = assertPlainObject(value, 'Agent message');
  if (!['user', 'assistant', 'system', 'tool'].includes(message.role)) {
    throw new TypeError('Invalid agent message role.');
  }
  return message;
}

function validateAgentOptions(value = {}) {
  const options = assertPlainObject(value, 'Agent options');
  if (options.sessionId !== undefined) assertSessionId(options.sessionId);
  if (options.workspaceRoot !== undefined) {
    if (typeof options.workspaceRoot !== 'string' || !path.isAbsolute(options.workspaceRoot) || options.workspaceRoot.length > 4096) {
      throw new TypeError('workspaceRoot must be an absolute filesystem path.');
    }
  }
  if (options.model !== undefined && (typeof options.model !== 'string' || options.model.length > 256)) {
    throw new TypeError('Invalid model identifier.');
  }
  if (options.maxIterations !== undefined) {
    const count = Number(options.maxIterations);
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new RangeError('maxIterations must be between 1 and 100.');
  }
  if (options.settings?.agentHarness !== undefined && !['native', 'pi'].includes(options.settings.agentHarness)) {
    throw new TypeError('Invalid agent harness.');
  }
  return options;
}

module.exports = {
  assertCallId,
  assertPlainObject,
  assertSessionId,
  validateAgentOptions,
  validateMessage
};

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { normalizeAssistant, normalizeProfile } = require('../electron/assistantManager');

const profile = normalizeProfile({
  schemaVersion: 2,
  runtime: { agentEnabled: true, approvalMode: 'strict', preferredModel: 'model-a', searchEnabled: true },
  capabilities: {
    skillPolicies: [{ skillId: 'writer', mode: 'auto' }, { skillId: 'bad', mode: 'unknown' }],
    toolIds: ['web_search', 'web_search'],
    pluginIds: ['calendar']
  }
});

assert.equal(profile.runtime.agentEnabled, true);
assert.equal(profile.runtime.approvalMode, 'strict');
assert.deepEqual(profile.capabilities.toolIds, ['web_search']);
assert.deepEqual(profile.capabilities.skillPolicies, [{ skillId: 'writer', mode: 'auto' }]);

const assistant = normalizeAssistant({
  identifier: 'safe-assistant',
  meta: { title: 'Safe', tags: ['one'], category: 'Testing' },
  config: { systemRole: 'Follow the test.' },
  profile: { schemaVersion: 2, runtime: {}, capabilities: {} }
});
assert.equal(assistant.identifier, 'safe-assistant');
assert.equal(assistant.meta.systemRole, 'Follow the test.');
assert.equal(normalizeAssistant({ identifier: '../unsafe', meta: {} }), null);

const selectorSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'components', 'PersonaSelector.jsx'), 'utf8');
for (const id of ['taxbot', 'soccer', 'review', 'cloze']) {
  assert(selectorSource.includes(`id: '${id}'`), `missing built-in assistant ${id}`);
}
assert(selectorSource.includes('<AssistantMarketModal'), 'assistant marketplace is not connected to persona selector');

console.log('Assistant marketplace and profile normalization tests passed.');

const assert = require('assert');
const {
  appendSystemPromptExtensions
} = require('../electron/systemPromptExtensions');

const allEnabled = appendSystemPromptExtensions('Base prompt', {}, {
  dateTimeString: 'Monday, January 1, 2026'
});

assert(allEnabled.includes('Base prompt'));
assert(allEnabled.includes('<diagram-rendering>'));
assert(allEnabled.includes('<image-citation>'));
assert(allEnabled.includes('<html-visual>'));
assert(allEnabled.includes('Current date and time: Monday, January 1, 2026'));

const allDisabled = appendSystemPromptExtensions('Only base', {
  enableDiagramPrompt: false,
  enableImagePrompt: false,
  enableHtmlVisualPrompt: false,
  enableCurrentDateTimePrompt: false
});

assert.strictEqual(allDisabled, 'Only base');

const selective = appendSystemPromptExtensions('Base', {
  enableDiagramPrompt: true,
  enableImagePrompt: false,
  enableHtmlVisualPrompt: false,
  enableCurrentDateTimePrompt: false
});

assert(selective.includes('<diagram-rendering>'));
assert(!selective.includes('<image-citation>'));
assert(!selective.includes('<html-visual>'));
assert(!selective.includes('Current date and time:'));

console.log('System prompt extension tests passed.');

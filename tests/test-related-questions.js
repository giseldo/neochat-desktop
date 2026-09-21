const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseQuestions } = require('../electron/relatedQuestionsManager');

assert.deepEqual(
  parseQuestions('```json\n["Como funciona?", "Quais são os limites?", "Como funciona?"]\n```'),
  ['Como funciona?', 'Quais são os limites?']
);
assert.deepEqual(parseQuestions('1. Primeira?\n- Segunda?'), ['Primeira?', 'Segunda?']);
assert.equal(parseQuestions(JSON.stringify(Array.from({ length: 8 }, (_, index) => `Q${index}?`))).length, 5);

const messageList = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'components', 'MessageList.jsx'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'App.jsx'), 'utf8');
assert(messageList.includes('<FollowUpQuestions'), 'follow-up questions must render after the last assistant message');
assert(app.includes('relatedQuestions.generate'), 'follow-up generation must run after a completed response');
assert(app.includes('onSuggestionClick'), 'clicking a suggestion must send it as the next user question');

console.log('Related follow-up question tests passed.');

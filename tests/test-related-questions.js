const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseQuestions, resolveRelatedQuestionsModel } = require('../electron/relatedQuestionsManager');

assert.deepEqual(
  parseQuestions('```json\n["Como funciona?", "Quais são os limites?", "Como funciona?"]\n```'),
  ['Como funciona?', 'Quais são os limites?']
);
assert.deepEqual(parseQuestions('1. Primeira?\n- Segunda?'), ['Primeira?', 'Segunda?']);
assert.equal(parseQuestions(JSON.stringify(Array.from({ length: 8 }, (_, index) => `Q${index}?`))).length, 5);
assert.deepEqual(
  parseQuestions('We need answer with JSON array in Portuguese.\n[\n  "Me conta outra piada curta?",\n  "Você tem mais piadas de bar?"\n]'),
  ['Me conta outra piada curta?', 'Você tem mais piadas de bar?']
);
assert.deepEqual(
  parseQuestions('Internal reasoning that must not be shown.\n[\n  "Primeira pergunta?",\n  "Segunda pergunta?",'),
  ['Primeira pergunta?', 'Segunda pergunta?']
);
assert.deepEqual(
  resolveRelatedQuestionsModel('deepseek::deepseek-flash', { provider: 'ollama' }, {
    'deepseek::deepseek-flash': { provider: 'deepseek', rawModelId: 'deepseek-flash' }
  }),
  { provider: 'deepseek', model: 'deepseek-flash' }
);

const messageList = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'components', 'MessageList.jsx'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'App.jsx'), 'utf8');
const settings = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'pages', 'Settings.jsx'), 'utf8');
assert(messageList.includes('<FollowUpQuestions'), 'follow-up questions must render after the last assistant message');
assert(app.includes('relatedQuestions.generate'), 'follow-up generation must run after a completed response');
assert(app.includes('onSuggestionClick'), 'clicking a suggestion must send it as the next user question');
assert(settings.includes('related-questions-toggle'), 'settings must expose a related questions toggle');
assert(settings.includes('settings.relatedQuestions?.enabled !== false'), 'the related questions toggle must default to enabled');

console.log('Related follow-up question tests passed.');

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseQuestions, resolveRelatedQuestionsModel, stripThinking } = require('../electron/relatedQuestionsManager');

// Standard JSON array and deduplication
assert.deepEqual(
  parseQuestions('```json\n["Como funciona?", "Quais são os limites?", "Como funciona?"]\n```'),
  ['Como funciona?', 'Quais são os limites?']
);

// Numbered and bulleted lists
assert.deepEqual(parseQuestions('1. Primeira?\n- Segunda?'), ['Primeira?', 'Segunda?']);
assert.equal(parseQuestions(JSON.stringify(Array.from({ length: 8 }, (_, index) => `Q${index}?`))).length, 5);

// Thinking tag stripping
assert.deepEqual(
  parseQuestions('<think>\nWe need to generate follow up questions in Portuguese.\nLet\'s provide 2 questions.\n</think>\n["Qual a diferença?", "Pode me dar um exemplo?"]'),
  ['Qual a diferença?', 'Pode me dar um exemplo?']
);

// Unclosed thinking tag
assert.deepEqual(
  parseQuestions('<think>\nStill thinking...'),
  []
);

// JSON Object format
assert.deepEqual(
  parseQuestions('{\n  "questions": ["Como otimizar o código?", "O que é assincronismo?"]\n}'),
  ['Como otimizar o código?', 'O que é assincronismo?']
);

// Reasoning with preamble before JSON array
assert.deepEqual(
  parseQuestions('We need answer with JSON array in Portuguese.\n[\n  "Me conta outra piada curta?",\n  "Você tem mais piadas de bar?"\n]'),
  ['Me conta outra piada curta?', 'Você tem mais piadas de bar?']
);
assert.deepEqual(
  parseQuestions('Internal reasoning that must not be shown.\n[\n  "Primeira pergunta?",\n  "Segunda pergunta?",'),
  ['Primeira pergunta?', 'Segunda pergunta?']
);

// User screenshot regression test: reasoning paragraphs containing prompt instructions must NOT leak as questions
const screenshotReasoning = `We need answer user asks: "Suggest 3 to 5 concise follow-up questions the user may want to ask next. Each question must have fewer than 24 words, use same language as user, and be directly related to conversation. Return only a JSON array o

We need provide JSON array of strings. Language is Portuguese (user's message "Conte outra piada de programador." assistant responded in Portuguese). Need suggest 3-5 concise follow-up questions user may want to ask next. Directly related t

We need craft follow-up questions. They should be questions the user may want to ask next after hearing programmer joke. Possibly ask for more jokes, variations, explanations, etc. Must be related. Keep concise. Fewer than 24 words. JSON ar

Examples:

Conte mais uma piada de programador.`;

assert.deepEqual(
  parseQuestions(screenshotReasoning),
  ['Conte mais uma piada de programador.']
);

// Preamble before plain questions
assert.deepEqual(
  parseQuestions('We need infer the language and provide examples.\nNeed no extra text.\nPor que essa piada funciona?\nVocê conhece outra piada?'),
  ['Por que essa piada funciona?', 'Você conhece outra piada?']
);

// Model resolution
assert.deepEqual(
  resolveRelatedQuestionsModel('deepseek::deepseek-flash', { provider: 'ollama' }, {
    'deepseek::deepseek-flash': { provider: 'deepseek', rawModelId: 'deepseek-flash' }
  }),
  { provider: 'deepseek', model: 'deepseek-flash' }
);

// Strip thinking helper
assert.equal(stripThinking('<think>secret</think>clean text'), 'clean text');
assert.equal(stripThinking('<thought>secret</thought>clean text'), 'clean text');
assert.equal(stripThinking('<think>unclosed'), '');

const messageList = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'components', 'MessageList.jsx'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'App.jsx'), 'utf8');
const settings = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'pages', 'Settings.jsx'), 'utf8');
assert(messageList.includes('<FollowUpQuestions'), 'follow-up questions must render after the last assistant message');
assert(app.includes('relatedQuestions.generate'), 'follow-up generation must run after a completed response');
assert(app.includes('onSuggestionClick'), 'clicking a suggestion must send it as the next user question');
assert(settings.includes('related-questions-toggle'), 'settings must expose a related questions toggle');
assert(settings.includes('settings.relatedQuestions?.enabled !== false'), 'the related questions toggle must default to enabled');

console.log('Related follow-up question tests passed.');


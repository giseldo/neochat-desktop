const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ResearchStore, fields } = require('./electron/research/store');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-research-test-'));
try {
  const store = new ResearchStore(directory);
  assert.deepEqual(store.list(), []);
  const draft = Object.fromEntries(fields.map(field => [field, '']));
  assert.throws(() => store.save(draft), /título/);
  const first = store.save({ ...draft, title: ' Minha revisão ', questions: 'Como apoiar a aprendizagem?\nQuais métodos?', population: 'Estudantes' });
  assert.equal(first.title, 'Minha revisão');
  assert.equal(first.revision, 1);
  const reopened = new ResearchStore(directory).get(first.id);
  assert.deepEqual(reopened, first);
  const updated = store.save({ ...reopened, inclusion: 'Estudos empíricos' });
  assert.equal(updated.revision, 2);
  assert.equal(updated.createdAt, first.createdAt);
  assert.equal(store.list().length, 1);
  assert.throws(() => store.save(first), /mudou/);
  assert.throws(() => store.get('../../settings'), /inválido/);
  assert.throws(() => store.save({ ...updated, questions: {} }), /Campo inválido/);
  assert.deepEqual(store.get(updated.id), updated);
  console.log('Research: persistence, validation, traversal and revision conflict checks passed.');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}

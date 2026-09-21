const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const rag = require('../electron/ragService');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-rag-hybrid-'));
const docsDir = path.join(tempDir, 'docs');

async function run() {
  try {
    fs.mkdirSync(docsDir);
    const markdownLines = ['# Authentication', 'The application authenticates users with rotating security credentials.'];
    for (let index = 0; index < 70; index++) markdownLines.push(`Supporting detail ${index}`);
    fs.writeFileSync(path.join(docsDir, 'security.md'), markdownLines.join('\n'));
    fs.writeFileSync(path.join(docsDir, 'other.txt'), 'Unrelated inventory and shipping information.');
    rag.initialize({ getPath: () => tempDir });

    await rag.indexFolder(docsDir, 'hybrid');
    const result = rag.queryKnowledge('authentication credential', { projectId: 'hybrid', maxResults: 5 });
    assert.ok(result.results.some(item => item.fileName === 'security.md'));
    const security = result.results.find(item => item.fileName === 'security.md');
    assert.ok(['both', 'semantic'].includes(security.retrieval));
    assert.deepEqual(security.headingPath, ['Authentication']);

    const portuguese = rag.tokenizeText('Configuração e documentação não disponível');
    assert.ok(portuguese.includes('configuracao'));
    assert.ok(portuguese.includes('documentacao'));
    assert.ok(!portuguese.includes('nao'));

    const similar = rag.cosineSimilarity(
      rag.buildSemanticFeatures('authenticate credential'),
      rag.buildSemanticFeatures('authentication credentials')
    );
    assert.ok(similar > 0.1);
    console.log('Hybrid RAG retrieval tests passed.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });

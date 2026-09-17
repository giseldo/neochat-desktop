const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const rag = require('../electron/ragService');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-rag-incremental-'));
const docsDir = path.join(tempDir, 'docs');

async function run() {
    try {
        fs.mkdirSync(docsDir);
        fs.writeFileSync(path.join(docsDir, 'one.md'), '# Alpha\nIncremental indexing content');
        fs.writeFileSync(path.join(docsDir, 'two.txt'), 'Beta document');
        fs.writeFileSync(path.join(docsDir, 'three.rtf'), '{\\rtf1\\ansi Office document extraction phrase}');
        rag.initialize({ getPath: () => tempDir });

        const first = await rag.indexFolder(docsDir, 'project');
        assert.strictEqual(first.addedFiles, 3);
        assert.strictEqual(first.unchangedFiles, 0);
        assert.ok(rag.queryKnowledge('document extraction phrase', { projectId: 'project' }).results.some(result => result.fileName === 'three.rtf'));

        const second = await rag.indexFolder(docsDir, 'project');
        assert.strictEqual(second.addedFiles, 0);
        assert.strictEqual(second.unchangedFiles, 3);

        fs.writeFileSync(path.join(docsDir, 'one.md'), '# Alpha changed\nNew searchable phrase');
        const third = await rag.indexFolder(docsDir, 'project');
        assert.strictEqual(third.changedFiles, 1);
        assert.strictEqual(third.unchangedFiles, 2);
        const changedResults = rag.queryKnowledge('searchable phrase', { projectId: 'project' }).results;
        assert.ok(changedResults.some(result => result.fileName === 'one.md' && result.content.includes('New searchable phrase')));

        fs.unlinkSync(path.join(docsDir, 'two.txt'));
        const fourth = await rag.indexFolder(docsDir, 'project');
        assert.strictEqual(fourth.removedFiles, 1);
        console.log('Incremental RAG tests passed.');
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });

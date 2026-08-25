const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { validateRepository, getRepositoryStatus } = require('./electron/gitManager');

async function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-git-'));
  try {
    assert.throws(() => validateRepository(root), /not a Git repository/);
    execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
    assert.strictEqual(validateRepository(root), path.resolve(root));
    fs.writeFileSync(path.join(root, 'example.txt'), 'test');
    const status = await getRepositoryStatus(root);
    assert(status.status.includes('example.txt'));
    assert.strictEqual(typeof status.branch, 'string');
    console.log('git manager tests passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });

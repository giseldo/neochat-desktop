const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const { once } = require('events');
const { fields } = require('../electron/research/store');

async function main() {
  const executable = path.resolve(process.argv[2] || 'release/research/win-unpacked/neochat-research.exe');
  assert.ok(fs.existsSync(executable), 'Build the Research package first.');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-research-package-'));
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  const env = { ...process.env, NEOCHAT_RESEARCH_USER_DATA_PATH: directory };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_ENV;
  const child = spawn(executable, [`--remote-debugging-port=${port}`], { env, windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let target;
    for (let i = 0; i < 100 && !target; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(1000) });
        target = (await response.json()).find(item => item.type === 'page' && item.url.startsWith('file:'));
      } catch { /* App is still starting. */ }
      if (!target) await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(target, 'Packaged renderer did not load.');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0;
    const request = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const listener = event => {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        clearTimeout(timer); socket.removeEventListener('message', listener);
        if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
      };
      const timer = setTimeout(() => { socket.removeEventListener('message', listener); reject(new Error(`Timed out: ${method}`)); }, 10000);
      socket.addEventListener('message', listener);
      socket.send(JSON.stringify({ id, method, params }));
    });
    let ready = false;
    for (let i = 0; i < 100 && !ready; i++) {
      try {
        const state = await request('Runtime.evaluate', { expression: "Boolean(window.research && document.body?.innerText.includes('Nova revisão'))", returnByValue: true });
        ready = state.result?.value === true;
      } catch { /* Navigation may replace the initial execution context. */ }
      if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'Packaged Research UI did not become ready.');
    const draft = { ...Object.fromEntries(fields.map(field => [field, ''])), title: 'Packaged Research check' };
    const evaluation = await request('Runtime.evaluate', { expression: `(async()=>{ for(let i=0;i<100&&!document.body?.innerText.includes('Nova revisão');i++) await new Promise(r=>setTimeout(r,50)); if(window.electron) throw new Error('Desktop bridge loaded'); const saved=await window.research.save(${JSON.stringify(draft)}); return {title:document.title, project:await window.research.get(saved.id)}; })()`, awaitPromise: true, returnByValue: true });
    assert.ok(!evaluation.exceptionDetails, JSON.stringify(evaluation.exceptionDetails));
    assert.equal(evaluation.result.value.title, 'NeoChat Research');
    assert.equal(evaluation.result.value.project.title, draft.title);
    assert.equal(fs.readdirSync(path.join(directory, 'reviews')).filter(file => file.endsWith('.json')).length, 1);
    console.log('Packaged Research: identity, preload, renderer and isolated persistence passed.');
  } finally {
    if (socket) socket.close();
    if (child.exitCode === null) { const closed = once(child, 'exit'); child.kill(); await closed; }
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

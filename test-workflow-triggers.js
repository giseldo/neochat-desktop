const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');
const workflowManager = require('./electron/workflowManager');

async function testWorkflowTriggers() {
  console.log('🧪 Testing Workflow Triggers & Local Webhooks...');

  // Setup temporary dir for tests
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-wf-test-'));
  const fakeApp = {
    getPath: () => tempDir
  };
  workflowManager.initialize(fakeApp);

  // 1. Create a workflow with a webhook trigger
  const created = workflowManager.save({
    name: 'CI Build Notifier',
    description: 'Triggered by CI webhooks',
    steps: ['Check commit {{commit}}', 'Run analysis for repo {{repo}}'],
    trigger: {
      type: 'webhook',
      config: { secret: 'super_secret_123' }
    }
  });

  assert(created.id, 'Workflow must have an ID');
  assert.strictEqual(created.trigger.type, 'webhook');
  console.log('✅ [PASS] Workflow creation with webhook trigger validated');

  // 2. Start local webhook server on an ephemeral port
  const port = 39299;
  const startResult = workflowManager.startWebhookServer(port);
  assert.strictEqual(startResult.status, 'started');

  let triggeredData = null;
  const unsubscribe = workflowManager.onWorkflowTriggered((data) => {
    triggeredData = data;
  });

  try {
    // 3. Test HTTP POST to webhook endpoint
    const postPayload = JSON.stringify({ commit: 'abc1234', repo: 'neochat-desktop' });
    
    await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: port,
        path: `/webhook/${created.id}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'super_secret_123',
          'Content-Length': Buffer.byteLength(postPayload)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          assert.strictEqual(res.statusCode, 200);
          const parsed = JSON.parse(body);
          assert.strictEqual(parsed.success, true);
          resolve();
        });
      });

      req.on('error', reject);
      req.write(postPayload);
      req.end();
    });

    assert(triggeredData, 'Trigger listener must have received event');
    assert(triggeredData.prompt.includes('abc1234'), 'Prompt should interpolate {{commit}}');
    assert(triggeredData.prompt.includes('neochat-desktop'), 'Prompt should interpolate {{repo}}');
    console.log('✅ [PASS] Webhook POST and variable interpolation validated');

    // 4. Test unauthorized webhook request
    await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: port,
        path: `/webhook/${created.id}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'wrong_secret',
          'Content-Length': 2
        }
      }, (res) => {
        assert.strictEqual(res.statusCode, 401);
        resolve();
      });
      req.on('error', reject);
      req.write('{}');
      req.end();
    });
    console.log('✅ [PASS] Webhook secret authentication validated');

  } finally {
    unsubscribe();
    workflowManager.stopWebhookServer();
    // Cleanup temp dir
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
  }

  console.log('🎉 All Workflow Trigger tests passed successfully!\n');
}

testWorkflowTriggers().catch(err => {
  console.error('❌ Workflow Triggers test failed:', err);
  process.exit(1);
});

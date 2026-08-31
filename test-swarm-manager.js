const assert = require('assert');
const { swarmManager, SWARM_ROLES, SWARM_MODES } = require('./electron/agent');

async function testSwarmManager() {
  console.log('🧪 Testing SwarmManager...');

  // 1. Check roles
  const roles = swarmManager.getRoles();
  assert(Array.isArray(roles) && roles.length >= 5, 'Roles should have at least 5 standard roles');
  assert(roles.some(r => r.id === 'architect'), 'Must have architect role');
  assert(roles.some(r => r.id === 'coder'), 'Must have coder role');
  assert(roles.some(r => r.id === 'reviewer'), 'Must have reviewer role');
  assert(roles.some(r => r.id === 'security'), 'Must have security role');
  assert(roles.some(r => r.id === 'tester'), 'Must have tester role');
  console.log('✅ [PASS] SwarmManager roles validated');

  // 2. Check modes
  const modes = swarmManager.getModes();
  assert(modes.includes('parallel') && modes.includes('pipeline') && modes.includes('debate'), 'Modes validated');
  console.log('✅ [PASS] SwarmManager modes validated');

  // 3. Test execution simulation with mocked streamCompletion
  const eventsCaptured = [];
  const fakeSettings = { groqApiKey: 'mock_key' };

  // Intercept _executeAgent and _synthesizeResults to test orchestration logic safely
  const originalExec = swarmManager._executeAgent;
  const originalSynth = swarmManager._synthesizeResults;

  swarmManager._executeAgent = async ({ role, prompt }) => {
    return `Analysis from ${role.name} for prompt: "${prompt.slice(0, 30)}..."`;
  };

  swarmManager._synthesizeResults = async ({ prompt, results }) => {
    return `Master synthesis combining ${results.length} expert contributions for: "${prompt}"`;
  };

  try {
    const runResult = await swarmManager.runTeam({
      swarmId: 'test_swarm_123',
      prompt: 'Design and implement a resilient caching layer',
      roles: ['architect', 'coder', 'security'],
      mode: 'parallel',
      settings: fakeSettings,
      onProgress: (evt) => {
        eventsCaptured.push(evt.event);
      }
    });

    assert.strictEqual(runResult.status, 'completed');
    assert.strictEqual(runResult.results.length, 3);
    assert(runResult.synthesis.includes('Master synthesis'));
    assert(eventsCaptured.includes('swarm:started'));
    assert(eventsCaptured.includes('swarm:completed'));
    console.log('✅ [PASS] Swarm parallel execution and synthesis validated');

    // 4. Test pipeline mode
    const pipelineResult = await swarmManager.runTeam({
      swarmId: 'test_swarm_pipe',
      prompt: 'Refactor authentication module',
      roles: ['architect', 'coder', 'reviewer'],
      mode: 'pipeline',
      settings: fakeSettings
    });

    assert.strictEqual(pipelineResult.status, 'completed');
    assert.strictEqual(pipelineResult.results.length, 3);
    console.log('✅ [PASS] Swarm pipeline execution validated');

    // 5. Test debate mode
    const debateResult = await swarmManager.runTeam({
      swarmId: 'test_swarm_debate',
      prompt: 'Microservices vs Monolith for NeoChat backend',
      roles: ['architect', 'coder'],
      mode: 'debate',
      settings: fakeSettings
    });

    assert.strictEqual(debateResult.status, 'completed');
    assert.strictEqual(debateResult.results.length, 2);
    console.log('✅ [PASS] Swarm debate execution validated');
  } finally {
    swarmManager._executeAgent = originalExec;
    swarmManager._synthesizeResults = originalSynth;
  }

  console.log('🎉 All SwarmManager tests passed successfully!\n');
}

testSwarmManager().catch(err => {
  console.error('❌ SwarmManager test failed:', err);
  process.exit(1);
});

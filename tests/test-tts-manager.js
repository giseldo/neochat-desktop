/**
 * Test script for NeoChat Multi-Engine TTS Manager
 */

const assert = require('assert');
const { ttsManager, EDGE_VOICES, PIPER_VOICES, KOKORO_VOICES } = require('../electron/ttsManager');

async function runTests() {
    console.log('--- Starting Multi-Engine TTS Tests ---');

    // Test 1: Catalogs verification
    console.log('\n[Test 1] Verifying voice catalogs...');
    assert.ok(Array.isArray(EDGE_VOICES) && EDGE_VOICES.length >= 10, 'Edge voices should have >= 10 entries');
    assert.ok(Array.isArray(PIPER_VOICES) && PIPER_VOICES.length >= 3, 'Piper voices should have >= 3 entries');
    assert.ok(Array.isArray(KOKORO_VOICES) && KOKORO_VOICES.length >= 5, 'Kokoro voices should have >= 5 entries');

    assert.strictEqual(ttsManager.getVoices('edge').length, EDGE_VOICES.length);
    assert.strictEqual(ttsManager.getVoices('piper').length, PIPER_VOICES.length);
    assert.strictEqual(ttsManager.getVoices('kokoro').length, KOKORO_VOICES.length);
    console.log('✓ Catalogs verified correctly.');

    // Test 2: Edge TTS Synthesis
    console.log('\n[Test 2] Testing Edge TTS Synthesis via ttsManager...');
    const result = await ttsManager.synthesize({
        text: 'Olá mundo, testando a síntese Edge TTS no NeoChat Desktop.',
        engine: 'edge',
        voice: 'pt-BR-FranciscaNeural',
        rate: 1.05,
        pitch: 1.0
    });

    assert.ok(result, 'Result should exist');
    assert.strictEqual(result.format, 'mp3', 'Edge format should be mp3');
    assert.ok(result.audioUrl && result.audioUrl.startsWith('data:audio/mp3;base64,'), 'Should return base64 audio data URI');
    console.log(`✓ Audio synthesized successfully (URI length: ${result.audioUrl.length} chars).`);

    // Test 3: Local Caching
    console.log('\n[Test 3] Testing local audio cache...');
    const cachedResult = await ttsManager.synthesize({
        text: 'Olá mundo, testando a síntese Edge TTS no NeoChat Desktop.',
        engine: 'edge',
        voice: 'pt-BR-FranciscaNeural',
        rate: 1.05,
        pitch: 1.0
    });

    assert.strictEqual(cachedResult.cached, true, 'Subsequent call should be served from cache');
    assert.strictEqual(cachedResult.audioUrl, result.audioUrl, 'Cached audioUrl should match original');
    console.log('✓ Local audio cache verified successfully.');

    // Test 4: Voice Preview / Demo
    console.log('\n[Test 4] Testing testVoice method...');
    const testPreview = await ttsManager.testVoice({
        engine: 'edge',
        voice: 'pt-BR-AntonioNeural'
    });
    assert.ok(testPreview.audioUrl.startsWith('data:audio/mp3;base64,'), 'Preview should return audio URI');
    console.log('✓ testVoice demonstration executed successfully.');

    console.log('\n========================================');
    console.log('🎉 ALL TTS MANAGER TESTS PASSED! 🎉');
    console.log('========================================');
}

runTests().catch(err => {
    console.error('TTS Manager Test failed:', err);
    process.exit(1);
});

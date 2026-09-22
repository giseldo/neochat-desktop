const assert = require('assert');
const { normalizeTts, normalizeVoiceInput } = require('../electron/settingsManager');

assert.deepStrictEqual(normalizeTts(), {
    enabled: true,
    autoSpeak: false,
    engine: 'edge',
    voiceURI: '',
    edgeVoice: 'pt-BR-FranciscaNeural',
    piperVoice: 'pt_BR-faber-medium',
    kokoroVoice: 'af_heart',
    rate: 1.05,
    pitch: 1
});
assert.deepStrictEqual(normalizeTts({ enabled: false, autoSpeak: true, engine: 'piper', piperVoice: 'pt_BR-edresson-low', voiceURI: 'voice-a', rate: 9, pitch: 0 }), {
    enabled: false,
    autoSpeak: true,
    engine: 'piper',
    voiceURI: 'voice-a',
    edgeVoice: 'pt-BR-FranciscaNeural',
    piperVoice: 'pt_BR-edresson-low',
    kokoroVoice: 'af_heart',
    rate: 2,
    pitch: 0.5
});
assert.strictEqual(normalizeTts({ rate: '1.25' }).rate, 1.25);
assert.strictEqual(normalizeTts({ engine: 'kokoro' }).engine, 'kokoro');
assert.strictEqual(normalizeTts({ engine: 'unknown-engine' }).engine, 'edge');

assert.deepStrictEqual(normalizeVoiceInput(), { enabled: true, apiKey: '' });
assert.deepStrictEqual(normalizeVoiceInput({ enabled: true, apiKey: 'gsk-voice' }), { enabled: true, apiKey: 'gsk-voice' });
assert.deepStrictEqual(normalizeVoiceInput({ enabled: false }), { enabled: false, apiKey: '' });
assert.deepStrictEqual(normalizeVoiceInput({ apiKey: 123 }), { enabled: true, apiKey: '' });

console.log('Voice and TTS settings tests passed.');



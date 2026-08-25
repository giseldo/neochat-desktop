const assert = require('assert');
const { normalizeTts, normalizeVoiceInput } = require('./electron/settingsManager');

assert.deepStrictEqual(normalizeTts(), { enabled: true, autoSpeak: false, voiceURI: '', rate: 1.05, pitch: 1 });
assert.deepStrictEqual(normalizeTts({ enabled: false, autoSpeak: true, voiceURI: 'voice-a', rate: 9, pitch: 0 }), { enabled: false, autoSpeak: true, voiceURI: 'voice-a', rate: 2, pitch: 0.5 });
assert.strictEqual(normalizeTts({ rate: '1.25' }).rate, 1.25);

assert.deepStrictEqual(normalizeVoiceInput(), { enabled: true, apiKey: '' });
assert.deepStrictEqual(normalizeVoiceInput({ enabled: true, apiKey: 'gsk-voice' }), { enabled: true, apiKey: 'gsk-voice' });
assert.deepStrictEqual(normalizeVoiceInput({ enabled: false }), { enabled: false, apiKey: '' });
assert.deepStrictEqual(normalizeVoiceInput({ apiKey: 123 }), { enabled: true, apiKey: '' });

console.log('Voice and TTS settings tests passed.');



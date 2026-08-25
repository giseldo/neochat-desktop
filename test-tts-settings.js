const assert = require('assert');
const { normalizeTts } = require('./electron/settingsManager');

assert.deepStrictEqual(normalizeTts(), { enabled: true, autoSpeak: false, voiceURI: '', rate: 1.05, pitch: 1 });
assert.deepStrictEqual(normalizeTts({ enabled: false, autoSpeak: true, voiceURI: 'voice-a', rate: 9, pitch: 0 }), { enabled: false, autoSpeak: true, voiceURI: 'voice-a', rate: 2, pitch: 0.5 });
assert.strictEqual(normalizeTts({ rate: '1.25' }).rate, 1.25);
console.log('TTS settings tests passed.');

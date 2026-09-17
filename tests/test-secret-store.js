const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { initializeSettingsHandlers, loadSettings } = require('../electron/settingsManager');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neochat-vault-'));
const settingsPath = path.join(tempDir, 'settings.json');
const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`encrypted:${value}`, 'utf8'),
    decryptString: (buffer) => buffer.toString('utf8').slice('encrypted:'.length)
};
const handlers = new Map();
const ipcMain = { handle: (channel, handler) => handlers.set(channel, handler) };

async function run() {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify({
            interfaceMode: 'power',
            apiKeys: { groq: 'gsk-secret', openai: 'sk-secret' },
            googleRefreshToken: 'refresh-secret',
            webSearch: { enabled: true, apiKey: 'search-secret' },
            voiceInput: { enabled: true, apiKey: 'voice-secret' }
        }));

        initializeSettingsHandlers(ipcMain, { getPath: () => tempDir }, safeStorage);
        const loaded = loadSettings();
        assert.strictEqual(loaded.apiKeys.groq, 'gsk-secret');
        assert.strictEqual(loaded.googleRefreshToken, 'refresh-secret');
        assert.strictEqual(loaded.webSearch.apiKey, 'search-secret');
        assert.strictEqual(loaded.voiceInput.apiKey, 'voice-secret');

        const plaintext = fs.readFileSync(settingsPath, 'utf8');
        assert.ok(!plaintext.includes('gsk-secret'), 'API keys must leave settings.json');
        assert.ok(!plaintext.includes('refresh-secret'), 'OAuth secrets must leave settings.json');
        assert.ok(!plaintext.includes('search-secret'), 'search keys must leave settings.json');
        assert.ok(!plaintext.includes('voice-secret'), 'voice keys must leave settings.json');
        assert.ok(fs.existsSync(path.join(tempDir, 'secrets.vault')), 'encrypted vault must be created');

        const reloaded = loadSettings();
        assert.strictEqual(reloaded.apiKeys.openai, 'sk-secret', 'vault secrets must hydrate on reload');
        assert.strictEqual(reloaded.voiceInput.apiKey, 'voice-secret', 'voice secret must hydrate on reload');
        console.log('Credential vault tests passed.');
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

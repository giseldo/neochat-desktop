const fs = require('fs');
const path = require('path');

const SECRET_FIELDS = ['apiKeys', 'googleOAuthToken', 'googleRefreshToken', 'googleClientSecret'];

function createSecretStore({ userDataPath, safeStorage }) {
    const vaultPath = path.join(userDataPath, 'secrets.vault');

    const isAvailable = () => Boolean(
        safeStorage &&
        typeof safeStorage.isEncryptionAvailable === 'function' &&
        safeStorage.isEncryptionAvailable()
    );

    function split(settings) {
        const publicSettings = JSON.parse(JSON.stringify(settings || {}));
        const secrets = {};
        for (const field of SECRET_FIELDS) {
            if (publicSettings[field] !== undefined) {
                secrets[field] = publicSettings[field];
                delete publicSettings[field];
            }
        }
        if (publicSettings.webSearch?.apiKey !== undefined) {
            secrets.webSearchApiKey = publicSettings.webSearch.apiKey;
            delete publicSettings.webSearch.apiKey;
        }
        if (publicSettings.voiceInput?.apiKey !== undefined) {
            secrets.voiceInputApiKey = publicSettings.voiceInput.apiKey;
            delete publicSettings.voiceInput.apiKey;
        }
        if (publicSettings.imageGeneration?.apiKey !== undefined) {
            secrets.imageGenerationApiKey = publicSettings.imageGeneration.apiKey;
            delete publicSettings.imageGeneration.apiKey;
        }
        if (publicSettings.externalPluginConfigs !== undefined) {
            const pluginConfigs = publicSettings.externalPluginConfigs;
            const publicPluginConfigs = {};
            const pluginAuthValues = {};
            for (const [pluginId, config] of Object.entries(pluginConfigs || {})) {
                publicPluginConfigs[pluginId] = { ...(config || {}) };
                if (publicPluginConfigs[pluginId].authValue !== undefined) {
                    pluginAuthValues[pluginId] = publicPluginConfigs[pluginId].authValue;
                    delete publicPluginConfigs[pluginId].authValue;
                }
            }
            publicSettings.externalPluginConfigs = publicPluginConfigs;
            if (Object.keys(pluginAuthValues).length > 0) secrets.externalPluginAuthValues = pluginAuthValues;
        }
        return { publicSettings, secrets };
    }

    function save(settings) {
        if (!isAvailable()) return { protected: false, publicSettings: settings };
        const { publicSettings, secrets } = split(settings);
        const encrypted = safeStorage.encryptString(JSON.stringify(secrets));
        const temporaryPath = `${vaultPath}.tmp`;
        fs.writeFileSync(temporaryPath, encrypted, { mode: 0o600 });
        fs.renameSync(temporaryPath, vaultPath);
        return { protected: true, publicSettings };
    }

    function hydrate(settings) {
        if (!isAvailable() || !fs.existsSync(vaultPath)) return settings;
        try {
            const decrypted = safeStorage.decryptString(fs.readFileSync(vaultPath));
            const secrets = JSON.parse(decrypted);
            const hydrated = { ...settings };
            for (const field of SECRET_FIELDS) {
                if (secrets[field] !== undefined) hydrated[field] = secrets[field];
            }
            if (secrets.webSearchApiKey !== undefined) {
                hydrated.webSearch = { ...(hydrated.webSearch || {}), apiKey: secrets.webSearchApiKey };
            }
            if (secrets.voiceInputApiKey !== undefined) {
                hydrated.voiceInput = { ...(hydrated.voiceInput || {}), apiKey: secrets.voiceInputApiKey };
            }
            if (secrets.imageGenerationApiKey !== undefined) {
                hydrated.imageGeneration = { ...(hydrated.imageGeneration || {}), apiKey: secrets.imageGenerationApiKey };
            }
            if (secrets.externalPluginAuthValues !== undefined) {
                hydrated.externalPluginConfigs = { ...(hydrated.externalPluginConfigs || {}) };
                for (const [pluginId, authValue] of Object.entries(secrets.externalPluginAuthValues)) {
                    hydrated.externalPluginConfigs[pluginId] = {
                        ...(hydrated.externalPluginConfigs[pluginId] || {}),
                        authValue
                    };
                }
            }
            return hydrated;
        } catch (error) {
            console.error('Unable to decrypt credential vault:', error.message);
            return settings;
        }
    }

    return { hydrate, isAvailable, save, vaultPath };
}

module.exports = { createSecretStore };

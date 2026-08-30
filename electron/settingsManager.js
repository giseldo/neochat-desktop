const fs = require('fs');
const path = require('path');
const { createSecretStore } = require('./secretStore');
const { invalidateModelsCache } = require('../shared/models.js');

// Load environment variables from .env file
require('dotenv').config();

let appInstance; // To store app instance for userData path
let secretStore;

function normalizeTts(value = {}) {
    const clamp = (number, fallback) => Math.min(2, Math.max(0.5, Number.isFinite(Number(number)) ? Number(number) : fallback));
    return {
        enabled: value.enabled !== false,
        autoSpeak: value.autoSpeak === true,
        voiceURI: typeof value.voiceURI === 'string' ? value.voiceURI : '',
        rate: clamp(value.rate, 1.05),
        pitch: clamp(value.pitch, 1)
    };
}

function normalizeVoiceInput(value = {}) {
    return {
        enabled: value.enabled !== false,
        apiKey: typeof value.apiKey === 'string' ? value.apiKey : ''
    };
}

function persistSettings(settings, settingsPath) {
    const result = secretStore ? secretStore.save(settings) : { protected: false, publicSettings: settings };
    const temporaryPath = `${settingsPath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(result.publicSettings, null, 2));
    fs.renameSync(temporaryPath, settingsPath);
    return result.protected;
}

// Helper function to load settings with defaults and validation
function loadSettings() {
    if (!appInstance) {
        console.error("App instance not initialized in settingsManager.");
        // Return minimal defaults to avoid crashing downstream logic
        return {
            language: 'pt',
            interfaceMode: 'user',
            showTrajectoryTab: true,
            showWelcomeTips: false,
            showWelcomeSuggestions: false,
            showButtonLabels: false,
            GROQ_API_KEY: process.env.GROQ_API_KEY || "<replace me>",
            model: process.env.GROQ_DEFAULT_MODEL || "llama-3.3-70b-versatile",
            temperature: 0.7,
            top_p: 0.95,
            mcpServers: {},
            disabledMcpServers: [],
            toolPermissions: { defaultPolicy: 'prompt', tools: {}, allowAll: false },
            customSystemPrompt: '',
            popupEnabled: true,
            popupShortcut: 'CommandOrControl+Shift+Space',
            customCompletionUrl: '',
            toolOutputLimit: 8000,
            customApiBaseUrl: '',
            customApiBaseUrlEnabled: false,
            customModels: {},
            disabledModels: [],
            disableThinkingSummaries: false,
            useResponsesApi: false,
            logApiRequests: false,
            googleConnectors: { gmail: false, calendar: false, drive: false },
            googleOAuthToken: "",
            googleRefreshToken: "",
            googleClientId: "",
            googleClientSecret: "",
            googleTokenExpiresAt: null,
            customPromptTemplates: [],
            voiceInput: { enabled: true, apiKey: '' },
            providerFilterTab: 'active',
            webSearch: {
                enabled: false,
                provider: 'local',
                apiKey: '',
                maxResults: 5
            }
        };
    }
    const userDataPath = appInstance.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    const defaultSettings = {
        language: 'pt',
        interfaceMode: 'user',
        showTrajectoryTab: true,
        showWelcomeTips: false,
        showWelcomeSuggestions: false,
        showButtonLabels: false,
        provider: 'groq',
        apiKeys: {},
        providerUrls: {},
        enabledProviders: ['groq'],
        customProviders: [],
        fallbackProviders: [],
        fallbackModels: {},
        tts: { enabled: true, autoSpeak: false, voiceURI: '', rate: 1.05, pitch: 1 },
        voiceInput: { enabled: true, apiKey: '' },
        autoUpdate: { checkOnStartup: true, channel: 'stable' },
        observability: { monthlyBudgetUsd: 0, defaultRate: { input: 0, output: 0 }, modelRates: {} },
        gitIntegration: { repositoryPath: '' },
        GROQ_API_KEY: process.env.GROQ_API_KEY || "<replace me>",
        model: process.env.GROQ_DEFAULT_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.7,
        top_p: 0.95,
        reasoning_effort: 'medium',
        mcpServers: {},
        disabledMcpServers: [],
        toolPermissions: { defaultPolicy: 'prompt', tools: {}, allowAll: false },
        customSystemPrompt: '',
        popupEnabled: true,
        popupShortcut: 'CommandOrControl+Shift+Space',
        customCompletionUrl: '',
        toolOutputLimit: 8000,
        customApiBaseUrl: '',
        customApiBaseUrlEnabled: false,
        customModels: {},
        disabledModels: [],
        disableThinkingSummaries: false,
        useResponsesApi: false,
        logApiRequests: false,
        googleConnectors: { gmail: false, calendar: false, drive: false },
        googleOAuthToken: "",
        googleRefreshToken: "",
        googleClientId: "",
        googleClientSecret: "",
        googleTokenExpiresAt: null,
        customPromptTemplates: [],
        providerFilterTab: 'active',
        chatWidth: 'wide',
        webSearch: {
            enabled: false,
            provider: 'local',
            apiKey: '',
            maxResults: 5
        }
    };

    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            const parsedSettings = JSON.parse(data);
            const hasPlaintextSecrets = Boolean(
                parsedSettings.GROQ_API_KEY ||
                Object.keys(parsedSettings.apiKeys || {}).length ||
                parsedSettings.googleOAuthToken ||
                parsedSettings.googleRefreshToken ||
                parsedSettings.googleClientSecret ||
                parsedSettings.webSearch?.apiKey ||
                parsedSettings.voiceInput?.apiKey
            );
            if (hasPlaintextSecrets && secretStore?.isAvailable()) {
                persistSettings(parsedSettings, settingsPath);
            }
            const loadedSettings = secretStore ? secretStore.hydrate(parsedSettings) : parsedSettings;

            // Merge defaults and ensure required fields exist, applying defaults if necessary
            const settings = { ...defaultSettings, ...loadedSettings };

            // Environment variables take precedence over settings file for API key
            if (process.env.GROQ_API_KEY) {
                settings.GROQ_API_KEY = process.env.GROQ_API_KEY;
                console.log('Using GROQ_API_KEY from environment variable');
            } else {
                // Explicitly check and apply defaults for potentially missing/undefined fields
                settings.GROQ_API_KEY = settings.GROQ_API_KEY || defaultSettings.GROQ_API_KEY;
            }

            settings.language = settings.language || defaultSettings.language;
            settings.interfaceMode = settings.interfaceMode === 'power' ? 'power' : 'user';
            settings.showTrajectoryTab = settings.showTrajectoryTab ?? defaultSettings.showTrajectoryTab;
            settings.showWelcomeTips = settings.showWelcomeTips ?? defaultSettings.showWelcomeTips;
            settings.showWelcomeSuggestions = settings.showWelcomeSuggestions ?? defaultSettings.showWelcomeSuggestions;
            settings.showButtonLabels = settings.showButtonLabels ?? defaultSettings.showButtonLabels;
            settings.model = settings.model || defaultSettings.model;
            settings.temperature = settings.temperature ?? defaultSettings.temperature; // Use nullish coalescing
            settings.top_p = settings.top_p ?? defaultSettings.top_p;
            settings.reasoning_effort = settings.reasoning_effort || defaultSettings.reasoning_effort;
            settings.provider = settings.provider || defaultSettings.provider;
            settings.apiKeys = settings.apiKeys || {};
            settings.providerUrls = settings.providerUrls || {};
            settings.customProviders = Array.isArray(settings.customProviders) ? settings.customProviders : [];
            
            // Normalize enabledProviders
            if (!Array.isArray(settings.enabledProviders)) {
                // Initialize with primary provider and any providers that have configured API keys or are local
                const initialEnabled = new Set([settings.provider || 'groq']);
                Object.keys(settings.apiKeys).forEach(pId => {
                    if (settings.apiKeys[pId] && settings.apiKeys[pId] !== '<replace me>') {
                        initialEnabled.add(pId);
                    }
                });
                settings.enabledProviders = Array.from(initialEnabled);
            }
            
            settings.fallbackProviders = Array.isArray(settings.fallbackProviders) ? settings.fallbackProviders : [];
            settings.fallbackModels = settings.fallbackModels || {};
            settings.tts = normalizeTts(settings.tts);
            settings.voiceInput = normalizeVoiceInput(settings.voiceInput);
    settings.autoUpdate = { ...defaultSettings.autoUpdate, ...(settings.autoUpdate || {}) };
    settings.observability = { ...defaultSettings.observability, ...(settings.observability || {}), defaultRate: { ...defaultSettings.observability.defaultRate, ...(settings.observability?.defaultRate || {}) } };
    settings.gitIntegration = { ...defaultSettings.gitIntegration, ...(settings.gitIntegration || {}) };

            // Migrate legacy GROQ_API_KEY into apiKeys.groq (and keep in sync)
            if (settings.GROQ_API_KEY && settings.GROQ_API_KEY !== "<replace me>" && !settings.apiKeys.groq) {
                settings.apiKeys.groq = settings.GROQ_API_KEY;
            }
            settings.mcpServers = settings.mcpServers || defaultSettings.mcpServers;
            settings.disabledMcpServers = settings.disabledMcpServers || defaultSettings.disabledMcpServers;
            settings.toolPermissions = settings.toolPermissions || defaultSettings.toolPermissions;
            settings.customSystemPrompt = settings.customSystemPrompt || defaultSettings.customSystemPrompt;
            settings.popupEnabled = settings.popupEnabled ?? defaultSettings.popupEnabled;
            settings.popupShortcut = settings.popupShortcut || defaultSettings.popupShortcut;

            // Log API key status only if not configured (for debugging)
            if (!settings.GROQ_API_KEY || settings.GROQ_API_KEY === "<replace me>") {
                console.warn('GROQ_API_KEY not configured - autocomplete will not work');
            }
            settings.customCompletionUrl = settings.customCompletionUrl || defaultSettings.customCompletionUrl;
            settings.toolOutputLimit = settings.toolOutputLimit ?? defaultSettings.toolOutputLimit;
            settings.customApiBaseUrl = settings.customApiBaseUrl || defaultSettings.customApiBaseUrl;
            settings.customApiBaseUrlEnabled = settings.customApiBaseUrlEnabled ?? defaultSettings.customApiBaseUrlEnabled;
            settings.customModels = settings.customModels || defaultSettings.customModels;
            settings.disableThinkingSummaries = settings.disableThinkingSummaries ?? defaultSettings.disableThinkingSummaries;
            settings.useResponsesApi = settings.useResponsesApi ?? defaultSettings.useResponsesApi;
            settings.logApiRequests = settings.logApiRequests ?? defaultSettings.logApiRequests;
            settings.googleConnectors = settings.googleConnectors || defaultSettings.googleConnectors;
            settings.googleOAuthToken = settings.googleOAuthToken || defaultSettings.googleOAuthToken;
            settings.googleRefreshToken = settings.googleRefreshToken || defaultSettings.googleRefreshToken;
            settings.googleClientId = settings.googleClientId || defaultSettings.googleClientId;
            settings.googleClientSecret = settings.googleClientSecret || defaultSettings.googleClientSecret;
            settings.googleTokenExpiresAt = settings.googleTokenExpiresAt ?? defaultSettings.googleTokenExpiresAt;
            settings.customPromptTemplates = Array.isArray(settings.customPromptTemplates) ? settings.customPromptTemplates : defaultSettings.customPromptTemplates;
            settings.providerFilterTab = settings.providerFilterTab || defaultSettings.providerFilterTab;
            settings.webSearch = { ...defaultSettings.webSearch, ...(loadedSettings.webSearch || {}) };
            if (settings.webSearch.provider === 'duckduckgo') {
                settings.webSearch.provider = 'local';
            }

            // Optional: Persist the potentially updated settings back to file if defaults were applied
            // fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

            return settings;
        } else {
            // Create settings file with defaults if it doesn't exist
            fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
            console.log('Settings file created with defaults at:', settingsPath);

            // Log API key status only if not configured (for new installations)
            if (!defaultSettings.GROQ_API_KEY || defaultSettings.GROQ_API_KEY === "<replace me>") {
                console.warn('GROQ_API_KEY not configured - please set it in .env file or settings');
            }

            return defaultSettings;
        }
    } catch (error) {
        console.error('Error reading or parsing settings:', error);
        // Return defaults in case of error
        return defaultSettings;
    }
}

function initializeSettingsHandlers(ipcMain, app, safeStorage) {
    appInstance = app; // Store app instance

    // Log settings path on initialization
    const userDataPath = appInstance.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    secretStore = createSecretStore({ userDataPath, safeStorage });
    console.log('SettingsManager Initialized. Settings file location:', settingsPath);
    console.log('Settings file exists:', fs.existsSync(settingsPath));

    // Handler for getting settings
    ipcMain.handle('get-settings', async () => {
        return loadSettings();
    });

    // Handler for getting settings file path
    ipcMain.handle('get-settings-path', async () => {
        const userDataPath = appInstance.getPath('userData'); // Use stored instance
        const settingsPath = path.join(userDataPath, 'settings.json');
        return settingsPath;
    });

    // Handler for reloading settings from disk
    ipcMain.handle('reload-settings', async () => {
        try {
            const settings = loadSettings(); // Reload and validate
            return { success: true, settings };
        } catch (error) {
            console.error('Error reloading settings via handler:', error);
            return { success: false, error: error.message };
        }
    });

    // Handler for saving settings
    ipcMain.handle('save-settings', async (event, settings) => {
        const userDataPath = appInstance.getPath('userData'); // Use stored instance
        const settingsPath = path.join(userDataPath, 'settings.json');

        try {
            // Basic validation before saving
            if (!settings || typeof settings !== 'object') {
                throw new Error("Invalid settings object provided.");
            }
            // Ensure provider-related fields are always present
            settings.provider = settings.provider || 'groq';
            settings.apiKeys = settings.apiKeys || {};
            // Keep legacy GROQ_API_KEY in sync with apiKeys.groq
            if (settings.apiKeys.groq) {
                settings.GROQ_API_KEY = settings.apiKeys.groq;
            } else if (settings.GROQ_API_KEY) {
                settings.apiKeys.groq = settings.GROQ_API_KEY;
            }
            // Optionally add more validation here
            const protectedStorage = persistSettings(settings, settingsPath);
            invalidateModelsCache();
            return { success: true, protectedStorage };
        } catch (error) {
            console.error('Error saving settings:', error);
            return { success: false, error: error.message };
        }
    });
}

/**
 * Save settings to disk (for use by other modules)
 * @param {Object} settings - Settings object to save
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function saveSettings(settings) {
    if (!appInstance) {
        console.error("App instance not initialized in settingsManager.");
        return { success: false, error: "App not initialized" };
    }
    
    const userDataPath = appInstance.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    try {
        if (!settings || typeof settings !== 'object') {
            throw new Error("Invalid settings object provided.");
        }
        settings.provider = settings.provider || 'groq';
        settings.apiKeys = settings.apiKeys || {};
        if (settings.apiKeys.groq) {
            settings.GROQ_API_KEY = settings.apiKeys.groq;
        } else if (settings.GROQ_API_KEY) {
            settings.apiKeys.groq = settings.GROQ_API_KEY;
        }
        const protectedStorage = persistSettings(settings, settingsPath);
        invalidateModelsCache();
        return { success: true, protectedStorage };
    } catch (error) {
        console.error('Error saving settings:', error);
        return { success: false, error: error.message };
    }
}

function reinitialize(safeStorage) {
    if (appInstance) {
        const userDataPath = appInstance.getPath('userData');
        secretStore = createSecretStore({ userDataPath, safeStorage });
        console.log('[SettingsManager] Re-initialized with userData path:', userDataPath);
    }
}

module.exports = {
    loadSettings,
    saveSettings,
    initializeSettingsHandlers,
    reinitialize,
    normalizeTts,
    normalizeVoiceInput
};


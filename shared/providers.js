// Provider presets for OpenAI-compatible APIs.
// The app is provider-agnostic: the user selects a provider, the app uses the
// provider's base URL + API key to fetch models and run chat completions.
const PROVIDERS = {
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    envVar: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    description: 'Inferência LPU ultra-rápida com modelos Llama, Gemma e DeepSeek',
    icon: 'Zap',
    isLocal: false,
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    modelsUrl: 'http://localhost:11434/v1/models',
    envVar: 'OLLAMA_API_KEY',
    defaultModel: 'llama3.2',
    description: 'Modelos locais rodando no Ollama (http://localhost:11434)',
    icon: 'HardDrive',
    isLocal: true,
    requiresApiKey: false,
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    baseUrl: 'http://localhost:1234/v1',
    modelsUrl: 'http://localhost:1234/v1/models',
    envVar: 'LM_STUDIO_API_KEY',
    defaultModel: 'local-model',
    description: 'Modelos locais rodando no LM Studio (http://localhost:1234)',
    icon: 'Cpu',
    isLocal: true,
    requiresApiKey: false,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelsUrl: 'https://api.openai.com/v1/models',
    envVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    description: 'GPT-4o, GPT-4o-mini, o1, o3-mini e outros da OpenAI',
    icon: 'Sparkles',
    isLocal: false,
    requiresApiKey: true,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    envVar: 'OPENROUTER_API_KEY',
    defaultModel: 'openai/gpt-4o-mini',
    description: 'Acesso unificado a centenas de modelos através da OpenRouter',
    icon: 'Globe',
    isLocal: false,
    requiresApiKey: true,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    modelsUrl: 'https://api.deepseek.com/v1/models',
    envVar: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    description: 'Modelos DeepSeek-V3 e DeepSeek-R1 (Reasoning)',
    icon: 'Brain',
    isLocal: false,
    requiresApiKey: true,
  },
  together: {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    modelsUrl: 'https://api.together.xyz/v1/models',
    envVar: 'TOGETHER_API_KEY',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    description: 'Inferência em nuvem de código aberto via Together AI',
    icon: 'Cloud',
    isLocal: false,
    requiresApiKey: true,
  },
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    modelsUrl: 'https://api.fireworks.ai/inference/v1/models',
    envVar: 'FIREWORKS_API_KEY',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    description: 'Inferência acelerada na nuvem via Fireworks AI',
    icon: 'Flame',
    isLocal: false,
    requiresApiKey: true,
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    modelsUrl: 'https://api.mistral.ai/v1/models',
    envVar: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-small-latest',
    description: 'Modelos abertos e comerciais da Mistral AI',
    icon: 'Wind',
    isLocal: false,
    requiresApiKey: true,
  },
  grok: {
    id: 'grok',
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    modelsUrl: 'https://api.x.ai/v1/models',
    envVar: 'XAI_API_KEY',
    defaultModel: 'grok-2-latest',
    description: 'Modelos Grok desenvolvidos pela xAI',
    icon: 'Bot',
    isLocal: false,
    requiresApiKey: true,
  },
  custom: {
    id: 'custom',
    name: 'Personalizado (OpenAI-compatible)',
    baseUrl: '',
    modelsUrl: '',
    envVar: 'CUSTOM_API_KEY',
    defaultModel: '',
    description: 'Qualquer endpoint compatível com a API da OpenAI (vLLM, LocalAI, etc.)',
    icon: 'Settings',
    isLocal: false,
    requiresApiKey: false,
  },
};

const PROVIDER_LIST = Object.values(PROVIDERS).map((p) => ({
  id: p.id,
  name: p.name,
  baseUrl: p.baseUrl,
  defaultModel: p.defaultModel,
  description: p.description,
  isLocal: !!p.isLocal,
  requiresApiKey: p.requiresApiKey !== false,
}));

function getCustomProviders(settings) {
  if (!settings || !Array.isArray(settings.customProviders)) {
    return [];
  }
  return settings.customProviders.map(p => ({
    id: p.id,
    name: p.name || p.id,
    baseUrl: p.baseUrl || '',
    modelsUrl: p.modelsUrl || (p.baseUrl ? `${p.baseUrl.replace(/\/+$/, '')}/models` : ''),
    defaultModel: p.defaultModel || '',
    description: p.description || 'Provedor personalizado OpenAI-compatible',
    icon: p.icon || 'Settings',
    isLocal: Boolean(p.isLocal),
    requiresApiKey: p.requiresApiKey !== false,
    isCustom: true,
    apiKey: p.apiKey || ''
  }));
}

function getAllProviders(settings = {}) {
  const custom = getCustomProviders(settings);
  const customMap = new Map(custom.map(c => [c.id, c]));
  
  const presets = PROVIDER_LIST.map(p => {
    // If a custom URL or override exists for this preset
    const customUrl = settings?.providerUrls?.[p.id];
    return {
      ...p,
      baseUrl: customUrl || p.baseUrl
    };
  });

  return [...presets, ...custom.filter(c => !PROVIDERS[c.id])];
}

function getProviderById(id, settings = {}) {
  if (!id) return PROVIDERS.groq;
  if (PROVIDERS[id]) {
    const customUrl = settings?.providerUrls?.[id];
    if (customUrl) {
      return { ...PROVIDERS[id], baseUrl: customUrl };
    }
    return PROVIDERS[id];
  }
  const custom = getCustomProviders(settings);
  const found = custom.find(p => p.id === id);
  return found || PROVIDERS.groq;
}

function getActiveProvider(settings) {
  return getProviderById(settings && settings.provider, settings);
}

function isProviderConfigured(settings = {}, providerId) {
  if (!providerId) return false;
  const provider = getProviderById(providerId, settings);

  // Local providers are considered configured out-of-the-box
  if (provider.isLocal) {
    return true;
  }

  // Check stored API key in apiKeys map
  const storedKey = settings.apiKeys && settings.apiKeys[providerId];
  if (storedKey && storedKey.trim() && storedKey !== '<replace me>') {
    return true;
  }

  // Check environment variable
  if (provider.envVar && process.env[provider.envVar]) {
    return true;
  }

  // Legacy GROQ_API_KEY
  if (providerId === 'groq' && settings.GROQ_API_KEY && settings.GROQ_API_KEY.trim() && settings.GROQ_API_KEY !== '<replace me>') {
    return true;
  }

  // Custom provider with inline apiKey or valid baseUrl
  if (provider.isCustom) {
    if (provider.apiKey && provider.apiKey.trim() && provider.apiKey !== '<replace me>') {
      return true;
    }
    if (provider.baseUrl && provider.baseUrl.trim() && provider.requiresApiKey === false) {
      return true;
    }
  }

  // Legacy custom provider with customApiBaseUrl
  if (providerId === 'custom' && settings.customApiBaseUrl && settings.customApiBaseUrl.trim()) {
    return true;
  }

  return false;
}

function isProviderEnabled(settings = {}, providerId) {
  if (!providerId) return false;

  // If enabledProviders list is explicitly present
  if (Array.isArray(settings.enabledProviders)) {
    return settings.enabledProviders.includes(providerId);
  }

  // If disabledProviders list is present
  if (Array.isArray(settings.disabledProviders)) {
    if (settings.disabledProviders.includes(providerId)) {
      return false;
    }
    return isProviderConfigured(settings, providerId) || providerId === (settings.provider || 'groq');
  }

  // Default: primary provider is always enabled; other providers enabled if configured
  if (providerId === (settings.provider || 'groq')) {
    return true;
  }

  return isProviderConfigured(settings, providerId);
}

function getActiveProviders(settings = {}) {
  const all = getAllProviders(settings);
  const active = all.filter(p => isProviderEnabled(settings, p.id));
  if (active.length > 0) {
    return active;
  }
  // Fallback to active provider if none marked active
  return [getActiveProvider(settings)];
}

/**
 * Resolve the API key for the currently selected provider.
 * Priority: environment variable > settings.apiKeys[provider] > custom provider key > legacy GROQ_API_KEY.
 */
function getActiveApiKey(settings) {
  if (!settings) return null;
  const providerId = settings.provider || 'groq';
  return getApiKeyForProvider(settings, providerId);
}

/**
 * Resolve the base URL for the currently selected provider.
 * A legacy customApiBaseUrlEnabled override wins for any provider.
 */
function getProviderBaseUrl(settings) {
  if (!settings) return null;

  // Legacy: custom base URL override wins for any provider
  if (settings.customApiBaseUrlEnabled && settings.customApiBaseUrl && settings.customApiBaseUrl.trim()) {
    return settings.customApiBaseUrl.trim();
  }

  const providerId = settings.provider || 'groq';
  return getBaseUrlForProvider(settings, providerId);
}

function getDefaultModel(settings) {
  const provider = getActiveProvider(settings);
  return provider.defaultModel || 'llama-3.3-70b-versatile';
}

/**
 * Full /models endpoint URL for the active provider.
 */
function getModelsUrl(settings) {
  const provider = getActiveProvider(settings);
  if (provider.modelsUrl) {
    return provider.modelsUrl;
  }
  const baseUrl = getProviderBaseUrl(settings);
  return baseUrl ? `${baseUrl.replace(/\/+$/, '')}/models` : null;
}

function normalizeSettingsAndProvider(a, b) {
  if (typeof a === 'string') {
    return { providerId: a, settings: typeof b === 'object' && b !== null ? b : {} };
  }
  return { settings: typeof a === 'object' && a !== null ? a : {}, providerId: typeof b === 'string' ? b : '' };
}

function getApiKeyForProvider(arg1, arg2) {
  const { settings, providerId } = normalizeSettingsAndProvider(arg1, arg2);
  if (!providerId) return null;
  const provider = getProviderById(providerId, settings);

  // If local provider that doesn't require a key
  if (provider.requiresApiKey === false && (!settings.apiKeys || !settings.apiKeys[provider.id])) {
    return 'local-key';
  }

  // Environment variable
  if (provider.envVar && process.env[provider.envVar]) {
    return process.env[provider.envVar];
  }

  const storedKey = settings.apiKeys && settings.apiKeys[provider.id];
  if (storedKey && storedKey !== '<replace me>' && storedKey.trim()) {
    return storedKey.trim();
  }

  if (provider.apiKey && provider.apiKey !== '<replace me>' && provider.apiKey.trim()) {
    return provider.apiKey.trim();
  }

  if (provider.id === 'groq' && settings.GROQ_API_KEY && settings.GROQ_API_KEY !== '<replace me>') {
    return settings.GROQ_API_KEY.trim();
  }

  return null;
}

function getBaseUrlForProvider(arg1, arg2) {
  const { settings, providerId } = normalizeSettingsAndProvider(arg1, arg2);
  if (!providerId) return null;

  // Check per-provider custom URL override
  if (settings.providerUrls && settings.providerUrls[providerId] && settings.providerUrls[providerId].trim()) {
    return settings.providerUrls[providerId].trim();
  }

  const provider = getProviderById(providerId, settings);
  if (provider.id === 'custom') {
    return settings.customApiBaseUrl && settings.customApiBaseUrl.trim()
      ? settings.customApiBaseUrl.trim()
      : null;
  }

  if (provider.baseUrl && provider.baseUrl.trim()) {
    return provider.baseUrl.trim();
  }

  return null;
}

function getModelsUrlForProvider(arg1, arg2) {
  const { settings, providerId } = normalizeSettingsAndProvider(arg1, arg2);
  const provider = getProviderById(providerId, settings);
  if (provider.modelsUrl) {
    return provider.modelsUrl;
  }
  const baseUrl = getBaseUrlForProvider(settings, providerId);
  return baseUrl ? `${baseUrl.replace(/\/+$/, '')}/models` : null;
}

function getConfiguredProviders(settings = {}) {
  const all = getAllProviders(settings);
  return all.filter(p => isProviderConfigured(settings, p.id));
}

function getProviderCandidates(settings = {}) {
  const primaryId = settings.provider || 'groq';
  const fallbackIds = Array.isArray(settings.fallbackProviders) ? settings.fallbackProviders : [];
  const ids = [primaryId, ...fallbackIds];
  return [...new Set(ids)].map((providerId, index) => {
    const provider = getProviderById(providerId, settings);
    return {
      ...settings,
      provider: provider.id,
      model: index === 0 ? settings.model : (settings.fallbackModels?.[provider.id] || provider.defaultModel),
      customApiBaseUrlEnabled: index === 0 ? settings.customApiBaseUrlEnabled : provider.id === 'custom'
    };
  });
}

module.exports = {
  PROVIDERS,
  PROVIDER_LIST,
  getCustomProviders,
  getAllProviders,
  getProviderById,
  getActiveProvider,
  getActiveApiKey,
  getProviderBaseUrl,
  getDefaultModel,
  getModelsUrl,
  getApiKeyForProvider,
  getBaseUrlForProvider,
  getModelsUrlForProvider,
  isProviderConfigured,
  isProviderEnabled,
  getActiveProviders,
  getConfiguredProviders,
  getProviderCandidates,
};

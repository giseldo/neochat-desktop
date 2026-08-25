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

function getProviderById(id) {
  return PROVIDERS[id] || PROVIDERS.groq;
}

function getActiveProvider(settings) {
  return getProviderById(settings && settings.provider);
}

/**
 * Resolve the API key for the currently selected provider.
 * Priority: environment variable > settings.apiKeys[provider] > legacy GROQ_API_KEY.
 */
function getActiveApiKey(settings) {
  if (!settings) return null;
  const provider = getActiveProvider(settings);

  // If local provider that doesn't require a key, return a dummy key if not set
  if (provider.requiresApiKey === false && (!settings.apiKeys || !settings.apiKeys[provider.id])) {
    return 'ollama-local-key';
  }

  // Environment variable takes precedence (matches legacy GROQ behavior)
  if (provider.envVar && process.env[provider.envVar]) {
    return process.env[provider.envVar];
  }

  const storedKey = settings.apiKeys && settings.apiKeys[provider.id];
  if (storedKey && storedKey !== '<replace me>') {
    return storedKey;
  }

  // Legacy top-level field for Groq
  if (provider.id === 'groq' && settings.GROQ_API_KEY && settings.GROQ_API_KEY !== '<replace me>') {
    return settings.GROQ_API_KEY;
  }

  return null;
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

  const provider = getActiveProvider(settings);
  if (provider.id === 'custom') {
    return settings.customApiBaseUrl && settings.customApiBaseUrl.trim()
      ? settings.customApiBaseUrl.trim()
      : null;
  }
  return provider.baseUrl || null;
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

function getApiKeyForProvider(settings, providerId) {
  if (!settings) return null;
  const provider = getProviderById(providerId);

  // If local provider that doesn't require a key
  if (provider.requiresApiKey === false && (!settings.apiKeys || !settings.apiKeys[provider.id])) {
    return 'local-key';
  }

  // Environment variable
  if (provider.envVar && process.env[provider.envVar]) {
    return process.env[provider.envVar];
  }

  const storedKey = settings.apiKeys && settings.apiKeys[provider.id];
  if (storedKey && storedKey !== '<replace me>') {
    return storedKey;
  }

  if (provider.id === 'groq' && settings.GROQ_API_KEY && settings.GROQ_API_KEY !== '<replace me>') {
    return settings.GROQ_API_KEY;
  }

  return null;
}

function getBaseUrlForProvider(settings, providerId) {
  if (!settings) return null;
  const provider = getProviderById(providerId);
  if (provider.id === 'custom') {
    return settings.customApiBaseUrl && settings.customApiBaseUrl.trim()
      ? settings.customApiBaseUrl.trim()
      : null;
  }
  return provider.baseUrl || null;
}

function getModelsUrlForProvider(settings, providerId) {
  const provider = getProviderById(providerId);
  if (provider.modelsUrl) {
    return provider.modelsUrl;
  }
  const baseUrl = getBaseUrlForProvider(settings, providerId);
  return baseUrl ? `${baseUrl.replace(/\/+$/, '')}/models` : null;
}

function getConfiguredProviders(settings = {}) {
  const configured = [];
  PROVIDER_LIST.forEach((p) => {
    const key = getApiKeyForProvider(settings, p.id);
    const isCurrent = (settings.provider || 'groq') === p.id;
    const isFallback = Array.isArray(settings.fallbackProviders) && settings.fallbackProviders.includes(p.id);
    
    // Configured if it has an API key, is local, is current, or is in fallbacks
    if (key || p.isLocal || isCurrent || isFallback) {
      configured.push(getProviderById(p.id));
    }
  });
  return configured;
}

function getProviderCandidates(settings = {}) {
  const ids = [settings.provider || 'groq', ...(Array.isArray(settings.fallbackProviders) ? settings.fallbackProviders : [])];
  return [...new Set(ids)].map((providerId, index) => {
    const provider = getProviderById(providerId);
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
  getProviderById,
  getActiveProvider,
  getActiveApiKey,
  getProviderBaseUrl,
  getDefaultModel,
  getModelsUrl,
  getApiKeyForProvider,
  getBaseUrlForProvider,
  getModelsUrlForProvider,
  getConfiguredProviders,
  getProviderCandidates,
};

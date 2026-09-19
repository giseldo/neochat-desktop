// Provider presets for OpenAI-compatible APIs.
// The app is provider-agnostic: the user selects a provider, the app uses the
// provider's base URL + API key to fetch models and run chat completions.
const PROVIDERS = {
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    defaultModel: 'llama-3.3-70b-versatile',
    description: 'Inferência LPU ultra-rápida com modelos Llama, Qwen e DeepSeek R1 Distill',
    icon: 'Zap',
    isLocal: false,
    keyUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    popularModels: [
      'llama-3.3-70b-versatile',
      'deepseek-r1-distill-llama-70b',
      'qwen-2.5-coder-32b',
      'deepseek-r1-distill-qwen-32b',
      'gemma2-9b-it',
      'mixtral-8x7b-32768'
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
    envVar: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.5-flash',
    description: 'Modelos Gemini 2.5 Pro/Flash, 2.0 Flash e 1.5 Pro via API OpenAI-compatible',
    icon: 'Sparkles',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
    popularModels: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-thinking-exp-01-21',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelsUrl: 'https://api.openai.com/v1/models',
    envVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
    description: 'GPT-4o, GPT-4o-mini, o1, o3-mini, GPT-4.5 e catálogo oficial da OpenAI',
    icon: 'Sparkles',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...',
    popularModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'o3-mini',
      'o1',
      'gpt-4.5-preview',
      'chatgpt-4o-latest'
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    envVar: 'ANTHROPIC_API_KEY',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    description: 'Claude 3.7 Sonnet (com raciocínio híbrido e extended thinking) e Claude 3.5 Sonnet',
    icon: 'Brain',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
    popularModels: [
      'anthropic/claude-3.7-sonnet',
      'anthropic/claude-3.7-sonnet:thinking',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3.5-haiku'
    ],
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity AI',
    baseUrl: 'https://api.perplexity.ai',
    modelsUrl: 'https://api.perplexity.ai/models',
    envVar: 'PERPLEXITY_API_KEY',
    defaultModel: 'sonar-pro',
    description: 'Modelos Sonar, Sonar Pro e Sonar Reasoning com busca web em tempo real',
    icon: 'Globe',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://www.perplexity.ai/settings/api',
    keyPlaceholder: 'pplx-...',
    popularModels: [
      'sonar-pro',
      'sonar',
      'sonar-reasoning-pro',
      'sonar-reasoning',
      'r1-1776'
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    modelsUrl: 'https://api.deepseek.com/v1/models',
    envVar: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    description: 'Modelos DeepSeek-V3 e DeepSeek-R1 (raciocínio avançado de alto desempenho)',
    icon: 'Brain',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-...',
    popularModels: [
      'deepseek-chat',
      'deepseek-reasoner'
    ],
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
    keyUrl: 'https://console.x.ai/',
    keyPlaceholder: 'xai-...',
    popularModels: [
      'grok-2-latest',
      'grok-2-vision-latest',
      'grok-beta',
      'grok-3',
      'grok-3-mini'
    ],
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    modelsUrl: 'https://api.cerebras.ai/v1/models',
    envVar: 'CEREBRAS_API_KEY',
    defaultModel: 'llama-3.3-70b',
    description: 'Inferência em velocidade recorde via Cerebras Wafer-Scale Engine (>1800 tok/s)',
    icon: 'Zap',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://cloud.cerebras.ai/',
    keyPlaceholder: 'csk-...',
    popularModels: [
      'llama-3.3-70b',
      'llama3.1-8b',
      'deepseek-r1-distill-llama-70b'
    ],
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    modelsUrl: 'https://api.mistral.ai/v1/models',
    envVar: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-small-latest',
    description: 'Modelos abertos e comerciais da Mistral AI (Large, Small, Codestral, Pixtral)',
    icon: 'Wind',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://console.mistral.ai/api-keys/',
    keyPlaceholder: '...',
    popularModels: [
      'mistral-large-latest',
      'mistral-small-latest',
      'codestral-latest',
      'pixtral-large-latest',
      'pixtral-12b'
    ],
  },
  together: {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    modelsUrl: 'https://api.together.xyz/v1/models',
    envVar: 'TOGETHER_API_KEY',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    description: 'Inferência em nuvem de código aberto com dezenas de modelos de ponta',
    icon: 'Cloud',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://api.together.xyz/settings/api-keys',
    keyPlaceholder: '...',
    popularModels: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-V3',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
      'Qwen/Qwen2.5-Coder-32B-Instruct'
    ],
  },
  sambanova: {
    id: 'sambanova',
    name: 'SambaNova Cloud',
    baseUrl: 'https://api.sambanova.ai/v1',
    modelsUrl: 'https://api.sambanova.ai/v1/models',
    envVar: 'SAMBANOVA_API_KEY',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    description: 'Modelos de ponta em precisão total (DeepSeek R1, Llama 3.3 70B, Qwen 2.5)',
    icon: 'Cpu',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://cloud.sambanova.ai/',
    keyPlaceholder: '...',
    popularModels: [
      'Meta-Llama-3.3-70B-Instruct',
      'DeepSeek-R1',
      'DeepSeek-R1-Distill-Llama-70B',
      'Qwen2.5-72B-Instruct',
      'Qwen2.5-Coder-32B-Instruct'
    ],
  },
  deepinfra: {
    id: 'deepinfra',
    name: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    modelsUrl: 'https://api.deepinfra.com/v1/openai/models',
    envVar: 'DEEPINFRA_API_KEY',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    description: 'Infraestrutura econômica para Llama 3.3, Qwen 2.5 e DeepSeek V3/R1',
    icon: 'Server',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://deepinfra.com/dash/api_keys',
    keyPlaceholder: '...',
    popularModels: [
      'meta-llama/Llama-3.3-70B-Instruct',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-V3',
      'Qwen/Qwen2.5-72B-Instruct',
      'Qwen/Qwen2.5-Coder-32B-Instruct'
    ],
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere',
    baseUrl: 'https://api.cohere.com/v2',
    modelsUrl: 'https://api.cohere.com/v2/models',
    envVar: 'COHERE_API_KEY',
    defaultModel: 'command-r-plus-08-2024',
    description: 'Modelos Command R+ e Command R para raciocínio e RAG',
    icon: 'Sparkles',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://dashboard.cohere.com/api-keys',
    keyPlaceholder: '...',
    popularModels: ['command-r-plus-08-2024', 'command-r-08-2024'],
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
    keyUrl: 'https://fireworks.ai/api-keys',
    keyPlaceholder: '...',
    popularModels: [
      'accounts/fireworks/models/llama-v3p3-70b-instruct',
      'accounts/fireworks/models/deepseek-r1',
      'accounts/fireworks/models/deepseek-v3',
      'accounts/fireworks/models/qwen2p5-coder-32b-instruct'
    ],
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    envVar: 'OPENROUTER_API_KEY',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    description: 'Acesso unificado a centenas de modelos através da OpenRouter',
    icon: 'Globe',
    isLocal: false,
    requiresApiKey: true,
    keyUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
    popularModels: [
      'anthropic/claude-3.7-sonnet',
      'anthropic/claude-3.7-sonnet:thinking',
      'openai/gpt-4o',
      'openai/o3-mini',
      'deepseek/deepseek-r1',
      'deepseek/deepseek-chat',
      'google/gemini-2.5-flash',
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.3-70b-instruct',
      'qwen/qwen-2.5-coder-32b-instruct'
    ],
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
    keyPlaceholder: 'Não requer chave (Local)',
    popularModels: ['llama3.3', 'llama3.2', 'deepseek-r1', 'qwen2.5-coder', 'mistral', 'qwen2.5'],
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
    keyPlaceholder: 'Não requer chave (Local)',
    popularModels: ['local-model'],
  },
  omnirouter: {
    id: 'omnirouter',
    name: 'OmniRouter',
    baseUrl: 'http://localhost:20128/v1',
    modelsUrl: 'http://localhost:20128/v1/models',
    envVar: 'OMNIROUTER_API_KEY',
    defaultModel: '',
    description: 'Gateway inteligente de IA e multi-provedor (http://localhost:20128)',
    icon: 'Route',
    isLocal: false,
    requiresApiKey: true,
    keyPlaceholder: 'Chave de API do OmniRouter (ex: sk-...)',
    keyUrl: 'http://localhost:20128',
    popularModels: [],
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
    keyPlaceholder: 'sk-...',
    popularModels: [],
  },
};

/**
 * Helper to determine the API key signup/management URL based on provider ID, baseUrl, or name.
 */
function getKnownApiKeyUrl(id = '', baseUrl = '', name = '') {
  const normId = (id || '').toLowerCase();
  const normUrl = (baseUrl || '').toLowerCase();
  const normName = (name || '').toLowerCase();

  if (normId.includes('omnirouter') || normId.includes('omniroute') || normUrl.includes('20128') || normName.includes('omnirouter') || normName.includes('omniroute')) {
    return 'http://localhost:20128';
  }

  if (normId.includes('groq') || normUrl.includes('groq.com') || normName.includes('groq')) {
    return 'https://console.groq.com/keys';
  }
  if (normId.includes('gemini') || normId.includes('google') || normUrl.includes('googleapis.com') || normUrl.includes('generativelanguage') || normName.includes('gemini') || normName.includes('google')) {
    return 'https://aistudio.google.com/app/apikey';
  }
  if (normId.includes('openai') || normUrl.includes('openai.com') || normName.includes('openai')) {
    return 'https://platform.openai.com/api-keys';
  }
  if (normId.includes('anthropic') || normId.includes('claude') || normUrl.includes('anthropic.com') || normName.includes('anthropic') || normName.includes('claude')) {
    return 'https://console.anthropic.com/settings/keys';
  }
  if (normId.includes('openrouter') || normUrl.includes('openrouter.ai') || normName.includes('openrouter')) {
    return 'https://openrouter.ai/keys';
  }
  if (normId.includes('deepseek') || normUrl.includes('deepseek.com') || normName.includes('deepseek')) {
    return 'https://platform.deepseek.com/api_keys';
  }
  if (normId.includes('together') || normUrl.includes('together.xyz') || normUrl.includes('together.ai') || normName.includes('together')) {
    return 'https://api.together.xyz/settings/api-keys';
  }
  if (normId.includes('fireworks') || normUrl.includes('fireworks.ai') || normName.includes('fireworks')) {
    return 'https://fireworks.ai/api-keys';
  }
  if (normId.includes('mistral') || normUrl.includes('mistral.ai') || normName.includes('mistral')) {
    return 'https://console.mistral.ai/api-keys/';
  }
  if (normId.includes('grok') || normId.includes('xai') || normUrl.includes('x.ai') || normName.includes('xai') || normName.includes('grok')) {
    return 'https://console.x.ai/';
  }
  if (normId.includes('perplexity') || normUrl.includes('perplexity.ai') || normName.includes('perplexity')) {
    return 'https://www.perplexity.ai/settings/api';
  }
  if (normId.includes('cohere') || normUrl.includes('cohere.com') || normUrl.includes('cohere.ai') || normName.includes('cohere')) {
    return 'https://dashboard.cohere.com/api-keys';
  }
  if (normId.includes('cerebras') || normUrl.includes('cerebras.ai') || normName.includes('cerebras')) {
    return 'https://cloud.cerebras.ai/';
  }
  if (normId.includes('sambanova') || normUrl.includes('sambanova.ai') || normName.includes('sambanova')) {
    return 'https://cloud.sambanova.ai/';
  }
  if (normId.includes('deepinfra') || normUrl.includes('deepinfra.com') || normName.includes('deepinfra')) {
    return 'https://deepinfra.com/dash/api_keys';
  }
  if (normId.includes('novita') || normUrl.includes('novita.ai') || normName.includes('novita')) {
    return 'https://novita.ai/dashboard/key-management';
  }
  if (normId.includes('ai21') || normUrl.includes('ai21.com') || normName.includes('ai21')) {
    return 'https://studio.ai21.com/account/api-key';
  }
  if (normId.includes('voyage') || normUrl.includes('voyageai.com') || normName.includes('voyage')) {
    return 'https://dash.voyageai.com/api-keys';
  }
  if (normId.includes('huggingface') || normId.includes('hf') || normUrl.includes('huggingface.co') || normName.includes('huggingface')) {
    return 'https://huggingface.co/settings/tokens';
  }
  return '';
}

const PROVIDER_LIST = Object.values(PROVIDERS).map((p) => {
  const resolvedKeyUrl = p.keyUrl || p.apiKeyUrl || getKnownApiKeyUrl(p.id, p.baseUrl, p.name);
  return {
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    defaultModel: p.defaultModel,
    description: p.description,
    icon: p.icon || 'Server',
    isLocal: !!p.isLocal,
    requiresApiKey: p.requiresApiKey !== false,
    keyUrl: resolvedKeyUrl,
    apiKeyUrl: resolvedKeyUrl,
    keyPlaceholder: p.keyPlaceholder || 'sk-...',
    popularModels: p.popularModels || [],
  };
});

function getCustomProviders(settings) {
  if (!settings || !Array.isArray(settings.customProviders)) {
    return [];
  }
  return settings.customProviders.map(p => {
    const resolvedKeyUrl = p.keyUrl || p.apiKeyUrl || getKnownApiKeyUrl(p.id, p.baseUrl, p.name);
    return {
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
      apiKey: p.apiKey || '',
      keyUrl: resolvedKeyUrl,
      apiKeyUrl: resolvedKeyUrl,
      keyPlaceholder: p.keyPlaceholder || 'sk-...',
      popularModels: p.popularModels || [],
    };
  });
}

function getAllProviders(settings = {}) {
  const custom = getCustomProviders(settings);
  const customMap = new Map(custom.map(c => [c.id, c]));
  
  const presets = PROVIDER_LIST.map(p => {
    // If a custom URL or override exists for this preset
    const customMatch = customMap.get(p.id);
    const customUrl = settings?.providerUrls?.[p.id] || customMatch?.baseUrl;
    const customKey = customMatch?.apiKey;
    const resolvedKeyUrl = p.keyUrl || p.apiKeyUrl || getKnownApiKeyUrl(p.id, customUrl || p.baseUrl, p.name);
    return {
      ...p,
      baseUrl: customUrl || p.baseUrl,
      apiKey: customKey || p.apiKey || '',
      keyUrl: resolvedKeyUrl,
      apiKeyUrl: resolvedKeyUrl,
    };
  });

  return [...presets, ...custom.filter(c => !PROVIDERS[c.id])];
}

function getProviderById(id, settings = {}) {
  if (!id) return PROVIDERS.groq;
  const custom = getCustomProviders(settings);
  const customMatch = custom.find(p => p.id === id);

  if (PROVIDERS[id]) {
    const customUrl = settings?.providerUrls?.[id] || customMatch?.baseUrl;
    const customKey = customMatch?.apiKey;
    const modelsUrl = customMatch?.modelsUrl || (customUrl ? `${customUrl.replace(/\/+$/, '')}/models` : PROVIDERS[id].modelsUrl);
    return {
      ...PROVIDERS[id],
      baseUrl: customUrl || PROVIDERS[id].baseUrl,
      modelsUrl,
      apiKey: customKey || PROVIDERS[id].apiKey || ''
    };
  }

  return customMatch || PROVIDERS.groq;
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

  // Resolved API key
  const resolvedKey = getApiKeyForProvider(settings, providerId);
  if (resolvedKey && resolvedKey !== '<replace me>' && resolvedKey.trim()) {
    return true;
  }

  // Custom provider with inline apiKey or valid baseUrl
  if (provider.isCustom) {
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
 * Priority: environment variable > settings.apiKeys[provider] > custom provider key.
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
  if (provider?.defaultModel) {
    return provider.defaultModel;
  }
  if (Array.isArray(provider?.popularModels) && provider.popularModels.length > 0) {
    return provider.popularModels[0];
  }
  return PROVIDERS.groq?.defaultModel || 'llama-3.3-70b-versatile';
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

  // Check custom provider inline key or custom override
  const custom = getCustomProviders(settings);
  const customMatch = custom.find(p => p.id === providerId);
  if (customMatch && customMatch.apiKey && customMatch.apiKey !== '<replace me>' && customMatch.apiKey.trim()) {
    return customMatch.apiKey.trim();
  }

  if (provider.apiKey && provider.apiKey !== '<replace me>' && provider.apiKey.trim()) {
    return provider.apiKey.trim();
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

function getDefaultEnabledModels(settings = {}) {
  const models = new Set();
  Object.values(PROVIDERS).forEach(p => {
    if (Array.isArray(p.popularModels)) {
      p.popularModels.forEach(m => models.add(m));
    }
    if (p.defaultModel) {
      models.add(p.defaultModel);
    }
  });
  if (settings && typeof settings.model === 'string' && settings.model) {
    models.add(settings.model);
  }
  return Array.from(models);
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
  getKnownApiKeyUrl,
  getDefaultEnabledModels,
};

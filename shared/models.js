// Default fallback model configuration
const DEFAULT_MODEL_CONFIG = {
  context: 1000000,
  vision_supported: false,
  builtin_tools_supported: false,
};

// Cache for fetched models, keyed by `${modelsUrl}|${apiKey}` so each
// provider/account combination gets its own cache entry.
const modelCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Apply heuristics to determine model capabilities based on name
 */
function applyModelHeuristics(modelId, apiModelData) {
  const modelName = modelId.toLowerCase();
  
  // Use context_window / max_context_length / context_length from API if available
  let context = apiModelData?.context_window ||
                apiModelData?.max_context_length ||
                apiModelData?.context_length ||
                apiModelData?.max_tokens;

  if (!context || typeof context !== 'number') {
    if (modelName.includes('gemini')) {
      context = 1000000;
    } else if (modelName.includes('claude')) {
      context = 200000;
    } else if (modelName.includes('sonar') || modelName.includes('perplexity')) {
      context = 128000;
    } else if (modelName.includes('deepseek')) {
      context = 64000;
    } else if (modelName.includes('llama-3.3') || modelName.includes('llama-3.1') || modelName.includes('llama-3.2')) {
      context = 128000;
    } else if (modelName.includes('llama-3')) {
      context = 8192;
    } else if (modelName.includes('qwen-2.5') || modelName.includes('qwen2.5')) {
      context = 128000;
    } else if (modelName.includes('qwen')) {
      context = 32768;
    } else if (modelName.includes('gpt-4') || modelName.includes('o1') || modelName.includes('o3') || modelName.includes('o4')) {
      context = 128000;
    } else if (modelName.includes('grok')) {
      context = 131072;
    } else if (modelName.includes('command-r')) {
      context = 128000;
    } else if (modelName.includes('mistral') || modelName.includes('mixtral') || modelName.includes('codestral')) {
      context = 32768;
    } else {
      context = DEFAULT_MODEL_CONFIG.context;
    }
  }
  
  // Heuristic: 'gpt-oss' or modern models in name = supports builtin tools
  const builtin_tools_supported = modelName.includes('gpt-oss');
  
  // Heuristic: models supporting vision input
  const vision_supported = modelName.includes('llama-4') ||
                           modelName.includes('vision') ||
                           modelName.includes('gemini') ||
                           modelName.includes('gpt-4o') ||
                           modelName.includes('gpt-4.5') ||
                           modelName.includes('gpt-4-turbo') ||
                           modelName.includes('claude') ||
                           modelName.includes('pixtral') ||
                           modelName.includes('grok-2-vision') ||
                           modelName.includes('vl');
  
  return {
    context,
    vision_supported,
    builtin_tools_supported,
  };
}

/**
 * Fetch models from an OpenAI-compatible provider's API
 * @param {string} apiKey - The API key for the provider
 * @param {string} modelsUrl - Full URL to the provider's /models endpoint
 */
async function fetchModelsFromAPI(apiKey, modelsUrl, options = {}) {
  const effectiveKey = (apiKey && apiKey !== "<replace me>") ? apiKey : '';
  const url = modelsUrl || 'https://api.groq.com/openai/v1/models';

  try {
    const http = require('http');
    const https = require('https');
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    const timeout = options.timeout || 8000;
    
    return new Promise((resolve, reject) => {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'NeoChat-Desktop/1.0'
      };

      if (effectiveKey) {
        headers['Authorization'] = `Bearer ${effectiveKey}`;
      }

      const req = client.get(url, { headers, timeout }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (err) {
              console.error('Error parsing models API response:', err);
              reject(new Error('Resposta inválida do endpoint de modelos (JSON esperado)'));
            }
          } else {
            console.error('Error fetching models:', res.statusCode, data);
            reject(new Error(`API retornou status ${res.statusCode}: ${data ? data.slice(0, 100) : ''}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Tempo limite esgotado ao conectar ao endpoint (timeout)'));
      });

      req.on('error', (err) => {
        // Connection refused typically just means a local provider (Ollama/LM Studio) isn't running - not worth a full stack trace
        const isConnRefused = err.code === 'ECONNREFUSED' || (err.errors && err.errors.every(e => e.code === 'ECONNREFUSED'));
        if (isConnRefused) {
          console.warn(`Models endpoint unreachable (${url}): connection refused`);
        } else {
          console.error('Error fetching models from API:', err);
        }
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error in fetchModelsFromAPI:', error);
    return null;
  }
}

/**
 * Convert API response to model context sizes format
 */
function convertAPIModelsToContextSizes(apiResponse, providerMeta = null) {
  const modelContextSizes = { default: DEFAULT_MODEL_CONFIG };
  
  if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
    console.warn('Invalid API response format');
    return modelContextSizes;
  }
  
  // Filter out non-chat models (audio, speech/tts, embeddings, guard models, image models, etc.)
  // Note: not all providers send an `active` field, so only exclude when
  // explicitly false.
  const NON_CHAT_MARKERS = [
    'whisper', 'guard', 'embedding', 'tts', 'dall-e', 'moderation', 'audio',
    'orpheus', 'canopylabs', 'canopy', 'speech', 'imagine', 'image', 'flux', 'stt'
  ];
  const chatModels = apiResponse.data.filter(model => {
    const modelName = model.id.toLowerCase();
    return model.active !== false &&
           !NON_CHAT_MARKERS.some(marker => modelName.includes(marker));
  });
  
  chatModels.forEach(model => {
    const modelId = model.id;
    
    // Apply heuristics to determine model capabilities
    const capabilities = applyModelHeuristics(modelId, model);
    capabilities.id = modelId;
    capabilities.rawModelId = modelId;
    capabilities.displayName = model.name || modelId;
    if (providerMeta) {
      capabilities.provider = providerMeta.providerId || 'groq';
      capabilities.group = providerMeta.providerName || providerMeta.providerId || 'Groq';
    }
    modelContextSizes[modelId] = capabilities;
  });
  
  console.log(`Loaded ${chatModels.length} chat models from API (${providerMeta?.providerName || 'default'})`);
  return modelContextSizes;
}

/**
 * Get models with caching (per provider/API-key)
 */
async function getModelsFromAPIWithCache(apiKey, modelsUrl, forceRefresh = false, providerMeta = null) {
  const cacheKey = `${modelsUrl || 'default'}|${apiKey || ''}|${providerMeta?.providerId || ''}`;
  const now = Date.now();

  // Return cached models if they're still fresh
  const cached = modelCache.get(cacheKey);
  if (!forceRefresh && cached && (now - cached.lastFetchTime) < CACHE_DURATION) {
    return cached.models;
  }

  // Fetch fresh models
  console.log(`Fetching fresh models from API (${providerMeta?.providerName || modelsUrl})`);
  const apiResponse = await fetchModelsFromAPI(apiKey, modelsUrl);

  if (apiResponse) {
    const models = convertAPIModelsToContextSizes(apiResponse, providerMeta);
    modelCache.set(cacheKey, { models, lastFetchTime: now });
    return models;
  }

  // If fetch failed and we have cached models, return them
  if (cached) {
    console.warn('API fetch failed, using stale cached models');
    return cached.models;
  }

  // If no cache and fetch failed, return default only
  console.warn('No models available, using default configuration only');
  return { default: DEFAULT_MODEL_CONFIG };
}

/**
 * Clear the in-memory model cache (used when the active provider/key changes)
 */
function invalidateModelsCache() {
  modelCache.clear();
  console.log('Model cache invalidated');
}

const BASE_MODEL_CONTEXT_SIZES = {
  default: DEFAULT_MODEL_CONFIG
};

// Function to check if a model supports built-in tools
function supportsBuiltInTools(modelName, modelContextSizes) {
  if (!modelName || !modelContextSizes) return false;
  // Check explicit configuration by exact key, rawModelId, or fallback
  const directInfo = modelContextSizes[modelName];
  if (directInfo) {
    return directInfo.builtin_tools_supported || false;
  }
  const found = Object.values(modelContextSizes).find(cfg =>
    cfg && (cfg.rawModelId === modelName || cfg.id === modelName)
  );
  if (found) {
    return found.builtin_tools_supported || false;
  }
  const defaultInfo = modelContextSizes['default'];
  return defaultInfo?.builtin_tools_supported || false;
}

// Function to merge base models with custom models from settings
function getModelContextSizes(customModels = {}, apiModels = null) {
  // Start with API models if available, otherwise use base models
  const mergedModels = apiModels ? { ...apiModels } : { ...BASE_MODEL_CONTEXT_SIZES };
  
  // Add custom models to the merged object
  Object.entries(customModels).forEach(([modelId, config]) => {
    // Use explicit configuration only - no name-based heuristic
    const key = modelId.includes('::') ? modelId : `custom::${modelId}`;
    const baseConfig = mergedModels[key] || mergedModels[modelId] || {};
    mergedModels[key] = {
      ...baseConfig,
      context: config.context || baseConfig.context || 1000000,
      vision_supported: config.vision_supported ?? baseConfig.vision_supported ?? false,
      builtin_tools_supported: config.builtin_tools_supported ?? baseConfig.builtin_tools_supported ?? false,
      displayName: config.displayName || baseConfig.displayName || modelId,
      group: config.group || baseConfig.group || 'Personalizados',
      provider: config.provider || baseConfig.provider || 'custom',
      rawModelId: config.rawModelId || baseConfig.rawModelId || modelId,
      modelKey: key,
      isCustom: true,
      ...(config.autoPrune !== undefined ? { autoPrune: Boolean(config.autoPrune) } : (baseConfig.autoPrune !== undefined ? { autoPrune: Boolean(baseConfig.autoPrune) } : {}))
    };
    if (key !== modelId && !mergedModels[modelId]) {
      mergedModels[modelId] = mergedModels[key];
    }
  });
  
  return mergedModels;
}

// Export all functions
module.exports = { 
  MODEL_CONTEXT_SIZES: BASE_MODEL_CONTEXT_SIZES,
  getModelContextSizes,
  supportsBuiltInTools,
  getModelsFromAPIWithCache,
  invalidateModelsCache,
  fetchModelsFromAPI,
  convertAPIModelsToContextSizes,
  applyModelHeuristics
};

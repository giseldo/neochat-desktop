// Default fallback model configuration
const DEFAULT_MODEL_CONFIG = {
  context: 8192,
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
    if (modelName.includes('deepseek')) {
      context = 64000;
    } else if (modelName.includes('llama-3.3') || modelName.includes('llama-3.1') || modelName.includes('llama-3.2')) {
      context = 128000;
    } else if (modelName.includes('llama-3')) {
      context = 8192;
    } else if (modelName.includes('qwen')) {
      context = 32768;
    } else if (modelName.includes('gpt-4') || modelName.includes('o1') || modelName.includes('o3') || modelName.includes('o4')) {
      context = 128000;
    } else if (modelName.includes('claude')) {
      context = 200000;
    } else if (modelName.includes('gemini')) {
      context = 1000000;
    } else if (modelName.includes('mistral') || modelName.includes('mixtral')) {
      context = 32768;
    } else {
      context = DEFAULT_MODEL_CONFIG.context;
    }
  }
  
  // Heuristic: 'gpt-oss' in name = supports builtin tools
  const builtin_tools_supported = modelName.includes('gpt-oss');
  
  // Heuristic: 'llama-4' in name = supports vision
  const vision_supported = modelName.includes('llama-4');
  
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
async function fetchModelsFromAPI(apiKey, modelsUrl) {
  if (!apiKey || apiKey === "<replace me>") {
    console.warn('No valid API key provided for fetching models');
    return null;
  }

  try {
    const http = require('http');
    const https = require('https');
    const url = modelsUrl || 'https://api.groq.com/openai/v1/models';
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      client.get(url, options, (res) => {
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
              reject(err);
            }
          } else {
            console.error('Error fetching models:', res.statusCode, data);
            reject(new Error(`API returned status ${res.statusCode}`));
          }
        });
      }).on('error', (err) => {
        console.error('Error fetching models from API:', err);
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
function convertAPIModelsToContextSizes(apiResponse) {
  const modelContextSizes = { default: DEFAULT_MODEL_CONFIG };
  
  if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
    console.warn('Invalid API response format');
    return modelContextSizes;
  }
  
  // Filter out non-chat models (audio, embeddings, guard models, etc.)
  // Note: not all providers send an `active` field, so only exclude when
  // explicitly false.
  const NON_CHAT_MARKERS = ['whisper', 'guard', 'embedding', 'tts', 'dall-e', 'moderation', 'audio'];
  const chatModels = apiResponse.data.filter(model => {
    const modelName = model.id.toLowerCase();
    return model.active !== false &&
           !NON_CHAT_MARKERS.some(marker => modelName.includes(marker));
  });
  
  chatModels.forEach(model => {
    const modelId = model.id;
    
    // Apply heuristics to determine model capabilities
    modelContextSizes[modelId] = applyModelHeuristics(modelId, model);
  });
  
  console.log(`Loaded ${chatModels.length} chat models from API`);
  return modelContextSizes;
}

/**
 * Get models with caching (per provider/API-key)
 */
async function getModelsFromAPIWithCache(apiKey, modelsUrl, forceRefresh = false) {
  const cacheKey = `${modelsUrl || 'default'}|${apiKey || ''}`;
  const now = Date.now();

  // Return cached models if they're still fresh
  const cached = modelCache.get(cacheKey);
  if (!forceRefresh && cached && (now - cached.lastFetchTime) < CACHE_DURATION) {
    console.log('Using cached models');
    return cached.models;
  }

  // Fetch fresh models
  console.log('Fetching fresh models from API');
  const apiResponse = await fetchModelsFromAPI(apiKey, modelsUrl);

  if (apiResponse) {
    const models = convertAPIModelsToContextSizes(apiResponse);
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
  // Check explicit configuration instead of name-based heuristic
  const modelInfo = modelContextSizes[modelName] || modelContextSizes['default'];
  return modelInfo?.builtin_tools_supported || false;
}

// Function to merge base models with custom models from settings
function getModelContextSizes(customModels = {}, apiModels = null) {
  // Start with API models if available, otherwise use base models
  const mergedModels = apiModels ? { ...apiModels } : { ...BASE_MODEL_CONTEXT_SIZES };
  
  // Add custom models to the merged object
  Object.entries(customModels).forEach(([modelId, config]) => {
    // Use explicit configuration only - no name-based heuristic
    mergedModels[modelId] = {
      context: config.context || 8192,
      vision_supported: config.vision_supported || false,
      builtin_tools_supported: config.builtin_tools_supported || false,
      displayName: config.displayName || modelId,
      group: config.group || null,
      isCustom: true
    };
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

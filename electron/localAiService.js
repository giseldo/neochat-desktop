const fetch = require('node-fetch');

/**
 * Probes a single URL with a timeout
 */
async function probeEndpoint(url, timeoutMs = 1500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return { ok: true, data, latencyMs };
    }
    return { ok: false, status: response.status, latencyMs };
  } catch (err) {
    clearTimeout(timeoutId);
    return { ok: false, error: err.message, latencyMs: Date.now() - startTime };
  }
}

/**
 * Detect running local AI instances (Ollama, LM Studio, vLLM, LocalAI)
 */
async function detectLocalAiProviders() {
  const results = {
    ollama: {
      running: false,
      name: 'Ollama',
      url: 'http://localhost:11434/v1',
      modelsUrl: 'http://localhost:11434/api/tags',
      latencyMs: null,
      models: [],
      error: null
    },
    lmstudio: {
      running: false,
      name: 'LM Studio',
      url: 'http://localhost:1234/v1',
      modelsUrl: 'http://localhost:1234/v1/models',
      latencyMs: null,
      models: [],
      error: null
    }
  };

  // 1. Probe Ollama (try tags endpoint or v1/models)
  try {
    const ollamaProbe = await probeEndpoint('http://localhost:11434/api/tags', 2000);
    if (ollamaProbe.ok && ollamaProbe.data) {
      results.ollama.running = true;
      results.ollama.latencyMs = ollamaProbe.latencyMs;
      const rawModels = ollamaProbe.data.models || [];
      results.ollama.models = rawModels.map(m => ({
        id: m.name || m.model,
        name: m.name || m.model,
        size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : null,
        modifiedAt: m.modified_at,
        details: m.details || {}
      }));
    } else {
      // Fallback try 127.0.0.1
      const fallbackProbe = await probeEndpoint('http://127.0.0.1:11434/api/tags', 1500);
      if (fallbackProbe.ok && fallbackProbe.data) {
        results.ollama.running = true;
        results.ollama.url = 'http://127.0.0.1:11434/v1';
        results.ollama.latencyMs = fallbackProbe.latencyMs;
        const rawModels = fallbackProbe.data.models || [];
        results.ollama.models = rawModels.map(m => ({
          id: m.name || m.model,
          name: m.name || m.model,
          size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : null,
          modifiedAt: m.modified_at,
          details: m.details || {}
        }));
      }
    }
  } catch (err) {
    results.ollama.error = err.message;
  }

  // 2. Probe LM Studio
  try {
    const lmProbe = await probeEndpoint('http://localhost:1234/v1/models', 2000);
    if (lmProbe.ok && lmProbe.data) {
      results.lmstudio.running = true;
      results.lmstudio.latencyMs = lmProbe.latencyMs;
      const rawModels = lmProbe.data.data || [];
      results.lmstudio.models = rawModels.map(m => ({
        id: m.id,
        name: m.id,
        ownedBy: m.owned_by
      }));
    } else {
      const fallbackLm = await probeEndpoint('http://127.0.0.1:1234/v1/models', 1500);
      if (fallbackLm.ok && fallbackLm.data) {
        results.lmstudio.running = true;
        results.lmstudio.url = 'http://127.0.0.1:1234/v1';
        results.lmstudio.latencyMs = fallbackLm.latencyMs;
        const rawModels = fallbackLm.data.data || [];
        results.lmstudio.models = rawModels.map(m => ({
          id: m.id,
          name: m.id,
          ownedBy: m.owned_by
        }));
      }
    }
  } catch (err) {
    results.lmstudio.error = err.message;
  }

  return {
    detected: results.ollama.running || results.lmstudio.running,
    providers: results
  };
}

module.exports = {
  detectLocalAiProviders
};

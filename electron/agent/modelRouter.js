/**
 * ModelRouter - Multi-provider routing, client instantiation, and streaming completions.
 */

const Groq = require('groq-sdk');
const {
  getActiveApiKey,
  getProviderBaseUrl,
  getProviderCandidates,
  getDefaultModel
} = require('../../shared/providers.js');

class ModelRouter {
  /**
   * Create an OpenAI-compatible SDK client configured for the given provider settings.
   * @param {object} settings
   * @returns {Groq}
   */
  createClient(settings) {
    const providerApiKey = getActiveApiKey(settings);
    const providerBaseUrl = getProviderBaseUrl(settings);
    const groqConfig = { apiKey: providerApiKey || 'none' };

    if (providerBaseUrl) {
      groqConfig.baseURL = providerBaseUrl;
    }

    const client = new Groq(groqConfig);

    // If baseURL ends with /v1/ or /v1, strip prefix from groq-sdk endpoint paths
    if (providerBaseUrl) {
      const originalBuildURL = client.buildURL.bind(client);
      client.buildURL = function (path, query) {
        if (path.startsWith('/openai/v1/')) {
          path = path.replace(/^\/openai\/v1/, '');
        }
        return originalBuildURL(path, query);
      };
    }

    return client;
  }

  /**
   * Determine exact model ID, provider, and capabilities.
   * @param {string} requestedModel
   * @param {object} settings
   * @param {object} [modelContextSizes={}]
   * @returns {{ modelToUse: string, modelInfo: object, modelProvider: string }}
   */
  determineModel(requestedModel, settings = {}, modelContextSizes = {}) {
    let rawModel = requestedModel || settings.model;
    let modelProvider = null;

    if (rawModel && rawModel.includes('::')) {
      const [p, m] = rawModel.split('::');
      modelProvider = p;
      rawModel = m;
    }

    const provider = modelProvider || settings.provider || 'groq';
    const modelToUse = rawModel || getDefaultModel({ provider });
    const modelInfo = modelContextSizes[modelToUse] || modelContextSizes[rawModel] || {};

    return {
      modelToUse,
      modelInfo,
      modelProvider: provider
    };
  }

  /**
   * Validate API key presence for a given provider.
   * @param {object} settings
   */
  validateApiKey(settings) {
    const provider = settings.provider || 'groq';
    const isLocal = provider === 'ollama' || provider === 'lmstudio' || provider === 'custom_local';
    if (isLocal) return true;

    const apiKey = getActiveApiKey(settings);
    if (!apiKey || apiKey === '<replace me>' || !apiKey.trim()) {
      throw new Error(`API key not configured for provider "${provider}". Please add your API key in Settings.`);
    }
    return true;
  }

  /**
   * Assemble Chat Completion API parameters.
   * @param {object} params
   * @param {Array<object>} params.messages
   * @param {string} params.model
   * @param {object} params.settings
   * @param {Array<object>} [params.tools=[]]
   * @param {string} [params.systemPrompt]
   * @returns {object}
   */
  buildApiParams({
    messages,
    model,
    settings = {},
    tools = [],
    systemPrompt = ''
  }) {
    const apiMessages = [];

    // System prompt
    if (systemPrompt && systemPrompt.trim()) {
      apiMessages.push({
        role: 'system',
        content: systemPrompt.trim()
      });
    }

    const isGemini =
      settings.provider === 'gemini' ||
      settings.provider === 'google' ||
      String(model || '').toLowerCase().includes('gemini') ||
      (settings.baseUrl && (settings.baseUrl.includes('googleapis.com') || settings.baseUrl.includes('generativelanguage')));

    // Sanitize conversation messages
    for (const msg of messages) {
      if (!msg) continue;
      // Skip redundant system messages if we already set systemPrompt
      if (msg.role === 'system' && systemPrompt) continue;

      const formatted = { role: msg.role };

      if (msg.content !== undefined && msg.content !== null) {
        formatted.content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      }

      if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        formatted.tool_calls = msg.tool_calls.map(tc => {
          const signature = tc.thought_signature ||
            tc.thoughtSignature ||
            tc.extra_content?.google?.thought_signature ||
            tc.function?.thought_signature ||
            tc.function?.thoughtSignature ||
            (isGemini ? 'skip_thought_signature_validator' : undefined);

          const formattedTc = {
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function?.name || tc.name,
              arguments: typeof tc.function?.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function?.arguments || {})
            }
          };

          if (signature) {
            formattedTc.thought_signature = signature;
            formattedTc.thoughtSignature = signature;
            formattedTc.extra_content = tc.extra_content || {
              google: {
                thought_signature: signature
              }
            };
          } else if (tc.extra_content) {
            formattedTc.extra_content = tc.extra_content;
          }

          return formattedTc;
        });
      }

      if (msg.role === 'tool') {
        formatted.tool_call_id = msg.tool_call_id || msg.id;
        formatted.content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '');
      }

      apiMessages.push(formatted);
    }

    const payload = {
      model,
      messages: apiMessages,
      stream: true,
      stream_options: { include_usage: true }
    };

    if (Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    if (settings.temperature !== undefined) {
      payload.temperature = parseFloat(settings.temperature);
    }

    if (settings.maxTokens) {
      payload.max_tokens = parseInt(settings.maxTokens, 10);
    }

    return payload;
  }

  /**
   * Execute streaming chat completion against active or fallback provider.
   * @param {object} options
   * @param {Array<object>} options.messages
   * @param {string} options.model
   * @param {object} options.settings
   * @param {Array<object>} [options.tools=[]]
   * @param {string} [options.systemPrompt]
   * @param {object} options.callbacks - { onToken, onReasoning, onToolCall, onError, onDone }
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<object>} Final aggregated message { role, content, reasoning, tool_calls, usage }
   */
  async streamCompletion({
    messages,
    model,
    settings = {},
    tools = [],
    systemPrompt = '',
    callbacks = {},
    signal = null
  }) {
    const { modelToUse, modelProvider } = this.determineModel(model, settings);
    const primarySettings = {
      ...settings,
      provider: modelProvider,
      model: modelToUse
    };

    const candidates = getProviderCandidates(primarySettings);
    let lastError = null;

    for (const [idx, candidate] of candidates.entries()) {
      const candidateModel = idx === 0 ? modelToUse : (candidate.model || getDefaultModel(candidate));
      try {
        this.validateApiKey(candidate);
      } catch (err) {
        lastError = err.message;
        continue;
      }

      const client = this.createClient(candidate);
      const params = this.buildApiParams({
        messages,
        model: candidateModel,
        settings: candidate,
        tools,
        systemPrompt
      });

      const streamStartTime = Date.now();
      try {
        const stream = await client.chat.completions.create(params, { signal });
        const aggregated = {
          role: 'assistant',
          content: '',
          reasoning: '',
          tool_calls: [],
          toolCallsMap: new Map(),
          usage: null,
          finish_reason: null
        };

        for await (const chunk of stream) {
          if (signal?.aborted) {
            throw new Error('Completion stream aborted by user');
          }

          const choice = chunk.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta || {};

          // 1. Text content
          if (delta.content) {
            aggregated.content += delta.content;
            if (callbacks.onToken) callbacks.onToken(delta.content);
          }

          // 2. Reasoning tokens (DeepSeek R1 / Claude / OpenAI o1/o3)
          const reasoning = delta.reasoning || delta.reasoning_content;
          if (reasoning) {
            aggregated.reasoning += reasoning;
            if (callbacks.onReasoning) callbacks.onReasoning(reasoning);
          }

          // 3. Tool calls accumulation
          if (Array.isArray(delta.tool_calls)) {
            for (const tcDelta of delta.tool_calls) {
              const tcIndex = tcDelta.index ?? 0;
              const signature = tcDelta.thought_signature ||
                tcDelta.thoughtSignature ||
                tcDelta.extra_content?.google?.thought_signature ||
                tcDelta.function?.thought_signature ||
                tcDelta.function?.thoughtSignature ||
                delta.thought_signature ||
                delta.thoughtSignature ||
                delta.extra_content?.google?.thought_signature ||
                choice.delta?.thought_signature ||
                choice.delta?.thoughtSignature ||
                choice.delta?.extra_content?.google?.thought_signature;

              const extraContent = tcDelta.extra_content || delta.extra_content || choice.delta?.extra_content;

              if (!aggregated.toolCallsMap.has(tcIndex)) {
                const item = {
                  id: tcDelta.id || `call_${Date.now()}_${tcIndex}`,
                  type: 'function',
                  function: {
                    name: tcDelta.function?.name || '',
                    arguments: tcDelta.function?.arguments || ''
                  }
                };
                if (signature) {
                  item.thought_signature = signature;
                  item.thoughtSignature = signature;
                  item.extra_content = extraContent || {
                    google: {
                      thought_signature: signature
                    }
                  };
                } else if (extraContent) {
                  item.extra_content = extraContent;
                }
                aggregated.toolCallsMap.set(tcIndex, item);
              } else {
                const existing = aggregated.toolCallsMap.get(tcIndex);
                if (tcDelta.id && !existing.id) existing.id = tcDelta.id;
                if (tcDelta.function?.name) existing.function.name += tcDelta.function.name;
                if (tcDelta.function?.arguments) existing.function.arguments += tcDelta.function.arguments;
                if (signature) {
                  existing.thought_signature = signature;
                  existing.thoughtSignature = signature;
                  existing.extra_content = extraContent || existing.extra_content || {
                    google: {
                      thought_signature: signature
                    }
                  };
                } else if (extraContent && !existing.extra_content) {
                  existing.extra_content = extraContent;
                }
              }
            }
          }

          if (choice.finish_reason) {
            aggregated.finish_reason = choice.finish_reason;
          }

          const rawUsage = chunk.usage || chunk.x_groq?.usage;
          if (rawUsage) {
            const promptTokens = rawUsage.prompt_tokens ?? rawUsage.input_tokens ?? (aggregated.usage?.prompt_tokens || 0);
            const cachedTokens = rawUsage.prompt_tokens_details?.cached_tokens ?? rawUsage.cache_read_input_tokens ?? rawUsage.prompt_cache_hit_tokens ?? (aggregated.usage?.cached_tokens || 0);
            const compTokens = rawUsage.completion_tokens ?? rawUsage.output_tokens ?? (aggregated.usage?.completion_tokens || 0);
            const totalTokens = rawUsage.total_tokens ?? (promptTokens + compTokens);
            const input = Math.max(0, promptTokens - cachedTokens);

            aggregated.usage = {
              ...rawUsage,
              prompt_tokens: promptTokens,
              completion_tokens: compTokens,
              total_tokens: totalTokens,
              cached_tokens: cachedTokens,
              cache_read_input_tokens: cachedTokens,
              prompt_cache_hit_tokens: cachedTokens,
              prompt_tokens_details: {
                cached_tokens: cachedTokens
              },
              input,
              output: compTokens,
              cacheRead: cachedTokens,
              totalTokens
            };
          }
        }

        const elapsedSeconds = Math.max(0.01, (Date.now() - streamStartTime) / 1000);
        if (aggregated.usage) {
          aggregated.usage.completion_time = aggregated.usage.completion_time || elapsedSeconds;
          aggregated.usage.total_time = aggregated.usage.total_time || elapsedSeconds;
          aggregated.usage.client_duration = elapsedSeconds;
          if (aggregated.usage.completion_tokens && !aggregated.usage.tokens_per_sec) {
            aggregated.usage.tokens_per_sec = Math.round(aggregated.usage.completion_tokens / (aggregated.usage.completion_time || elapsedSeconds));
          }
        } else {
          aggregated.usage = {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            completion_time: elapsedSeconds,
            total_time: elapsedSeconds,
            client_duration: elapsedSeconds
          };
        }

        aggregated.tool_calls = Array.from(aggregated.toolCallsMap.values()).filter(tc => Boolean(tc.function.name));

        if (callbacks.onDone) {
          callbacks.onDone(aggregated);
        }

        return {
          success: true,
          provider: candidate.provider,
          model: candidateModel,
          message: aggregated
        };
      } catch (streamErr) {
        if (signal?.aborted) {
          return { cancelled: true };
        }
        lastError = streamErr.message || 'Stream error';
        console.warn(`[ModelRouter] Provider ${candidate.provider} failed:`, lastError);
      }
    }

    if (callbacks.onError) {
      callbacks.onError(new Error(`All provider candidates failed: ${lastError}`));
    }

    return {
      success: false,
      error: `All provider candidates failed: ${lastError}`
    };
  }
}

const modelRouter = new ModelRouter();

module.exports = {
  ModelRouter,
  modelRouter
};

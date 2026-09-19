/**
 * Model Grouping and Classification Utilities
 */

const KNOWN_NAMESPACE_MAP = {
  openai: 'OpenAI',
  groq: 'Groq',
  canopylabs: 'Canopy Labs',
  canopy: 'Canopy Labs',
  deepseek: 'DeepSeek',
  'deepseek-ai': 'DeepSeek',
  qwen: 'Qwen',
  alibaba: 'Qwen',
  'meta-llama': 'Meta (Llama)',
  meta: 'Meta (Llama)',
  llama: 'Meta (Llama)',
  anthropic: 'Anthropic',
  google: 'Google',
  mistralai: 'Mistral AI',
  mistral: 'Mistral AI',
  allam: 'Allam',
  cohere: 'Cohere',
  'x-ai': 'xAI (Grok)',
  xai: 'xAI (Grok)',
  together: 'Together AI',
  togethercomputer: 'Together AI',
  fireworks: 'Fireworks AI',
  microsoft: 'Microsoft',
  amazon: 'Amazon',
  nvidia: 'NVIDIA',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  omnirouter: 'OmniRouter',
  omniroute: 'OmniRouter',
  novita: 'Novita AI',
  ai21: 'AI21 Labs',
};

/**
 * Clean and format a custom group or namespace name
 */
export function formatNamespaceName(namespace) {
  if (!namespace) return 'Outros';
  const lower = namespace.toLowerCase().trim();
  if (KNOWN_NAMESPACE_MAP[lower]) {
    return KNOWN_NAMESPACE_MAP[lower];
  }
  // Title Case with hyphen/underscore to space
  return namespace
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get clean human-friendly display name for any model
 */
export function getModelDisplayName(modelId, config = null) {
  if (!modelId || typeof modelId !== 'string') return '';
  if (config && config.displayName && config.displayName.trim()) {
    return config.displayName.trim();
  }
  if (config && config.rawModelId && config.rawModelId.trim()) {
    return config.rawModelId.trim();
  }
  if (modelId.includes('::')) {
    return modelId.split('::')[1];
  }
  return modelId;
}

/**
 * Infer group/provider for any model ID based on custom config, namespace, or model heuristics.
 */
export function getModelGroup(modelId, config = null) {
  if (!modelId || typeof modelId !== 'string') return 'Outros';

  // 1. Explicit group in custom config
  if (config && config.group && config.group.trim()) {
    return config.group.trim();
  }

  // 2. Provider in config (from configured API providers)
  if (config && config.provider && config.provider.trim()) {
    return formatNamespaceName(config.provider.trim());
  }

  // 3. Provider prefix in modelId (e.g. groq::openai/gpt-4o)
  if (modelId.includes('::')) {
    const [p] = modelId.split('::');
    return formatNamespaceName(p);
  }

  const trimmed = modelId.trim();

  // 4. Namespaced model (e.g., openai/gpt-4o, canopylabs/orpheus-v1-english, accounts/fireworks/...)
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts[0] === 'accounts' && parts.length > 2) {
      return formatNamespaceName(parts[1]);
    }
    const namespace = parts[0];
    return formatNamespaceName(namespace);
  }

  // 5. Name-based heuristics for non-namespaced model IDs
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('deepseek') || lower.includes('deepseek')) {
    return 'DeepSeek';
  }
  if (
    lower.startsWith('gpt') ||
    lower.startsWith('o1') ||
    lower.startsWith('o3') ||
    lower.startsWith('o4') ||
    lower.startsWith('chatgpt') ||
    lower.includes('davinci') ||
    lower.includes('dall-e')
  ) {
    return 'OpenAI';
  }
  if (lower.startsWith('llama') || lower.includes('llama')) {
    return 'Meta (Llama)';
  }
  if (lower.startsWith('qwen') || lower.includes('qwen')) {
    return 'Qwen';
  }
  if (lower.startsWith('canopy') || lower.includes('orpheus')) {
    return 'Canopy Labs';
  }
  if (lower.startsWith('groq') || lower.includes('compound')) {
    return 'Groq';
  }
  if (lower.startsWith('gemini') || lower.startsWith('gemma') || lower.includes('gemma')) {
    return 'Google';
  }
  if (lower.startsWith('claude') || lower.includes('claude')) {
    return 'Anthropic';
  }
  if (
    lower.startsWith('mistral') ||
    lower.startsWith('mixtral') ||
    lower.startsWith('codestral') ||
    lower.startsWith('pixtral') ||
    lower.includes('mistral')
  ) {
    return 'Mistral AI';
  }
  if (lower.startsWith('allam') || lower.startsWith('alm') || lower.includes('allam')) {
    return 'Allam';
  }
  if (lower.startsWith('grok') || lower.includes('grok')) {
    return 'xAI (Grok)';
  }
  if (lower.startsWith('phi') || lower.includes('phi-')) {
    return 'Microsoft (Phi)';
  }
  if (lower.startsWith('command') || lower.includes('cohere')) {
    return 'Cohere';
  }
  if (lower.includes('whisper')) {
    return 'Audio (Whisper)';
  }

  // 6. Custom models fallback
  if (config && config.isCustom) {
    return 'Personalizados';
  }

  return 'Outros';
}

/**
 * Priority order for common model groups so the list appears well structured
 */
const GROUP_PRIORITY = [
  'Favoritos',
  'Favorites',
  'OpenAI',
  'Canopy Labs',
  'DeepSeek',
  'Groq',
  'Qwen',
  'Meta (Llama)',
  'Google',
  'Anthropic',
  'Mistral AI',
  'Allam',
  'xAI (Grok)',
  'Cohere',
  'Microsoft (Phi)',
  'Together AI',
  'Fireworks AI',
  'Ollama',
  'LM Studio',
  'Personalizados',
  'Outros',
];

/**
 * Group an array of model IDs into structured groups
 * @param {string[]} modelList Array of model IDs
 * @param {object} modelConfigs Map of model configs
 * @returns {Array<{ group: string, models: string[] }>}
 */
export function groupModels(modelList = [], modelConfigs = {}) {
  if (!Array.isArray(modelList) || modelList.length === 0) {
    return [];
  }

  const groupsMap = new Map();

  modelList.forEach((modelId) => {
    if (!modelId || modelId === 'default') return;
    const config = modelConfigs[modelId] || null;
    const groupName = getModelGroup(modelId, config);

    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, []);
    }
    groupsMap.get(groupName).push(modelId);
  });

  // Sort models within each group by displayName or raw ID
  groupsMap.forEach((models, groupName) => {
    models.sort((a, b) => {
      const nameA = getModelDisplayName(a, modelConfigs[a]).toLowerCase();
      const nameB = getModelDisplayName(b, modelConfigs[b]).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });

  // Sort groups according to predefined priority or alphabetically
  const sortedGroupNames = Array.from(groupsMap.keys()).sort((a, b) => {
    const indexA = GROUP_PRIORITY.indexOf(a);
    const indexB = GROUP_PRIORITY.indexOf(b);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return a.localeCompare(b);
  });

  return sortedGroupNames.map((groupName) => ({
    group: groupName,
    models: groupsMap.get(groupName),
  }));
}

/**
 * Parse bulk text or JSON input for adding multiple models
 * Supports:
 * - One model ID per line: "openai/gpt-oss-120b"
 * - Pipe/comma format: "openai/gpt-oss-20b | GPT OSS 20B | 128000 | OpenAI"
 * - JSON Array: `[{"id": "foo", "displayName": "Foo", "context": 64000}]`
 * - JSON Object: `{"model-id": {"context": 64000}}`
 */
export function parseBulkModelsInput(rawInput, defaultOptions = {}) {
  if (!rawInput || typeof rawInput !== 'string') return [];
  const text = rawInput.trim();
  if (!text) return [];

  const defaultContext = Number(defaultOptions.context) || 1000000;
  const defaultVision = !!defaultOptions.vision_supported;
  const defaultTools = !!defaultOptions.builtin_tools_supported;
  const defaultGroup = defaultOptions.group ? defaultOptions.group.trim() : '';

  // 1. Try parsing as JSON
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && (item.id || typeof item === 'string'))
          .map((item) => {
            const id = (typeof item === 'string' ? item : item.id).trim();
            const group = item.group || defaultGroup || getModelGroup(id);
            return {
              id,
              displayName: item.displayName || id,
              context: Number(item.context) || defaultContext,
              vision_supported: item.vision_supported !== undefined ? !!item.vision_supported : defaultVision,
              builtin_tools_supported: item.builtin_tools_supported !== undefined ? !!item.builtin_tools_supported : defaultTools,
              group,
              isCustom: true,
            };
          });
      }

      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed).map(([id, config]) => {
          const group = config?.group || defaultGroup || getModelGroup(id);
          return {
            id: id.trim(),
            displayName: config?.displayName || id.trim(),
            context: Number(config?.context) || defaultContext,
            vision_supported: config?.vision_supported !== undefined ? !!config.vision_supported : defaultVision,
            builtin_tools_supported: config?.builtin_tools_supported !== undefined ? !!config.builtin_tools_supported : defaultTools,
            group,
            isCustom: true,
          };
        });
      }
    } catch (e) {
      // Not valid JSON, fallback to line-by-line parser
    }
  }

  // 2. Line-by-line parsing
  const lines = text.split('\n');
  const results = [];
  const seenIds = new Set();

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    // Check pipe format: id | displayName | context | group
    if (line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim());
      const id = parts[0];
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);

      const displayName = parts[1] || id;
      const context = Number(parts[2]) || defaultContext;
      const group = parts[3] || defaultGroup || getModelGroup(id);

      results.push({
        id,
        displayName,
        context,
        vision_supported: defaultVision,
        builtin_tools_supported: defaultTools,
        group,
        isCustom: true,
      });
      continue;
    }

    // Check tab separated: id \t displayName
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim());
      const id = parts[0];
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);

      results.push({
        id,
        displayName: parts[1] || id,
        context: Number(parts[2]) || defaultContext,
        vision_supported: defaultVision,
        builtin_tools_supported: defaultTools,
        group: parts[3] || defaultGroup || getModelGroup(id),
        isCustom: true,
      });
      continue;
    }

    // Clean quotes or commas at end of line (e.g. copied from code/lists: "openai/gpt-4o",)
    line = line.replace(/^["'`]/, '').replace(/["'`,;]$/, '').trim();
    if (!line || seenIds.has(line)) continue;
    seenIds.add(line);

    results.push({
      id: line,
      displayName: line,
      context: defaultContext,
      vision_supported: defaultVision,
      builtin_tools_supported: defaultTools,
      group: defaultGroup || getModelGroup(line),
      isCustom: true,
    });
  }

  return results;
}

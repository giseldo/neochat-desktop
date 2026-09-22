const fs = require('fs');
const path = require('path');

let appInstance = null;
let botsCache = null;

const DEFAULT_BOTS = [
  {
    id: 'bot_hermes_assistant',
    name: 'Hermes Assistant',
    description: 'Assistente autônomo com raciocínio analítico profundo, memória de longo prazo e aprendizado contínuo.',
    icon: 'Sparkles',
    color: '#8b5cf6',
    systemPrompt: `Você é o Hermes Assistant, um assistente autônomo avançado inspirado no Hermes Agent da Nous Research.
Suas principais diretrizes:
1. Raciocínio & Profundidade: Pense de forma estruturada e analítica antes de responder.
2. Aprendizado Contínuo: Você tem capacidade de aprender e reter fatos, preferências e regras ao longo do tempo. Quando o usuário declarar regras, preferências de estilo ou informações importantes de contexto, use a ferramenta \`save_user_memory\` para memorizar.
3. Precisão e Transparência: Seja direto, técnico e honesto quando algo exigir verificação externa.`,
    preferredModel: '',
    temperature: 0.5,
    agentEnabled: false,
    approvalMode: 'balanced',
    searchEnabled: true,
    tools: ['web_search', 'save_user_memory', 'forget_user_memory'],
    memoryEnabled: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bot_hermes_dev',
    name: 'Hermes Dev Agent',
    description: 'Engenheiro de software e agente autônomo de código com acesso a terminal, arquivos e memória persistente.',
    icon: 'Terminal',
    color: '#10b981',
    systemPrompt: `Você é o Hermes Dev Agent, um engenheiro de software autônomo especialista em arquitetura, refatoração, resolução sistemática de bugs e execução de tarefas.
Diretrizes:
1. Padrões de Engenharia: Escreva código limpo, modular, com tipagem sólida e tratamento de edge cases.
2. Ferramentas de Código: Utilize ferramentas de leitura, edição, busca e terminal com responsabilidade.
3. Aprendizado Contínuo: Memorize preferências de stack do usuário (ex: bibliotecas preferidas, convenções de código, flags de build) chamando \`save_user_memory\` com escopo de desenvolvedor.`,
    preferredModel: '',
    temperature: 0.2,
    agentEnabled: true,
    approvalMode: 'balanced',
    searchEnabled: true,
    tools: [
      'read_file', 'write_file', 'edit_file', 'list_directory',
      'glob_search', 'grep_search', 'shell_exec', 'git_status',
      'web_search', 'save_user_memory', 'forget_user_memory'
    ],
    memoryEnabled: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function initialize(app) {
  appInstance = app;
}

function getStoragePath() {
  const userDataPath = appInstance ? appInstance.getPath('userData') : path.join(process.cwd(), 'temp_data');
  return path.join(userDataPath, 'bots.json');
}

/**
 * Load bots from disk with cache and default seeds
 */
function loadBots() {
  if (botsCache !== null) {
    return botsCache;
  }

  const filePath = getStoragePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const loaded = JSON.parse(raw);
      if (Array.isArray(loaded)) {
        // Merge with built-in defaults if missing
        const existingIds = new Set(loaded.map(b => b.id));
        const merged = [...loaded];
        for (const defaultBot of DEFAULT_BOTS) {
          if (!existingIds.has(defaultBot.id)) {
            merged.push(defaultBot);
          }
        }
        botsCache = merged;
        return botsCache;
      }
    }
  } catch (err) {
    console.error('[BotManager] Error loading bots:', err);
  }

  botsCache = [...DEFAULT_BOTS];
  saveBots(botsCache);
  return botsCache;
}

/**
 * Save bots to disk
 */
function saveBots(bots) {
  botsCache = bots;
  const filePath = getStoragePath();
  const dirPath = path.dirname(filePath);

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(bots, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error('[BotManager] Error saving bots:', err);
    return false;
  }
}

/**
 * List all configured bots
 */
function listBots() {
  return loadBots();
}

/**
 * Get a bot by ID
 */
function getBot(id) {
  if (!id) return null;
  const bots = loadBots();
  return bots.find(b => b.id === id) || null;
}

/**
 * Save or update a bot
 */
function saveBot(botData) {
  if (!botData || !botData.name || typeof botData.name !== 'string' || !botData.name.trim()) {
    throw new Error('Bot name is required.');
  }

  const bots = loadBots();
  const now = new Date().toISOString();

  if (botData.id) {
    const index = bots.findIndex(b => b.id === botData.id);
    if (index !== -1) {
      const existing = bots[index];
      const updated = {
        ...existing,
        ...botData,
        name: botData.name.trim(),
        description: (botData.description || '').trim(),
        systemPrompt: (botData.systemPrompt || '').trim(),
        preferredModel: (botData.preferredModel || '').trim(),
        temperature: typeof botData.temperature === 'number' ? botData.temperature : 0.5,
        agentEnabled: Boolean(botData.agentEnabled),
        approvalMode: botData.approvalMode || 'balanced',
        searchEnabled: botData.searchEnabled !== false,
        tools: Array.isArray(botData.tools) ? botData.tools : existing.tools || [],
        memoryEnabled: botData.memoryEnabled !== false,
        icon: botData.icon || existing.icon || 'Bot',
        color: botData.color || existing.color || '#8b5cf6',
        updatedAt: now
      };
      bots[index] = updated;
      saveBots(bots);
      return { success: true, bot: updated, isNew: false };
    }
  }

  const newId = botData.id || `bot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const created = {
    id: newId,
    name: botData.name.trim(),
    description: (botData.description || '').trim(),
    systemPrompt: (botData.systemPrompt || '').trim(),
    preferredModel: (botData.preferredModel || '').trim(),
    temperature: typeof botData.temperature === 'number' ? botData.temperature : 0.5,
    agentEnabled: Boolean(botData.agentEnabled),
    approvalMode: botData.approvalMode || 'balanced',
    searchEnabled: botData.searchEnabled !== false,
    tools: Array.isArray(botData.tools) ? botData.tools : ['web_search', 'save_user_memory', 'forget_user_memory'],
    memoryEnabled: botData.memoryEnabled !== false,
    icon: botData.icon || 'Bot',
    color: botData.color || '#8b5cf6',
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now
  };

  bots.push(created);
  saveBots(bots);
  return { success: true, bot: created, isNew: true };
}

/**
 * Delete a bot by ID
 */
function deleteBot(id) {
  if (!id) return { success: false, error: 'ID is required' };
  const bots = loadBots();
  const initialLength = bots.length;
  const filtered = bots.filter(b => b.id !== id);

  if (filtered.length === initialLength) {
    return { success: false, error: 'Bot not found' };
  }

  saveBots(filtered);
  return { success: true, count: filtered.length };
}

module.exports = {
  initialize,
  listBots,
  getBot,
  saveBot,
  deleteBot,
  DEFAULT_BOTS
};

const fs = require('fs');
const path = require('path');

let appInstance = null;
let memoriesCache = null;

function initialize(app) {
  appInstance = app;
}

function getStoragePath() {
  const userDataPath = appInstance ? appInstance.getPath('userData') : path.join(process.cwd(), 'temp_data');
  return path.join(userDataPath, 'user_memories.json');
}

/**
 * Load memories from disk with caching
 */
function loadMemories() {
  if (memoriesCache !== null) {
    return memoriesCache;
  }

  const filePath = getStoragePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      memoriesCache = JSON.parse(raw);
      if (!Array.isArray(memoriesCache)) {
        memoriesCache = [];
      }
    } else {
      memoriesCache = [];
    }
  } catch (err) {
    console.error('[MemoryService] Error loading user memories:', err);
    memoriesCache = [];
  }

  return memoriesCache;
}

/**
 * Persist memories to disk atomically
 */
function saveMemories(memories) {
  memoriesCache = memories;
  const filePath = getStoragePath();
  const dirPath = path.dirname(filePath);

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(memories, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error('[MemoryService] Error saving user memories:', err);
    return false;
  }
}

/**
 * Get all stored user memories, optionally filtered by botId
 * @param {string|object} filter - botId string or filter object { botId, includeGlobal }
 */
function getMemories(filter = null) {
  const all = loadMemories();
  if (!filter) return all;

  const botId = typeof filter === 'string' ? filter : filter.botId;
  const includeGlobal = typeof filter === 'object' && filter.includeGlobal !== undefined ? filter.includeGlobal : true;

  if (!botId) return all;

  return all.filter(m => {
    if (m.botId === botId) return true;
    if (includeGlobal && !m.botId) return true;
    return false;
  });
}

/**
 * Get memories belonging strictly to a specific bot
 */
function getBotMemories(botId) {
  if (!botId) return [];
  return loadMemories().filter(m => m.botId === botId);
}

/**
 * Get only active/enabled memories
 */
function getActiveMemories(botId = null) {
  const list = getMemories(botId);
  return list.filter(m => m.enabled !== false);
}

/**
 * Add a new user memory
 * @param {string} content - The memory fact/preference
 * @param {string} category - 'preference' | 'fact' | 'rule' | 'context'
 * @param {string} source - 'manual' | 'ai_extracted'
 * @param {string|null} botId - Optional bot ID to associate memory with
 */
function addMemory(content, category = 'preference', source = 'manual', botId = null) {
  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new Error('Memory content cannot be empty.');
  }

  const cleanContent = content.trim();
  const validCategories = ['preference', 'fact', 'rule', 'context'];
  const validCategory = validCategories.includes(category) ? category : 'preference';

  const memories = loadMemories();

  // Avoid exact duplicates in the same scope
  const existingIndex = memories.findIndex(m => 
    m.content.toLowerCase() === cleanContent.toLowerCase() &&
    (botId ? m.botId === botId : !m.botId)
  );

  if (existingIndex !== -1) {
    memories[existingIndex].updatedAt = new Date().toISOString();
    memories[existingIndex].category = validCategory;
    memories[existingIndex].enabled = true;
    saveMemories(memories);
    return { success: true, memory: memories[existingIndex], isNew: false };
  }

  const newMemory = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    content: cleanContent,
    category: validCategory,
    enabled: true,
    source: source || 'manual',
    botId: botId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  memories.unshift(newMemory);
  saveMemories(memories);

  return { success: true, memory: newMemory, isNew: true };
}

/**
 * Update an existing memory
 */
function updateMemory(id, updates = {}) {
  const memories = loadMemories();
  const index = memories.findIndex(m => m.id === id);
  if (index === -1) {
    return { success: false, error: 'Memory not found' };
  }

  const current = memories[index];
  const validCategories = ['preference', 'fact', 'rule', 'context'];

  if (typeof updates.content === 'string' && updates.content.trim()) {
    current.content = updates.content.trim();
  }
  if (typeof updates.category === 'string' && validCategories.includes(updates.category)) {
    current.category = updates.category;
  }
  if (typeof updates.enabled === 'boolean') {
    current.enabled = updates.enabled;
  }
  if (updates.botId !== undefined) {
    current.botId = updates.botId || null;
  }
  current.updatedAt = new Date().toISOString();

  saveMemories(memories);
  return { success: true, memory: current };
}

/**
 * Delete a memory by ID
 */
function deleteMemory(id) {
  const memories = loadMemories();
  const initialLength = memories.length;
  const filtered = memories.filter(m => m.id !== id);

  if (filtered.length === initialLength) {
    return { success: false, error: 'Memory not found' };
  }

  saveMemories(filtered);
  return { success: true, count: filtered.length };
}

/**
 * Forget/delete memory matching content query (for AI tool calls)
 */
function forgetMemoryByQuery(query, botId = null) {
  if (!query || typeof query !== 'string') {
    return { success: false, error: 'Query required' };
  }

  const memories = loadMemories();
  const cleanQuery = query.toLowerCase().trim();

  // Find best match, prioritizing current bot if botId specified
  let matchIndex = -1;
  if (botId) {
    matchIndex = memories.findIndex(m => 
      m.botId === botId && (
        m.id === query || 
        m.content.toLowerCase().includes(cleanQuery) || 
        cleanQuery.includes(m.content.toLowerCase())
      )
    );
  }

  if (matchIndex === -1) {
    matchIndex = memories.findIndex(m => 
      m.id === query || 
      m.content.toLowerCase().includes(cleanQuery) || 
      cleanQuery.includes(m.content.toLowerCase())
    );
  }

  if (matchIndex === -1) {
    return { success: false, message: `Nenhuma memória correspondente encontrada para "${query}".` };
  }

  const removed = memories.splice(matchIndex, 1)[0];
  saveMemories(memories);

  return { 
    success: true, 
    message: `Memória esquecida: "${removed.content}"`,
    forgottenMemory: removed 
  };
}

/**
 * Clear all memories, optionally only for a specific bot
 */
function clearMemories(botId = null) {
  if (!botId) {
    saveMemories([]);
    return { success: true, count: 0 };
  }
  const memories = loadMemories();
  const remaining = memories.filter(m => m.botId !== botId);
  saveMemories(remaining);
  return { success: true, count: remaining.length };
}

/**
 * Get memory stats
 */
function getMemoryStats(botId = null) {
  const memories = botId ? loadMemories().filter(m => m.botId === botId) : loadMemories();
  return {
    total: memories.length,
    active: memories.filter(m => m.enabled !== false).length,
    byCategory: {
      preference: memories.filter(m => m.category === 'preference').length,
      fact: memories.filter(m => m.category === 'fact').length,
      rule: memories.filter(m => m.category === 'rule').length,
      context: memories.filter(m => m.category === 'context').length,
    }
  };
}

/**
 * Formats active memories into a compact block for system prompt injection.
 * Supports activeBot with dedicated persistent learnings and Hermes style.
 */
function getFormattedMemoryPrompt(settings = {}, activeBot = null) {
  const isGlobalEnabled = settings.userMemory?.enabled !== false;
  const isBotMemoryEnabled = activeBot ? activeBot.memoryEnabled !== false : false;

  if (!isGlobalEnabled && !isBotMemoryEnabled) {
    return '';
  }

  const sections = [];

  // Bot-specific knowledge & learnings
  if (activeBot && isBotMemoryEnabled) {
    const botMemories = getBotMemories(activeBot.id).filter(m => m.enabled !== false);
    const botMemoryLines = botMemories.length > 0
      ? botMemories.map(m => `• [${m.category}] ${m.content}`)
      : ['(No persistent lessons learned yet for this bot. Use `save_user_memory` when learning user preferences or key facts.)'];

    sections.push(
      `=== BOT LEARNED KNOWLEDGE & LESSONS (${activeBot.name || 'Hermes Agent'}) ===`,
      `Continuous Learning is ACTIVE for this Bot. You remember what you learn across sessions with the user:`,
      ...botMemoryLines,
      ''
    );
  }

  // General user profile & preferences
  if (isGlobalEnabled) {
    const globalMemories = loadMemories().filter(m => !m.botId && m.enabled !== false);
    if (globalMemories.length > 0) {
      sections.push(
        '=== USER GENERAL MEMORY & PROFILE ===',
        ...globalMemories.map(m => `• [${m.category}] ${m.content}`),
        ''
      );
    }
  }

  if (sections.length === 0) {
    return '';
  }

  sections.push(
    'Available Memory Commands / Tools:',
    '- `save_user_memory`: Use this command when the user tells you to remember something ("lembre-se de...", "remember that..."), declares coding/communication preferences, or shares persistent project/task context. Arguments: `memory` (string description of the fact/rule), `category` ("preference", "fact", "rule", or "context").',
    '- `forget_user_memory`: Use this command when the user asks to forget or remove a remembered fact or preference. Argument: `query` (search phrase of what to forget).',
    '',
    'Instructions:',
    '1. Apply verified preferences naturally to tailor your answers, code style, and explanations.',
    '2. Do not explicitly recite this raw memory block unless the user asks what you remember.',
    '3. Whenever a new persistent preference, lesson, or fact is shared by the user, proactively call `save_user_memory`.',
    '4. When the user asks you to forget a preference or fact, use `forget_user_memory`.',
    '==================================================================='
  );

  return sections.join('\n');
}

/**
 * Returns native function calling tool definitions for memory management
 */
function getMemoryToolDefinitions() {
  return [
    {
      type: 'function',
      function: {
        name: 'save_user_memory',
        description: 'Save a persistent fact, preference, rule, or piece of context about the user to long-term memory so it persists across all chats. Use this when the user says "remember that...", declares a personal preference (e.g. "I code in TypeScript", "I prefer concise answers", "My project uses Postgres"), or shares an important personal detail.',
        parameters: {
          type: 'object',
          properties: {
            memory: {
              type: 'string',
              description: 'A clear, concise, self-contained statement of the fact or preference to remember (e.g., "Prefere código em TypeScript e React com Tailwind CSS", "Trabalha no fuso horário GMT-3").'
            },
            category: {
              type: 'string',
              enum: ['preference', 'fact', 'rule', 'context'],
              description: 'The type of memory: "preference" (coding/communication style), "fact" (personal/project details), "rule" (strict instruction to always follow), or "context" (general background).'
            }
          },
          required: ['memory']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'forget_user_memory',
        description: 'Remove or forget a specific piece of user information from persistent long-term memory. Use this when the user asks to forget something or says a previously remembered fact is no longer valid.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Description or key phrase of the fact/preference to forget (e.g., "React Native", "morava em SP").'
            }
          },
          required: ['query']
        }
      }
    }
  ];
}

/**
 * Export memories in JSON or Markdown format
 * @param {'json'|'md'|'markdown'} format
 */
function exportMemories(format = 'json') {
  const memories = loadMemories();
  const activeCount = memories.filter(m => m.enabled !== false).length;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  if (format === 'md' || format === 'markdown') {
    const categoryLabels = {
      preference: 'Preferências (Preferences)',
      fact: 'Fatos (Facts)',
      rule: 'Regras (Rules)',
      context: 'Contexto (Context)'
    };

    const sections = ['preference', 'fact', 'rule', 'context'].map(cat => {
      const items = memories.filter(m => (m.category || 'preference') === cat);
      const title = categoryLabels[cat] || cat;
      if (items.length === 0) {
        return `### ${title}\n*(Nenhuma memória cadastrada)*\n`;
      }
      const list = items.map(m => {
        const status = m.enabled !== false ? '✅ Ativa' : '⏸️ Desativada';
        const source = m.source === 'ai_extracted' ? 'Aprendido pela IA' : 'Manual';
        const date = m.createdAt ? new Date(m.createdAt).toLocaleDateString() : dateStr;
        return `- **${m.content}**\n  - *Status:* ${status} | *Origem:* ${source} | *Data:* ${date}`;
      }).join('\n');
      return `### ${title} (${items.length})\n${list}\n`;
    });

    const content = [
      '# Memória Persistente do Usuário - NeoChat',
      '',
      `> **Data de exportação:** ${now.toLocaleString()}  `,
      `> **Total de memórias:** ${memories.length} (${activeCount} ativas)`,
      '',
      '---',
      '',
      ...sections
    ].join('\n');

    return {
      success: true,
      format: 'md',
      filename: `neochat-memorias-${dateStr}.md`,
      content,
      total: memories.length,
      active: activeCount
    };
  }

  // Default to JSON
  const payload = {
    version: 1,
    appName: 'NeoChat',
    exportedAt: now.toISOString(),
    total: memories.length,
    active: activeCount,
    memories
  };

  return {
    success: true,
    format: 'json',
    filename: `neochat-memorias-${dateStr}.json`,
    content: JSON.stringify(payload, null, 2),
    total: memories.length,
    active: activeCount
  };
}

/**
 * Import memories from JSON object or string
 * @param {string|object|Array} data
 * @param {{ merge?: boolean }} options
 */
function importMemories(data, options = { merge: true }) {
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch (err) {
      return { success: false, error: 'JSON inválido para importação de memória.' };
    }
  }

  let incomingList = [];
  if (Array.isArray(parsed)) {
    incomingList = parsed;
  } else if (parsed && Array.isArray(parsed.memories)) {
    incomingList = parsed.memories;
  } else {
    return { success: false, error: 'Estrutura de dados não reconhecida. Esperado array de memórias ou objeto com chave "memories".' };
  }

  if (incomingList.length === 0) {
    return { success: false, error: 'O arquivo não contém memórias para importar.' };
  }

  const validCategories = ['preference', 'fact', 'rule', 'context'];
  const currentMemories = options.merge !== false ? loadMemories() : [];
  let added = 0;
  let updated = 0;

  for (const item of incomingList) {
    if (!item || typeof item.content !== 'string' || !item.content.trim()) {
      continue;
    }

    const cleanContent = item.content.trim();
    const category = validCategories.includes(item.category) ? item.category : 'preference';
    const enabled = item.enabled !== false;
    const source = item.source || 'imported';
    const createdAt = item.createdAt || new Date().toISOString();
    const updatedAt = new Date().toISOString();

    const existingIndex = currentMemories.findIndex(
      m => m.id === item.id || m.content.toLowerCase() === cleanContent.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Update existing
      currentMemories[existingIndex].category = category;
      currentMemories[existingIndex].enabled = enabled;
      currentMemories[existingIndex].updatedAt = updatedAt;
      updated++;
    } else {
      // Add new
      currentMemories.unshift({
        id: item.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        content: cleanContent,
        category,
        enabled,
        source,
        createdAt,
        updatedAt
      });
      added++;
    }
  }

  saveMemories(currentMemories);

  return {
    success: true,
    total: currentMemories.length,
    imported: added + updated,
    added,
    updated
  };
}

module.exports = {
  initialize,
  getMemories,
  getBotMemories,
  getActiveMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  forgetMemoryByQuery,
  clearMemories,
  getMemoryStats,
  getFormattedMemoryPrompt,
  getMemoryToolDefinitions,
  exportMemories,
  importMemories
};

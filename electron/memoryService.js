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
 * Get all stored user memories
 */
function getMemories() {
  return loadMemories();
}

/**
 * Get only active/enabled memories
 */
function getActiveMemories() {
  return loadMemories().filter(m => m.enabled !== false);
}

/**
 * Add a new user memory
 * @param {string} content - The memory fact/preference
 * @param {string} category - 'preference' | 'fact' | 'rule' | 'context'
 * @param {string} source - 'manual' | 'ai_extracted'
 */
function addMemory(content, category = 'preference', source = 'manual') {
  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new Error('Memory content cannot be empty.');
  }

  const cleanContent = content.trim();
  const validCategories = ['preference', 'fact', 'rule', 'context'];
  const validCategory = validCategories.includes(category) ? category : 'preference';

  const memories = loadMemories();

  // Avoid exact duplicates
  const existingIndex = memories.findIndex(m => m.content.toLowerCase() === cleanContent.toLowerCase());
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
function forgetMemoryByQuery(query) {
  if (!query || typeof query !== 'string') {
    return { success: false, error: 'Query required' };
  }

  const memories = loadMemories();
  const cleanQuery = query.toLowerCase().trim();

  // Find best match
  const matchIndex = memories.findIndex(m => 
    m.id === query || 
    m.content.toLowerCase().includes(cleanQuery) || 
    cleanQuery.includes(m.content.toLowerCase())
  );

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
 * Clear all memories
 */
function clearMemories() {
  saveMemories([]);
  return { success: true, count: 0 };
}

/**
 * Get memory stats
 */
function getMemoryStats() {
  const memories = loadMemories();
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
 * Formats active memories into a compact block for system prompt injection
 */
function getFormattedMemoryPrompt(settings = {}) {
  if (settings.userMemory?.enabled === false) {
    return '';
  }

  const activeMemories = getActiveMemories();
  if (activeMemories.length === 0) {
    return '';
  }

  const lines = activeMemories.map(m => `• [${m.category}] ${m.content}`);

  return [
    '=== USER MEMORY & PROFILE (Persistent Long-Term Memory) ===',
    'The following are verified preferences, facts, and rules learned about the user across past sessions:',
    ...lines,
    'Instructions:',
    '1. Apply these preferences naturally to tailor your answers, code style, and explanations.',
    '2. Do not explicitly list or repeat this raw memory block unless the user asks about what you remember.',
    '3. When the user tells you to remember a new preference or fact, use the `save_user_memory` tool.',
    '4. When the user asks you to forget a preference or fact, use the `forget_user_memory` tool.',
    '==========================================================='
  ].join('\n');
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

module.exports = {
  initialize,
  getMemories,
  getActiveMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  forgetMemoryByQuery,
  clearMemories,
  getMemoryStats,
  getFormattedMemoryPrompt,
  getMemoryToolDefinitions
};

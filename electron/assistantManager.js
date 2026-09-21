const fetch = require('node-fetch');

const REGISTRY_BASE_URL = 'https://registry.npmmirror.com/@lobehub/agents-index/v1/files/public';
const IDENTIFIER_RE = /^[A-Za-z0-9._-]+$/;
const INDEX_FILES = { en: 'index.json', zh: 'index.zh-CN.json', ja: 'index.ja-JP.json' };
const DETAIL_SUFFIXES = { en: '', zh: '.zh-CN', ja: '.ja-JP' };

function localeKey(locale) {
  const value = String(locale || '').toLowerCase();
  if (value === 'zh' || value.startsWith('zh-')) return 'zh';
  if (value === 'ja' || value.startsWith('ja-')) return 'ja';
  return 'en';
}

function stringList(value, max = 20) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(item => typeof item === 'string').map(item => item.trim().slice(0, 160)).filter(Boolean))].slice(0, max);
}

function normalizeProfile(value) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== 2) return undefined;
  const runtime = value.runtime && typeof value.runtime === 'object' ? value.runtime : {};
  const capabilities = value.capabilities && typeof value.capabilities === 'object' ? value.capabilities : {};
  const approvalMode = ['permissive', 'balanced', 'strict'].includes(runtime.approvalMode) ? runtime.approvalMode : 'permissive';
  const reasoningMode = ['off', 'auto', 'low', 'medium', 'high'].includes(runtime.reasoningMode) ? runtime.reasoningMode : undefined;
  const skillPolicies = Array.isArray(capabilities.skillPolicies)
    ? capabilities.skillPolicies.filter(item => item && typeof item.skillId === 'string' && ['auto', 'manual', 'disabled'].includes(item.mode)).slice(0, 100)
    : [];
  return {
    schemaVersion: 2,
    runtime: {
      agentEnabled: runtime.agentEnabled === true,
      approvalMode,
      ...(typeof runtime.preferredModel === 'string' && runtime.preferredModel.trim() ? { preferredModel: runtime.preferredModel.trim().slice(0, 240) } : {}),
      ...(reasoningMode ? { reasoningMode } : {}),
      ...(typeof runtime.searchEnabled === 'boolean' ? { searchEnabled: runtime.searchEnabled } : {}),
      ...(runtime.budget && typeof runtime.budget === 'object' ? { budget: runtime.budget } : {})
    },
    capabilities: {
      skillPolicies,
      pluginIds: stringList(capabilities.pluginIds, 100),
      toolIds: stringList(capabilities.toolIds, 100),
      knowledgeCollectionIds: stringList(capabilities.knowledgeCollectionIds, 100),
      memoryScopes: stringList(capabilities.memoryScopes, 4)
    }
  };
}

function normalizeAssistant(value, forcedIdentifier) {
  if (!value || typeof value !== 'object') return null;
  const meta = value.meta && typeof value.meta === 'object' ? value.meta : {};
  const config = value.config && typeof value.config === 'object' ? value.config : {};
  const identifier = String(forcedIdentifier || value.identifier || '').trim().slice(0, 160);
  if (!IDENTIFIER_RE.test(identifier)) return null;
  const systemRole = typeof config.systemRole === 'string' ? config.systemRole : meta.systemRole;
  return {
    identifier,
    meta: {
      avatar: String(meta.avatar || '🤖').slice(0, 200),
      title: String(meta.title || identifier).trim().slice(0, 200),
      description: String(meta.description || '').trim().slice(0, 1000),
      tags: stringList(meta.tags, 20),
      category: String(meta.category || 'General').trim().slice(0, 100),
      ...(typeof systemRole === 'string' ? { systemRole: systemRole.trim().slice(0, 50000) } : {})
    },
    createdAt: String(value.createdAt || '').slice(0, 100),
    homepage: String(value.homepage || '').slice(0, 2048),
    author: String(value.author || '').slice(0, 200),
    ...(normalizeProfile(value.profile) ? { profile: normalizeProfile(value.profile) } : {})
  };
}

class AssistantManager {
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = 60 * 60 * 1000;
  }

  async list(locale = 'en', forceRefresh = false) {
    const key = localeKey(locale);
    const cached = this.cache.get(key);
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return { assistants: cached.assistants, status: 'cache', fetchedAt: cached.fetchedAt };
    }
    try {
      const response = await fetch(`${REGISTRY_BASE_URL}/${INDEX_FILES[key]}`, { timeout: 20000, size: 5000000 });
      if (!response.ok) throw new Error(`Assistant registry returned HTTP ${response.status}`);
      const payload = await response.json();
      const entries = Array.isArray(payload?.agents) ? payload.agents : [];
      const assistants = [];
      const seen = new Set();
      for (const entry of entries) {
        const assistant = normalizeAssistant(entry);
        if (!assistant || seen.has(assistant.identifier)) continue;
        seen.add(assistant.identifier);
        assistants.push(assistant);
        if (assistants.length >= 1000) break;
      }
      const fetchedAt = Date.now();
      this.cache.set(key, { assistants, fetchedAt });
      return { assistants, status: 'fresh', fetchedAt };
    } catch (error) {
      if (cached) return { assistants: cached.assistants, status: 'stale', fetchedAt: cached.fetchedAt, error: error.message };
      return { assistants: [], status: 'error', error: error.message };
    }
  }

  async detail(identifier, locale = 'en') {
    if (!IDENTIFIER_RE.test(String(identifier || ''))) throw new Error('Invalid assistant identifier.');
    const key = localeKey(locale);
    const filename = `${identifier}${DETAIL_SUFFIXES[key]}.json`;
    const response = await fetch(`${REGISTRY_BASE_URL}/${encodeURIComponent(filename)}`, { timeout: 20000, size: 2000000 });
    if (!response.ok && key !== 'en') return this.detail(identifier, 'en');
    if (!response.ok) throw new Error(`Assistant detail returned HTTP ${response.status}`);
    const assistant = normalizeAssistant(await response.json(), identifier);
    if (!assistant) throw new Error('Invalid assistant detail response.');
    return assistant;
  }

  registerIpcHandlers(ipcMain) {
    ipcMain.handle('assistants:list', async (_event, { locale = 'en', forceRefresh = false } = {}) => this.list(locale, forceRefresh));
    ipcMain.handle('assistants:detail', async (_event, { identifier, locale = 'en' } = {}) => this.detail(identifier, locale));
  }
}

const assistantManager = new AssistantManager();

module.exports = { AssistantManager, assistantManager, normalizeAssistant, normalizeProfile, REGISTRY_BASE_URL };

/**
 * Community MCP Hub & Workflow Store Plugin for NeoChat Desktop
 * 
 * Provides:
 * - 1-Click installable popular MCP servers from community registry
 * - Curated automation workflow recipes
 */

const { fetchRegistryPage, safeHttpUrl } = require('../mcpRegistry');

const CURATED_MCP_SERVERS = [
  {
    id: 'github',
    name: 'GitHub Server',
    author: 'modelcontextprotocol',
    description: 'Gerencie repositórios, issues, pull requests, commits e branches no GitHub via MCP',
    icon: 'GitBranch',
    category: 'developer',
    badge: 'Popular',
    stars: '4.8k',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
    envHelp: 'Crie um Personal Access Token com escopo repo em github.com/settings/tokens'
  },
  {
    id: 'postgres',
    name: 'PostgreSQL Database',
    author: 'modelcontextprotocol',
    description: 'Execute consultas SQL seguras, inspecione schemas e analise tabelas de bancos Postgres',
    icon: 'Database',
    category: 'database',
    badge: 'Database',
    stars: '3.1k',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://user:pass@localhost:5432/mydb'],
    env: {},
    envHelp: 'Substitua a URL de conexão com as credenciais do seu PostgreSQL'
  },
  {
    id: 'brave-search',
    name: 'Brave Web Search',
    author: 'modelcontextprotocol',
    description: 'Busca na web e notícias com total privacidade via API do Brave Search',
    icon: 'Globe',
    category: 'web',
    badge: 'Web & News',
    stars: '2.9k',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: { BRAVE_API_KEY: '' },
    envHelp: 'Obtenha uma chave de API gratuita em brave.com/search/api'
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer Browser Automation',
    author: 'modelcontextprotocol',
    description: 'Navegação web automatizada, captura de screenshots e extração de páginas SPA dinâmicas',
    icon: 'Laptop',
    category: 'automation',
    badge: 'Automation',
    stars: '3.5k',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    env: {},
    envHelp: 'Não requer chaves de API adicionais.'
  },
  {
    id: 'filesystem',
    name: 'Secure Filesystem',
    author: 'modelcontextprotocol',
    description: 'Acesso seguro de leitura e escrita com escopo restrito a diretórios locais autorizados',
    icon: 'Folder',
    category: 'system',
    badge: 'Core',
    stars: '5.2k',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:/Users'],
    env: {},
    envHelp: 'Altere o caminho para a pasta que você deseja autorizar o acesso.'
  },
  {
    id: 'slack',
    name: 'Slack Workspace',
    author: 'modelcontextprotocol',
    description: 'Envie mensagens para canais, leia threads e consulte histórico do Slack',
    icon: 'MessageSquare',
    category: 'productivity',
    badge: 'Team',
    stars: '2.1k',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    env: { SLACK_BOT_TOKEN: '', SLACK_TEAM_ID: '' },
    envHelp: 'Crie um Slack Bot App em api.slack.com e gere o Bot Token'
  }
];

const CURATED_RECIPES = [
  {
    id: 'recipe-code-review',
    title: 'Automated Pull Request & Code Review',
    description: 'Analisa diff do Git, detecta potenciais vulnerabilidades, verifica boas práticas e gera sumário em markdown.',
    tags: ['Git', 'Security', 'Code Quality'],
    steps: 3
  },
  {
    id: 'recipe-deep-research',
    title: 'Deep Web & Knowledge Research Pipeline',
    description: 'Executa buscas iterativas na web, filtra fontes relevantes, compila dados e produz um relatório executivo.',
    tags: ['Research', 'Web Search', 'RAG'],
    steps: 4
  },
  {
    id: 'recipe-daily-digest',
    title: 'Morning Executive Briefing & Agenda',
    description: 'Sintetiza eventos do dia no Google Calendar, repositórios de código e gera áudio narrado.',
    tags: ['Productivity', 'Calendar', 'TTS'],
    steps: 3
  }
];

class McpHubEngine {
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = 5 * 60 * 1000;
  }

  listCuratedServers() {
    return CURATED_MCP_SERVERS;
  }

  async listServers(options = {}) {
    const key = JSON.stringify({ search: options.search || '', cursor: options.cursor || '', limit: options.limit || 50 });
    const cached = this.cache.get(key);
    if (!options.forceRefresh && cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return { ...cached.data, status: 'cache' };
    }
    try {
      const page = await fetchRegistryPage(options);
      const data = { ...page, status: 'fresh', source: 'registry' };
      this.cache.set(key, { data, fetchedAt: Date.now() });
      return data;
    } catch (error) {
      if (cached) return { ...cached.data, status: 'stale', error: error.message };
      const fallback = !options.cursor && !options.search ? CURATED_MCP_SERVERS : [];
      return { servers: fallback, nextCursor: '', status: 'fallback', source: 'curated', error: error.message };
    }
  }

  listCuratedRecipes() {
    return CURATED_RECIPES;
  }

  async installMcpServer({ serverId, server, bearerToken, customArgs, customEnv, settings = {}, saveSettings }) {
    const serverDef = server || CURATED_MCP_SERVERS.find(s => s.id === serverId);
    if (!serverDef) {
      throw new Error(`MCP Server ${serverId} não encontrado no catálogo`);
    }

    const isRemote = serverDef.transport === 'sse' || serverDef.transport === 'streamableHttp';
    if (isRemote && !safeHttpUrl(serverDef.url)) throw new Error('URL remota MCP inválida.');
    if (!isRemote && !serverDef.command) throw new Error('Comando MCP ausente.');
    const id = String(serverDef.id || serverId || '').replace(/[^a-zA-Z0-9._:-]/g, '-').slice(0, 120);
    if (!id) throw new Error('ID do servidor MCP inválido.');
    const headers = { ...(serverDef.headers || {}) };
    if (bearerToken?.trim()) {
      const headerName = serverDef.auth?.name || 'Authorization';
      headers[headerName] = serverDef.auth?.type === 'apiKey' ? bearerToken.trim() : `Bearer ${bearerToken.trim()}`;
    }

    const currentServers = { ...(settings.mcpServers || {}) };
    currentServers[id] = {
      name: serverDef.name,
      ...(isRemote ? { transport: serverDef.transport, url: serverDef.url, headers } : {
        command: serverDef.command,
        args: customArgs || serverDef.args,
        env: customEnv || serverDef.env || {}
      }),
      source: serverDef.source || 'curated',
      enabled: true
    };

    if (typeof saveSettings === 'function') {
      saveSettings({ ...settings, mcpServers: currentServers });
    }

    return {
      success: true,
      serverId: id,
      server: currentServers[id],
      message: `Servidor MCP ${serverDef.name} instalado e configurado com sucesso!`
    };
  }

  async installCustomServer({ name, url, transport = 'streamableHttp', bearerToken, headers = {}, settings = {}, saveSettings }) {
    const normalizedUrl = safeHttpUrl(url);
    if (!normalizedUrl) throw new Error('A URL deve usar HTTP ou HTTPS.');
    if (!['streamableHttp', 'sse'].includes(transport)) throw new Error('Transporte MCP remoto inválido.');
    const title = String(name || new URL(normalizedUrl).hostname).trim().slice(0, 100);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'server';
    return this.installMcpServer({
      server: {
        id: `custom-mcp-${slug}`,
        name: title,
        source: 'custom',
        transport,
        url: normalizedUrl,
        headers,
        auth: bearerToken ? { type: 'bearer', name: 'Authorization' } : { type: 'none' }
      },
      bearerToken,
      settings,
      saveSettings
    });
  }
}

const mcpHubEngine = new McpHubEngine();

module.exports = {
  id: 'mcp-hub',
  name: 'Community MCP Hub & Recipes',
  description: 'Catálogo 1-click para instalar servidores MCP populares da comunidade e receitas prontas de automação',
  category: 'tools',
  lazy: true,

  init: async (ctx) => {
    ctx.registerIpcHandler('mcp-hub:list-servers', async (_event, options = {}) => {
      return await mcpHubEngine.listServers(options);
    });

    ctx.registerIpcHandler('mcp-hub:list-recipes', async () => {
      return mcpHubEngine.listCuratedRecipes();
    });

    ctx.registerIpcHandler('mcp-hub:install', async (_event, params = {}) => {
      const currentSettings = ctx.loadSettings ? ctx.loadSettings() : {};
      return await mcpHubEngine.installMcpServer({
        ...params,
        settings: currentSettings,
        saveSettings: ctx.saveSettings
      });
    });

    ctx.registerIpcHandler('mcp-hub:install-custom', async (_event, params = {}) => {
      const currentSettings = ctx.loadSettings ? ctx.loadSettings() : {};
      return await mcpHubEngine.installCustomServer({
        ...params,
        settings: currentSettings,
        saveSettings: ctx.saveSettings
      });
    });
  },

  activate: async () => {
    console.log('[McpHubPlugin] Activated.');
  },

  deactivate: async () => {
    console.log('[McpHubPlugin] Deactivated.');
  }
};

module.exports.McpHubEngine = McpHubEngine;
module.exports.CURATED_MCP_SERVERS = CURATED_MCP_SERVERS;

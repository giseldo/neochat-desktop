/**
 * Community MCP Hub & Workflow Store Plugin for NeoChat Desktop
 * 
 * Provides:
 * - 1-Click installable popular MCP servers from community registry
 * - Curated automation workflow recipes
 */

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
  listCuratedServers() {
    return CURATED_MCP_SERVERS;
  }

  listCuratedRecipes() {
    return CURATED_RECIPES;
  }

  async installMcpServer({ serverId, customArgs, customEnv, settings = {}, saveSettings }) {
    const serverDef = CURATED_MCP_SERVERS.find(s => s.id === serverId);
    if (!serverDef) {
      throw new Error(`MCP Server ${serverId} não encontrado no catálogo`);
    }

    const currentServers = settings.mcpServers || {};
    currentServers[serverId] = {
      name: serverDef.name,
      command: serverDef.command,
      args: customArgs || serverDef.args,
      env: customEnv || serverDef.env || {},
      enabled: true
    };

    if (typeof saveSettings === 'function') {
      saveSettings({ ...settings, mcpServers: currentServers });
    }

    return {
      success: true,
      server: currentServers[serverId],
      message: `Servidor MCP ${serverDef.name} instalado e configurado com sucesso!`
    };
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
    ctx.registerIpcHandler('mcp-hub:list-servers', async () => {
      return mcpHubEngine.listCuratedServers();
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
  },

  activate: async () => {
    console.log('[McpHubPlugin] Activated.');
  },

  deactivate: async () => {
    console.log('[McpHubPlugin] Deactivated.');
  }
};

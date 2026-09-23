const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

/**
 * Curated Built-in Catalog of AI Skills
 */
const NATIVE_CURATED_CATALOG = [
  {
    id: 'deep-research',
    name: 'Deep Research & Web Synthesis',
    displayName: 'Deep Research & Síntese Web',
    description: 'Conduz pesquisas abrangentes, cruzamento de fontes, síntese detalhada com citações e análise crítica de fatos.',
    category: 'research',
    tags: ['pesquisa', 'síntese', 'web', 'citações', 'fatos'],
    icon: 'Search',
    version: '1.2.0',
    author: 'NeoChat Core',
    slashCommand: 'research',
    parameters: [
      { name: 'query', type: 'string', description: 'Tópico ou pergunta de pesquisa detalhada', required: true },
      { name: 'depth', type: 'string', description: 'Profundidade da pesquisa (básica | profunda | exaustiva)', default: 'profunda' }
    ],
    instructions: `# Modo Deep Research & Síntese Crítica

Ao agir sob esta skill:
1. Estruture sua resposta com seções claras: Resumo Executivo, Descobertas Principais, Análise Detalhada, Controvérsias/Perspectivas Opostas e Conclusão.
2. Seja rigoroso com evidências, citando fontes conceituais e premissas.
3. Se houver incertezas ou dados divergentes, destaque expressamente as nuances em vez de simplificar.
4. Mantenha um tom analítico, objetivo, factual e aprofundado.`
  },
  {
    id: 'code-reviewer',
    name: 'Code Review & Security Auditor',
    displayName: 'Revisor de Código & Auditor de Segurança',
    description: 'Analisa código em busca de bugs, vulnerabilidades OWASP, gargalos de performance, aderência a Clean Code e sugere refatorações seguras.',
    category: 'coding',
    tags: ['review', 'segurança', 'clean-code', 'owasp', 'refatoração'],
    icon: 'Code2',
    version: '1.3.0',
    author: 'NeoChat Core',
    slashCommand: 'code-review',
    parameters: [
      { name: 'code', type: 'string', description: 'Trecho de código ou arquivo para revisão', required: true }
    ],
    instructions: `# Auditoria de Código e Segurança

Ao analisar código:
1. **Segurança (OWASP Top 10)**: Verifique injeções SQL, XSS, validações de entrada, vazamento de segredos, autorização e sanitização.
2. **Qualidade & Manutenibilidade**: Avalie legibilidade, tipagem estrita, princípios SOLID, DRY e tratamento correto de erros.
3. **Performance**: Identifique vazamentos de memória, consultas N+1, complexidade assintótica excessiva (O(n²)) e bloqueios de I/O.
4. Forneça sempre blocos de código com a correção sugerida no formato "Antes vs Depois" e explique o impacto de cada ajuste.`
  },
  {
    id: 'git-workflow',
    name: 'Git & PR Workflow Assistant',
    displayName: 'Assistente de Git & Conventional Commits',
    description: 'Gera mensagens de commit semânticas (Conventional Commits), orienta branches, resolução de conflitos e descreve Pull Requests de alto nível.',
    category: 'devops',
    tags: ['git', 'commits', 'pr', 'branch', 'github'],
    icon: 'GitBranch',
    version: '1.1.0',
    author: 'NeoChat Core',
    slashCommand: 'git-helper',
    parameters: [
      { name: 'diff', type: 'string', description: 'Git diff ou descrição das alterações' }
    ],
    instructions: `# Especialista em Git & Conventional Commits

Diretrizes para Git:
1. Gere mensagens no padrão Conventional Commits: \`<tipo>(<escopo opcional>): <descrição no imperativo>\`.
   - Tipos: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
2. Inclua uma lista concisa com o impacto das mudanças se for um commit complexo ou PR.
3. Sugira comandos Git exatos quando o usuário tiver dúvidas de merge, rebase interativo, stash ou resolução de conflitos.`
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst & SQL Wizard',
    displayName: 'Analista de Dados & Especialista SQL',
    description: 'Formula consultas SQL otimizadas, scripts de Pandas/Python para análise exploratória, estatística descritiva e insights acionáveis.',
    category: 'analysis',
    tags: ['sql', 'dados', 'pandas', 'estatística', 'bi', 'postgres'],
    icon: 'Database',
    version: '1.1.0',
    author: 'NeoChat Core',
    slashCommand: 'data-analyst',
    parameters: [
      { name: 'schema', type: 'string', description: 'Schema do banco ou estrutura de dados' }
    ],
    instructions: `# Especialista em Ciência de Dados e Banco de Dados

1. **SQL Otimizado**: Escreva queries eficientes utilizando CTEs (\`WITH\`), Window Functions (\`ROW_NUMBER\`, \`RANK\`, \`SUM() OVER\`), e planos de execução que evitem Full Table Scans.
2. **Análise Exploratória**: Sugira agregações, distribuições, detecção de outliers e correlações estatísticas relevantes.
3. **Visualização**: Sugira gráficos adequados (histograma, boxplot, dispersão, séries temporais) para os dados em questão.`
  },
  {
    id: 'latex-academic',
    name: 'LaTeX & Academic Writing',
    displayName: 'LaTeX & Redação Acadêmica',
    description: 'Formata equações matemáticas complexas, artigos científicos em LaTeX, tabelas elegantes e citações BibTeX com rigor formal.',
    category: 'writing',
    tags: ['latex', 'matemática', 'acadêmico', 'fórmulas', 'artigo'],
    icon: 'BookOpen',
    version: '1.0.0',
    author: 'NeoChat Core',
    slashCommand: 'latex',
    parameters: [
      { name: 'content', type: 'string', description: 'Texto ou fórmula para formatar em LaTeX', required: true }
    ],
    instructions: `# Especialista em LaTeX e Escrita Científica

1. Use sintaxe LaTeX rigorosa tanto para fórmulas inline \`$f(x)$\` quanto display \`\\[ ... \\]\` ou blocos \`\`\`latex.
2. Para papers e relatórios acadêmicos, forneça templates prontos com pacotes modernos (\`amsmath\`, \`amssymb\`, \`booktabs\`, \`microtype\`, \`hyperref\`).
3. Mantenha tom formal, preciso, com notação matemática canônica.`
  },
  {
    id: 'devops-docker',
    name: 'DevOps, Docker & CI/CD Engineer',
    displayName: 'Engenheiro DevOps, Docker & CI/CD',
    description: 'Cria Dockerfiles multi-stage otimizados, arquivos docker-compose, pipelines de CI/CD (GitHub Actions/GitLab) e configurações seguras.',
    category: 'devops',
    tags: ['docker', 'devops', 'cicd', 'github-actions', 'kubernetes', 'linux'],
    icon: 'Layers',
    version: '1.2.0',
    author: 'NeoChat Core',
    slashCommand: 'devops',
    parameters: [
      { name: 'stack', type: 'string', description: 'Stack tecnológica ou serviço a containerizar' }
    ],
    instructions: `# Especialista em DevOps e Containerização

1. **Dockerfiles**: Sempre use builds multi-stage, execute processos com usuários não-root (\`USER appuser\`), minimize camadas e fixe versões base seguras (ex: Alpine ou distroless).
2. **CI/CD**: Desenvolva workflows com etapas bem definidas (lint, test, build, security scan, deploy) com cache de dependências configurado.
3. **Infraestrutura**: Priorize práticas de Infrastructure as Code, variáveis de ambiente seguras e healthchecks para containers.`
  },
  {
    id: 'api-architect',
    name: 'REST & OpenAPI Architect',
    displayName: 'Arquiteto de APIs & OpenAPI',
    description: 'Desenvolve especificações OpenAPI 3.0/Swagger, contratos RESTful semânticos, autenticação JWT/OAuth2 e esquemas JSON Schema.',
    category: 'coding',
    tags: ['api', 'rest', 'openapi', 'swagger', 'json-schema', 'endpoints'],
    icon: 'Globe',
    version: '1.1.0',
    author: 'NeoChat Core',
    slashCommand: 'api-designer',
    parameters: [
      { name: 'entity', type: 'string', description: 'Recurso ou especificação da API' }
    ],
    instructions: `# Arquitetura de APIs RESTful e OpenAPI

1. **Semântica HTTP**: Use verbos corretos (GET, POST, PUT, PATCH, DELETE) e status codes semânticos (200, 201, 204, 400, 401, 403, 404, 422, 500).
2. **OpenAPI 3.0**: Entregue especificações completas em YAML/JSON com schemas de request body, responses e exemplos realistas.
3. **Resiliência e Segurança**: Destaque paginação (cursor-based ou offset), idempotência, rate limiting e tratamento padronizado de erros (RFC 7807 Problem Details).`
  },
  {
    id: 'ui-designer',
    name: 'UI/UX & Modern Tailwind Designer',
    displayName: 'Designer UI/UX & TailwindCSS',
    description: 'Cria interfaces ricas, responsivas e modernas com TailwindCSS, componentes acessíveis (WCAG) e micro-interações fluidas.',
    category: 'design',
    tags: ['ui', 'ux', 'tailwind', 'css', 'react', 'design-system'],
    icon: 'Sparkles',
    version: '1.2.0',
    author: 'NeoChat Core',
    slashCommand: 'ui-designer',
    parameters: [
      { name: 'component', type: 'string', description: 'Descrição do componente ou tela a ser desenhado' }
    ],
    instructions: `# Design UI/UX e TailwindCSS Moderno

1. **Estética Moderna**: Use paletas equilibradas (Dark/Light mode), tipografia refinada, sombras sutis (\`shadow-xs\`, \`shadow-md\`), bordas arredondadas e estados hover/active/focus claros.
2. **Acessibilidade (a11y)**: Garanta contraste de cores adequado, suporte a navegação por teclado e atributos ARIA onde necessário.
3. **Responsividade**: Forneça classes Tailwind móvel-primeiro (\`sm:\`, \`md:\`, \`lg:\`, \`xl:\`).`
  },
  {
    id: 'tdd-coach',
    name: 'Test-Driven Development (TDD) Coach',
    displayName: 'Coach de Testes & TDD',
    description: 'Orienta o ciclo Red-Green-Refactor, cria suítes de testes unitários, de integração e end-to-end com Jest, Vitest, PyTest ou Playwright.',
    category: 'coding',
    tags: ['tdd', 'testes', 'jest', 'vitest', 'pytest', 'qualidade'],
    icon: 'CheckCircle2',
    version: '1.0.0',
    author: 'NeoChat Core',
    slashCommand: 'tdd',
    parameters: [
      { name: 'feature', type: 'string', description: 'Funcionalidade ou classe a ser testada' }
    ],
    instructions: `# Especialista em TDD e Testes de Software

1. Estruture testes no padrão AAA (Arrange, Act, Assert) ou GWT (Given, When, Then).
2. Priorize testes com cobertura de edge cases: entradas nulas, limites de valor, timeouts e respostas com erro de rede.
3. Utilize mocks e spies apenas nos limites da unidade (I/O, chamadas de rede), mantendo a lógica de negócio testada de forma determinística.`
  },
  {
    id: 'sys-architect',
    name: 'System Architecture & RFC Designer',
    displayName: 'Arquiteto de Sistemas & RFCs',
    description: 'Modela arquiteturas distribuídas escaláveis, elabora documentos RFC (Request for Comments), diagramas C4 e análise de trade-offs.',
    category: 'coding',
    tags: ['arquitetura', 'rfc', 'c4', 'sistemas', 'escalabilidade', 'microservices'],
    icon: 'Layers',
    version: '1.1.0',
    author: 'NeoChat Core',
    slashCommand: 'sys-arch',
    parameters: [
      { name: 'problem', type: 'string', description: 'Problema arquitetural ou sistema a ser planejado' }
    ],
    instructions: `# Arquitetura de Software e Elaboração de RFCs

1. Estruture a proposta com: Contexto & Motivação, Metas e Não-Metas, Arquitetura Proposta, Diagrama de Fluxo/Componentes, Trade-offs & Alternativas Consideradas, Impacto em Segurança & Observabilidade.
2. Use notação Mermaid para diagramas de sequência ou fluxo arquitetural.
3. Destaque garantias de consistência (CAP/PACELC), tolerância a falhas e estratégias de fallback.`
  },
  {
    id: 'docs-writer',
    name: 'Technical Documentation Specialist',
    displayName: 'Especialista em Documentação Técnica',
    description: 'Escreve READMEs impecáveis, documentação de arquitetura, guias de onboarding, manuais de API e changelogs detalhados.',
    category: 'writing',
    tags: ['docs', 'readme', 'markdown', 'changelog', 'onboarding'],
    icon: 'FileText',
    version: '1.0.0',
    author: 'NeoChat Core',
    slashCommand: 'docs',
    parameters: [
      { name: 'project', type: 'string', description: 'Nome do projeto ou funcionalidade para documentar' }
    ],
    instructions: `# Redação de Documentação Técnica Profissional

1. Crie documentos concisos, fáceis de navegar com sumário (ToC), badges, pré-requisitos, instruções de instalação passo-a-passo e exemplos de uso funcionais.
2. Utilize callouts e alertas informativos (\`> [!NOTE]\`, \`> [!IMPORTANT]\`, \`> [!TIP]\`) para pontos cruciais.
3. Mantenha clareza cristalina para desenvolvedores iniciantes e sêniores.`
  },
  {
    id: 'perf-optimizer',
    name: 'Performance & Algorithm Optimizer',
    displayName: 'Otimizador de Performance & Algoritmos',
    description: 'Diagnostica complexidade de tempo/espaço (Big-O), otimiza algoritmos, reduz alocações de memória e paraleliza tarefas computacionais.',
    category: 'coding',
    tags: ['performance', 'algoritmos', 'big-o', 'otimização', 'memória', 'concorrência'],
    icon: 'Zap',
    version: '1.0.0',
    author: 'NeoChat Core',
    slashCommand: 'perf-opt',
    parameters: [
      { name: 'code', type: 'string', description: 'Código ou algoritmo a ser otimizado', required: true }
    ],
    instructions: `# Engenharia de Performance e Otimização Algorítmica

1. Analise o código fornecido calculando a complexidade assintótica de Tempo e Espaço (Big-O).
2. Proponha estruturas de dados mais eficientes (HashMaps, Heaps, Sets, Bitwise, Tries) se aplicável.
3. Forneça o código otimizado com benchmarks estimados e explicações detalhadas das melhorias de CPU/Memória.`
  },
  {
    id: 'humanizer',
    name: 'Humanizer: Remove AI Writing Patterns',
    displayName: 'Humanizer (Remover Padrões de IA)',
    description: 'Reescreve textos com estilo artificial ou gerado por IA para soarem naturais e humanos, preservando o tom do autor e todos os fatos sem inventar dados.',
    category: 'writing',
    tags: ['humanizer', 'redação', 'texto', 'edição', 'ai-tells', 'reescrita'],
    icon: 'FileText',
    version: '3.0.0',
    author: 'blader',
    slashCommand: 'humanizer',
    parameters: [
      { name: 'text', type: 'string', description: 'Texto a ser humanizado ou caminho do arquivo', required: true }
    ],
    instructions: `# Humanizer: remove AI writing patterns

Rewrite AI-sounding text so it reads like the writer, not a chatbot. Keep what it says. Do not make anything up.

## Principles & Rules
1. Every sentence kept must add something the reader did not already have.
2. Mark and remove structural habits and AI tells:
   - Not X but Y contrasts (e.g., "It's not just X, it's Y")
   - Staged openers and formulaic one-line closers repeating the point
   - Forced triads, rhythm-by-rule, excessive dashes everywhere
   - Inflated claims, stock AI buzzwords, and sales/promotional language
   - Formatting by rule: bold labels and title case applied to every list item
3. Never invent facts, numbers, dates, quotes, or citations. Keep all substance, nuance, and meaning intact.
4. If a writing sample is provided, match its sentence length, word choice, rhythm, and voice.`
  }
];

const BUNDLED_SKILLS_DIR = path.join(__dirname, 'skills', 'catalog');

/**
 * Load the declarative text-skill catalog bundled with the application.
 *
 * These definitions originate from neo-chat's public skills dataset. Keeping
 * them as individual JSON files makes the catalog easy to update without
 * growing this manager into a large generated source file.
 */
function loadBundledCatalog(catalogDir = BUNDLED_SKILLS_DIR) {
  const metadataPath = path.join(catalogDir, 'skills.metadata.json');
  if (!fs.existsSync(metadataPath)) return [];

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    if (!Array.isArray(metadata.skills)) return [];

    return metadata.skills.map((entry) => {
      const definitionPath = path.join(catalogDir, entry.file || `${entry.id}.json`);
      const definition = fs.existsSync(definitionPath)
        ? JSON.parse(fs.readFileSync(definitionPath, 'utf8'))
        : entry;

      return {
        ...entry,
        ...definition,
        name: definition.title || entry.title || definition.name || entry.name || entry.id,
        displayName: definition.title || entry.title || definition.name || entry.name || entry.id,
        instructions: definition.content || definition.instructions || '',
        slashCommand: definition.slashCommand || definition.command || entry.id,
        icon: definition.icon || 'Sparkles',
        version: definition.version || metadata.schemaVersion || '1.0.0',
        author: definition.author || 'NeoChat Skills Catalog',
        parameters: Array.isArray(definition.parameters) ? definition.parameters : []
      };
    }).filter((skill) => skill.id && skill.name && skill.instructions);
  } catch (error) {
    console.error('[SkillManager] Failed to load bundled skills catalog:', error.message);
    return [];
  }
}

// Bundled definitions win on duplicate IDs so every imported neo-chat skill
// retains its complete, current instructions. NeoChat Desktop native entries
// remain available when they do not exist in the imported dataset.
const CURATED_CATALOG = Array.from(new Map([
  ...NATIVE_CURATED_CATALOG,
  ...loadBundledCatalog()
].map((skill) => [skill.id, skill])).values());

class SkillManager {
  constructor() {
    this.app = null;
    this.skillsDir = null;
    this.installedSkills = new Map();
    this.settingsManager = null;
  }

  /**
   * Initialize SkillManager with application paths and settings.
   * @param {object} app Electron App instance
   * @param {object} options
   */
  initialize(app, options = {}) {
    this.app = app;
    this.settingsManager = options;
    const userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), '.neochat_user');
    this.skillsDir = path.join(userDataPath, 'skills');

    try {
      if (!fs.existsSync(this.skillsDir)) {
        fs.mkdirSync(this.skillsDir, { recursive: true });
      }
    } catch (err) {
      console.error('[SkillManager] Failed to create skills directory:', err.message);
    }

    // Load installed skills from disk
    this._loadInstalledSkills();

    // Auto-install default skills if fresh installation
    this._bootstrapDefaultSkills();

    console.log(`[SkillManager] Initialized with ${this.installedSkills.size} installed skills.`);
  }

  /**
   * Load all skills stored in userData/skills directory.
   */
  _loadInstalledSkills() {
    this.installedSkills.clear();
    if (!this.skillsDir || !fs.existsSync(this.skillsDir)) return;

    try {
      const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(this.skillsDir, entry.name);
          const skill = this._loadSkillFromDirectory(dirPath);
          if (skill && skill.id) {
            this.installedSkills.set(skill.id, skill);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.md'))) {
          const filePath = path.join(this.skillsDir, entry.name);
          const skill = this._loadSkillFromFile(filePath);
          if (skill && skill.id) {
            this.installedSkills.set(skill.id, skill);
          }
        }
      }
    } catch (err) {
      console.error('[SkillManager] Error reading skills directory:', err.message);
    }
  }

  /**
   * Parse a single skill directory containing SKILL.md or skill.json
   */
  _loadSkillFromDirectory(dirPath) {
    const skillMdPath = path.join(dirPath, 'SKILL.md');
    const skillJsonPath = path.join(dirPath, 'skill.json');

    if (fs.existsSync(skillMdPath)) {
      try {
        const content = fs.readFileSync(skillMdPath, 'utf8');
        return this.parseSkillMarkdown(content, { dirPath, filePath: skillMdPath });
      } catch (err) {
        console.warn(`[SkillManager] Failed to parse ${skillMdPath}:`, err.message);
      }
    }

    if (fs.existsSync(skillJsonPath)) {
      try {
        const raw = fs.readFileSync(skillJsonPath, 'utf8');
        const json = JSON.parse(raw);
        return { ...json, dirPath, filePath: skillJsonPath };
      } catch (err) {
        console.warn(`[SkillManager] Failed to parse ${skillJsonPath}:`, err.message);
      }
    }

    return null;
  }

  /**
   * Parse a standalone .md or .json skill file.
   */
  _loadSkillFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (filePath.endsWith('.json')) {
        const json = JSON.parse(content);
        return { ...json, filePath };
      } else if (filePath.endsWith('.md')) {
        return this.parseSkillMarkdown(content, { filePath });
      }
    } catch (err) {
      console.warn(`[SkillManager] Failed to read skill file ${filePath}:`, err.message);
    }
    return null;
  }

  /**
   * No-op by default: on first installation, no skills are installed automatically.
   * Users can browse and install curated skills on demand via the Skills Catalog.
   */
  _bootstrapDefaultSkills() {
    // Intentionally left blank: do not install any skills by default on clean installation.
  }

  /**
   * Parse Markdown with YAML frontmatter or structured markdown into a Skill object.
   * @param {string} markdownContent 
   * @param {object} meta 
   */
  parseSkillMarkdown(markdownContent, meta = {}) {
    if (!markdownContent || typeof markdownContent !== 'string') return null;

    let frontmatter = {};
    let body = markdownContent.trim();

    // Check for YAML frontmatter: --- ... ---
    if (markdownContent.startsWith('---')) {
      const parts = markdownContent.split('---');
      if (parts.length >= 3) {
        const yamlBlock = parts[1];
        body = parts.slice(2).join('---').trim();
        frontmatter = this._parseSimpleYaml(yamlBlock);
      }
    }

    const id = frontmatter.id || frontmatter.name ? this._slugify(frontmatter.id || frontmatter.name) : path.basename(meta.filePath || 'custom-skill', path.extname(meta.filePath || ''));
    
    return {
      id: id || `skill-${Date.now()}`,
      name: frontmatter.name || frontmatter.displayName || id,
      displayName: frontmatter.displayName || frontmatter.name || id,
      description: frontmatter.description || '',
      category: frontmatter.category || 'general',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : (frontmatter.tags ? String(frontmatter.tags).split(',').map(t => t.trim()) : []),
      icon: frontmatter.icon || 'Sparkles',
      version: frontmatter.version || '1.0.0',
      author: frontmatter.author || 'User',
      slashCommand: frontmatter.slashCommand || frontmatter.command || this._slugify(id),
      enabled: frontmatter.enabled !== false,
      instructions: body || frontmatter.instructions || '',
      parameters: frontmatter.parameters || [],
      filePath: meta.filePath,
      dirPath: meta.dirPath
    };
  }

  /**
   * Parse a simple YAML frontmatter block without external heavy dependencies.
   */
  _parseSimpleYaml(yamlText) {
    const result = {};
    const lines = yamlText.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();

      // Handle quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Simple list [a, b, c]
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
      }

      result[key] = value;
    }

    return result;
  }

  /**
   * Convert skill object to Markdown with YAML frontmatter.
   */
  formatSkillMarkdown(skill) {
    const tagsStr = Array.isArray(skill.tags) ? `[${skill.tags.map(t => `"${t}"`).join(', ')}]` : '[]';
    return `---
id: "${skill.id}"
name: "${skill.name || skill.id}"
displayName: "${skill.displayName || skill.name || skill.id}"
description: "${(skill.description || '').replace(/"/g, '\\"')}"
category: "${skill.category || 'general'}"
tags: ${tagsStr}
icon: "${skill.icon || 'Sparkles'}"
version: "${skill.version || '1.0.0'}"
author: "${skill.author || 'User'}"
slashCommand: "${skill.slashCommand || this._slugify(skill.id)}"
enabled: ${skill.enabled !== false}
---

${skill.instructions || ''}
`;
  }

  _slugify(text) {
    if (!text) return 'skill';
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get list of all installed skills + catalog metadata.
   * @param {string} [workspaceRoot] Optional workspace root for local .neochat/skills
   */
  listSkills(workspaceRoot = null) {
    const list = Array.from(this.installedSkills.values());

    // Also scan workspace skills if workspaceRoot is provided
    if (workspaceRoot && typeof workspaceRoot === 'string' && fs.existsSync(workspaceRoot)) {
      const wsSkillsDir = path.join(workspaceRoot, '.neochat', 'skills');
      if (fs.existsSync(wsSkillsDir)) {
        try {
          const files = fs.readdirSync(wsSkillsDir);
          for (const file of files) {
            const fp = path.join(wsSkillsDir, file);
            if (file.endsWith('.md') || file.endsWith('.json')) {
              const wsSkill = this._loadSkillFromFile(fp);
              if (wsSkill && wsSkill.id && !this.installedSkills.has(wsSkill.id)) {
                list.push({ ...wsSkill, isWorkspace: true });
              }
            }
          }
        } catch (err) {
          console.warn('[SkillManager] Failed to read workspace skills:', err.message);
        }
      }
    }

    return list;
  }

  /**
   * Get the curated catalog of skills available for 1-click install.
   */
  getCatalog() {
    return CURATED_CATALOG.map(item => {
      const installed = this.installedSkills.has(item.id);
      const installedSkill = this.installedSkills.get(item.id);
      return {
        ...item,
        isInstalled: installed,
        enabled: installed ? (installedSkill.enabled !== false) : false
      };
    });
  }

  /**
   * Install or update a skill. Saves to userData/skills/<id>/SKILL.md
   * @param {object} skillData 
   */
  installSkill(skillData) {
    if (!skillData || !skillData.name) {
      throw new Error('Dados da skill inválidos: Nome é obrigatório.');
    }

    const id = this._slugify(skillData.id || skillData.name);
    const skill = {
      ...skillData,
      id,
      name: skillData.name,
      displayName: skillData.displayName || skillData.name,
      description: skillData.description || '',
      category: skillData.category || 'general',
      tags: Array.isArray(skillData.tags) ? skillData.tags : (skillData.tags ? String(skillData.tags).split(',').map(t => t.trim()) : []),
      icon: skillData.icon || 'Sparkles',
      version: skillData.version || '1.0.0',
      author: skillData.author || 'User',
      slashCommand: skillData.slashCommand || this._slugify(skillData.slashCommand || id),
      enabled: skillData.enabled !== false,
      instructions: skillData.instructions || '',
      parameters: skillData.parameters || []
    };

    if (!this.skillsDir) {
      throw new Error('Diretório de skills não inicializado.');
    }

    const skillDir = path.join(this.skillsDir, id);
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    const skillFilePath = path.join(skillDir, 'SKILL.md');
    const mdContent = this.formatSkillMarkdown(skill);
    fs.writeFileSync(skillFilePath, mdContent, 'utf8');

    skill.filePath = skillFilePath;
    skill.dirPath = skillDir;

    this.installedSkills.set(id, skill);
    console.log(`[SkillManager] Installed skill: ${id} (${skill.name})`);
    return { success: true, skill };
  }

  /**
   * Install skill from the curated catalog.
   * @param {string} catalogId 
   */
  installFromCatalog(catalogId) {
    const item = CURATED_CATALOG.find(s => s.id === catalogId);
    if (!item) {
      throw new Error(`Skill com ID "${catalogId}" não encontrada no catálogo.`);
    }
    return this.installSkill({ ...item, enabled: true });
  }

  /**
   * Uninstall / delete an installed skill.
   * @param {string} skillId 
   */
  deleteSkill(skillId) {
    if (!this.installedSkills.has(skillId)) {
      return { success: false, error: 'Skill não encontrada.' };
    }

    const skill = this.installedSkills.get(skillId);
    if (skill.dirPath && fs.existsSync(skill.dirPath)) {
      try {
        fs.rmSync(skill.dirPath, { recursive: true, force: true });
      } catch (err) {
        console.warn(`[SkillManager] Failed to remove directory ${skill.dirPath}:`, err.message);
      }
    } else if (skill.filePath && fs.existsSync(skill.filePath)) {
      try {
        fs.unlinkSync(skill.filePath);
      } catch (err) {
        console.warn(`[SkillManager] Failed to remove file ${skill.filePath}:`, err.message);
      }
    }

    this.installedSkills.delete(skillId);
    console.log(`[SkillManager] Deleted skill: ${skillId}`);
    return { success: true, skillId };
  }

  /**
   * Toggle skill enabled state.
   * @param {string} skillId 
   * @param {boolean} enabled 
   */
  toggleSkill(skillId, enabled) {
    if (!this.installedSkills.has(skillId)) {
      throw new Error(`Skill "${skillId}" não encontrada.`);
    }

    const skill = this.installedSkills.get(skillId);
    skill.enabled = Boolean(enabled);

    // Save updated markdown
    if (skill.filePath) {
      try {
        const mdContent = this.formatSkillMarkdown(skill);
        fs.writeFileSync(skill.filePath, mdContent, 'utf8');
      } catch (err) {
        console.warn(`[SkillManager] Failed to persist toggle for ${skillId}:`, err.message);
      }
    }

    return { success: true, skillId, enabled: skill.enabled };
  }

  /**
   * Import a skill from raw content string or file path.
   * @param {string} content Raw text or JSON
   * @param {string} [filename] Optional source file name
   */
  importSkillFromContent(content, filename = 'imported-skill.md') {
    let skill;
    if (filename.endsWith('.json') || content.trim().startsWith('{')) {
      const parsed = JSON.parse(content);
      skill = parsed;
    } else {
      skill = this.parseSkillMarkdown(content, { filePath: filename });
    }

    if (!skill || !skill.name) {
      throw new Error('Conteúdo do arquivo não representa uma skill válida.');
    }

    return this.installSkill(skill);
  }

  /**
   * Import a skill from a remote URL (e.g. GitHub raw URL).
   * @param {string} url 
   */
  async importSkillFromUrl(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      throw new Error('URL inválida fornecida.');
    }

    // Convert github.com blob URLs to raw.githubusercontent.com if needed
    let fetchUrl = url;
    if (url.includes('github.com') && url.includes('/blob/')) {
      fetchUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }

    const response = await fetch(fetchUrl, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`Falha ao baixar skill: HTTP ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const filename = path.basename(new URL(url).pathname) || 'remote-skill.md';
    return this.importSkillFromContent(text, filename);
  }

  /**
   * Export an installed skill as Markdown or JSON string.
   * @param {string} skillId 
   * @param {'md'|'json'} format 
   */
  exportSkill(skillId, format = 'md') {
    const skill = this.installedSkills.get(skillId);
    if (!skill) throw new Error(`Skill ${skillId} não encontrada.`);

    if (format === 'json') {
      return {
        filename: `${skill.id}.skill.json`,
        content: JSON.stringify(skill, null, 2),
        mimeType: 'application/json'
      };
    }

    return {
      filename: `${skill.id}.SKILL.md`,
      content: this.formatSkillMarkdown(skill),
      mimeType: 'text/markdown'
    };
  }

  /**
   * Get all active (enabled) skills.
   * @param {string} [workspaceRoot]
   */
  getActiveSkills(workspaceRoot = null) {
    return this.listSkills(workspaceRoot).filter(s => s.enabled !== false);
  }

  /**
   * Build combined system prompt context containing all active skills instructions.
   * @param {Array<object>} [customActiveSkills] Optional override of active skills
   * @param {string} [invokedSkillId] Optional specific skill triggered via /command
   */
  buildSkillsPrompt(customActiveSkills = null, invokedSkillId = null) {
    const skills = customActiveSkills || this.getActiveSkills();
    if (!skills || skills.length === 0) return '';

    const lines = [
      '# ATIVAÇÃO DE SKILLS & CAPACIDADES ESPECIALIZADAS',
      '',
      'Você possui as seguintes habilidades especializadas (Skills) ativadas nesta sessão. Siga rigorosamente as diretrizes e instruções de cada skill correspondente ao contexto da tarefa:',
      ''
    ];

    for (const skill of skills) {
      const isInvoked = invokedSkillId && (skill.id === invokedSkillId || skill.slashCommand === invokedSkillId);
      lines.push(`## Skill: ${skill.displayName || skill.name} (${skill.id})${isInvoked ? ' [INVOCADA DIRETAMENTE NESTA MENSAGEM]' : ''}`);
      if (skill.description) {
        lines.push(`*Propósito*: ${skill.description}`);
      }
      if (skill.slashCommand) {
        lines.push(`*Comando de Ativação*: /${skill.slashCommand}`);
      }
      if (skill.instructions) {
        lines.push('', '### Instruções de Execução:', skill.instructions.trim(), '');
      }
      lines.push('---', '');
    }

    return lines.join('\n');
  }
}

const skillManager = new SkillManager();

module.exports = {
  SkillManager,
  skillManager,
  CURATED_CATALOG
};

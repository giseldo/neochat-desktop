export const BUILT_IN_SLASH_COMMANDS = [
  {
    id: 'summarize',
    command: 'summarize',
    aliases: ['resumir', 'resumo'],
    icon: 'FileText',
    titleKey: 'slashCommands.defaultSummarize',
    descKey: 'slashCommands.defaultSummarizeDesc',
    templatePt: 'Faça um resumo claro, objetivo e estruturado em tópicos do seguinte conteúdo:\n\n{{input}}',
    templateEn: 'Provide a clear, objective, and structured bulleted summary of the following content:\n\n{{input}}',
    isBuiltIn: true
  },
  {
    id: 'refactor',
    command: 'refactor',
    aliases: ['refatorar', 'clean'],
    icon: 'Code2',
    titleKey: 'slashCommands.defaultRefactor',
    descKey: 'slashCommands.defaultRefactorDesc',
    templatePt: 'Refatore o seguinte código para torná-lo mais limpo, eficiente, idiomático e legível, mantendo o mesmo comportamento:\n\n```\n{{input}}\n```',
    templateEn: 'Refactor the following code to make it cleaner, more efficient, idiomatic, and readable while maintaining its behavior:\n\n```\n{{input}}\n```',
    isBuiltIn: true
  },
  {
    id: 'explain',
    command: 'explain',
    aliases: ['explicar', 'como-funciona'],
    icon: 'BookOpen',
    titleKey: 'slashCommands.defaultExplain',
    descKey: 'slashCommands.defaultExplainDesc',
    templatePt: 'Explique detalhadamente o seguinte conceito ou código de forma didática, com passos claros e exemplos práticos:\n\n{{input}}',
    templateEn: 'Explain the following concept or code in detail in a didactic manner with clear steps and practical examples:\n\n{{input}}',
    isBuiltIn: true
  },
  {
    id: 'fix',
    command: 'fix',
    aliases: ['corrigir', 'bug', 'erro'],
    icon: 'Wrench',
    titleKey: 'slashCommands.defaultFix',
    descKey: 'slashCommands.defaultFixDesc',
    templatePt: 'Analise o seguinte código/erro, identifique a causa raiz do problema e forneça a versão corrigida com explicação detalhada:\n\n```\n{{input}}\n```',
    templateEn: 'Analyze the following code/error, identify the root cause of the problem, and provide the corrected version with a detailed explanation:\n\n```\n{{input}}\n```',
    isBuiltIn: true
  },
  {
    id: 'review',
    command: 'review',
    aliases: ['revisar', 'crítica', 'code-review'],
    icon: 'CheckCircle2',
    titleKey: 'slashCommands.defaultReview',
    descKey: 'slashCommands.defaultReviewDesc',
    templatePt: 'Faça um Code Review detalhado do seguinte código avaliando: 1. Qualidade e Boas Práticas, 2. Eficiência/Complexidade, 3. Segurança e Tratamento de Erros, 4. Sugestões de Melhoria:\n\n```\n{{input}}\n```',
    templateEn: 'Perform a detailed Code Review of the following code assessing: 1. Quality & Best Practices, 2. Efficiency/Complexity, 3. Security & Error Handling, 4. Actionable Suggestions:\n\n```\n{{input}}\n```',
    isBuiltIn: true
  },
  {
    id: 'translate',
    command: 'translate',
    aliases: ['traduzir', 'traducao'],
    icon: 'Languages',
    titleKey: 'slashCommands.defaultTranslate',
    descKey: 'slashCommands.defaultTranslateDesc',
    templatePt: 'Traduza o seguinte texto preservando o tom natural, contexto e terminologia técnica especializada:\n\n{{input}}',
    templateEn: 'Translate the following text preserving its natural tone, context, and technical terminology:\n\n{{input}}',
    isBuiltIn: true
  },
  {
    id: 'diagram',
    command: 'diagram',
    aliases: ['diagrama', 'mermaid', 'fluxo'],
    icon: 'GitBranch',
    titleKey: 'slashCommands.defaultDiagram',
    descKey: 'slashCommands.defaultDiagramDesc',
    templatePt: 'Crie um diagrama Mermaid limpo e bem formatado para representar visualmente a arquitetura, estrutura ou fluxo do seguinte tema:\n\n```mermaid\n{{input}}\n```',
    templateEn: 'Create a clean, well-formatted Mermaid diagram visually representing the architecture, data structure, or flow of the following topic:\n\n```mermaid\n{{input}}\n```',
    isBuiltIn: true
  },
  {
    id: 'sql',
    command: 'sql',
    aliases: ['consulta', 'banco', 'database'],
    icon: 'Database',
    titleKey: 'slashCommands.defaultSql',
    descKey: 'slashCommands.defaultSqlDesc',
    templatePt: 'Escreva uma consulta SQL eficiente, legível e otimizada (com comentários explicando joins, índices ou filtros) para o seguinte requisito:\n\n{{input}}',
    templateEn: 'Write an efficient, readable, and optimized SQL query (with comments explaining joins, indexes, or filters) for the following requirement:\n\n{{input}}',
    isBuiltIn: true
  },
  {
    id: 'test',
    command: 'test',
    aliases: ['testes', 'unit-test', 'spec'],
    icon: 'FlaskConical',
    titleKey: 'slashCommands.defaultTest',
    descKey: 'slashCommands.defaultTestDesc',
    templatePt: 'Escreva uma suíte abrangente de testes unitários para o seguinte código, cobrindo o fluxo feliz, validações e cenários de erro/limite:\n\n```\n{{input}}\n```',
    templateEn: 'Write a comprehensive unit test suite for the following code, covering happy paths, validations, and edge/error cases:\n\n```\n{{input}}\n```',
    isBuiltIn: true
  },
  {
    id: 'doc',
    command: 'doc',
    aliases: ['documentar', 'readme', 'jsdoc'],
    icon: 'FileCode',
    titleKey: 'slashCommands.defaultDoc',
    descKey: 'slashCommands.defaultDocDesc',
    templatePt: 'Gere documentação técnica clara e detalhada (docstrings, tipos ou README com exemplos de uso) para o seguinte código/módulo:\n\n```\n{{input}}\n```',
    templateEn: 'Generate clear and detailed technical documentation (docstrings, types, or README with usage examples) for the following code/module:\n\n```\n{{input}}\n```',
    isBuiltIn: true
  }
];

export const PROMPT_TEMPLATES_STORAGE_KEY = 'neochat_custom_prompt_templates';

/**
 * Get all available prompt commands (built-in + custom from settings/localStorage)
 * @param {Array} customTemplates
 * @param {Function} t - translation function
 * @param {string} language - 'pt' | 'en'
 * @returns {Array} List of formatted prompt command objects
 */
export function getAllPromptCommands(customTemplates = [], t = (k) => k, language = 'pt') {
  const isPt = language === 'pt';

  const builtInList = BUILT_IN_SLASH_COMMANDS.map(item => ({
    id: item.id,
    command: item.command,
    aliases: item.aliases || [],
    icon: item.icon,
    title: t(item.titleKey, {}, item.command),
    description: t(item.descKey, {}, ''),
    template: isPt ? item.templatePt : item.templateEn,
    isBuiltIn: true
  }));

  const customList = (customTemplates || []).map(item => ({
    id: item.id || `custom-${item.command}`,
    command: (item.command || '').replace(/^\//, '').toLowerCase().trim(),
    aliases: item.aliases || [],
    icon: item.icon || 'Sparkles',
    title: item.title || item.command,
    description: item.description || '',
    template: item.template || '',
    isBuiltIn: false
  }));

  return [...builtInList, ...customList];
}

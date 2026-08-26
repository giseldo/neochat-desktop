export const DEFAULT_WORKFLOW_TEMPLATES = [
  {
    id: 'code-review-audit',
    icon: 'ShieldCheck',
    category: 'development',
    namePt: 'Revisão de Código & Segurança',
    nameEn: 'Code Review & Security Audit',
    descriptionPt: 'Auditoria completa de qualidade, segurança, performance e boas práticas.',
    descriptionEn: 'Comprehensive audit for code quality, security, performance, and best practices.',
    stepsPt: [
      'Faça uma análise estática detalhada do código ou diff fornecido: avalie a legibilidade, padrões de design, convenções de nomenclatura e aderência aos princípios SOLID.',
      'Identifique possíveis vulnerabilidades de segurança (ex: injeção, vazamento de credenciais, sanitização de inputs) e falhas no tratamento de erros ou exceções.',
      'Avalie a complexidade de tempo/espaço (Big-O) e consumo de recursos. Sugira refatorações específicas para otimizar a performance.',
      'Gere um relatório final estruturado contendo: Resumo da análise, tabela de problemas classificados por severidade (Alta, Média, Baixa) e blocos de código com a versão corrigida e recomendada.'
    ],
    stepsEn: [
      'Perform a thorough static analysis of the provided code/diff: assess readability, design patterns, naming conventions, and adherence to SOLID principles.',
      'Identify potential security vulnerabilities (e.g., injection, credential leakage, missing input sanitization) and flaws in exception handling.',
      'Evaluate time/space complexity (Big-O) and resource usage. Propose targeted refactorings to optimize performance.',
      'Generate a structured final report containing: Summary, findings table ranked by severity (High, Medium, Low), and corrected code blocks with recommendations.'
    ],
    variables: ['codigo_ou_arquivo']
  },
  {
    id: 'daily-tech-briefing',
    icon: 'Newspaper',
    category: 'productivity',
    namePt: 'Briefing Diário de Notícias & IA',
    nameEn: 'Daily Tech & AI Briefing',
    descriptionPt: 'Pesquisa em tempo real dos maiores lançamentos e novidades tecnológicas das últimas 24h.',
    descriptionEn: 'Real-time web search and curation of top tech and AI news from the last 24 hours.',
    stepsPt: [
      'Use a ferramenta de busca web para pesquisar as notícias, atualizações de modelos de IA e novidades do ecossistema de tecnologia das últimas 24 horas sobre {{topico}}.',
      'Filtre e selecione os 5 acontecimentos mais impactantes, descartando rumores e conteúdos superficiais.',
      'Para cada destaque selecionado, elabore um resumo conciso de 2 a 3 parágrafos explicando o que aconteceu, por que é relevante e qual o impacto prático.',
      'Monte o briefing executivo final com título chamativo, lista de links de referência e uma dica acionável do dia para desenvolvedores e entusiastas.'
    ],
    stepsEn: [
      'Use the web search tool to find news, AI model releases, and technology ecosystem updates from the last 24 hours regarding {{topico}}.',
      'Filter and select the 5 most impactful developments, filtering out rumors and low-signal posts.',
      'For each key highlight, draft a concise 2-3 paragraph summary detailing what happened, why it matters, and the practical takeaways.',
      'Compile the final executive morning briefing with an engaging headline, source links, and an actionable tip of the day for developers.'
    ],
    suggestedSchedule: { type: 'daily', time: '08:30' },
    variables: ['topico']
  },
  {
    id: 'tech-article-creator',
    icon: 'PenTool',
    category: 'writing',
    namePt: 'Criação de Artigo Técnico & Blog Post',
    nameEn: 'Technical Article & Blog Post Creator',
    descriptionPt: 'Fluxo completo: estruturação de tópicos, redação aprofundada, otimização SEO e posts sociais.',
    descriptionEn: 'End-to-end flow: outline planning, in-depth technical drafting, SEO optimization, and social teasers.',
    stepsPt: [
      'Planeje a estrutura do artigo sobre {{tema}}: defina a tese principal, o público-alvo (iniciante, intermediário ou avançado) e um sumário detalhado em tópicos (H2 e H3).',
      'Redija o conteúdo completo do artigo com tom didático e profissional. Inclua introdução cativante, explicações aprofundadas, analogias visuais e exemplos práticos de código comentados.',
      'Otimize o artigo para SEO: defina a palavra-chave primária, sugira 3 opções de títulos atraentes, crie a meta description (até 155 caracteres) e adicione uma conclusão com Call-to-Action (CTA).',
      'Crie 3 versões de posts curtos para redes sociais (LinkedIn / X) com hashtags relevantes para promover o artigo.'
    ],
    stepsEn: [
      'Outline the technical article on {{tema}}: define the core thesis, target audience level, and a detailed section breakdown (H2 and H3 headings).',
      'Draft the complete article in a clear and engaging technical tone. Include a compelling hook, in-depth explanations, practical code examples, and architecture diagrams/tables where helpful.',
      'Optimize for SEO: identify primary and secondary keywords, propose 3 catchy titles, craft a meta description (<155 chars), and conclude with an engaging Call-to-Action (CTA).',
      'Draft 3 promotional social media posts (LinkedIn / X) with relevant hashtags to share the article.'
    ],
    variables: ['tema']
  },
  {
    id: 'bug-triage-fix',
    icon: 'Bug',
    category: 'development',
    namePt: 'Diagnóstico & Resolução de Bug',
    nameEn: 'Bug Triage & Fix',
    descriptionPt: 'Investigação de causa raiz, desenvolvimento da correção e testes de regressão.',
    descriptionEn: 'Root cause investigation, patch implementation, and regression test generation.',
    stepsPt: [
      'Analise os logs de erro, mensagem de exceção e comportamento inesperado descritos em {{descricao_erro}}. Isole a condição exata em que a falha ocorre.',
      'Inspecione o fluxo de execução e o código relevante para identificar a causa raiz do problema e efeitos colaterais em módulos adjacentes.',
      'Escreva a correção completa para o problema, explicando passo a passo o raciocínio da alteração e por que ela resolve o bug de forma robusta.',
      'Crie testes automatizados (unitários ou de integração) que falham com o bug original e passam com a correção, garantindo que não ocorram regressões no futuro.'
    ],
    stepsEn: [
      'Analyze the error logs, stack trace, and unexpected behavior described in {{descricao_erro}}. Isolate the exact trigger condition.',
      'Inspect the execution flow and relevant files to pinpoint the root cause and any potential side-effects on adjacent modules.',
      'Implement the complete bug fix, explaining the logic step-by-step and why it provides a robust, maintainable solution.',
      'Write automated test cases (unit or integration) that reproduce the original issue and verify the fix to prevent future regressions.'
    ],
    variables: ['descricao_erro']
  },
  {
    id: 'data-analysis-report',
    icon: 'BarChart3',
    category: 'analysis',
    namePt: 'Análise de Dados & Relatório Executivo',
    nameEn: 'Data Analysis & Executive Report',
    descriptionPt: 'Validação e limpeza de base, métricas-chave (KPIs), insights e plano de ação estratégico.',
    descriptionEn: 'Data validation, metric extraction, statistical insights, and strategic action plan.',
    stepsPt: [
      'Valide e limpe a base de dados fornecida: identifique anomalias, valores ausentes, discrepâncias de formato e distribuições atípicas.',
      'Calcule as principais métricas de desempenho (KPIs), médias, medianas, taxas de conversão ou crescimento comparativo entre períodos.',
      'Identifique os 3 principais padrões, oportunidades de otimização e riscos operacionais revelados pelos dados.',
      'Estruture um Relatório Executivo final com: Sumário para a diretoria, tabelas comparativas formatadas em Markdown e um plano de ação em 3 fases com prioridades claras.'
    ],
    stepsEn: [
      'Validate and inspect the provided dataset: detect missing values, anomalies, format inconsistencies, and outliers.',
      'Calculate core performance KPIs, averages, medians, conversion/growth rates, and period-over-period trends.',
      'Highlight the top 3 patterns, optimization opportunities, and operational risks discovered in the data.',
      'Draft the final Executive Report: Executive summary, formatted Markdown tables, key insights, and a prioritized 3-phase action plan.'
    ],
    variables: ['fonte_dados']
  },
  {
    id: 'test-suite-generator',
    icon: 'FlaskConical',
    category: 'development',
    namePt: 'Geração de Testes Automatizados',
    nameEn: 'Automated Test Suite Generator',
    descriptionPt: 'Mapeamento de cenários, casos de borda e geração de testes unitários e de integração.',
    descriptionEn: 'Edge-case mapping, mocking, and full unit/integration test suite generation.',
    stepsPt: [
      'Analise o código da função ou módulo fornecido e mapeie todos os caminhos de execução: caminho feliz (happy path), entradas inválidas, limites (edge cases) e tratamento de exceções.',
      'Escreva a suíte completa de testes unitários utilizando o framework padrão do projeto (ex: Jest, Vitest, PyTest, JUnit) com mocks claros para dependências externas.',
      'Adicione asserções explícitas, descrições claras para cada bloco describe e test (formato given/when/then), garantindo cobertura abrangente.',
      'Documente como executar os testes no terminal e os critérios de validação esperados.'
    ],
    stepsEn: [
      'Analyze the provided module or function and map all execution paths: happy path, invalid inputs, edge cases, and exception branches.',
      'Write a comprehensive test suite using the standard test framework (e.g. Vitest, Jest, PyTest, JUnit) with clean mocks for external dependencies.',
      'Add explicit assertions and descriptive test titles (given/when/then style) to ensure robust and maintainable coverage.',
      'Provide terminal execution instructions and expected test output criteria.'
    ],
    variables: ['modulo_alvo']
  },
  {
    id: 'meeting-action-items',
    icon: 'ListChecks',
    category: 'productivity',
    namePt: 'Minuta de Reunião & Plano de Ação',
    nameEn: 'Meeting Minutes & Action Items',
    descriptionPt: 'Transforma notas e transcrições em atas estruturadas com responsáveis e prazos.',
    descriptionEn: 'Turn raw notes or transcripts into structured summaries, decisions, and action items.',
    stepsPt: [
      'Processe as anotações ou transcrição bruta da reunião {{reuniao}} e organize os tópicos principais discutidos por ordem de importância.',
      'Extraia todas as decisões tomadas, acordos estabelecidos e pontos que ficaram pendentes para definição posterior.',
      'Gere a tabela de Próximos Passos (Action Items) especificando: Tarefa, Responsável atribuído, Nível de prioridade e Prazo acordado.',
      'Formate a Ata de Reunião final de forma limpa e profissional, pronta para ser compartilhada por e-mail ou canais da equipe.'
    ],
    stepsEn: [
      'Process the raw notes or transcript from meeting {{reuniao}} and organize the discussion into key agenda topics.',
      'Extract all consensus decisions, agreed commitments, and open questions deferred to future meetings.',
      'Generate an Action Items table specifying: Task description, Assignee, Priority level, and Deadline.',
      'Format the final Meeting Minutes professionally in Markdown, ready for sharing via email or team channels.'
    ],
    variables: ['reuniao']
  }
];

export function getLocalizedWorkflowTemplates(language = 'pt-BR') {
  const isPt = String(language || '').toLowerCase().startsWith('pt');
  return DEFAULT_WORKFLOW_TEMPLATES.map(template => ({
    id: template.id,
    icon: template.icon,
    category: template.category,
    name: isPt ? template.namePt : template.nameEn,
    description: isPt ? template.descriptionPt : template.descriptionEn,
    steps: isPt ? template.stepsPt : template.stepsEn,
    suggestedSchedule: template.suggestedSchedule || null,
    variables: template.variables || []
  }));
}

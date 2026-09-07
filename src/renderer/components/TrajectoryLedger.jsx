import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Terminal, 
  AlertCircle, 
  FolderKanban, 
  Bot, 
  FileText, 
  Code,
  Activity,
  Zap,
  MessageSquare,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { extractThinking } from '../lib/messageUtils';

export default function TrajectoryLedger({
  turns = [],
  viewMode = 'duration', // 'duration' | 'turns' | 'calls'
  searchQuery = '',
  mcpTools = [],
  onPreviewArtifact: _onPreviewArtifact,
}) {
  const { t, language } = useLanguage();
  const [expandedTurns, setExpandedTurns] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const formatNumber = (num) => (num ? Number(num).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US') : '0');

  const NATIVE_TOOLS = [
    // Filesystem Native Tools
    {
      name: 'read_file',
      category: 'Sistema de Arquivos',
      isNative: true,
      description: 'Lê o conteúdo de um arquivo no workspace (completo ou por intervalo de linhas).',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho relativo à raiz do workspace' },
          start_line: { type: 'integer', description: 'Linha inicial (1-indexed)' },
          end_line: { type: 'integer', description: 'Linha final (1-indexed inclusive)' }
        },
        required: ['path']
      }
    },
    {
      name: 'write_file',
      category: 'Sistema de Arquivos',
      isNative: true,
      description: 'Cria um novo arquivo ou sobrescreve completamente um arquivo com o conteúdo fornecido.',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho relativo à raiz do workspace' },
          content: { type: 'string', description: 'Conteúdo exato a ser gravado no arquivo' },
          overwrite: { type: 'boolean', description: 'Sobrescrever se já existir (padrão: true)' }
        },
        required: ['path', 'content']
      }
    },
    {
      name: 'edit_file',
      category: 'Sistema de Arquivos',
      isNative: true,
      description: 'Edita um bloco contíguo de texto em um arquivo existente substituindo o conteúdo correspondente.',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho relativo à raiz do workspace' },
          target_content: { type: 'string', description: 'Texto exato a ser encontrado e substituído' },
          replacement_content: { type: 'string', description: 'Novo texto substituto' },
          start_line: { type: 'integer', description: 'Linha aproximada de início' },
          end_line: { type: 'integer', description: 'Linha aproximada de término' }
        },
        required: ['path', 'target_content', 'replacement_content']
      }
    },
    {
      name: 'list_directory',
      category: 'Sistema de Arquivos',
      isNative: true,
      description: 'Lista arquivos e diretórios em uma pasta do workspace.',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho relativo à raiz do workspace' },
          recursive: { type: 'boolean', description: 'Listar recursivamente (padrão: false)' },
          max_depth: { type: 'integer', description: 'Profundidade máxima de recursão (padrão: 2)' }
        }
      }
    },
    {
      name: 'glob_search',
      category: 'Sistema de Arquivos',
      isNative: true,
      description: 'Busca arquivos correspondentes a um padrão glob (ex: "**/*.js", "src/**/*.jsx").',
      schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Padrão glob de busca' },
          path: { type: 'string', description: 'Diretório base de busca' },
          max_results: { type: 'integer', description: 'Máximo de resultados (padrão: 50)' }
        },
        required: ['pattern']
      }
    },
    {
      name: 'grep_search',
      category: 'Sistema de Arquivos',
      isNative: true,
      description: 'Busca textual ou por expressão regular (regex) nos arquivos do workspace.',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto ou padrão regex a buscar' },
          path: { type: 'string', description: 'Diretório base ou arquivo específico' },
          is_regex: { type: 'boolean', description: 'Tratar como regex (padrão: false)' },
          case_sensitive: { type: 'boolean', description: 'Diferenciar maiúsculas/minúsculas' },
          max_results: { type: 'integer', description: 'Máximo de ocorrências (padrão: 50)' }
        },
        required: ['query']
      }
    },
    // Terminal & Shell Native Tools
    {
      name: 'shell_exec',
      category: 'Terminal Shell',
      isNative: true,
      description: 'Executa comandos de terminal/shell no workspace (PowerShell, Bash, npm, pnpm, git, etc.).',
      schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Comando de terminal a executar' },
          cwd: { type: 'string', description: 'Diretório de trabalho' },
          timeout_ms: { type: 'integer', description: 'Timeout em milissegundos (padrão: 30000)' }
        },
        required: ['command']
      }
    },
    {
      name: 'process_exec',
      category: 'Terminal Shell',
      isNative: true,
      description: 'Executa um binário ou programa diretamente sem passar pelo interpretador de shell.',
      schema: {
        type: 'object',
        properties: {
          executable: { type: 'string', description: 'Nome ou caminho do executável' },
          arguments: { type: 'array', items: { type: 'string' }, description: 'Argumentos' },
          cwd: { type: 'string', description: 'Diretório de trabalho' }
        },
        required: ['executable']
      }
    },
    // Git Intelligence
    {
      name: 'git_status',
      category: 'Git Intelligence',
      isNative: true,
      description: 'Obtém o status do repositório Git (branch ativa, modificações, arquivos não rastreados).',
      schema: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Caminho do repositório Git' }
        }
      }
    },
    {
      name: 'git_diff',
      category: 'Git Intelligence',
      isNative: true,
      description: 'Visualiza o diff com as alterações não commitadas ou em stage no repositório.',
      schema: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Caminho do repositório Git' },
          cached: { type: 'boolean', description: 'Se true, visualiza alterações em stage' }
        }
      }
    },
    {
      name: 'git_commit',
      category: 'Git Intelligence',
      isNative: true,
      description: 'Adiciona alterações e cria um commit Git com mensagem descritiva.',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Mensagem do commit' },
          repo_path: { type: 'string', description: 'Caminho do repositório Git' }
        },
        required: ['message']
      }
    },
    // Background Tasks
    {
      name: 'run_background_task',
      category: 'Tarefas em Background',
      isNative: true,
      description: 'Inicia um comando assíncrono em segundo plano (servidores locais, watchers, builds).',
      schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Comando a executar em segundo plano' },
          name: { type: 'string', description: 'Título descritivo da tarefa' }
        },
        required: ['command']
      }
    },
    {
      name: 'list_background_tasks',
      category: 'Tarefas em Background',
      isNative: true,
      description: 'Lista todas as tarefas em segundo plano em execução ou finalizadas.',
      schema: { type: 'object', properties: {} }
    },
    {
      name: 'kill_background_task',
      category: 'Tarefas em Background',
      isNative: true,
      description: 'Encerra uma tarefa em segundo plano pelo seu identificador ID.',
      schema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'ID da tarefa a cancelar' }
        },
        required: ['task_id']
      }
    },
    // Canvas Workspace
    {
      name: 'canvas_create_document',
      category: 'Canvas Workspace',
      isNative: true,
      description: 'Cria um novo documento no editor Canvas interativo (Markdown, código, etc.).',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título claro do documento' },
          content: { type: 'string', description: 'Conteúdo inicial do documento' },
          language: { type: 'string', description: 'Linguagem ou formato: markdown, javascript, python, html, etc.' }
        },
        required: ['title', 'content']
      }
    },
    {
      name: 'canvas_update_document',
      category: 'Canvas Workspace',
      isNative: true,
      description: 'Atualiza, reescreve, expande ou modifica a íntegra do documento ativo no Canvas.',
      schema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Conteúdo completo atualizado do documento' }
        },
        required: ['content']
      }
    },
    {
      name: 'canvas_edit_selection',
      category: 'Canvas Workspace',
      isNative: true,
      description: 'Substitui um trecho específico selecionado pelo usuário no documento Canvas.',
      schema: {
        type: 'object',
        properties: {
          targetText: { type: 'string', description: 'Texto exato a ser substituído' },
          replacementText: { type: 'string', description: 'Novo texto substituto' }
        },
        required: ['targetText', 'replacementText']
      }
    },
    {
      name: 'canvas_get_document',
      category: 'Canvas Workspace',
      isNative: true,
      description: 'Obtém o conteúdo atual, versão e estatísticas do documento ativo no Canvas.',
      schema: { type: 'object', properties: {} }
    },
    // Web & Project RAG
    {
      name: 'web_search',
      category: 'Busca Web (Web Search)',
      isNative: true,
      description: 'Busca na web em tempo real por fatos, notícias, documentação técnica e dados recentes.',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termos de busca na web' },
          max_results: { type: 'integer', description: 'Máximo de resultados' }
        },
        required: ['query']
      }
    },
    {
      name: 'read_url_content',
      category: 'Web Scraping',
      isNative: true,
      description: 'Lê o conteúdo textual de uma página web, API ou documentação via URL.',
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL de destino para extração de conteúdo' }
        },
        required: ['url']
      }
    },
    {
      name: 'query_project_knowledge',
      category: 'RAG Local / Projeto',
      isNative: true,
      description: 'Busca semântica e vetorial em arquivos indexados da base de conhecimento do projeto.',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Consulta semântica sobre os arquivos do projeto' },
          limit: { type: 'integer', description: 'Número máximo de trechos a retornar' }
        },
        required: ['query']
      }
    },
    {
      name: 'read_project_file',
      category: 'RAG Local / Projeto',
      isNative: true,
      description: 'Lê o conteúdo bruto ou linhas específicas de um arquivo local do projeto.',
      schema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Caminho relativo do arquivo no projeto' },
          startLine: { type: 'integer', description: 'Linha inicial (1-indexed)' },
          endLine: { type: 'integer', description: 'Linha final (1-indexed)' }
        },
        required: ['filePath']
      }
    }
  ];

  const getTurnBreakdown = (event, turn, activeTools = []) => {
    if (event.usage?.breakdown) {
      return event.usage.breakdown;
    }

    const promptTokens = event.usage?.prompt_tokens || 0;
    const completionTokens = event.usage?.completion_tokens || 0;

    if (promptTokens === 0 && completionTokens === 0) return null;

    // Combine Native Tools with active MCP tools passed from props
    const mcpItems = (activeTools || []).map(t => {
      const jsonStr = JSON.stringify(t, null, 2);
      return {
        name: t.name || t.function?.name || 'mcp_tool',
        description: t.description || t.function?.description || '',
        category: t.server_label ? `MCP (${t.server_label})` : 'Servidor MCP',
        isNative: false,
        rawSchema: t,
        rawJson: jsonStr,
        chars: jsonStr.length,
        estimated_tokens: Math.max(1, Math.round(jsonStr.length / 4))
      };
    });

    const CODING_AGENT_TOOL_NAMES = [
      'read_file', 'write_file', 'edit_file', 'list_directory', 'glob_search',
      'grep_search', 'shell_exec', 'process_exec', 'git_status', 'git_diff',
      'git_commit', 'read_url_content', 'run_background_task', 'list_background_tasks', 'kill_background_task'
    ];

    const hasCanvasEvent = turn?.events?.some(e => e.type === 'canvas' || e.parts?.some(p => p.type === 'canvas') || e.name?.startsWith('canvas_'));
    const hasRagEvent = turn?.events?.some(e => e.type === 'project' || e.parts?.some(p => p.type === 'project') || e.name?.includes('project_'));
    const hasWebSearchEvent = turn?.events?.some(e => e.name === 'web_search');
    
    // Check if turn triggered coding tools or was in agent/code mode
    const hasAgentEvent = turn?.events?.some(e => 
      CODING_AGENT_TOOL_NAMES.includes(e.name) ||
      e.parts?.some(p => p.type === 'workspace' || p.type === 'harness') ||
      e.type === 'tool' ||
      (e.type === 'assistant' && e.tool_calls?.length > 0)
    );

    const nativeItems = NATIVE_TOOLS.filter(t => {
      if (t.name.startsWith('canvas_')) return hasCanvasEvent;
      if (t.name.includes('project_')) return hasRagEvent;
      if (t.name === 'web_search') return hasWebSearchEvent || hasAgentEvent;
      if (CODING_AGENT_TOOL_NAMES.includes(t.name)) {
        return hasAgentEvent || activeTools?.length === 0;
      }
      return false;
    }).map(t => {
      const fullDef = {
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.schema
        }
      };
      const jsonStr = JSON.stringify(fullDef, null, 2);
      return {
        name: t.name,
        description: t.description,
        category: t.category,
        isNative: true,
        rawSchema: fullDef,
        rawJson: jsonStr,
        chars: jsonStr.length,
        estimated_tokens: Math.max(1, Math.round(jsonStr.length / 4))
      };
    });

    const allToolItems = [...nativeItems, ...mcpItems];
    const toolsChars = allToolItems.reduce((acc, t) => acc + t.chars, 0);

    const systemPromptEvent = turn?.events?.find(e => e.type === 'injected_context' || e.type === 'system');
    const systemRaw = systemPromptEvent?.systemPrompt || systemPromptEvent?.content || '';
    const systemChars = (systemRaw ? systemRaw.length : 0) + 1200;

    const userEvent = turn?.events?.find(e => e.type === 'user');
    const userContent = typeof userEvent?.content === 'string' ? userEvent.content : JSON.stringify(userEvent?.content || '');
    const userChars = userContent.length;

    const totalChars = toolsChars + systemChars + userChars;
    const toolsEstimatedTokens = Math.max(0, Math.round(totalChars > 0 ? (toolsChars / totalChars) * promptTokens : toolsChars / 4));

    return {
      tools: {
        count: allToolItems.length,
        chars: toolsChars,
        tools: allToolItems.map(t => t.name),
        items: allToolItems.map(t => ({
          ...t,
          estimated_tokens: Math.max(1, Math.round((t.chars / Math.max(1, toolsChars)) * toolsEstimatedTokens))
        })),
        estimated_tokens: toolsEstimatedTokens
      },
      system: {
        chars: systemChars,
        estimated_tokens: Math.max(0, Math.round(totalChars > 0 ? (systemChars / totalChars) * promptTokens : systemChars / 4)),
        rawContent: systemRaw || 'Instruções base do NeoChat com diretrizes de ferramentas nativas do sistema, terminal shell, Git, modo de agente, data/hora e regras do sistema.'
      },
      user_input: {
        chars: userChars,
        estimated_tokens: Math.max(0, Math.round(totalChars > 0 ? (userChars / totalChars) * promptTokens : userChars / 4)),
        content: userContent
      },
      completion: {
        content_tokens: completionTokens,
        reasoning_tokens: 0,
        total_tokens: completionTokens,
        ttft: event.usage?.ttft,
        tokens_per_sec: event.usage?.tokens_per_sec
      }
    };
  };

  const toggleTurn = (turnId) => {
    setExpandedTurns(prev => ({
      ...prev,
      [turnId]: prev[turnId] === undefined ? false : !prev[turnId]
    }));
  };

  const toggleItem = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDuration = (ms) => {
    if (!ms && ms !== 0) return '';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Helper to format arguments inline: toolName {"arg": "val"}
  const formatToolCallSignature = (toolName, rawArgs) => {
    let argsObj = rawArgs;
    if (typeof rawArgs === 'string') {
      try {
        argsObj = JSON.parse(rawArgs);
      } catch {
        argsObj = rawArgs;
      }
    }

    if (typeof argsObj === 'object' && argsObj !== null) {
      // Shorten arguments representation for the line preview
      const keys = Object.keys(argsObj);
      if (keys.length === 0) return `${toolName} {}`;
      
      const formattedParts = keys.map(k => {
        let val = argsObj[k];
        if (typeof val === 'string') {
          const cleanVal = val.replace(/\r?\n/g, ' ');
          val = cleanVal.length > 50 ? `${cleanVal.substring(0, 50)}...` : cleanVal;
          return `"${k}": "${val}"`;
        }
        return `"${k}": ${JSON.stringify(val)}`;
      });

      return `${toolName} {${formattedParts.join(', ')}}`;
    }

    return `${toolName} ${String(rawArgs || '')}`;
  };

  // Helper to get preview snippet of result
  const getToolResultSnippet = (toolItem) => {
    if (toolItem.status === 'running') {
      return '(no new output) [status: running]';
    }
    if (toolItem.status === 'aborted') {
      return 'ABORTED';
    }
    if (toolItem.error) {
      return `[error] ${toolItem.error}`;
    }
    if (toolItem.result !== undefined && toolItem.result !== null) {
      let text = typeof toolItem.result === 'string' ? toolItem.result : JSON.stringify(toolItem.result);
      text = text.trim().replace(/\r?\n/g, ' ');
      if (!text) return '(no output)';
      return text.length > 80 ? `${text.substring(0, 80)}...` : text;
    }
    return '(no output)';
  };

  const matchesSearch = (item, q) => {
    if (!q) return true;
    const query = q.toLowerCase();
    
    if (item.type === 'injected_context') {
      const partsText = (item.parts || []).map(p => `${p.title || ''} ${p.content || ''} ${p.type || ''}`).join(' ');
      const fullText = `${item.systemPrompt || ''} ${partsText} etapa 1 context injetado stage 1`;
      return fullText.toLowerCase().includes(query) || 'etapa 1'.includes(query) || 'contexto'.includes(query) || 'prompt'.includes(query);
    }
    if (item.type === 'system' && (item.content?.toLowerCase().includes(query) || 'system'.includes(query))) {
      return true;
    }
    if (item.type === 'user') {
      const text = typeof item.content === 'string' 
        ? item.content 
        : Array.isArray(item.content) 
          ? item.content.map(c => c.text || '').join(' ') 
          : '';
      return text.toLowerCase().includes(query) || 'user'.includes(query);
    }
    if (item.type === 'assistant') {
      const text = `${item.content || ''} ${item.reasoning || ''} ${item.liveReasoning || ''}`;
      return text.toLowerCase().includes(query) || 'assistant'.includes(query);
    }
    if (item.type === 'tool') {
      const text = `${item.name || ''} ${item.arguments || ''} ${item.result || ''} ${item.error || ''}`;
      return text.toLowerCase().includes(query) || 'tool'.includes(query);
    }
    return false;
  };

  if (turns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <Terminal className="w-10 h-10 mb-3 opacity-40 text-primary" />
        <p className="text-sm font-medium">{t('trajectory.emptyTrajectory')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-xs">
      {turns.map((turn, turnIdx) => {
        const turnId = turn.id || `turn-${turnIdx}`;
        // In 'turns' mode, default to collapsed for previous turns if there are multiple turns
        const isTurnOpen = expandedTurns[turnId] !== undefined
          ? expandedTurns[turnId]
          : viewMode === 'turns'
            ? turnIdx === turns.length - 1
            : true;
        
        // Filter events by search and viewMode
        let visibleEvents = turn.events.filter(e => matchesSearch(e, searchQuery));
        if (viewMode === 'calls') {
          visibleEvents = visibleEvents.filter(e => e.type === 'tool' || e.type === 'assistant');
        }
        if (searchQuery && visibleEvents.length === 0) return null;

        const totalSteps = turn.events.filter(e => e.type === 'assistant' || e.type === 'tool').length;
        const totalTools = turn.events.filter(e => e.type === 'tool').length;

        let turnPromptTokens = turn.usage?.prompt_tokens || turn.usage?.input_tokens || 0;
        let turnCompletionTokens = turn.usage?.completion_tokens || turn.usage?.output_tokens || 0;
        let turnTotalTokens = turn.usage?.total_tokens || (turnPromptTokens + turnCompletionTokens);

        if (turnTotalTokens === 0) {
          turn.events.forEach(e => {
            if (e.type === 'assistant' && e.usage) {
              const prompt = e.usage.prompt_tokens ?? e.usage.input_tokens ?? 0;
              const comp = e.usage.completion_tokens ?? e.usage.output_tokens ?? 0;
              const tot = e.usage.total_tokens || (prompt + comp);
              turnPromptTokens += prompt;
              turnCompletionTokens += comp;
              turnTotalTokens += tot;
            }
          });
        }

        return (
          <div
            key={turnId}
            id={turnId}
            className="border border-border/70 bg-card/40 rounded-xl overflow-hidden shadow-2xs transition-colors hover:border-border"
          >
            {/* Turn Header (for User turns) */}
            {turn.turnNumber !== undefined && (
              <div 
                className="flex items-center justify-between px-3.5 py-2.5 bg-muted/30 border-b border-border/50 select-none cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleTurn(turnId)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button className="text-muted-foreground hover:text-foreground">
                    {isTurnOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  <span className="font-semibold text-foreground/80 font-mono text-[11px]">
                    {t('trajectory.turnLabel', { number: turn.turnNumber })}
                  </span>
                  {turn.userPrompt && (
                    <span className="text-muted-foreground truncate max-w-md italic font-normal">
                      &ldquo;{turn.userPrompt}&rdquo;
                    </span>
                  )}
                </div>

                {/* Steps, Tool calls & Token summary badge */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                  {turnTotalTokens > 0 && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1 shrink-0 font-mono shadow-2xs select-none"
                      title={`${t('trajectory.promptTokensLabel')}: ${formatNumber(turnPromptTokens)} tk · ${t('trajectory.completionTokensLabel')}: ${formatNumber(turnCompletionTokens)} tk`}
                    >
                      <Activity className="w-3 h-3 text-purple-500" />
                      <span>{formatNumber(turnTotalTokens)} {t('trajectory.tokensUnit')}</span>
                    </span>
                  )}
                  {totalSteps > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-muted border border-border/60">
                      {t('trajectory.stepsAndTools', { steps: totalSteps, tools: totalTools })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Turn Events Content */}
            {isTurnOpen && (
              <div className="p-3 space-y-2.5 divide-y divide-border/20">
                {visibleEvents.map((event, eventIdx) => {
                  const eventId = event.id || `${turnId}-ev-${eventIdx}`;
                  const isItemExpanded = Boolean(expandedItems[eventId]);

                  // 1. SYSTEM EVENT
                  if (event.type === 'system') {
                    return (
                      <div key={eventId} className="pt-2 first:pt-0 flex items-start gap-3">
                        <span className="shrink-0 px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                          {t('trajectory.system')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div 
                            className="font-medium text-foreground/90 flex items-center gap-1.5 cursor-pointer hover:text-foreground select-none"
                            onClick={() => toggleItem(eventId)}
                          >
                            <span>{t('trajectory.initialSystemPrompt')}</span>
                            <span className="text-muted-foreground text-[10px]">
                              {isItemExpanded ? '▲' : '▼'}
                            </span>
                          </div>
                          {isItemExpanded && (
                            <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/60 font-mono text-[11px] whitespace-pre-wrap text-muted-foreground max-h-60 overflow-y-auto">
                              {event.content}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 1.5. INJECTED CONTEXT (STAGE 1) EVENT
                  if (event.type === 'injected_context') {
                    const parts = event.parts || [];
                    const hasProject = parts.some(p => p.type === 'project');
                    const hasPersona = parts.some(p => p.type === 'persona');
                    const hasCanvas = parts.some(p => p.type === 'canvas');
                    const hasWorkspace = parts.some(p => p.type === 'workspace');
                    const hasHarness = parts.some(p => p.type === 'harness');
                    const totalChars = event.systemPrompt ? event.systemPrompt.length : 0;
                    const totalWords = event.systemPrompt ? event.systemPrompt.trim().split(/\s+/).length : 0;

                    return (
                      <div key={eventId} className="pt-2.5 first:pt-0 flex items-start gap-3">
                        <span className="shrink-0 px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{t('trajectory.stage1Badge')}</span>
                        </span>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div
                            className="flex items-center justify-between font-medium text-foreground/90 cursor-pointer hover:text-foreground select-none"
                            onClick={() => toggleItem(eventId)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-[11px] text-foreground">
                                {t('trajectory.injectedPromptTitle')}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({parts.length === 1 ? t('trajectory.componentInjected') : t('trajectory.componentsInjected', { count: parts.length })})
                              </span>
                              {hasProject && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                                  📁 {t('trajectory.projectInstructions')}
                                </span>
                              )}
                              {hasPersona && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
                                  🎭 {t('trajectory.activePersona')}
                                </span>
                              )}
                              {hasWorkspace && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                                  📁 {t('trajectory.workspaceRules')}
                                </span>
                              )}
                              {hasHarness && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                                  🤖 {t('trajectory.codingHarness')}
                                </span>
                              )}
                              {hasCanvas && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                                  📝 {t('trajectory.canvasDocContext')}
                                </span>
                              )}
                            </div>

                            <span className="text-muted-foreground text-[10px]">
                              {isItemExpanded !== false ? '▲' : '▼'}
                            </span>
                          </div>

                          {isItemExpanded !== false && (
                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                              <p className="text-[11px] text-muted-foreground">
                                {t('trajectory.injectedPromptsDesc')}
                              </p>

                              {/* Individual Injected Components */}
                              <div className="space-y-2.5">
                                {parts.map((part, pIdx) => {
                                  const partId = `${eventId}-part-${pIdx}`;
                                  const isPartExpanded = expandedItems[partId] !== false;
                                  const isCopied = copiedId === partId;

                                  let IconComponent = Terminal;
                                  let typeBadgeClass = 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
                                  let typeLabel = part.type;

                                  if (part.type === 'project') {
                                    IconComponent = FolderKanban;
                                    typeBadgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                                    typeLabel = t('trajectory.projectInstructions');
                                  } else if (part.type === 'persona') {
                                    IconComponent = Bot;
                                    typeBadgeClass = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
                                    typeLabel = t('trajectory.activePersona');
                                  } else if (part.type === 'workspace') {
                                    IconComponent = Layers;
                                    typeBadgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
                                    typeLabel = t('trajectory.workspaceRules');
                                  } else if (part.type === 'harness') {
                                    IconComponent = Zap;
                                    typeBadgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                                    typeLabel = t('trajectory.codingHarness');
                                  } else if (part.type === 'canvas') {
                                    IconComponent = FileText;
                                    typeBadgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
                                    typeLabel = t('trajectory.canvasDocContext');
                                  }

                                  return (
                                    <div
                                      key={partId}
                                      className="rounded-lg border border-border/80 bg-background/80 p-2.5 space-y-2 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div
                                          className="flex items-center gap-2 cursor-pointer select-none min-w-0"
                                          onClick={() => toggleItem(partId)}
                                        >
                                          <IconComponent className="w-3.5 h-3.5 text-primary shrink-0" />
                                          <span className="font-semibold text-foreground text-[11px] truncate">
                                            {part.title}
                                          </span>
                                          <span className={`px-1.5 py-0.2 rounded text-[9px] border font-medium uppercase tracking-wider ${typeBadgeClass}`}>
                                            {typeLabel}
                                          </span>
                                          <span className="text-muted-foreground text-[10px]">
                                            {isPartExpanded ? '▲' : '▼'}
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleCopy(part.raw || part.content, partId)}
                                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors cursor-pointer"
                                          title={t('trajectory.copyInjectedPrompt')}
                                        >
                                          {isCopied ? (
                                            <>
                                              <Check className="w-3 h-3 text-emerald-500" />
                                              <span className="text-emerald-500 font-medium">{t('trajectory.copied')}</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3 h-3" />
                                              <span>{t('trajectory.copyArguments')}</span>
                                            </>
                                          )}
                                        </button>
                                      </div>

                                      {isPartExpanded && (
                                        <div className="space-y-2">
                                          {part.selectedText && (
                                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] font-mono whitespace-pre-wrap">
                                              <span className="font-bold text-[10px] block text-amber-700 dark:text-amber-400 mb-0.5">
                                                {t('trajectory.canvasSelection')}:
                                              </span>
                                              &ldquo;{part.selectedText}&rdquo;
                                            </div>
                                          )}

                                          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 font-mono text-[11px] whitespace-pre-wrap text-foreground/90 max-h-48 overflow-y-auto select-text leading-relaxed">
                                            {part.content}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Consolidated System Prompt (role: system) Payload */}
                              {event.systemPrompt && (
                                <div className="rounded-lg border border-border/80 bg-background/80 p-2.5 space-y-2 shadow-2xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <div
                                      className="flex items-center gap-2 cursor-pointer select-none min-w-0"
                                      onClick={() => toggleItem(`${eventId}-payload`)}
                                    >
                                      <Code className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <span className="font-semibold text-foreground text-[11px] truncate">
                                        {t('trajectory.consolidatedSystemPayload')}
                                      </span>
                                      {totalChars > 0 && (
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          ({t('trajectory.charsAndWords', { chars: totalChars, words: totalWords })})
                                        </span>
                                      )}
                                      <span className="text-muted-foreground text-[10px]">
                                        {expandedItems[`${eventId}-payload`] ? '▲' : '▼'}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleCopy(event.systemPrompt, `${eventId}-payload-copy`)}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors cursor-pointer"
                                      title={t('trajectory.copyInjectedPrompt')}
                                    >
                                      {copiedId === `${eventId}-payload-copy` ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-500" />
                                          <span className="text-emerald-500 font-medium">{t('trajectory.copied')}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>{t('trajectory.copyArguments')}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {expandedItems[`${eventId}-payload`] && (
                                    <div className="p-2.5 rounded-lg bg-muted/60 border border-border/60 font-mono text-[10px] whitespace-pre-wrap text-muted-foreground max-h-60 overflow-y-auto select-text leading-relaxed">
                                      {event.systemPrompt}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 2. USER EVENT
                  if (event.type === 'user') {
                    const textContent = typeof event.content === 'string'
                      ? event.content
                      : Array.isArray(event.content)
                        ? event.content.filter(p => p.type === 'text').map(p => p.text).join('\n')
                        : '';

                    const images = Array.isArray(event.content)
                      ? event.content.filter(p => p.type === 'image_url')
                      : [];

                    return (
                      <div key={eventId} className="pt-2 first:pt-0 flex items-start gap-3">
                        <span className="shrink-0 px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                          {t('trajectory.user')}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="font-normal text-foreground whitespace-pre-wrap leading-relaxed">
                            {textContent}
                          </div>
                          {images.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img.image_url?.url}
                                  alt="Attachment"
                                  className="w-16 h-16 object-cover rounded-md border border-border"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 3. ASSISTANT EVENT
                  if (event.type === 'assistant') {
                    const rawContent = event.content || '';
                    const thinkResult = extractThinking(typeof rawContent === 'string' ? rawContent : '');
                    const cleanText = thinkResult.cleanContent || (typeof rawContent === 'string' ? rawContent : '');
                    const thinkingText = event.liveReasoning || event.reasoning || thinkResult.thinking;
                    const isToolOnly = !cleanText.trim() && !thinkingText;

                    return (
                      <div key={eventId} className="pt-2 first:pt-0 flex items-start gap-3">
                        <span className="shrink-0 px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                          {t('trajectory.assistant')}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {thinkingText && (
                            <div className="p-2 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30 text-purple-900 dark:text-purple-200 text-[11px] font-sans">
                              <div 
                                className="flex items-center justify-between font-semibold cursor-pointer select-none pb-1"
                                onClick={() => toggleItem(`${eventId}-think`)}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span>💭 {t('trajectory.model')}</span>
                                  {event.reasoningDuration && (
                                    <span className="text-muted-foreground font-normal font-mono">
                                      ({formatDuration(event.reasoningDuration * 1000)})
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {expandedItems[`${eventId}-think`] ? '▲' : '▼'}
                                </span>
                              </div>
                              {expandedItems[`${eventId}-think`] !== false && (
                                <div className="mt-1 whitespace-pre-wrap leading-relaxed opacity-90 max-h-48 overflow-y-auto">
                                  {thinkingText}
                                </div>
                              )}
                            </div>
                          )}

                          {cleanText.trim() ? (
                            <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                              {cleanText}
                            </div>
                          ) : isToolOnly ? (
                            <div className="text-muted-foreground/70 italic font-mono text-[11px]">
                              {t('trajectory.toolCallOnly')}
                            </div>
                          ) : null}

                          {/* Token Breakdown Inspector Section */}
                          {(() => {
                            const hasUsage = Boolean(event.usage && (event.usage.prompt_tokens || event.usage.total_tokens || event.usage.completion_tokens));
                            if (!hasUsage) return null;

                            const promptTokens = event.usage?.prompt_tokens || 0;
                            const completionTokens = event.usage?.completion_tokens || 0;
                            const totalTokens = event.usage?.total_tokens || (promptTokens + completionTokens);

                            const breakdown = getTurnBreakdown(event, turn, mcpTools);
                            const toolsTokens = breakdown?.tools?.estimated_tokens || 0;
                            const toolsCount = breakdown?.tools?.count || (mcpTools ? mcpTools.length : 0);
                            const _toolsList = breakdown?.tools?.tools || [];
                            const systemTokens = breakdown?.system?.estimated_tokens || 0;
                            const userTokens = breakdown?.user_input?.estimated_tokens || 0;

                            const toolsPct = totalTokens > 0 ? Math.round((toolsTokens / totalTokens) * 100) : 0;
                            const systemPct = totalTokens > 0 ? Math.round((systemTokens / totalTokens) * 100) : 0;
                            const userPct = totalTokens > 0 ? Math.round((userTokens / totalTokens) * 100) : 0;
                            const completionPct = totalTokens > 0 ? Math.max(1, 100 - toolsPct - systemPct - userPct) : 0;

                            return (
                              <div className="mt-2.5 pt-2 border-t border-border/40">
                                <div
                                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/60 hover:bg-muted/50 cursor-pointer select-none transition-colors"
                                  onClick={() => toggleItem(`${eventId}-tokens`)}
                                >
                                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                                      <Activity className="w-3.5 h-3.5 text-primary" />
                                      <span>{t('trajectory.tokenAuditTitle')}</span>
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
                                      {formatNumber(totalTokens)} {t('trajectory.tokensUnit')}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      (📥 {formatNumber(promptTokens)} {t('trajectory.promptTokensLabel')} · 📤 {formatNumber(completionTokens)} {t('trajectory.completionTokensLabel')})
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-sans">
                                    <span>{expandedItems[`${eventId}-tokens`] ? t('trajectory.hideTokenBreakdown') : t('trajectory.viewTokenBreakdown')}</span>
                                    <span>{expandedItems[`${eventId}-tokens`] ? '▲' : '▼'}</span>
                                  </div>
                                </div>

                                {expandedItems[`${eventId}-tokens`] && (
                                  <div className="mt-2 p-3 rounded-xl bg-card border border-border space-y-3 shadow-2xs">
                                    {/* Proportional Colored Stacked Bar */}
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                                        <span>Distribuição de Consumo</span>
                                        <span>Total: {formatNumber(totalTokens)} tokens</span>
                                      </div>
                                      <div className="h-3 w-full rounded-full bg-muted/60 flex overflow-hidden border border-border/60">
                                        {toolsPct > 0 && <div style={{ width: `${toolsPct}%` }} className="bg-amber-500 hover:opacity-90 transition-all" title={`Ferramentas/MCP: ${toolsPct}% (~${formatNumber(toolsTokens)} tk)`} />}
                                        {systemPct > 0 && <div style={{ width: `${systemPct}%` }} className="bg-blue-500 hover:opacity-90 transition-all" title={`Sistema/Contexto: ${systemPct}% (~${formatNumber(systemTokens)} tk)`} />}
                                        {userPct > 0 && <div style={{ width: `${userPct}%` }} className="bg-emerald-500 hover:opacity-90 transition-all" title={`Entrada/Histórico: ${userPct}% (~${formatNumber(userTokens)} tk)`} />}
                                        {completionPct > 0 && <div style={{ width: `${completionPct}%` }} className="bg-purple-500 hover:opacity-90 transition-all" title={`Geração: ${completionPct}% (~${formatNumber(completionTokens)} tk)`} />}
                                      </div>
                                    </div>

                                    {/* 4 Cards Breakdown Grid */}
                                    <div className="grid grid-cols-1 gap-2.5 text-[11px]">
                                      {/* 1. Ferramentas & MCPs */}
                                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden transition-all shadow-2xs">
                                        <div 
                                          className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-amber-500/10 select-none transition-colors"
                                          onClick={() => toggleItem(`${eventId}-card-tools`)}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                                            <div className="min-w-0">
                                              <span className="font-semibold text-amber-800 dark:text-amber-200">
                                                {t('trajectory.toolSchemas')}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground ml-2">
                                                ({toolsCount > 0 ? t('trajectory.activeToolsCount', { count: toolsCount }) : t('trajectory.toolSchemasDesc')})
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 font-mono shrink-0">
                                            <span className="font-bold text-amber-800 dark:text-amber-200">
                                              ~{formatNumber(toolsTokens)} tk ({toolsPct}%)
                                            </span>
                                            <span className="text-muted-foreground text-[10px]">
                                              {expandedItems[`${eventId}-card-tools`] ? '▲' : '▼'}
                                            </span>
                                          </div>
                                        </div>

                                        {expandedItems[`${eventId}-card-tools`] && (
                                          <div className="p-3 pt-2.5 space-y-2.5 border-t border-amber-500/20 bg-background/50">
                                            {/* Tool Items Detailed List */}
                                            <div className="space-y-2">
                                              {(breakdown?.tools?.items || []).map((toolItem, tIdx) => {
                                                const schemaId = `${eventId}-tool-schema-${tIdx}`;
                                                const isSchemaOpen = expandedItems[schemaId];
                                                const isCopied = copiedId === schemaId;

                                                return (
                                                  <div
                                                    key={schemaId}
                                                    className="p-2.5 rounded-lg border border-border/80 bg-card space-y-1.5 shadow-2xs"
                                                  >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                                                        <Code className="w-3.5 h-3.5 text-primary shrink-0" />
                                                        <span className="font-mono font-bold text-foreground text-xs">
                                                          {toolItem.name}
                                                        </span>
                                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium border ${
                                                          toolItem.isNative
                                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                                        }`}>
                                                          {toolItem.category}
                                                        </span>
                                                      </div>

                                                      <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono text-muted-foreground">
                                                          ~{formatNumber(toolItem.estimated_tokens)} {t('trajectory.tokensUnit')}
                                                        </span>
                                                        <button
                                                          type="button"
                                                          onClick={() => toggleItem(schemaId)}
                                                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                                                        >
                                                          {isSchemaOpen ? 'Ocultar Schema' : t('trajectory.viewToolSchema')}
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() => handleCopy(toolItem.rawJson, schemaId)}
                                                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                                          title={t('trajectory.copySchema')}
                                                        >
                                                          {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                      </div>
                                                    </div>

                                                    {toolItem.description && (
                                                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        {toolItem.description}
                                                      </p>
                                                    )}

                                                    {isSchemaOpen && (
                                                      <div className="mt-2 rounded-lg bg-zinc-950 p-2.5 font-mono text-[11px] text-zinc-200 border border-zinc-800 overflow-x-auto max-h-56">
                                                        <pre>{toolItem.rawJson}</pre>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* 2. Sistema & Contexto Injetado */}
                                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 overflow-hidden transition-all shadow-2xs">
                                        <div 
                                          className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-blue-500/10 select-none transition-colors"
                                          onClick={() => toggleItem(`${eventId}-card-system`)}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                                            <div className="min-w-0">
                                              <span className="font-semibold text-blue-800 dark:text-blue-200">
                                                {t('trajectory.systemAndContext')}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground ml-2">
                                                ({t('trajectory.systemAndContextDesc')})
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 font-mono shrink-0">
                                            <span className="font-bold text-blue-800 dark:text-blue-200">
                                              ~{formatNumber(systemTokens)} tk ({systemPct}%)
                                            </span>
                                            <span className="text-muted-foreground text-[10px]">
                                              {expandedItems[`${eventId}-card-system`] ? '▲' : '▼'}
                                            </span>
                                          </div>
                                        </div>

                                        {expandedItems[`${eventId}-card-system`] && (
                                          <div className="p-3 pt-0 space-y-2 border-t border-blue-500/20 bg-background/50">
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="font-semibold text-foreground">
                                                {t('trajectory.fullSystemPrompt')}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleCopy(breakdown?.system?.rawContent, `${eventId}-sys-copy`)}
                                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border flex items-center gap-1 cursor-pointer"
                                              >
                                                {copiedId === `${eventId}-sys-copy` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                <span>{copiedId === `${eventId}-sys-copy` ? t('trajectory.copied') : t('trajectory.copyInjectedPrompt')}</span>
                                              </button>
                                            </div>
                                            <div className="p-2.5 rounded-lg bg-zinc-950 text-zinc-200 font-mono text-[11px] border border-zinc-800 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                                              {breakdown?.system?.rawContent || 'N/A'}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* 3. Entrada do Usuário & Histórico */}
                                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 overflow-hidden transition-all shadow-2xs">
                                        <div 
                                          className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-emerald-500/10 select-none transition-colors"
                                          onClick={() => toggleItem(`${eventId}-card-user`)}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <div className="min-w-0">
                                              <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                                                {t('trajectory.userAndHistory')}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground ml-2">
                                                ({t('trajectory.userAndHistoryDesc')})
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 font-mono shrink-0">
                                            <span className="font-bold text-emerald-800 dark:text-emerald-200">
                                              ~{formatNumber(userTokens)} tk ({userPct}%)
                                            </span>
                                            <span className="text-muted-foreground text-[10px]">
                                              {expandedItems[`${eventId}-card-user`] ? '▲' : '▼'}
                                            </span>
                                          </div>
                                        </div>

                                        {expandedItems[`${eventId}-card-user`] && (
                                          <div className="p-3 pt-0 space-y-2 border-t border-emerald-500/20 bg-background/50">
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="font-semibold text-foreground">
                                                {t('trajectory.userMessagePayload')}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleCopy(breakdown?.user_input?.content, `${eventId}-usr-copy`)}
                                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border flex items-center gap-1 cursor-pointer"
                                              >
                                                {copiedId === `${eventId}-usr-copy` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                <span>{copiedId === `${eventId}-usr-copy` ? t('trajectory.copied') : 'Copiar Entrada'}</span>
                                              </button>
                                            </div>
                                            <div className="p-2.5 rounded-lg bg-zinc-950 text-zinc-200 font-mono text-[11px] border border-zinc-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                                              {typeof breakdown?.user_input?.content === 'string'
                                                ? breakdown.user_input.content
                                                : JSON.stringify(breakdown?.user_input?.content || '', null, 2)}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* 4. Resposta Gerada (Saída) */}
                                      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 overflow-hidden transition-all shadow-2xs">
                                        <div 
                                          className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-purple-500/10 select-none transition-colors"
                                          onClick={() => toggleItem(`${eventId}-card-comp`)}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <Cpu className="w-4 h-4 text-purple-500 shrink-0" />
                                            <div className="min-w-0">
                                              <span className="font-semibold text-purple-800 dark:text-purple-200">
                                                {t('trajectory.modelCompletion')}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground ml-2">
                                                ({t('trajectory.modelCompletionDesc')})
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 font-mono shrink-0">
                                            <span className="font-bold text-purple-800 dark:text-purple-200">
                                              {formatNumber(completionTokens)} tk ({completionPct}%)
                                            </span>
                                            <span className="text-muted-foreground text-[10px]">
                                              {expandedItems[`${eventId}-card-comp`] ? '▲' : '▼'}
                                            </span>
                                          </div>
                                        </div>

                                        {expandedItems[`${eventId}-card-comp`] && (
                                          <div className="p-3 pt-0 space-y-2 border-t border-purple-500/20 bg-background/50">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] font-mono">
                                              <div className="p-2 rounded-md bg-purple-500/10 border border-purple-500/20">
                                                <span className="text-[10px] text-muted-foreground block">{t('trajectory.contentTokensLabel')}</span>
                                                <span className="font-bold text-purple-700 dark:text-purple-300">{formatNumber(breakdown?.completion?.content_tokens || completionTokens)} tk</span>
                                              </div>
                                              <div className="p-2 rounded-md bg-purple-500/10 border border-purple-500/20">
                                                <span className="text-[10px] text-muted-foreground block">{t('trajectory.reasoningTokensLabel')}</span>
                                                <span className="font-bold text-purple-700 dark:text-purple-300">{formatNumber(breakdown?.completion?.reasoning_tokens || 0)} tk</span>
                                              </div>
                                              {breakdown?.completion?.tokens_per_sec > 0 && (
                                                <div className="p-2 rounded-md bg-purple-500/10 border border-purple-500/20">
                                                  <span className="text-[10px] text-muted-foreground block">Velocidade</span>
                                                  <span className="font-bold text-purple-700 dark:text-purple-300">{breakdown.completion.tokens_per_sec} t/s</span>
                                                </div>
                                              )}
                                              {breakdown?.completion?.ttft > 0 && (
                                                <div className="p-2 rounded-md bg-purple-500/10 border border-purple-500/20">
                                                  <span className="text-[10px] text-muted-foreground block">TTFT</span>
                                                  <span className="font-bold text-purple-700 dark:text-purple-300">{Math.round(breakdown.completion.ttft)}ms</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  }

                  // 4. TOOL EVENT
                  if (event.type === 'tool') {
                    const isError = Boolean(event.error || event.status === 'error' || event.status === 'aborted');
                    const signature = formatToolCallSignature(event.name, event.arguments);
                    const snippet = getToolResultSnippet(event);
                    const isRunning = event.status === 'running';

                    return (
                      <div key={eventId} className="pt-2 first:pt-0 flex items-start gap-3">
                        <span 
                          className={`shrink-0 px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider border ${
                            isError
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                              : isRunning
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {t('trajectory.tool')}
                        </span>

                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Top row: Signature + Result Snippet + Duration */}
                          <div 
                            className="flex items-baseline justify-between gap-2 cursor-pointer font-mono hover:text-foreground group py-0.5 select-none"
                            onClick={() => toggleItem(eventId)}
                          >
                            <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
                              <span className="font-semibold text-foreground truncate">
                                {signature}
                              </span>
                              <span className="text-muted-foreground/60 shrink-0">→</span>
                              <span 
                                className={`truncate text-[11px] ${
                                  isError 
                                    ? 'text-red-500 font-semibold' 
                                    : isRunning 
                                      ? 'text-amber-500 italic' 
                                      : 'text-muted-foreground'
                                }`}
                              >
                                {snippet}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {event.durationMs && (
                                <span className="text-[10px] text-muted-foreground/70 font-mono">
                                  {formatDuration(event.durationMs)}
                                </span>
                              )}
                              <button className="text-muted-foreground group-hover:text-foreground">
                                {isItemExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Tool Details */}
                          {isItemExpanded && (
                            <div className="mt-2 space-y-2.5 p-3 rounded-xl bg-card border border-border/80 text-foreground font-mono animate-in fade-in-0 duration-150">
                              {/* Arguments */}
                              <div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-sans font-semibold mb-1">
                                  <span>{t('trajectory.arguments')}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(event.arguments, `${eventId}-args`)}
                                    className="flex items-center gap-1 hover:text-foreground text-[10px]"
                                  >
                                    {copiedId === `${eventId}-args` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedId === `${eventId}-args` ? t('trajectory.copied') : t('trajectory.copyArguments')}</span>
                                  </button>
                                </div>
                                <div className="p-2 rounded-lg bg-muted/50 border border-border/60 text-[11px] overflow-x-auto max-h-48">
                                  <pre className="whitespace-pre-wrap break-all">
                                    {typeof event.arguments === 'string' ? event.arguments : JSON.stringify(event.arguments, null, 2)}
                                  </pre>
                                </div>
                              </div>

                              {/* Error / stderr (if any) */}
                              {isError && event.error && (
                                <div>
                                  <div className="text-[11px] text-red-500 font-sans font-semibold mb-1 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{t('trajectory.errorLabel')}</span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                                    {event.error}
                                  </div>
                                </div>
                              )}

                              {/* Result Output */}
                              {event.result !== undefined && event.result !== null && (
                                <div>
                                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-sans font-semibold mb-1">
                                    <span>{t('trajectory.output')}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(event.result, `${eventId}-res`)}
                                      className="flex items-center gap-1 hover:text-foreground text-[10px]"
                                    >
                                      {copiedId === `${eventId}-res` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                      <span>{copiedId === `${eventId}-res` ? t('trajectory.copied') : t('trajectory.copyOutput')}</span>
                                    </button>
                                  </div>
                                  <div className="p-2 rounded-lg bg-muted/50 border border-border/60 text-[11px] overflow-x-auto max-h-60">
                                    <pre className="whitespace-pre-wrap break-all">
                                      {typeof event.result === 'string' ? event.result : JSON.stringify(event.result, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

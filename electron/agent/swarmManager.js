/**
 * SwarmManager - Multi-Agent Teams & Swarm Subagents Orchestrator for Neo Agent Runtime.
 */

const EventEmitter = require('events');
const { modelRouter } = require('./modelRouter');

const SWARM_ROLES = {
  ARCHITECT: {
    id: 'architect',
    name: 'Lead System Architect',
    description: 'Specializes in high-level system design, modularity, patterns, and technical trade-offs.',
    systemPrompt: 'You are the Lead System Architect. Your role is to analyze requirements, define clean architecture, ensure modularity, scalability, and evaluate technical trade-offs with utmost precision.'
  },
  CODER: {
    id: 'coder',
    name: 'Senior Implementation Engineer',
    description: 'Specializes in writing clean, idiomatic, robust, and performant code.',
    systemPrompt: 'You are the Senior Implementation Engineer. Your role is to produce production-grade, modular, self-contained, and bug-free code meeting all functional requirements.'
  },
  REVIEWER: {
    id: 'reviewer',
    name: 'Principal Code Reviewer',
    description: 'Specializes in code quality, error handling, maintainability, and standard compliance.',
    systemPrompt: 'You are the Principal Code Reviewer. Your role is to perform rigorous code reviews, point out potential bugs, edge cases, performance bottlenecks, and style/clean code improvements.'
  },
  SECURITY: {
    id: 'security',
    name: 'Security & Vulnerability Auditor',
    description: 'Specializes in security auditing, safe input handling, OWASP best practices, and data integrity.',
    systemPrompt: 'You are the Security Auditor. Your role is to scrutinize architecture and code for vulnerabilities (injections, access controls, secrets leakage, insecure dependencies) and propose concrete hardening measures.'
  },
  TESTER: {
    id: 'tester',
    name: 'QA & Test Automation Specialist',
    description: 'Specializes in test strategy, edge cases, unit tests, and regression prevention.',
    systemPrompt: 'You are the QA Specialist. Your role is to design exhaustive test scenarios, identify tricky boundary conditions, and produce automated unit/integration test suites.'
  },
  DEVOPS: {
    id: 'devops',
    name: 'DevOps & Cloud SRE',
    description: 'Specializes in cloud infrastructure, CI/CD pipelines, Docker, Kubernetes, and reliability engineering.',
    systemPrompt: 'You are the DevOps & Cloud Infrastructure Lead. Your role is to design scalable deployment architectures, CI/CD automation pipelines, containerization strategies, and site reliability practices.'
  },
  DATA_SCIENTIST: {
    id: 'data_scientist',
    name: 'Data Scientist & AI Specialist',
    description: 'Specializes in data analysis, machine learning models, statistical inference, and ETL pipelines.',
    systemPrompt: 'You are the Senior Data Scientist & AI Specialist. Your role is to analyze data flows, recommend ML algorithms, evaluate statistical significance, design data models, and extract actionable intelligence.'
  },
  MARKETING_EDITOR: {
    id: 'marketing_editor',
    name: 'Editor de Marketing & Estrategista',
    description: 'Especialista em estratégia de marketing digital, posicionamento de marca, funis de conversão e campanhas.',
    systemPrompt: 'Você é o Diretor / Editor Chefe de Marketing e Estrategista Digital. Sua função é desenhar estratégias de atração, conversão e retenção, analisar canais de aquisição, posicionamento de marca e mensurar métricas de engajamento e CAC/LTV.'
  },
  COPYWRITER: {
    id: 'copywriter',
    name: 'Copywriter & Redator Persuasivo',
    description: 'Especialista em textos persuasivos de alta conversão, storytelling, headlines de impacto e chamadas para ação (CTAs).',
    systemPrompt: 'Você é um Copywriter e Redator Publicitário de elite. Sua missão é criar textos persuasivos, ganchos magnéticos, narrativas envolventes e chamadas para ação irresistíveis aplicando princípios de psicologia de consumo e copywriting de resposta direta.'
  },
  SEO_SPECIALIST: {
    id: 'seo_specialist',
    name: 'Especialista em SEO & Tráfego',
    description: 'Especialista em otimização para motores de busca, arquitetura de conteúdo e tráfego orgânico.',
    systemPrompt: 'Você é um Especialista Sênior em SEO e Tráfego Orgânico. Sua função é mapear intenção de busca, arquitetura de conteúdo, palavras-chave de alto valor, SEO técnico e estratégias de link building.'
  },
  SOCIAL_MEDIA: {
    id: 'social_media',
    name: 'Social Media & Gestor de Comunidade',
    description: 'Especialista em engajamento social, estratégias de conteúdo viral, calendário editorial e comunidade.',
    systemPrompt: 'Você é um Estrategista de Redes Sociais e Conteúdo Viral. Sua função é criar calendários editoriais, formatos de postagens de alto engajamento, estratégias de crescimento e conexão com a comunidade.'
  },
  LAWYER: {
    id: 'lawyer',
    name: 'Advogado & Consultor Jurídico',
    description: 'Especialista em conformidade legal, análise de riscos regulatórios, contratos e proteção de dados (LGPD/GDPR).',
    systemPrompt: 'Você é um Consultor Jurídico e Advogado Sênior. Sua função é analisar riscos legais, termos de serviço, políticas de privacidade, conformidade com a LGPD/GDPR, contratos e propor salvaguardas jurídicas robustas.'
  },
  FINANCE: {
    id: 'finance',
    name: 'Especialista Financeiro / CFO',
    description: 'Especialista em modelagem financeira, viabilidade econômica, ROI, fluxo de caixa e precificação.',
    systemPrompt: 'Você é um Especialista Financeiro / CFO Estratégico. Sua função é avaliar a viabilidade econômica, estrutura de custos, projeção de receitas, retorno sobre investimento (ROI), precificação e sustentabilidade fiscal.'
  },
  PRODUCT_MANAGER: {
    id: 'product_manager',
    name: 'Product Manager & Estrategista',
    description: 'Especialista em visão de produto, priorização RICE/MoSCoW, métricas de negócio e descoberta de produto.',
    systemPrompt: 'Você é o Principal Product Manager (PM). Sua missão é alinhar necessidades do usuário aos objetivos de negócio, definir critérios de aceitação, priorizar features com base em valor e impacto, e orquestrar o roadmap.'
  },
  UX_DESIGNER: {
    id: 'ux_designer',
    name: 'UX / UI Strategist & Design Lead',
    description: 'Especialista em usabilidade, arquitetura de informação, jornadas de usuário e design intuitivo.',
    systemPrompt: 'Você é o Lead UX/UI Designer. Sua função é mapear fluxos e jornadas de usuário intuitivas, resolver fricções de usabilidade, projetar interfaces acessíveis e garantir uma experiência de excelência.'
  },
  RESEARCHER: {
    id: 'researcher',
    name: 'Pesquisador & Analista Científico',
    description: 'Especialista em investigação profunda, análise crítica, síntese de literatura e embasamento teórico.',
    systemPrompt: 'Você é um Pesquisador Científico e Analista de Inteligência. Sua função é conduzir investigações minuciosas, checar fontes, sintetizar dados complexos e fornecer análises comparativas fundamentadas.'
  }
};

const SWARM_MODES = {
  PARALLEL: 'parallel', // Run all selected agents in parallel, then synthesize
  PIPELINE: 'pipeline', // Run sequentially (e.g. Architect -> Coder -> Reviewer)
  DEBATE: 'debate'      // Multi-round critique & synthesis
};

class SwarmManager extends EventEmitter {
  constructor() {
    super();
    this.activeRuns = new Map();
  }

  getRoles() {
    return Object.values(SWARM_ROLES);
  }

  getModes() {
    return Object.values(SWARM_MODES);
  }

  /**
   * Run a swarm multi-agent team task.
   * @param {object} params
   * @param {string} params.swarmId
   * @param {string} params.prompt
   * @param {Array<string|object>} params.roles Array of role IDs or role objects
   * @param {Array<object>} [params.customRoles] Array of custom role objects { id, name, description, systemPrompt }
   * @param {string} [params.mode='parallel'] 'parallel' | 'pipeline' | 'debate'
   * @param {string} [params.model] Default model for agents
   * @param {object} [params.settings] App/Provider settings
   * @param {string} [params.workspaceRoot] Current workspace directory
   * @param {function} [params.onProgress] Optional callback for streaming events
   * @returns {Promise<object>}
   */
  async runTeam({
    swarmId = `swarm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    prompt,
    roles = ['architect', 'coder', 'reviewer'],
    customRoles = [],
    mode = SWARM_MODES.PARALLEL,
    model,
    settings = {},
    workspaceRoot = process.cwd(),
    onProgress
  }) {
    const abortController = new AbortController();
    this.activeRuns.set(swarmId, { abortController, status: 'running' });

    const emitEvent = (event, data) => {
      this.emit(event, { swarmId, ...data });
      if (typeof onProgress === 'function') {
        onProgress({ event, swarmId, ...data });
      }
    };

    try {
      emitEvent('swarm:started', {
        swarmId,
        mode,
        roles,
        timestamp: Date.now()
      });

      const customRolesMap = new Map();
      if (Array.isArray(customRoles)) {
        for (const cr of customRoles) {
          if (cr && cr.id) customRolesMap.set(cr.id.toLowerCase(), cr);
        }
      }

      const selectedRoles = roles.map(roleItem => {
        if (typeof roleItem === 'object' && roleItem !== null && roleItem.id) {
          return {
            id: roleItem.id,
            name: roleItem.name || roleItem.id,
            description: roleItem.description || '',
            systemPrompt: roleItem.systemPrompt || `Você é um especialista em ${roleItem.name || roleItem.id}. Forneça uma análise estruturada, profunda e acionável.`
          };
        }
        const idStr = String(roleItem);
        const builtIn = SWARM_ROLES[idStr.toUpperCase()] ||
          Object.values(SWARM_ROLES).find(br => br.id.toLowerCase() === idStr.toLowerCase());
        if (builtIn) return builtIn;
        if (customRolesMap.has(idStr.toLowerCase())) {
          return customRolesMap.get(idStr.toLowerCase());
        }
        return {
          id: idStr,
          name: idStr,
          description: '',
          systemPrompt: `Você é um especialista em ${idStr}. Forneça uma análise profunda e recomendações acionáveis.`
        };
      });

      let agentResults = [];

      if (mode === SWARM_MODES.PIPELINE) {
        // Sequential execution
        let accumulatedContext = `Task: ${prompt}\n\n`;
        for (const role of selectedRoles) {
          if (abortController.signal.aborted) break;

          emitEvent('swarm:agent_started', { role: role.id, roleName: role.name });

          const agentOutput = await this._executeAgent({
            role,
            prompt: accumulatedContext,
            model,
            settings,
            workspaceRoot,
            abortController,
            onChunk: (chunk) => emitEvent('swarm:agent_chunk', { role: role.id, chunk })
          });

          agentResults.push({ role: role.id, roleName: role.name, output: agentOutput });
          accumulatedContext += `\n\n--- Output from ${role.name} ---\n${agentOutput}\n`;
          emitEvent('swarm:agent_completed', { role: role.id, output: agentOutput });
        }
      } else if (mode === SWARM_MODES.DEBATE) {
        // Multi-round debate between selected roles
        const round1Outputs = await Promise.all(
          selectedRoles.map(async (role) => {
            emitEvent('swarm:agent_started', { role: role.id, roleName: role.name, round: 1 });
            const output = await this._executeAgent({
              role,
              prompt: `Objective: ${prompt}\nProvide your initial comprehensive perspective.`,
              model,
              settings,
              workspaceRoot,
              abortController,
              onChunk: (chunk) => emitEvent('swarm:agent_chunk', { role: role.id, round: 1, chunk })
            });
            emitEvent('swarm:agent_completed', { role: role.id, round: 1, output });
            return { role: role.id, roleName: role.name, output };
          })
        );

        // Round 2: Critique each other's outputs
        const summaryContext = round1Outputs
          .map(r => `[${r.roleName} Initial Output]:\n${r.output}`)
          .join('\n\n');

        const round2Outputs = await Promise.all(
          selectedRoles.map(async (role) => {
            emitEvent('swarm:agent_started', { role: role.id, roleName: role.name, round: 2 });
            const critique = await this._executeAgent({
              role,
              prompt: `Objective: ${prompt}\n\nHere are the perspectives from all team members:\n${summaryContext}\n\nReview and critique the proposals. Identify edge cases, flaws, and refine your recommendations into a final refined stance.`,
              model,
              settings,
              workspaceRoot,
              abortController,
              onChunk: (chunk) => emitEvent('swarm:agent_chunk', { role: role.id, round: 2, chunk })
            });
            emitEvent('swarm:agent_completed', { role: role.id, round: 2, output: critique });
            return { role: role.id, roleName: role.name, round1: round1Outputs.find(r => r.role === role.id)?.output, output: critique };
          })
        );
        agentResults = round2Outputs;
      } else {
        // Parallel execution
        agentResults = await Promise.all(
          selectedRoles.map(async (role) => {
            emitEvent('swarm:agent_started', { role: role.id, roleName: role.name });
            const output = await this._executeAgent({
              role,
              prompt,
              model,
              settings,
              workspaceRoot,
              abortController,
              onChunk: (chunk) => emitEvent('swarm:agent_chunk', { role: role.id, chunk })
            });
            emitEvent('swarm:agent_completed', { role: role.id, output });
            return { role: role.id, roleName: role.name, output };
          })
        );
      }

      if (abortController.signal.aborted) {
        emitEvent('swarm:cancelled', { swarmId });
        return { status: 'cancelled', swarmId, results: agentResults };
      }

      // Final Synthesis
      emitEvent('swarm:synthesis_started', { swarmId });
      const synthesis = await this._synthesizeResults({
        prompt,
        results: agentResults,
        model,
        settings,
        abortController,
        onChunk: (chunk) => emitEvent('swarm:synthesis_chunk', { chunk })
      });

      emitEvent('swarm:completed', {
        swarmId,
        results: agentResults,
        synthesis,
        timestamp: Date.now()
      });

      return {
        status: 'completed',
        swarmId,
        results: agentResults,
        synthesis
      };
    } catch (error) {
      emitEvent('swarm:error', { swarmId, error: error.message });
      throw error;
    } finally {
      this.activeRuns.delete(swarmId);
    }
  }

  cancel(swarmId) {
    const run = this.activeRuns.get(swarmId);
    if (run && run.abortController) {
      run.abortController.abort();
      run.status = 'cancelled';
      return true;
    }
    return false;
  }

  async _executeAgent({ role, prompt, model, settings, workspaceRoot, abortController, onChunk }) {
    let fullOutput = '';
    const systemPrompt = `${role.systemPrompt}\nWorkspace Directory: ${workspaceRoot}\nFocus strictly on your domain expertise. Provide structured, actionable, and in-depth output.`;

    const messages = [
      { role: 'user', content: prompt }
    ];

    try {
      const response = await modelRouter.streamCompletion({
        messages,
        model: model || settings.selectedModel,
        settings,
        systemPrompt,
        signal: abortController.signal,
        callbacks: { onToken: (chunk) => {
          if (typeof chunk === 'string') {
            fullOutput += chunk;
            if (onChunk) onChunk(chunk);
          } else if (chunk?.content) {
            fullOutput += chunk.content;
            if (onChunk) onChunk(chunk.content);
          }
        } }
      });

      if (!response?.success) throw new Error(response?.error || 'Agent model request failed');
      return fullOutput || response?.message?.content || '';
    } catch (err) {
      if (abortController.signal.aborted) {
        return fullOutput || '[Agent execution cancelled]';
      }
      return `[Agent Error (${role.name})]: ${err.message}`;
    }
  }

  async _synthesizeResults({ prompt, results, model, settings, abortController, onChunk }) {
    let fullSynthesis = '';
    const contributionsText = results
      .map(r => `### ${r.roleName} Analysis:\n${r.output}`)
      .join('\n\n');

    const synthesisPrompt = `Original User Goal:\n${prompt}\n\nTeam Member Analyses:\n${contributionsText}\n\nPlease synthesize all team analyses into an authoritative, unified, and cohesive master execution plan and solution. Highlight consensus, resolve conflicting recommendations, and present the final polished solution with clear code/instructions.`;

    const messages = [
      { role: 'user', content: synthesisPrompt }
    ];

    const systemPrompt = 'You are the Lead Swarm Supervisor & Synthesizer. Consolidate multi-agent outputs into an immaculate, unified, and directly actionable result.';

    try {
      const response = await modelRouter.streamCompletion({
        messages,
        model: model || settings.selectedModel,
        settings,
        systemPrompt,
        signal: abortController.signal,
        callbacks: { onToken: (chunk) => {
          if (typeof chunk === 'string') {
            fullSynthesis += chunk;
            if (onChunk) onChunk(chunk);
          } else if (chunk?.content) {
            fullSynthesis += chunk.content;
            if (onChunk) onChunk(chunk.content);
          }
        } }
      });

      if (!response?.success) throw new Error(response?.error || 'Synthesis model request failed');
      return fullSynthesis || response?.message?.content || '';
    } catch (err) {
      if (abortController.signal.aborted) {
        return fullSynthesis || '[Synthesis cancelled]';
      }
      return `[Synthesis Error]: ${err.message}`;
    }
  }
}

const swarmManager = new SwarmManager();

module.exports = {
  SwarmManager,
  swarmManager,
  SWARM_ROLES,
  SWARM_MODES
};

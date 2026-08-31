/**
 * SwarmManager - Multi-Agent Teams & Swarm Subagents Orchestrator for Neo Agent Runtime.
 */

const EventEmitter = require('events');
const { modelRouter } = require('./modelRouter');
const { workspaceManager } = require('./workspaceManager');

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
   * @param {Array<string>} params.roles Array of role IDs (e.g. ['architect', 'coder', 'reviewer'])
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

      const selectedRoles = roles
        .map(id => SWARM_ROLES[id.toUpperCase()] || { id, name: id, systemPrompt: `You are an expert ${id}.` });

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
        abortSignal: abortController.signal,
        onChunk: (chunk) => {
          if (typeof chunk === 'string') {
            fullOutput += chunk;
            if (onChunk) onChunk(chunk);
          } else if (chunk?.content) {
            fullOutput += chunk.content;
            if (onChunk) onChunk(chunk.content);
          }
        }
      });

      return fullOutput || response?.content || '';
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
        abortSignal: abortController.signal,
        onChunk: (chunk) => {
          if (typeof chunk === 'string') {
            fullSynthesis += chunk;
            if (onChunk) onChunk(chunk);
          } else if (chunk?.content) {
            fullSynthesis += chunk.content;
            if (onChunk) onChunk(chunk.content);
          }
        }
      });

      return fullSynthesis || response?.content || '';
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

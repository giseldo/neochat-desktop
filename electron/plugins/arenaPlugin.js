/**
 * Arena & Multi-Model Debate Plugin for NeoChat Desktop
 * 
 * Provides:
 * - Multi-Model Debate with autonomous rounds and judge synthesis
 * - Multi-Model Consensus voting with latency & token metrics
 * - Side-by-side comparative benchmarking
 */

const { getModelContextSizes } = require('../../shared/models');
const { getApiKeyForProvider, getBaseUrlForProvider, getActiveApiKey } = require('../../shared/providers');

class ArenaEngine {
  constructor() {
    this.activeDebates = new Map();
  }

  /**
   * Helper to execute a single completion request to a specific model/provider
   */
  async _callModel({ modelId, providerId, messages, temperature = 0.7, maxTokens = 2048, settings = {} }) {
    const fetch = global.fetch || require('node-fetch');
    const startTime = Date.now();

    let rawModel = modelId || '';
    let resolvedProvider = providerId;

    // If modelId is formatted like "provider::raw-model-id" (e.g. "mistral::mistral-small-2603")
    if (typeof rawModel === 'string' && rawModel.includes('::')) {
      const [p, ...rest] = rawModel.split('::');
      resolvedProvider = resolvedProvider || p;
      rawModel = rest.join('::');
    }

    // Resolve provider endpoint and API key
    let baseUrl = 'https://api.groq.com/openai/v1';
    let apiKey = process.env.GROQ_API_KEY || '';

    if (settings) {
      if (resolvedProvider) {
        baseUrl = getBaseUrlForProvider(settings, resolvedProvider) || baseUrl;
        const resolvedKey = getApiKeyForProvider(settings, resolvedProvider);
        if (resolvedKey && resolvedKey !== '<replace me>') {
          apiKey = resolvedKey;
        }
      } else {
        apiKey = getActiveApiKey(settings) || apiKey;
      }
    }

    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const payload = {
      model: rawModel,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`API error (${res.status}): ${errorText || res.statusText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      return {
        content,
        usage,
        latencyMs,
        model: modelId,
        provider: providerId
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      return {
        error: err.message,
        latencyMs,
        model: modelId,
        provider: providerId
      };
    }
  }

  /**
   * Run a structured multi-round debate between models
   */
  async runDebate({ debateId, topic, context = '', project = null, participants = [], judgeModel = null, rounds = 2, settings = {}, onRoundProgress }) {
    if (!participants || participants.length < 2) {
      throw new Error('Debate requires at least 2 participant models');
    }

    const projectContext = project?.name
      ? `[Projeto Ativo: "${project.name}"]${project.customPrompt ? `\nDiretrizes do Projeto:\n${project.customPrompt}` : ''}`
      : '';
    const fullContext = [projectContext, context].filter(Boolean).join('\n\n');

    const debateState = {
      id: debateId || `debate-${Date.now()}`,
      topic,
      context: fullContext,
      project: project ? { id: project.id, name: project.name } : null,
      roundsData: [],
      synthesis: null,
      status: 'running',
      createdAt: new Date().toISOString()
    };

    this.activeDebates.set(debateState.id, debateState);

    const emitProgress = (payload) => {
      if (typeof onRoundProgress === 'function') {
        onRoundProgress(payload);
      }
    };

    try {
      for (let r = 1; r <= rounds; r++) {
        const roundObj = { round: r, turns: [] };

        for (let i = 0; i < participants.length; i++) {
          const participant = participants[i];
          const role = participant.role || (i === 0 ? 'Proponente (A favor / Abordagem A)' : 'Oponente (Crítica / Abordagem B)');

          // Build history of previous arguments
          const conversationHistory = [
            {
              role: 'system',
              content: `Você está participando de um debate técnico e analítico de alto nível no NeoChat Desktop.
Seu papel: ${role}.
Tema: "${topic}".
${fullContext ? `Contexto do Projeto / Informações adicionais:\n${fullContext}\n` : ''}
Regras:
1. Seja incisivo, técnico, claro e fundamentado com exemplos concretos alinhados ao projeto.
2. Na Rodada ${r} de ${rounds}: ${r === 1 ? 'Apresente seus argumentos fundamentais e plano de ação.' : 'Analise as fraquezas dos argumentos dos outros participantes e defenda suas premissas com refutações lógicas.'}
3. Responda em Português formatado em Markdown limpo.`
            }
          ];

          // Add previous rounds context
          if (debateState.roundsData.length > 0) {
            debateState.roundsData.forEach(prevRound => {
              prevRound.turns.forEach(turn => {
                conversationHistory.push({
                  role: 'user',
                  content: `[${turn.participantName} - ${turn.role}]:\n${turn.content}`
                });
              });
            });
          }

          // Add current round's prior turns
          roundObj.turns.forEach(priorTurn => {
            conversationHistory.push({
              role: 'user',
              content: `[${priorTurn.participantName} - ${priorTurn.role}]:\n${priorTurn.content}`
            });
          });

          conversationHistory.push({
            role: 'user',
            content: `Sua vez de discursar na Rodada ${r}. Apresente sua resposta.`
          });

          emitProgress({
            type: 'turn_start',
            debateId: debateState.id,
            round: r,
            participantIndex: i,
            participantName: participant.name || participant.model
          });

          const result = await this._callModel({
            modelId: participant.model,
            providerId: participant.provider,
            messages: conversationHistory,
            temperature: participant.temperature || 0.7,
            settings
          });

          const turnData = {
            participantId: participant.id || `p-${i}`,
            participantName: participant.name || participant.model,
            role,
            model: participant.model,
            content: result.content || `[Erro: ${result.error}]`,
            usage: result.usage,
            latencyMs: result.latencyMs,
            error: result.error || null
          };

          roundObj.turns.push(turnData);

          emitProgress({
            type: 'turn_complete',
            debateId: debateState.id,
            round: r,
            turn: turnData
          });
        }

        debateState.roundsData.push(roundObj);
      }

      // Final Judge & Arbiter Synthesis
      const effectiveJudge = judgeModel || participants[0];
      emitProgress({
        type: 'synthesis_start',
        debateId: debateState.id,
        judgeName: effectiveJudge.name || effectiveJudge.model
      });

      const judgePrompt = [
        {
          role: 'system',
          content: `Você é o Juiz e Sintetizador Imparcial deste debate no NeoChat Desktop.
Tema do Debate: "${topic}".
Sua missão:
1. Avaliar os pontos fortes e limitações de cada participante.
2. Fornecer uma Tabela Comparativa de Notas (0 a 10) para: Clareza, Rigor Técnico, Viabilidade e Inovação.
3. Produzir o "Veredito & Síntese Otimizada", unindo o melhor de cada visão para entregar a solução definitiva ao usuário.
Responda em Português formatado em Markdown com tabelas e seções bem estruturadas.`
        },
        {
          role: 'user',
          content: `Aqui está o histórico completo do debate:\n\n${debateState.roundsData.map(r => `### Rodada ${r.round}\n` + r.turns.map(t => `**${t.participantName} (${t.role}):**\n${t.content}`).join('\n\n')).join('\n\n---\n\n')}\n\nPor favor, faça seu julgamento, notas e a síntese final recomendada.`
        }
      ];

      const judgeResult = await this._callModel({
        modelId: effectiveJudge.model,
        providerId: effectiveJudge.provider,
        messages: judgePrompt,
        temperature: 0.3,
        settings
      });

      debateState.synthesis = {
        judgeName: effectiveJudge.name || effectiveJudge.model,
        content: judgeResult.content || `[Erro ao sintetizar: ${judgeResult.error}]`,
        usage: judgeResult.usage,
        latencyMs: judgeResult.latencyMs
      };

      debateState.status = 'completed';

      emitProgress({
        type: 'debate_complete',
        debateId: debateState.id,
        debate: debateState
      });

      return debateState;
    } catch (err) {
      debateState.status = 'failed';
      debateState.error = err.message;
      emitProgress({
        type: 'debate_error',
        debateId: debateState.id,
        error: err.message
      });
      throw err;
    }
  }

  /**
   * Run parallel consensus across multiple models
   */
  async runConsensus({ prompt, models = [], settings = {} }) {
    if (!models || models.length === 0) {
      throw new Error('At least one model must be specified for consensus');
    }

    const startTime = Date.now();
    const tasks = models.map(async (m) => {
      const res = await this._callModel({
        modelId: m.model,
        providerId: m.provider,
        messages: [{ role: 'user', content: prompt }],
        temperature: m.temperature || 0.5,
        settings
      });
      return {
        modelId: m.model,
        modelName: m.name || m.model,
        provider: m.provider,
        content: res.content || '',
        usage: res.usage || {},
        latencyMs: res.latencyMs || 0,
        error: res.error || null
      };
    });

    const results = await Promise.all(tasks);
    const totalLatencyMs = Date.now() - startTime;

    return {
      prompt,
      results,
      totalLatencyMs,
      completedAt: new Date().toISOString()
    };
  }
}

const arenaEngine = new ArenaEngine();

module.exports = {
  id: 'arena',
  name: 'AI Arena & Multi-Model Debate',
  description: 'Debates autônomos em rodadas entre múltiplos modelos de IA e votação paralela por consenso',
  category: 'intelligence',
  lazy: true,

  init: async (ctx) => {
    ctx.registerIpcHandler('arena:run-debate', async (event, params = {}) => {
      const currentSettings = ctx.loadSettings ? ctx.loadSettings() : {};
      return await arenaEngine.runDebate({
        ...params,
        settings: { ...currentSettings, ...(params.settings || {}) },
        onRoundProgress: (data) => {
          if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('arena:event', data);
          }
        }
      });
    });

    ctx.registerIpcHandler('arena:run-consensus', async (_event, params = {}) => {
      const currentSettings = ctx.loadSettings ? ctx.loadSettings() : {};
      return await arenaEngine.runConsensus({
        ...params,
        settings: { ...currentSettings, ...(params.settings || {}) }
      });
    });
  },

  activate: async () => {
    console.log('[ArenaPlugin] Activated.');
  },

  deactivate: async () => {
    arenaEngine.activeDebates.clear();
    console.log('[ArenaPlugin] Deactivated and memory freed.');
  }
};

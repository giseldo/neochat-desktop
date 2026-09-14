/**
 * Podcast & Audio Studio Plugin for NeoChat Desktop
 * 
 * Provides:
 * - Generation of dynamic 2-host conversational podcast scripts (NotebookLM style)
 * - Speech synthesis queue with host role differentiation
 * - Audio overview exports from RAG knowledge or chat history
 */

const { getActiveApiKey, getBaseUrlForProvider, getDefaultModel } = require('../../shared/providers');

class PodcastEngine {
  constructor() {
    this.activePodcasts = new Map();
  }

  async generatePodcastScript({ topic, sourceText = '', style = 'engaging', durationMinutes = 3, settings = {} }) {
    const fetch = global.fetch || require('node-fetch');

    let baseUrl = 'https://api.groq.com/openai/v1';
    let apiKey = '';

    if (settings) {
      const providerId = settings.provider || 'groq';
      baseUrl = getBaseUrlForProvider(settings, providerId) || baseUrl;
      apiKey = getActiveApiKey(settings) || apiKey;
    }

    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const model = settings?.model || getDefaultModel(settings);

    const systemPrompt = `Você é um produtor de podcasts executivo de inteligência artificial de elite.
Sua tarefa é transformar o texto ou tema fornecido em um ROTEIRO DE PODCAST DINÂMICO E FASCINANTE (estilo NotebookLM Audio Overview) entre 2 apresentadores:
- **Apresentador A (Alex)**: Curioso, entusiasmado, faz perguntas inteligentes e metáforas do dia a dia.
- **Apresentador B (Sam)**: Especialista técnico, didático, aprofunda os conceitos com precisão e clareza.

Regras do Roteiro:
1. Comece com uma introdução calorosa e envolvente.
2. Mantenha um tom natural de conversa espontânea (com interjeições leves como "Exatamente!", "Nossa, isso é fascinante", "Olha só...").
3. Alterne falas curtas e médias entre Alex e Sam.
4. Resuma os pontos mais importantes do conteúdo de forma clara e educativa.
5. Conclua com uma reflexão marcante.
6. Retorne ESTRITAMENTE um JSON válido com o seguinte formato:
{
  "title": "Título do Episódio",
  "summary": "Breve resumo de 1 parágrafo",
  "estimatedDuration": "${durationMinutes} min",
  "dialogue": [
    { "speaker": "Alex", "voice": "host_a", "text": "Texto da fala do Alex..." },
    { "speaker": "Sam", "voice": "host_b", "text": "Texto da fala do Sam..." }
  ]
}`;

    const userPrompt = `Tema/Título: "${topic}"
Estilo desejado: ${style}
Duração estimada: ${durationMinutes} minutos

Conteúdo base / Documentos indexados:
${sourceText ? sourceText.slice(0, 12000) : 'Gere uma visão geral e discussão aprofundada sobre o tema informado.'}`;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 3500,
      response_format: { type: 'json_object' }
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Podcast Generation API error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        // Fallback cleanup if markdown codeblock fences were included
        const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(clean);
      }

      const podcastId = `pod-${Date.now()}`;
      const podcastResult = {
        id: podcastId,
        topic,
        title: parsed.title || topic,
        summary: parsed.summary || '',
        estimatedDuration: parsed.estimatedDuration || `${durationMinutes} min`,
        dialogue: Array.isArray(parsed.dialogue) ? parsed.dialogue : [],
        createdAt: new Date().toISOString()
      };

      this.activePodcasts.set(podcastId, podcastResult);
      return podcastResult;
    } catch (err) {
      console.error('[PodcastEngine] Failed to generate script:', err);
      throw err;
    }
  }
}

const podcastEngine = new PodcastEngine();

module.exports = {
  id: 'podcast-studio',
  name: 'Podcast & Audio Studio',
  description: 'Gere podcasts em áudio com diálogo entre 2 apresentadores virtuais (NotebookLM style) a partir de seus documentos e chats',
  category: 'productivity',
  lazy: true,

  init: async (ctx) => {
    ctx.registerIpcHandler('podcast:generate-script', async (_event, params = {}) => {
      const currentSettings = ctx.loadSettings ? ctx.loadSettings() : {};
      return await podcastEngine.generatePodcastScript({
        ...params,
        settings: { ...currentSettings, ...(params.settings || {}) }
      });
    });
  },

  activate: async () => {
    console.log('[PodcastPlugin] Activated.');
  },

  deactivate: async () => {
    podcastEngine.activePodcasts.clear();
    console.log('[PodcastPlugin] Deactivated.');
  }
};

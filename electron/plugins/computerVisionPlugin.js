/**
 * Computer Vision & Desktop Assistant Plugin for NeoChat Desktop
 * 
 * Provides:
 * - Desktop screen capture and optical element analysis
 * - Visual step-by-step guided automation with human safety approvals
 */

class ComputerVisionEngine {
  constructor() {
    this.screenCaptureService = null;
  }

  _getCaptureService() {
    if (!this.screenCaptureService) {
      this.screenCaptureService = require('../screenCaptureService');
    }
    return this.screenCaptureService;
  }

  async captureScreen(displayId = null) {
    const service = this._getCaptureService();
    return await service.captureScreen(displayId);
  }

  async analyzeScreen({ imageBase64, goal = 'Descrever a interface atual', settings = {} }) {
    const fetch = global.fetch || require('node-fetch');
    const { getActiveApiKey, getBaseUrlForProvider } = require('../settingsManager');

    let baseUrl = 'https://api.groq.com/openai/v1';
    let apiKey = process.env.GROQ_API_KEY || '';

    if (settings) {
      const providerId = settings.provider || 'groq';
      baseUrl = getBaseUrlForProvider(settings, providerId) || baseUrl;
      apiKey = getActiveApiKey(settings) || apiKey;
    }

    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
    // Prefer vision model if configured, fallback to llama-3.2-11b-vision or gpt-4o
    const model = settings.visionModel || settings.model || 'llama-3.2-11b-vision-preview';

    const systemPrompt = `Você é um assistente de visão computacional e automação de desktop de alta precisão no NeoChat Desktop.
Sua missão:
1. Inspecionar a imagem da tela fornecida e identificar janelas, botões, campos de entrada, textos e estados visuais.
2. Responder ao objetivo do usuário com orientações claras ou plano de ação passo a passo.
3. Se for uma automação, listar os passos exatos com descrição do elemento visual (ex: "Clique no botão azul 'Salvar' no canto superior direito").
Responda em Português formatado em Markdown limpo.`;

    const userContent = [
      { type: 'text', text: `Objetivo da análise de tela: "${goal}"` }
    ];

    if (imageBase64) {
      const formattedUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      userContent.push({
        type: 'image_url',
        image_url: { url: formattedUrl }
      });
    }

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.2,
      max_tokens: 2048
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Vision API error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      return {
        analysis: data.choices?.[0]?.message?.content || 'Análise visual concluída sem detalhes adicionais.',
        usage: data.usage || {},
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('[ComputerVisionEngine] Analysis error:', err);
      throw err;
    }
  }
}

const computerVisionEngine = new ComputerVisionEngine();

module.exports = {
  id: 'computer-vision',
  name: 'Computer Vision & Desktop Assistant',
  description: 'Análise visual da tela, reconhecimento de elementos da interface e automação guiada com segurança',
  category: 'tools',
  lazy: true,

  init: async (ctx) => {
    ctx.registerIpcHandler('vision:capture-screen', async (_event, displayId) => {
      return await computerVisionEngine.captureScreen(displayId);
    });

    ctx.registerIpcHandler('vision:analyze-screen', async (_event, params = {}) => {
      const currentSettings = ctx.loadSettings ? ctx.loadSettings() : {};
      return await computerVisionEngine.analyzeScreen({
        ...params,
        settings: { ...currentSettings, ...(params.settings || {}) }
      });
    });
  },

  activate: async () => {
    console.log('[ComputerVisionPlugin] Activated.');
  },

  deactivate: async () => {
    computerVisionEngine.screenCaptureService = null;
    console.log('[ComputerVisionPlugin] Deactivated.');
  }
};

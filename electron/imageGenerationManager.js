const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');
const { getApiKeyForProvider, getBaseUrlForProvider } = require('../shared/providers');

/**
 * Normalizes aspect ratio to dimensions supported by OpenAI DALL-E 3
 */
function getOpenAISize(aspectRatio = '1:1') {
  switch (aspectRatio) {
    case '16:9':
      return '1792x1024';
    case '9:16':
      return '1024x1792';
    case '1:1':
    default:
      return '1024x1024';
  }
}

/**
 * Downloads an image from a URL and converts it to a base64 data URL
 */
async function urlToDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download generated image from URL: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') || 'image/png';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

/**
 * Generates an image using an OpenAI-compatible /v1/images/generations endpoint (xAI, OpenAI, etc.)
 */
async function generateImage({
  prompt,
  provider,
  model,
  aspectRatio,
  quality,
  apiKey: overrideApiKey,
  useCustomApiKey: overrideUseCustomApiKey,
  baseUrl: overrideBaseUrl
} = {}, settings = {}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return { success: false, error: 'O prompt para a imagem não pode estar vazio.' };
  }

  const imageSettings = settings.imageGeneration || {};
  const effectiveProvider = provider || imageSettings.provider || 'grok';
  const providerKey = effectiveProvider === 'xai' ? 'grok' : effectiveProvider;

  const useCustomKey = overrideUseCustomApiKey !== undefined
    ? Boolean(overrideUseCustomApiKey)
    : Boolean(imageSettings.useCustomApiKey);

  // Resolve API Key: custom key takes precedence, otherwise reuse provider's configured key
  let apiKey = '';
  if (overrideApiKey && typeof overrideApiKey === 'string' && overrideApiKey.trim()) {
    apiKey = overrideApiKey.trim();
  } else if (useCustomKey && imageSettings.apiKey && imageSettings.apiKey.trim()) {
    apiKey = imageSettings.apiKey.trim();
  } else {
    apiKey = getApiKeyForProvider(settings, providerKey);
  }

  if (!apiKey || apiKey === '<replace me>') {
    const providerName = providerKey === 'grok' ? 'xAI' : providerKey === 'openai' ? 'OpenAI' : providerKey;
    return {
      success: false,
      error: `Chave de API não configurada para ${providerName}. Configure nas Configurações > Geração de Imagens ou Modelos & Provedores.`
    };
  }

  // Resolve endpoint URL
  let endpoint = '';
  const configuredBaseUrl = overrideBaseUrl || getBaseUrlForProvider(settings, providerKey);
  if (configuredBaseUrl) {
    endpoint = `${configuredBaseUrl.replace(/\/+$/, '')}/images/generations`;
  } else if (providerKey === 'grok') {
    endpoint = 'https://api.x.ai/v1/images/generations';
  } else if (providerKey === 'openai') {
    endpoint = 'https://api.openai.com/v1/images/generations';
  } else {
    endpoint = 'https://api.x.ai/v1/images/generations';
  }

  // Resolve model
  let effectiveModel = model || imageSettings.model;
  if (!effectiveModel) {
    effectiveModel = providerKey === 'openai' ? 'dall-e-3' : 'grok-imagine-image';
  }

  const effectiveAspectRatio = aspectRatio || imageSettings.aspectRatio || '1:1';
  const effectiveQuality = quality || imageSettings.quality || 'standard';

  // Build request payload
  const body = {
    prompt: prompt.trim(),
    model: effectiveModel,
    n: 1
  };

  if (providerKey === 'openai' || effectiveModel.toLowerCase().includes('dall-e')) {
    body.response_format = 'b64_json';
    if (effectiveModel.includes('dall-e-3')) {
      body.size = getOpenAISize(effectiveAspectRatio);
      body.quality = effectiveQuality;
    } else {
      body.size = '1024x1024';
    }
  } else if (providerKey === 'grok') {
    // xAI supports response_format: 'b64_json' or 'url', does not accept size/quality parameters
    body.response_format = 'b64_json';
  }

  console.log(`[ImageGeneration] Requesting generation from ${endpoint} with model ${effectiveModel}...`);

  try {
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    // If xAI or another provider fails due to response_format, retry without response_format
    if (!response.ok && body.response_format) {
      const errorClone = response.clone();
      try {
        const errJson = await errorClone.json();
        const errMsg = JSON.stringify(errJson);
        if (errMsg.includes('response_format') || errMsg.includes('b64_json')) {
          console.warn('[ImageGeneration] Provider rejected response_format, retrying with default format...');
          delete body.response_format;
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
          });
        }
      } catch {
        // Ignore json parse error on clone
      }
    }

    if (!response.ok) {
      let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = typeof errorData.error === 'string'
            ? errorData.error
            : errorData.error.message || JSON.stringify(errorData.error);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      console.error('[ImageGeneration] Generation failed:', errorMessage);
      return { success: false, error: errorMessage, status: response.status };
    }

    const data = await response.json();
    const item = data?.data?.[0];

    if (!item) {
      return { success: false, error: 'A API não retornou dados de imagem válidos.' };
    }

    let dataUrl = '';
    let rawUrl = '';
    let revisedPrompt = item.revised_prompt || prompt;

    if (item.b64_json) {
      dataUrl = `data:image/png;base64,${item.b64_json}`;
    } else if (item.url) {
      rawUrl = item.url;
      try {
        // Download and convert to permanent base64 data URL so it never expires in local chat history
        dataUrl = await urlToDataUrl(item.url);
      } catch (err) {
        console.warn('[ImageGeneration] Could not convert image URL to base64, using direct URL:', err.message);
        dataUrl = item.url;
      }
    } else {
      return { success: false, error: 'Formato de imagem retornado pela API não reconhecido.' };
    }

    return {
      success: true,
      dataUrl,
      rawUrl,
      revisedPrompt,
      model: effectiveModel,
      provider: providerKey
    };
  } catch (error) {
    console.error('[ImageGeneration] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Erro inesperado ao conectar ao servidor de geração de imagens.'
    };
  }
}

/**
 * Saves a base64 or URL image to the local filesystem using Electron's native Save Dialog
 */
async function saveImageToFile(dataUrlOrBuffer, defaultName = '', mainWindow = null) {
  try {
    const cleanName = (defaultName || `neochat-image-${Date.now()}`)
      .replace(/[^\w\s-]/g, '')
      .trim()
      .slice(0, 50) || `neochat-image-${Date.now()}`;

    const defaultFilename = `${cleanName}.png`;
    const defaultPath = path.join(app.getPath('downloads'), defaultFilename);

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar Imagem Gerada',
      defaultPath,
      filters: [
        { name: 'Imagem PNG (*.png)', extensions: ['png'] },
        { name: 'Imagem JPEG (*.jpg;*.jpeg)', extensions: ['jpg', 'jpeg'] },
        { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    let buffer;
    if (typeof dataUrlOrBuffer === 'string') {
      if (dataUrlOrBuffer.startsWith('data:')) {
        const base64Data = dataUrlOrBuffer.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else if (dataUrlOrBuffer.startsWith('http://') || dataUrlOrBuffer.startsWith('https://')) {
        const response = await fetch(dataUrlOrBuffer);
        const arrayBuf = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      } else {
        buffer = Buffer.from(dataUrlOrBuffer, 'base64');
      }
    } else if (Buffer.isBuffer(dataUrlOrBuffer)) {
      buffer = dataUrlOrBuffer;
    } else {
      return { success: false, error: 'Conteúdo de imagem inválido para salvar.' };
    }

    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  } catch (error) {
    console.error('[ImageGeneration] Failed to save image:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateImage,
  saveImageToFile,
  getOpenAISize
};
